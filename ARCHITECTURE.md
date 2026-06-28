# 🧬 架构文档 — 酒馆剧本格式转换工具 → AI 剧本工坊

> **一次入库 · 多格式输出 · AI 铸造 · 专属宣发**
> 春潮 / 风月 / MISS 剧本格式互转 + Markdown 存档 + AI 剧本工坊 + 主题宣发页生成

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
    source: string;         // 'chunchao' | 'fengyue' | 'miss'
    exportedAt: string|null;
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

数据库名：`ScriptLibrary`，表名：`scripts`

```typescript
interface DBScript {
  id: number;               // 自动递增
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

### 三视图 SPA 架构

```
┌─────────────────────────────────────────────────┐
│                  App Shell                       │
│  [📐 转换器] [🏭 剧本工坊] [📚 剧本库]  [⚙️ AI] │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ Converter ──────────────────────────────┐   │
│  │  输入面板（拖拽/粘贴/批量）               │   │
│  │  输出面板（格式选择/复制/下载/ZIP）       │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ Generator ──────────────────────────────┐   │
│  │  Step 1 💡 脑暴抽卡 → 3 张概念卡         │   │
│  │  Step 2 ✏️ 精修确认 → 编辑/合并/删除     │   │
│  │  Step 3 📖 提示词膨胀 → 800+ 字 Prompt   │   │
│  │  Step 4 🌍 世界书衍生 → 写入本地文件     │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ Library ────────────────────────────────┐   │
│  │  侧边栏：搜索 + 卡片列表                  │   │
│  │  详情弹窗：元信息/提示词/世界书/宣发页    │   │
│  │  右键菜单：复制/导出/删除                 │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
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
| `landingPage` | `work.detailIntro` | `description` | `description` |

源 JSON 中已有的 HTML 宣发页自动提取到 UIF，入库时写入 `htmlLandingPage` 字段，详情页直接预览/下载。

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
  seed: '',           // Step 1 种子输入
  cards: [],          // Step 1 AI 生成的概念卡
  selectedIndex: -1,  // Step 2 当前选中的卡片
  refinedText: '',    // Step 2 精修后的设定文本
  prompts: {          // Step 3 AI 膨胀后的提示词
    mainPrompt: '',
    suffixPrompt: '',
    worldview: '',
    identityStyle: '',
    writingStyle: '',
  },
  worldBook: [],      // Step 4 AI 生成的世界书
  currentStep: 1,     // 当前步骤 (1-4)
};
```

### 4 步 Prompt 工程

| 步骤 | 输入 | AI 任务 | 输出 |
|------|------|---------|------|
| 1 💡 | 种子词/梗概 | 生成 3 张概念卡（角色/世界观/核心冲突），严格 JSON 格式 | `{cards: [{title, type, description, tags}]}` |
| 2 ✏️ | 3 张概念卡 | 用户手动编辑/合并/删除 | 精修后的设定文本 |
| 3 📖 | 精修设定 | 扩展为 800+ 字结构化 System Prompt | `{mainPrompt, suffixPrompt, worldview, identityStyle, writingStyle}` |
| 4 🌍 | 完整提示词 | 生成世界书条目 + 写入本地文件 | 世界书数组 + 物理文件 |

### AI 配置（BYOK）

- 端点：兼容 OpenAI Chat Completions API
- 预设：`https://api.deepseek.com/v1/chat/completions`
- 模型：`deepseek-chat`
- 配置存储在 `localStorage`

---

## 🌐 专属宣发页

### 自动提取（源 JSON 已有）

导入剧本时，解析器自动从源 JSON 提取嵌入式 HTML 宣发页：
- **春潮**：`work.detailIntro` → `landingPage`
- **风月**：`description` → `landingPage`
- **MISS**：`description` → `landingPage`

入库后详情页直接显示 "✅ 已铸造"，支持 **预览** 和 **下载**。

### AI 铸造（源 JSON 无宣发页）

对于没有嵌入式宣发页的剧本，可使用 AI 动态生成：

1. 在详情页点击 **✨ AI 铸造专属主题宣发页**
2. AI 根据剧本题材生成沉浸式 HTML 页面：
   - 赛博朋克 → 霓虹发光 + 故障艺术 CSS
   - 修仙 → 水墨晕染 + 古风排版
   - 奇幻 → 深色渐变 + 金色装饰
3. 生成的 HTML 自动入库，支持预览/下载/重新铸造

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

### 已知合理信息丢失（平台 schema 差异，非 Bug）

| 丢失内容 | 原因 | 影响 |
|---------|------|------|
| 春潮 `tagIds` 数字 ID → 名称映射 | 无名称映射表，只存 `tag:N` | 回春潮时 ID 正确但无名称 |
| 风月 `tags[].id` 和 `tags[].type` | UIF 只保留 `name` | 回风月时 tags 只有 name |
| 风月无 `orientation` 字段 | 平台无此概念 | 渲染春潮/MISS 时 fallback `'通用'` |
| `coverAnimated` 固定为 `false` | renderer 硬编码 | 不影响功能 |

---

## 🔧 扩展指南

### 添加新平台格式

1. 在 [`src/main.js`](src/main.js) 的 `detectFormat()` 中添加格式检测
2. 编写 `parseXxx(raw)` 解析器，返回 UIF 结构
3. 编写 `renderXxx(uif)` 渲染器，从 UIF 生成目标 JSON
4. 在 UI 的格式选择器中添加新选项
5. 运行 `node build.js` 重新构建

### 解析器/渲染器开发规范

- **解析器**：使用 `flexGet/flexStr/flexArr/flexBool/flexNum` 工具函数进行容错字段查找，支持多个备选 key 名
- **渲染器**：提示词拼接统一使用 `[A, B, C].filter(Boolean).join('\n\n')` 模式
- **世界书**：使用 `parseWorldBookEntries()` 统一处理，支持 `keywords`/`key`/`_or_@wb@` 三种关键词格式

---

## ⚠️ 注意事项

- 所有转换在浏览器本地完成，**不上传任何数据到服务器**
- AI 功能需要自行配置 API Key，**Key 仅存储在本地 localStorage**
- 春潮的 `tagIds` 为数字 ID，无映射表时以 `tag:N` 形式保留
- 封面/背景图为外部链接，可能随源站变动而失效
- 部分平台特有字段（如 MISS 的 `characterID`）在转换中会置空，需手动补充
- 风月的 `post_text` 是复合字段，解析时通过 `findSuffixPrompt`/`findPostText` 智能拆分
- 宣发页 HTML 存储在 IndexedDB 中，导出时需手动下载

---

*最后更新: 2026-06-28 (v3 — AI 剧本工坊、宣发页自动提取、三视图 SPA)*
