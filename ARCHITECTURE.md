# 🧬 架构文档 — 尼可剧本工具

> **作者：尼可** · **QQ 群：1051068329**

> **一次入库 · 多格式输出 · AI 铸造 · AI 动态生成沉浸式 HTML 宣发页**
> 春潮 / 风月 / MISS 剧本格式互转 + Markdown 存档 + AI 剧本工坊 + AI 根据世界观动态生成主题 HTML 宣发页

---

## 📦 项目文件

| 文件 | 说明 |
|------|------|
| [`index.html`](./index.html) | **构建产物** — 浏览器打开即用，零依赖（由 `build.js` 生成） |
| [`src/template.html`](./src/template.html) | HTML 骨架（开发源文件） |
| [`src/styles.css`](./src/styles.css) | 全部样式（开发源文件） |
| [`src/main.js`](./src/main.js) | 全部 JS 逻辑（开发源文件） |
| [`build.js`](./build.js) | **极简构建器** — 合并 `src/` 三文件为 `index.html` |
| `【春潮】*.json` | 春潮平台导出的剧本示例 |
| `[风月]*.json` | 风月平台导出的剧本示例 |
| `【MISS】*.json` | MISS 平台导出的剧本示例 |
| [`test_convert.js`](./test_convert.js) | 转换测试脚本（Node.js），验证 3×4 转换路径 + 往返一致性 |
| [`audit_mapping.js`](./audit_mapping.js) | 字段级映射审计脚本（Node.js），逐字段验证解析/渲染正确性 |
| [`temp_core.js`](./temp_core.js) | 核心函数提取（供测试/审计脚本使用，从 `src/main.js` 抽取） |

---

## 🏗️ 开发指南

### 构建流程

```bash
node build.js              # 合并 src/ 三文件 → index.html
node test_convert.js       # 运行测试
```

**开发时只修改 `src/` 目录下的文件**，不要直接编辑 `index.html`。每次修改后运行 `node build.js` 重新生成。

### 架构动机

> 为什么从单 HTML 文件拆分为 `src/` + `build.js`？

之前的单文件架构（~2265 行）在与 AI 工具协作时暴露了两个系统性缺陷：

1. **`apply_diff` 行号漂移**：CSS 修改导致后续所有 JS 行号偏移，diff 频繁失败
2. **HTML 实体双重转义**：LLM 工具调用的 JSON/XML 序列化管道会错误转义 JS 字符串中的 `&`、`<`、`>`、`"`、`'` 字符

拆分后，AI 工具只需操作 `src/main.js`（纯 JS 文件），彻底规避了 HTML 上下文中的编码污染问题。

---

## 🧬 核心架构：通用中间格式 (UIF)

```
 春潮 JSON  ──→┐
 风月 JSON  ──→├──→  UIF (通用中间格式)  ──→  Markdown 存档
 MISS JSON  ──→┘                        ├──→  春潮 JSON
                                         ├──→  风月 JSON
                                         └──→  MISS JSON
```

**UIF（Universal Intermediate Format）** 是"唯一真相源"。所有平台格式先解析为 UIF，再从 UIF 渲染为目标格式。新平台出现时，只需新增一个解析器 + 一个渲染器，无需修改已有逻辑。

### UIF 数据结构

```typescript
interface UIF {
  meta: {
    title: string;
    summary: string;        // 简介第一行（纯文本）
    description: string;    // 完整描述（含 HTML 标签）
    language: string;
    orientation: string;    // 取向（春潮/MISS），风月无此字段 → fallback '通用'
    tags: string[];
    source: string;         // 'chunchao' | 'fengyue' | 'miss' | 'generator'
    exportedAt: string|null;
    protagonist: string;    // 玩家扮演角色（向导生成时设定）
  };
  assets: {
    coverUrl: string|null;
    coverTinyUrl: string|null;
    bgImageUrl: string|null;
    bgMobileUrl: string|null;
    coverAnimated: boolean;
  };
  prompts: {
    mainPrompt: string;     // 核心系统提示词
    suffixPrompt: string;   // 后缀提示词
    postText: string;
    identityStyle: string;
    worldview: string;
    writingStyle: string;
  };
  worldBook: Array<{
    keywords: string[];
    content: string;
    weight: number;
    enabled: boolean;
    source: string;
  }>;
  landingPage: string;      // 嵌入式 HTML 宣发页（从源 JSON 自动提取 / AI 铸造）
  extras: {
    customCss: string;
    quickCommands: string[];
    gameStateEnabled: boolean;
    gameStateDesc: string;
    gameStateExample: string;
    nextOptionsEnabled: boolean;
    nextPlotPrompt: string;
    breakerText: string;
    useCustomBreaker: boolean;
    bannedWords: string[];
    suggestedQuestions: string[];
  };
  _raw: object;             // 原始 JSON（无损保留，用于回渲）
  _sourceFormat: string;
}
```

### IndexedDB 存储结构

数据库名：`ScriptLibrary`，表名：`scripts`，版本：`2`

```typescript
interface DBScript {
  id: number;               // 自动递增（主键）
  uid: string;              // 确定性 UID（唯一索引），基于 title+sourceFormat+exportedAt 生成
  title: string;
  summary: string;          // 前 200 字
  tags: string[];
  orientation: string;
  sourceFormat: string;
  worldBookCount: number;
  promptLength: number;
  coverUrl: string;
  bgUrl: string;
  htmlLandingPage: string;  // 独立索引字段，用于快速布尔查询
  createdAt: number;
  updatedAt: number;
  uif: UIF;                 // 完整 UIF 对象
}
```

**UID 去重机制：** 外部导入 JSON 时，`dbAdd()` 先通过 `uid` 唯一索引查找是否已存在。存在则 `store.put()` 覆盖更新（保留原 `id` 和 `createdAt`），不存在则 `store.add()` 新增。同名同源文件重复导入不会产生冗余条目。

### 六视图 SPA 架构

```
┌──────────────────────────────────────────────────────────┐
│                      App Shell                           │
│  [📐 转换器] [🏭 工坊] [🧑 捏人] [🌍 世界观] [⚡ 体系] [📚 库]  [🤖 AI] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─ Converter ───────────────────────────────────────┐   │
│  │  输入面板（拖拽/粘贴/批量）                        │   │
│  │  输出面板（格式选择/复制/下载/ZIP）                │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Generator ───────────────────────────────────────┐   │
│  │  Step 1 💡 脑暴抽卡 → 3 张概念卡                  │   │
│  │  Step 2 ✏️ 精修确认 → 编辑/导入素材/设定主角      │   │
│  │  Step 3 📖 提示词膨胀 → 800+ 字 Prompt            │   │
│  │  Step 4 🌍 世界书衍生 + 宣发页铸造 → 保存入库     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Char Creator ────────────────────────────────────┐   │
│  │  一句话 → AI 生成完整人物档案 → 复制/导入流水线   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ World Builder ───────────────────────────────────┐   │
│  │  一句话 → AI 构建世界观 → 复制/导入流水线          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Power Builder ───────────────────────────────────┐   │
│  │  一句话 → AI 设计力量体系 → 复制/导入流水线        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Library ─────────────────────────────────────────┐   │
│  │  侧边栏：搜索 + 卡片列表（含 🌐 宣发页状态徽章）   │   │
│  │  详情弹窗：元信息/宣发页/提示词/世界书             │   │
│  │  右键菜单：复制/导出/删除                          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 格式对照

### 字段映射矩阵

以下为 **实际字段名** 的完整映射（基于三个样本 JSON 的字段值逐一验证）：

#### 元数据层 (`meta`)

| UIF 字段 | 春潮来源 | 风月来源 | MISS来源 | 春潮输出 | 风月输出 | MISS输出 |
|---------|---------|---------|---------|---------|---------|---------|
| `meta.title` | `work.title` | `title` | `promptData.title` | `work.title` | `title` | `promptData.title` |
| `meta.description` | `work.description` | `description` | `promptData.description` | `work.description` | `description` | `promptData.description` |
| `meta.orientation` | `work.orientation` | **无** → `'通用'` | `promptData.orientation` | `work.orientation` | `orientation` | `promptData.orientation` |
| `meta.tags` | `work.tagIds` → `tag:N` | `tags[].name` | `tags[]` (字符串) | `work.tagIds` (数字) | `tags[]` (对象) | `tags[]` (字符串) |
| `meta.exportedAt` | `work.exportedAt` | `exported_at` | `promptData.exportedAt` | `work.exportedAt` | `exported_at` | `promptData.exportedAt` |
| `meta.language` | `work.language` | `language` | `promptData.language` | `work.language` | `language` | `promptData.language` |

#### 资源层 (`assets`)

| UIF 字段 | 春潮来源 | 风月来源 | MISS来源 | 春潮输出 | 风月输出 | MISS输出 |
|---------|---------|---------|---------|---------|---------|---------|
| `assets.coverUrl` | `work.coverUrl` | `cover_url` | `promptData.coverUrl` | `work.coverUrl` | `cover_url` | `promptData.coverUrl` |
| `assets.bgUrl` | `work.bgUrl` | `bg_url` | `promptData.bgUrl` | `work.bgUrl` | `bg_url` | `promptData.bgUrl` |
| `assets.customCss` | `work.customCss` | `custom_css` | `promptData.customCss` | `work.customCss` | `custom_css` | `promptData.customCss` |

#### 提示词层 (`prompts`) — 核心转换区

| UIF 字段 | 春潮来源 | 风月来源 | MISS来源 | 春潮输出 | 风月输出 | MISS输出 |
|---------|---------|---------|---------|---------|---------|---------|
| `prompts.mainPrompt` | `work.prompt` | `pre_prompt` (主内容) | `promptData.prompt` | `work.prompt` | `pre_prompt` | `promptData.prompt` |
| `prompts.suffixPrompt` | `work.suffixPrompt` | `post_text` (提取) | `promptData.postPrompt` | `work.suffixPrompt` | `post_text` 拼接 | `promptData.postPrompt` |
| `prompts.postText` | `work.postText` | `post_text` (提取) | **无** → `''` | → `[后置规则: ...]` | `post_text` 拼接 | → `[后置补充: ...]` |
| `prompts.identityStyle` | `work.identityStyle` | `identity_style` | `promptData.identityStyle` | → `[角色风格设定: ...]` | → `[角色风格设定: ...]` | → `[角色风格设定: ...]` |
| `prompts.worldview` | `work.worldview` | `worldview` | `promptData.worldview` | → `[世界观设定: ...]` | → `[世界观设定: ...]` | → `[世界观设定: ...]` |

#### 世界书层 (`worldBook`)

| UIF 字段 | 春潮来源 | 风月来源 | MISS来源 | 春潮输出 | 风月输出 | MISS输出 |
|---------|---------|---------|---------|---------|---------|---------|
| `worldBook[].content` | `content` | `content` | `content` | `content` | `content` | `content` |
| `worldBook[].keywords` | `keywords[]` | `key[]` | `key[]` | `keywords[]` | `key[]` | `key[]` |
| `worldBook[].scanRegions` | `scanRegions[]` | **无** → `[]` | **无** → `[]` | `scanRegions[]` | **无** | **无** |

#### 宣发页层 (`landingPage`)

| UIF 字段 | 春潮来源 | 风月来源 | MISS来源 |
|---------|---------|---------|---------|
| `landingPage` | `work.detailIntro` (HTML 检测) | `description` (纯文本) | `description` (HTML 检测) |

源 JSON 中已有的 HTML 宣发页自动提取到 UIF。春潮和 MISS 的 `description`/`detailIntro` 字段可能包含完整 HTML 网页代码，解析器检测 `<!DOCTYPE` 或 `<html` 标记后提取为 `landingPage`，同时剥离标签取纯文本作为 `meta.description`。

### Elegant Join 拼接规则

提示词字段在跨平台转换时，采用 **带标记的无损拼接** 模式：

```javascript
// 统一模式：[A, B, C].filter(Boolean).join('\n\n')

// 春潮 suffixPrompt 的构建
suffixPrompt = [suffixPrompt, postText ? `[后置规则: ${postText}]` : '', identityStyle ? `[角色风格设定: ${identityStyle}]` : ''].filter(Boolean).join('\n\n')

// 风月 post_text 的构建
post_text    = [postText, suffixPrompt ? `[后缀设定: ${suffixPrompt}]` : '', identityStyle ? `[角色风格设定: ${identityStyle}]` : ''].filter(Boolean).join('\n\n')

// 风月 pre_prompt 的构建
pre_prompt   = [mainPrompt, worldview ? `[世界观设定: ${worldview}]` : ''].filter(Boolean).join('\n\n')

// MISS postPrompt 的构建
postPrompt   = [suffixPrompt, postText ? `[后置补充: ${postText}]` : ''].filter(Boolean).join('\n\n')
```

这种设计的核心思想：
- **无损**：所有信息都保留，没有任何字段被丢弃
- **可逆**：解析器通过标记前缀（`[后置规则:]`、`[角色风格设定:]`）能精确还原
- **可读**：标记本身是人类可读的中文，用户能直观理解内容来源

### 平台差异要点

- **春潮**：核心字段在 `work` 对象内部（`raw.work.prompt`），非顶层
- **风月**：`post_text` 是复合字段，同时承载 `postText`、`suffixPrompt`、`identityStyle` 三个 UIF 字段
- **MISS**：提示词分散在 `promptData` 子对象中，世界书关键词为数组格式

---

## 🤖 AI 剧本工坊

### 状态机设计

```javascript
const genState = {
  step: 1,
  seed: '',           // Step 1 种子输入
  drafts: [],         // Step 1 AI 生成的 4 个方向
  selectedIdx: -1,    // Step 2 选中的卡片索引
  selectedDraft: null,// Step 2 选中的卡片对象
  prompts: null,      // Step 3 AI 膨胀后的提示词 { systemPrompt, outline, expanded }
  worldBook: [],      // Step 4 AI 生成的世界书
  materials: [],      // Step 2 导入的素材（捏人/世界观/体系）
  protagonist: '',    // Step 2 设定的玩家扮演角色
  _landingPage: '',   // Step 4 AI 铸造的宣发页 HTML
};
```

### 4 步 Prompt 工程

| 步骤 | 输入 | AI 任务 | 输出 |
|------|------|---------|------|
| 1 💡 | 种子词/梗概 | 生成 3 张概念卡（角色/世界观/核心冲突），严格 JSON 格式 | `{cards: [{title, type, description, tags}]}` |
| 2 ✏️ | 3 张概念卡 + 可选素材 | 用户手动编辑/合并/删除；可导入捏人/世界观/体系素材；设定玩家扮演角色 | 精修后的设定文本 + 素材列表 + 主角 |
| 3 📖 | 精修设定 + 素材 + 主角 | 扩展为 800+ 字结构化 System Prompt，融合素材和主角身份 | `{mainPrompt, suffixPrompt, worldview, identityStyle, writingStyle}` |
| 4 🌍 | 完整提示词 | 生成世界书条目；支持追加指令迭代扩充；AI 铸造宣发页；保存入库 | 世界书数组 + 宣发页 HTML + IndexedDB 条目 |

### 流水线集成

三个独立工坊（捏人/世界观/体系）的产出通过 `localStorage` 传递到剧本工坊：

```
🧑 捏人工坊 → localStorage._last_char_result
🌍 世界观构建 → localStorage._last_world_result
⚡ 体系工坊 → localStorage._last_power_result

剧本工坊 Step 2:
  ┌─ 点击 "🧑 导入捏人" → 读取 _last_char_result → 注入 prompt 上下文
  ├─ 点击 "🌍 导入世界观" → 读取 _last_world_result → 注入 prompt 上下文
  └─ 点击 "⚡ 导入体系" → 读取 _last_power_result → 注入 prompt 上下文
```

### AI 配置（BYOK）

- 端点：兼容 OpenAI Chat Completions API
- 预设：`https://api.deepseek.com/v1/chat/completions`
- 模型：`deepseek-chat`
- 配置存储在 `localStorage`

---

## 🌐 专属宣发页

### 自动提取（源 JSON 已有）

导入剧本时，解析器自动从源 JSON 提取嵌入式 HTML 宣发页：
- **春潮**：`work.detailIntro` → 检测 `<!DOCTYPE`/`<html` → 提取为 `landingPage`
- **风月**：`description` → 纯文本，无 HTML 检测
- **MISS**：`description` → 检测 `<!DOCTYPE`/`<html` → 提取为 `landingPage`

入库后详情页直接显示 "✅ 已铸造"，支持 **预览** 和 **下载**。

### AI 动态生成（源 JSON 无宣发页）

对于没有嵌入式宣发页的剧本，AI 根据世界观实时生成匹配题材的沉浸式 HTML 单页应用。**这不是模板套壳**——AI 从零手写完整的 HTML/CSS/JS，风格与剧本世界观深度绑定：

| 题材 | 视觉风格 | CSS 特效 |
|------|---------|---------|
| 🦾 赛博朋克 | 霓虹发光 + 故障艺术 | `text-shadow` 多重发光、`clip-path` 故障偏移、暗黑矩阵背景 |
| 🏔️ 修仙武侠 | 水墨晕染 + 古风排版 | `@font-face` 毛笔字体、半透明墨迹纹理、竖排题词 |
| 🌌 奇幻科幻 | 深色渐变 + 粒子感 | `radial-gradient` 星云背景、金色装饰边框、发光按钮 |
| 🧛 哥特暗黑 | 暗红黑金 + 浮雕质感 | `box-shadow` 内阴影浮雕、暗色纹理叠加、哥特式边框 |
| 🏖️ 日常现代 | 柔和渐变 + 毛玻璃 | `backdrop-filter: blur()` 毛玻璃效果、圆润卡片、柔和阴影 |

**生成内容包含：**
- 沉浸式背景 + 标题动画
- 世界观简介区域
- 玩家自定义档案表单（姓名/性别/年龄/职业/外貌/隐藏背景）
- 一键复制档案文本到剪贴板（含 "=> 档案确认完毕，请根据上述我的设定，开始游戏剧情第一幕。"）
- 完整的响应式布局

**操作流程：**
1. 在详情页点击 **✨ AI 铸造专属主题宣发页**
2. AI 生成 HTML → 自动入库（同时更新 `uif.landingPage` 和 `htmlLandingPage`）
3. 详情页刷新显示 ✅ 已铸造
4. 支持 **预览**（Blob URL 新标签页）/ **下载**（独立 HTML 文件）/ **重新铸造**

---

## 🎨 樱花动态背景

### 实现方案

通过 JS 动态创建 Canvas 元素，使用 WebGL 渲染 800 个 3D 樱花粒子，带景深模糊（Depth-of-Field）和辉光（Bloom）后处理。

**关键设计：**
- **零 HTML 侵入**：`document.createElement('canvas')` 在 `initSakuraBg()` 中动态创建
- **不干扰交互**：`position:fixed; z-index:-1; pointer-events:none; opacity:0.5`
- **性能优化**：粒子数从原始 1600 减至 800
- **Shader 内联**：8 个 GLSL shader 编码为 JS 字符串常量 `SAKURA_SHADERS` 对象，无 DOM `<script id="...">` 依赖
- **自动适配**：所有视图通用，自动适配明暗主题

### 文件结构

```
樱花特效背景.html  →  原始 WebGL 源码（1095 行）
sakura_inject.js   →  注入脚本，将 shader 内联为 JS 常量
src/main.js        →  initSakuraBg() 函数（~230 行 WebGL 逻辑）
```

---

## 🗄️ IndexedDB 数据流

```
外部导入 JSON
     │
     ▼
parseJSON(raw)
  ├─ detectFormat() → chunchao/fengyue/miss
  ├─ parseXxx() → UIF (含 landingPage HTML 提取)
  └─ generateUid() → 12 位十六进制 UID
     │
     ▼
dbAdd(uif)
  ├─ dbFindByUid(uid) → 已存在?
  │   ├─ 是 → store.put() 覆盖更新（保留 id + createdAt）
  │   └─ 否 → store.add() 新增
  │
  ▼
renderLibList() 刷新

向导保存
     │
     ▼
构建 script UIF → dbAdd(dbEntry)
  ├─ uid 从 script.meta 生成
  ├─ htmlLandingPage 从 genState._landingPage 写入
  └─ protagonist 从 genState.protagonist 写入 meta
```

---

## 🧪 测试结果

### 转换测试（`test_convert.js`）

**27/27 全部通过** ✅ — 3 样本 × (格式检测 + 解析 + 4 渲染 + 3 往返一致性)

| 剧本 | 来源 | 世界书 | 提示词 | 格式检测 | 解析 | 4 渲染 | 3 往返 |
|------|------|--------|--------|---------|------|--------|--------|
| 全息韩国真实生活模拟器 | 春潮 | 75 条 | 5408 字符 | ✅ | ✅ | ✅✅✅✅ | ✅✅✅ |
| 穿成阿龙，但这次鱼人说了算 | 风月 | 4 条 | 6974 字符 | ✅ | ✅ | ✅✅✅✅ | ✅✅✅ |
| 海拉鲁悲歌交响 | MISS | 6 条 | 4987 字符 | ✅ | ✅ | ✅✅✅✅ | ✅✅✅ |

### 字段级审计（`audit_mapping.js`）

**~80 项字段映射全部通过** ✅ — 逐字段验证每个样本的解析值、渲染值、往返一致性。

3 项 FAIL 为 **Elegant Join 设计特性**（非 Bug）：
- `mainPrompt -> fy pre_prompt 包含` — 风月渲染器将 `mainPrompt` + `worldview` 合并为 `pre_prompt`
- `postText -> fy post_text 包含` — 风月渲染器将 `postText` + `suffixPrompt` + `identityStyle` 合并为 `post_text`

### 已修复 Bug

| Bug | 修复位置 | 说明 |
|-----|---------|------|
| `escapeHtml` 实体替换值错误 | [`src/main.js:794`](src/main.js:794) | `&` → `&` 等替换使用了错误值；改用 `String.fromCharCode()` 构建实体字符串，彻底避免 `&` 字符被工具链污染 |
| 右键菜单未绑定事件 | [`src/main.js:~1310`](src/main.js:1310) | DOM 和 CSS 已定义但 JS 未绑定 `contextmenu` 事件；新增完整的事件委托实现 |
| `renderChunchao` 中 `postText` 丢失 | [`src/main.js:515`](src/main.js:515) | 风月的 `post_text` 内容在转换为春潮格式时被丢弃 |
| `dbGetAll()` 全量加载性能问题 | [`src/main.js:629`](src/main.js:629) | 原使用 `getAll()` 返回完整 UIF 对象（含大字段），改为游标查询只返回轻量字段 |
| 未使用变量 `zonene` | [`src/main.js:1097`](src/main.js:1097) | 声明了 `const zonene = $('uploadZone')` 但从未使用 |
| 重复章节标题 | [`src/main.js:769`](src/main.js:769) | 连续两行 `//  11. 剧本库` 注释 |
| parser 未提取嵌入式 HTML 宣发页 | [`src/main.js:311,355,400`](src/main.js:311) | 三个 parser 未将 `description`/`detailIntro` 中的 HTML 提取到独立字段；新增 `landingPage` 字段 |
| `dbAdd()` 未存储宣发页 | [`src/main.js:616`](src/main.js:616) | 入库时未将 `uif.landingPage` 写入 `htmlLandingPage`；新增字段映射 |
| AI 铸造未同步 UIF 顶层 | [`src/main.js:1825`](src/main.js:1825) | `generateLandingPage()` 只更新了 `htmlLandingPage`，未同步 `uif.landingPage`；修复为双写 |
| `parseMiss` 未检测 HTML | [`src/main.js:384`](src/main.js:384) | MISS 的 `description` 字段可能包含完整 HTML，但解析器只是简单赋值；增加 `<!DOCTYPE`/`<html` 检测逻辑 |
| 同名 JSON 重复导入导致数据冗余 | [`src/main.js:605`](src/main.js:605) | 无 UID 去重机制，每次导入都创建新条目；新增 `generateUid()` + `dbFindByUid()` + `dbAdd()` upsert 模式 |

### 已知合理信息丢失（平台 schema 差异，非 Bug）

| 丢失内容 | 原因 | 影响 |
|---------|------|------|
| 春潮 `tagIds` 数字 ID → 名称映射 | 无名称映射表，只存 `tag:N` | 回春潮时 ID 正确但无名称 |
| 风月 `tags[].id` 和 `tags[].type` | UIF 只保留 `name` | 回风月时 tags 只有 name |
| 风月无 `orientation` 字段 | 平台无此概念 | 渲染春潮/MISS 时 fallback `'通用'` |
| `coverAnimated` 固定为 `false` | renderer 硬编码 | 不影响功能 |

---

## 🔧 扩展指南

### 架构总览

添加新平台格式的核心流程：

```
源格式 JSON  ──→  parseXxx()  ──→  UIF  ──→  renderXxx()  ──→  目标格式 JSON
                     │                          │
                     │  flexGet/flexStr/         │  Elegant Join
                     │  flexArr/flexBool/        │  [A,B,C].filter(Boolean)
                     │  flexNum 容错查找          │  .join('\n\n')
                     ▼                          ▼
                  UIF 结构体                  目标平台 JSON
```

**只需写两个函数**（~70 行代码），无需修改任何已有逻辑。

### 第一步：格式检测

在 [`src/main.js`](src/main.js) 的 [`detectFormat()`](src/main.js:269) 中添加新平台的标识字段检测：

```javascript
function detectFormat(raw) {
  if (raw.work && raw.work.prompt) return 'chunchao';
  if (raw.pre_prompt && raw.title) return 'fengyue';
  if (raw.promptData && raw.promptData.prompt) return 'miss';
  // 新增：检测新平台格式
  if (raw.xxxField && raw.yyyField) return 'xxx';
  return null;
}
```

### 第二步：编写解析器

解析器将源 JSON 映射为 UIF 结构。使用 `flexGet/flexStr/flexArr/flexBool/flexNum` 工具函数进行容错字段查找，支持多个备选 key 名：

```javascript
function parseXxx(raw) {
  return {
    meta: {
      title: flexStr(raw, 'title', 'name', 'scriptName'),
      summary: flexStr(raw, 'summary', 'brief', 'shortDesc'),
      description: flexStr(raw, 'description', 'desc', 'detailIntro'),
      language: flexStr(raw, 'language', 'lang') || 'zh-CN',
      orientation: flexStr(raw, 'orientation', 'gender') || '通用',
      tags: flexArr(raw, 'tags', 'tagList', 'categories'),
      source: 'xxx',
      exportedAt: flexStr(raw, 'exportedAt', 'exported_at', 'createTime'),
    },
    assets: {
      coverUrl: flexStr(raw, 'coverUrl', 'cover_url', 'cover'),
      coverTinyUrl: flexStr(raw, 'coverTinyUrl', 'cover_tiny', 'thumb'),
      bgImageUrl: flexStr(raw, 'bgImageUrl', 'bg_url', 'background'),
      bgMobileUrl: flexStr(raw, 'bgMobileUrl', 'bg_mobile', 'bgMobile'),
      coverAnimated: flexBool(raw, 'coverAnimated', 'animatedCover'),
    },
    prompts: {
      mainPrompt: flexStr(raw, 'prompt', 'mainPrompt', 'systemPrompt', 'pre_prompt'),
      suffixPrompt: flexStr(raw, 'suffixPrompt', 'suffix', 'postPrompt', 'post_prompt'),
      postText: flexStr(raw, 'postText', 'post_text', 'afterword'),
      identityStyle: flexStr(raw, 'identityStyle', 'identity_style', 'charStyle'),
      worldview: flexStr(raw, 'worldview', 'worldView', 'world_bg'),
      writingStyle: flexStr(raw, 'writingStyle', 'writing_style', 'style'),
    },
    worldBook: parseWorldBookEntries(
      flexArr(raw, 'worldBook', 'world_book', 'entries', 'wb'),
      'xxx'
    ),
    landingPage: extractLandingPage(raw, 'description', 'detailIntro', 'intro'),
    extras: {
      customCss: findCustomCss(raw),
      quickCommands: flexArr(raw, 'quickCommands', 'quick_cmd', 'commands'),
      gameStateEnabled: flexBool(raw, 'gameStateEnabled', 'stateEnabled'),
      gameStateDesc: flexStr(raw, 'gameStateDesc', 'stateDesc', 'state_description'),
      gameStateExample: flexStr(raw, 'gameStateExample', 'stateExample', 'state_example'),
      nextOptionsEnabled: flexBool(raw, 'nextOptionsEnabled', 'nextEnabled'),
      nextPlotPrompt: flexStr(raw, 'nextPlotPrompt', 'nextPrompt', 'next_plot'),
      breakerText: flexStr(raw, 'breakerText', 'breaker_text', 'breakText'),
      useCustomBreaker: flexBool(raw, 'useCustomBreaker', 'customBreaker'),
      bannedWords: flexArr(raw, 'bannedWords', 'banned_words', 'blacklist'),
      suggestedQuestions: flexArr(raw, 'suggestedQuestions', 'suggested_questions', 'starterQuestions'),
    },
    _raw: raw,
    _sourceFormat: 'xxx',
  };
}
```

**关键原则：**
- 所有字段查找使用 `flexGet` 系列函数，支持多个备选 key 名
- 缺失字段返回 `null`/`''`/`[]`，**绝不抛异常**
- `landingPage` 从源 JSON 的 HTML 字段提取（检测 `<!DOCTYPE`/`<html` 标记）
- `worldBook` 统一用 `parseWorldBookEntries()` 处理
- `_raw` 保留原始 JSON，用于无损回渲

### 第三步：编写渲染器

渲染器从 UIF 生成目标平台的 JSON 格式。提示词拼接使用 **Elegant Join** 模式：

```javascript
function renderXxx(uif) {
  var wb = uif.worldBook || [];
  var meta = uif.meta || {};
  var prompts = uif.prompts || {};
  var assets = uif.assets || {};
  var extras = uif.extras || {};

  // Elegant Join：带标记的无损拼接
  var mainPrompt = [prompts.mainPrompt,
    prompts.worldview ? '[世界观设定: ' + prompts.worldview + ']' : ''
  ].filter(Boolean).join('\n\n');

  var suffixPrompt = [prompts.suffixPrompt,
    prompts.postText ? '[后置规则: ' + prompts.postText + ']' : '',
    prompts.identityStyle ? '[角色风格设定: ' + prompts.identityStyle + ']' : ''
  ].filter(Boolean).join('\n\n');

  return JSON.stringify({
    title: meta.title,
    description: meta.description,
    language: meta.language,
    orientation: meta.orientation,
    tags: meta.tags.map(function(t) { return { name: t }; }),
    cover_url: assets.coverUrl,
    bg_url: assets.bgImageUrl,
    custom_css: extras.customCss,
    pre_prompt: mainPrompt,
    post_text: suffixPrompt,
    world_book: wb.map(function(e, i) {
      return {
        key: e.keywords || [],
        content: e.content || '',
        weight: e.weight || 0,
        enabled: e.enabled !== false,
      };
    }),
    exported_at: meta.exportedAt,
  }, null, 2);
}
```

**关键原则：**
- 提示词拼接统一使用 `[A, B, C].filter(Boolean).join('\n\n')` 模式
- 标记前缀（`[世界观设定:]`、`[角色风格设定:]`）确保拼接后的内容可逆解析
- 世界书渲染时注意平台字段名差异（`keywords` vs `key`）
- 缺失字段用 `||` 提供默认值

### 第四步：注册到输出路由

在 [`renderOutput()`](src/main.js:749) 中添加新格式的渲染调用：

```javascript
function renderOutput() {
  var fmt = getSelectedFormat();
  var uif = currentUIF;
  if (!uif) return;

  var output;
  switch (fmt) {
    case 'markdown': output = renderMarkdown(uif); break;
    case 'chunchao': output = renderChunchao(uif); break;
    case 'fengyue':  output = renderFengyue(uif);  break;
    case 'miss':     output = renderMiss(uif);     break;
    case 'xxx':      output = renderXxx(uif);      break;  // 新增
  }
  // ... 显示输出
}
```

同时在 HTML 模板的格式选择器（[`src/template.html:68`](src/template.html:68)）中添加新选项：

```html
<label><input type="radio" name="format" value="xxx"> XXX 格式</label>
```

### 代码量参考

| 平台 | 解析器行数 | 渲染器行数 | 合计 |
|------|-----------|-----------|------|
| 春潮 | ~45 行 | ~25 行 | ~70 行 |
| 风月 | ~44 行 | ~23 行 | ~67 行 |
| MISS | ~45 行 | ~21 行 | ~66 行 |
| **新增** | **~45 行** | **~25 行** | **~70 行** |

### 测试验证

新增平台后，在 [`test_convert.js`](test_convert.js) 中添加测试样本：

```javascript
const testFiles = [
  { path: '【春潮】全息韩国真实生活模拟器-20260628.json', format: 'chunchao' },
  { path: '[风月]穿成阿龙，但这次鱼人说了算-20260628-104717.json', format: 'fengyue' },
  { path: '【MISS】海拉鲁悲歌交响.json', format: 'miss' },
  { path: '【新平台】示例剧本.json', format: 'xxx' },  // 新增
];
```

运行测试验证：
```bash
node test_convert.js       # 应显示 36/36 通过（原 27 + 新 9）
node audit_mapping.js      # 应显示 ~100 项字段映射通过
node build.js              # 重新构建 index.html
```

---

## ⚠️ 注意事项

- 所有转换在浏览器本地完成，**不上传任何数据到服务器**
- AI 功能需要自行配置 API Key，**Key 仅存储在本地 localStorage**
- 春潮的 `tagIds` 为数字 ID，无映射表时以 `tag:N` 形式保留
- 封面/背景图为外部链接，可能随源站变动而失效
- 部分平台特有字段（如 MISS 的 `characterID`）在转换中会置空，需手动补充
- 风月的 `post_text` 是复合字段，解析时通过 `findSuffixPrompt`/`findPostText` 智能拆分
- 宣发页 HTML 存储在 IndexedDB 中，导出时需手动下载
- 同名同源 JSON 文件重复导入会自动覆盖更新（基于 UID 去重），不会产生重复条目

---

---

**作者：尼可** · **QQ 群：1051068329** · 欢迎进群交流反馈

*最后更新: 2026-06-28 (v4 — UID 去重、流水线集成、六视图 SPA、樱花背景)*
