# 🧬 架构文档 — 尼可剧本工具 · V2.1.0

> **作者：尼可** · **QQ 群：1051068329**

> **一次入库 · 多格式输出 · AI 铸造 · AI 动态生成沉浸式 HTML 宣发页 · 灵感对话**
> 春潮 / 风月 / MISS 剧本格式互转 + Markdown 存档 + AI 剧本工坊 + AI 根据世界观动态生成主题 HTML 宣发页 + AI 灵感对话助手

---

## 📦 项目文件

| 文件 | 说明 |
|------|------|
| [`index.html`](./index.html) | **构建产物** — 浏览器打开即用，零依赖（由 `build.js` 生成） |
| [`build.js`](./build.js) | **极简构建器** — 合并 `src/` 下 HTML/CSS/JS 为 `index.html` |
| **HTML 骨架（`src/html/`）** | |
| [`src/html/head.html`](./src/html/head.html) | DOCTYPE + head + CSS 注入点 |
| [`src/html/nav.html`](./src/html/nav.html) | 导航栏（7 视图切换 + 主题/AI 按钮） |
| [`src/html/views/view-converter.html`](./src/html/views/view-converter.html) | 转换器视图（输入/输出面板） |
| [`src/html/views/view-generator.html`](./src/html/views/view-generator.html) | 剧本车间视图（4 步向导） |
| [`src/html/views/view-chat.html`](./src/html/views/view-chat.html) | 灵感对话视图（多轮聊天） |
| [`src/html/views/view-library.html`](./src/html/views/view-library.html) | 剧本库视图（侧边栏 + 详情） |
| [`src/html/views/view-char-creator.html`](./src/html/views/view-char-creator.html) | 捏人工坊视图 |
| [`src/html/views/view-world-builder.html`](./src/html/views/view-world-builder.html) | 世界观构建视图 |
| [`src/html/views/view-power-builder.html`](./src/html/views/view-power-builder.html) | 体系工坊视图 |
| [`src/html/dialogs.html`](./src/html/dialogs.html) | AI 配置弹窗 + 主角确认弹窗 + 宣发页源码编辑器弹窗 |
| [`src/html/footer.html`](./src/html/footer.html) | StatusBar + 右键菜单 + JS 注入点 |
| **CSS 样式（`src/css/`）** | |
| [`src/css/vars.css`](./src/css/vars.css) | CSS 变量、主题（暗夜/浅色）、Reset、滚动条 |
| [`src/css/layout.css`](./src/css/layout.css) | 布局样式（Header/Nav/Views/StatusBar/Responsive） |
| [`src/css/components.css`](./src/css/components.css) | 组件样式（Upload/Batch/Buttons/Output/ContextMenu/Library/Workshop/AI Dialog/Char Creator/World/Power/AI Tabs/Chat） |
| **JS 逻辑（`src/js/`）** | |
| [`src/js/config.js`](./src/js/config.js) | UIF 定义、工具函数、格式检测、解析器、渲染器 |
| [`src/js/db.js`](./src/js/db.js) | IndexedDB 操作（openDB/CRUD/搜索/UID 去重） |
| [`src/js/ui.js`](./src/js/ui.js) | UI 逻辑、SPA 视图切换、库渲染、批量转换、事件绑定、右键菜单 |
| [`src/js/api.js`](./src/js/api.js) | AI 反应堆（BYOK 双模式：DeepSeek 原生 + 中转站） |
| [`src/js/features/chat.js`](./src/js/features/chat.js) | 灵感对话（多轮记忆/滑动窗口/localStorage 持久化/TXT 导出） |
| [`src/js/features/main-features.js`](./src/js/features/main-features.js) | 捏人工坊、世界观构建、体系工坊、剧本车间（4 步向导）、樱花 WebGL 背景 |
| **示例剧本** | |
| `【春潮】*.json` | 春潮平台导出的剧本示例 |
| `[风月]*.json` | 风月平台导出的剧本示例 |
| `【MISS】*.json` | MISS 平台导出的剧本示例 |

---

## 🏗️ 开发指南

### 构建流程

```bash
node build.js              # 合并 src/ 下所有文件 → index.html
```

**开发时只修改 `src/` 目录下的文件**，不要直接编辑 `index.html`。每次修改后运行 `node build.js` 重新生成。

### 构建顺序

构建器按以下顺序合并文件：

1. **HTML**（11 个文件）：`head.html` → `nav.html` → `view-converter.html` → `view-generator.html` → `view-chat.html` → `view-library.html` → `view-char-creator.html` → `view-world-builder.html` → `view-power-builder.html` → `dialogs.html` → `footer.html`
2. **CSS**（3 个文件）：`vars.css` → `layout.css` → `components.css`
3. **JS**（6 个文件）：`config.js` → `db.js` → `ui.js` → `api.js` → `features/main-features.js` → `features/chat.js`

HTML 通过 `<!-- CSS_INJECT_POINT -->` 和 `<!-- JS_INJECT_POINT -->` 占位符注入 CSS 和 JS。

### 架构动机

> 为什么从单 HTML 文件拆分为 `src/` + `build.js`？

之前的单文件架构（~2265 行）在与 AI 工具协作时暴露了两个系统性缺陷：

1. **`apply_diff` 行号漂移**：CSS 修改导致后续所有 JS 行号偏移，diff 频繁失败
2. **HTML 实体双重转义**：LLM 工具调用的 JSON/XML 序列化管道会错误转义 JS 字符串中的 `&`、`<`、`>`、`"`、`'` 字符

拆分后，AI 工具只需操作 `src/js/*.js`（纯 JS 文件），彻底规避了 HTML 上下文中的编码污染问题。

### 文件分割映射

JS 逻辑按功能模块分割，依赖链决定了构建顺序：

| 分割文件 | 功能 | 依赖 |
|---------|------|------|
| [`src/js/config.js`](./src/js/config.js) | UIF 定义、工具函数、格式检测、解析器、渲染器 | 无（基础层） |
| [`src/js/db.js`](./src/js/db.js) | IndexedDB 操作 | `config.js` |
| [`src/js/ui.js`](./src/js/ui.js) | UI 逻辑、SPA 视图切换、库渲染、批量转换、事件绑定、右键菜单 | `config.js`, `db.js` |
| [`src/js/api.js`](./src/js/api.js) | AI 反应堆（BYOK 双模式） | `ui.js`（DOM 引用） |
| [`src/js/features/main-features.js`](./src/js/features/main-features.js) | 捏人工坊、世界观构建、体系工坊、剧本车间、樱花 WebGL 背景 | 全部以上 |
| [`src/js/features/chat.js`](./src/js/features/chat.js) | 灵感对话（多轮记忆/滑动窗口/持久化/导出） | `api.js`（`callAI`） |

CSS 按职责分割：

| 分割文件 | 内容 |
|---------|------|
| [`src/css/vars.css`](./src/css/vars.css) | CSS 变量、主题、Reset、滚动条 |
| [`src/css/layout.css`](./src/css/layout.css) | 布局（Header/Nav/Views/StatusBar/Responsive） |
| [`src/css/components.css`](./src/css/components.css) | 所有组件样式 |

HTML 按视图分割为 11 个部分，每个文件对应一个独立视图或公共组件。

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

**UID 去重机制：** 外部导入 JSON 时，[`dbAdd()`](src/js/db.js:61) 先通过 `uid` 唯一索引查找是否已存在。存在则 `store.put()` 覆盖更新（保留原 `id` 和 `createdAt`），不存在则 `store.add()` 新增。同名同源文件重复导入不会产生冗余条目。

> **注意：** `dbAdd()` 中所有异步查询（`await dbFindByUid`）必须在 `db.transaction()` 之前完成，否则浏览器会因微任务队列 drain 而关闭事务，抛出 `TransactionInactiveError`。详见"已修复 Bug"章节。

### 七视图 SPA 架构

```
┌──────────────────────────────────────────────────────────┐
│                      App Shell                           │
│  [📐 转换器] [🏭 工坊] [💬 对话] [🧑 捏人] [🌍 世界观] [⚡ 体系] [📚 库]  [🤖 AI] │
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
│  ┌─ Chat ────────────────────────────────────────────┐   │
│  │  多轮灵感对话，自动记忆最近 20 轮                  │   │
│  │  localStorage 无感存档，刷新不丢失                 │   │
│  │  一键 TXT 导出 / 清空对话                          │   │
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

## 💬 灵感对话

### 架构设计

灵感对话是一个独立的 SPA 视图，与剧本转换/工坊完全解耦。它复用 [`callAI()`](src/js/api.js:82) 函数，通过参数重载实现多轮记忆：

```javascript
// 单轮调用（向后兼容）
callAI(systemPrompt, userMessage, expectJson)

// 多轮调用（灵感对话）
callAI(systemPrompt, chatHistory, expectJson)
// chatHistory: Array<{role: 'user'|'assistant', content: string}>
```

当 `userMessage` 是字符串时，`callAI` 按单轮模式处理（所有现有功能不变）。当 `userMessage` 是数组时，直接作为 `messages` 数组发送，实现多轮记忆。

### 数据流

```
用户输入
    │
    ▼
handleSend()
  ├─ 追加用户消息到 chatMemory[]
  ├─ 构建 contextToSend = chatMemory.slice(-20)  // 滑动窗口
  ├─ await callAI(systemPrompt, contextToSend, false)
  ├─ 追加 AI 回复到 chatMemory[]
  ├─ saveChat() → localStorage.setItem('aiChatMemory', JSON.stringify(...))
  └─ 渲染到 #chat-history-box

页面加载
    │
    ▼
initChat()
  └─ 从 localStorage.getItem('aiChatMemory') 恢复
      ├─ 有历史 → 渲染历史消息
      └─ 无历史 → 显示默认欢迎语
```

### 关键设计

| 特性 | 实现 | 位置 |
|------|------|------|
| 多轮记忆 | `chatMemory[]` 数组，IIFE 隔离作用域 | [`chat.js:4`](src/js/features/chat.js:4) |
| 滑动窗口 | `chatMemory.slice(-20)`，只发最近 20 条 | [`chat.js:96`](src/js/features/chat.js:96) |
| 无感存档 | 每次对话后 `localStorage.setItem('aiChatMemory', ...)` | [`chat.js:37`](src/js/features/chat.js:37) |
| TXT 导出 | Blob + URL.createObjectURL + `<a>.download` | [`chat.js:149`](src/js/features/chat.js:149) |
| 加载状态 | 动态创建 loading 占位 div，AI 回复后替换 | [`chat.js:85`](src/js/features/chat.js:85) |
| 作用域隔离 | 整个文件包裹在 `(() => { ... })()` IIFE 中 | [`chat.js:1`](src/js/features/chat.js:1) |

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
4. 支持 **预览**（Blob URL 新标签页）/ **下载**（独立 HTML 文件）/ **查看/编辑源码** / **重新铸造**

### 宣发页源码编辑器

已铸造宣发页可在详情页点击「📄 查看源码」打开源码编辑弹窗，支持查看、编辑、复制和保存 HTML 源码。

**架构设计：**

| 组件 | 位置 | 说明 |
|------|------|------|
| 弹窗 HTML | [`src/html/dialogs.html:104`](src/html/dialogs.html:104) | `<dialog id="source-editor-dialog">`，680px 宽，含 textarea + 操作按钮 |
| 按钮注入 | [`src/js/ui.js:248`](src/js/ui.js:248) | `showDetailInPanel()` 中宣发页按钮组新增 `btnViewSource` |
| 事件绑定 | [`src/js/ui.js:3326`](src/js/ui.js:3326) | 点击调用 `openSourceEditor(entry.htmlLandingPage, id)` |
| 核心函数 | [`src/js/ui.js:4061`](src/js/ui.js:4061) | `openSourceEditor()` — 打开弹窗、填充内容 |
| 事件注册 | [`src/js/ui.js:4073`](src/js/ui.js:4073) | `DOMContentLoaded` 中绑定复制/格式化/保存/关闭事件 |
| CSS 样式 | [`src/css/components.css:1294`](src/css/components.css:1294) | textarea 聚焦高亮、选中紫色背景 |

**功能矩阵：**

| 功能 | 实现 | 细节 |
|------|------|------|
| 📋 一键复制 | `navigator.clipboard.writeText()` + fallback `execCommand('copy')` | 成功反馈 ✅ 动画，1.5s 后恢复 |
| 🔧 格式化 | 标签换行 + 缩进清理 + 去多余空行 | 简单缩进格式化，非 prettier 级别 |
| 💾 保存修改 | `dbUpdate(id, { htmlLandingPage })` + 同步更新 `uif.landingPage` | 双字段同步，保存后自动刷新详情面板 |
| ✕ 关闭 | `dialog.close()` + 点击外部关闭 | 不保存直接关闭 |

**数据流：**
```
详情页点击「📄 查看源码」
    │
    ▼
openSourceEditor(htmlContent, scriptId)
  ├─ textarea.value = htmlContent
  ├─ _sourceEditorScriptId = scriptId
  └─ dialog.showModal()
    │
    ▼
用户编辑 → 💾 保存
    ├─ dbUpdate(id, { htmlLandingPage: newHtml })
    ├─ dbGet(id) → 更新 uif.landingPage → dbUpdate(id, { uif })
    ├─ showDetailInPanel(id) 刷新
    └─ dialog.close()
```

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
src/js/features/main-features.js  →  initSakuraBg() 函数（~230 行 WebGL 逻辑）
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
  ├─ [1] 组装 entry 数据
  ├─ [2] await dbFindByUid(uid)  ← 此时无活跃事务，安全
  │   ├─ 已存在 → entry.id = existing.id（后续 store.put）
  │   └─ 不存在 → 保持 entry 无 id（后续 store.add）
  ├─ [3] await openDB()
  ├─ [4] db.transaction()  ← 此时所有 await 已完成
  ├─ [5] store.put/add()   ← 立即执行，无 await 打断
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

> **关键约束：** `dbAdd()` 中所有 `await` 操作（尤其是 `dbFindByUid`）必须在 `db.transaction()` 之前完成。事务打开后必须同步执行所有读写操作，任何 `await` 都会导致浏览器关闭事务（`TransactionInactiveError`）。

---

## 🧪 测试结果

### 转换测试

**27/27 全部通过** ✅ — 3 样本 × (格式检测 + 解析 + 4 渲染 + 3 往返一致性)

| 剧本 | 来源 | 世界书 | 提示词 | 格式检测 | 解析 | 4 渲染 | 3 往返 |
|------|------|--------|--------|---------|------|--------|--------|
| 全息韩国真实生活模拟器 | 春潮 | 75 条 | 5408 字符 | ✅ | ✅ | ✅✅✅✅ | ✅✅✅ |
| 穿成阿龙，但这次鱼人说了算 | 风月 | 4 条 | 6974 字符 | ✅ | ✅ | ✅✅✅✅ | ✅✅✅ |
| 海拉鲁悲歌交响 | MISS | 6 条 | 4987 字符 | ✅ | ✅ | ✅✅✅✅ | ✅✅✅ |

### 已修复 Bug

| Bug | 修复位置 | 说明 |
|-----|---------|------|
| `escapeHtml` 实体替换值错误 | 旧 `src/main.js:794` | `&` → `&` 等替换使用了错误值；改用 `String.fromCharCode()` 构建实体字符串，彻底避免 `&` 字符被工具链污染 |
| 右键菜单未绑定事件 | 旧 `src/main.js:~1310` | DOM 和 CSS 已定义但 JS 未绑定 `contextmenu` 事件；新增完整的事件委托实现 |
| `renderChunchao` 中 `postText` 丢失 | 旧 `src/main.js:515` | 风月的 `post_text` 内容在转换为春潮格式时被丢弃 |
| `dbGetAll()` 全量加载性能问题 | 旧 `src/main.js:629` | 原使用 `getAll()` 返回完整 UIF 对象（含大字段），改为游标查询只返回轻量字段 |
| 未使用变量 `zonene` | 旧 `src/main.js:1097` | 声明了 `const zonene = $('uploadZone')` 但从未使用 |
| 重复章节标题 | 旧 `src/main.js:769` | 连续两行 |
| `TransactionInactiveError`（IndexedDB 事务超时） | [`src/js/db.js:61`](src/js/db.js:61) | `dbAdd()` 中 `await dbFindByUid(uid)` 在 `db.transaction()` 之后调用，浏览器因微任务队列 drain 关闭事务。修复：将所有 `await` 移到 `db.transaction()` 之前 |
| 解析器未提取 `landingPage` HTML | [`src/js/config.js:286`](src/js/config.js:286) | 春潮/MISS 解析器未检测 `detailIntro`/`description` 中的 `<!DOCTYPE`/`<html` 标记，导致 HTML 宣发页未被提取到 `landingPage` 字段 |
| `dbAdd` 未存储 `landingPage` | [`src/js/db.js:61`](src/js/db.js:61) | `dbAdd()` 中 `htmlLandingPage` 字段取值逻辑不完整，未覆盖 `uif.htmlLandingPage` 路径 |
| AI 铸造宣发页未同步 UIF | [`src/js/ui.js:511`](src/js/ui.js:511) | `generateLandingPage()` 更新了 `htmlLandingPage` 但未同步更新 `uif.landingPage`，导致重新铸造时丢失旧版本 |
| `parseMiss` 未检测 HTML | [`src/js/config.js:384`](src/js/config.js:384) | MISS 解析器未对 `description` 做 HTML 检测，直接作为纯文本处理 |
| 重复 JSON 导入去重 | [`src/js/db.js:61`](src/js/db.js:61) | 导入同名同源 JSON 文件时，基于 `uid` 唯一索引实现 upsert 语义，避免数据冗余 |

### 已知合理信息丢失

以下字段在跨平台转换中无法保留，属于平台差异导致的合理丢失：

| 丢失信息 | 来源格式 | 原因 |
|---------|---------|------|
| `scanRegions` | 春潮 | 风月/MISS 无此概念，转换后丢失 |
| `tagIds`（数字 ID） | 春潮 | 风月/MISS 使用标签名字符串，无法映射回数字 ID |
| `bgm` | 风月 | 春潮/MISS 无此字段 |
| `gameState` 相关 | 春潮 | 风月/MISS 无此概念 |
| `nextOptions` 相关 | 春潮 | 风月/MISS 无此概念 |
| `customBreaker` | 春潮 | 风月/MISS 无此概念 |
| `bannedWords` | 春潮 | 风月/MISS 无此概念 |
| `suggestedQuestions` | 春潮 | 风月/MISS 无此概念 |

---

## 🧩 扩展指南

### 新增平台格式

1. 在 [`src/js/config.js`](src/js/config.js) 中新增：
   - `detectFormat()` 中增加格式检测逻辑
   - `parseXxx()` 解析函数（源格式 → UIF）
   - `renderXxx()` 渲染函数（UIF → 目标格式）
2. 在 [`src/js/ui.js`](src/js/ui.js) 的 `getSelectedFormat()` 中增加选项
3. 在 [`src/html/views/view-converter.html`](src/html/views/view-converter.html) 的 `formatSelector` 中增加按钮

### 新增 SPA 视图

1. 在 `src/html/views/` 下创建 `view-xxx.html`
2. 在 [`src/html/nav.html`](src/html/nav.html) 中增加导航按钮（`id="nav-xxx"`）
3. 在 [`src/js/ui.js`](src/js/ui.js) 中绑定点击事件：`$('nav-xxx').addEventListener('click', () => switchView('xxx'))`
4. 在 [`src/css/components.css`](src/css/components.css) 中添加 `#view-xxx.active { display:flex !important }`
5. 在 [`build.js`](build.js) 的 `htmlFiles` 数组中按顺序添加文件路径

### 新增 AI 功能

灵感对话展示了如何复用 [`callAI()`](src/js/api.js:82) 实现多轮对话。核心模式：

```javascript
// 1. 构建消息数组
var messages = [{ role: 'user', content: '你好' }];
// 2. 调用（userMessage 传数组触发多轮模式）
var reply = await callAI(systemPrompt, messages, false);
// 3. 追加回复
messages.push({ role: 'assistant', content: reply });
```

---

## ⚠️ 注意事项

### 开发约束

1. **IndexedDB 事务生命周期**：`db.transaction()` 后必须同步执行所有读写操作，任何 `await` 都会导致 `TransactionInactiveError`。所有异步查询必须在 `db.transaction()` 之前完成。
2. **HTML 实体编码**：JS 字符串中的 `&`、`<`、`>`、`"`、`'` 字符在 HTML 上下文中会被 LLM 工具链错误转义。JS 逻辑应放在 `.js` 文件中，而非 HTML `<script>` 标签内。
3. **构建顺序**：JS 文件按依赖链排序（`config.js` → `db.js` → `ui.js` → `api.js` → `main-features.js` → `chat.js`），不可随意调换。
4. **CSS 视图切换**：所有视图默认 `display: none !important`，激活态必须显式声明 `#view-xxx.active { display:flex !important }`。新增视图时容易遗漏此规则。

### 已知限制

- 封面/背景图为外部链接，可能随源站变动而失效
- AI 功能需要自行配置 API Key，Key 仅存储在本地 `localStorage`
- 灵感对话记录存储在 `localStorage`，清除浏览器数据会丢失
- 宣发页 HTML 存储在 IndexedDB 中，导出时需手动下载
- 风月格式的 `post_text` 是复合字段，往返转换后内容顺序可能变化，但信息完整保留

### 安全

- 所有数据在浏览器本地处理，不上传任何内容到服务器
- AI API Key 仅存储在 `localStorage`，不经过任何第三方服务
- 宣发页预览使用 `Blob URL`，不写入文件系统
- 批量下载使用 `JSZip` 在内存中打包，不产生临时文件

---

## 📄 许可证

本项目仅供学习交流使用。剧本内容版权归原作者所有。

---

**作者：尼可** · **QQ 群：1051068329** · 欢迎进群交流反馈

*最后更新: 2026-06-28 · V2.1.0*
