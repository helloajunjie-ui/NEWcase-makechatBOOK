
// ═══════════════════════════════════════
//  1. 通用中间格式 (UIF) 定义
// ═══════════════════════════════════════
//
// UIF 是所有平台格式的"唯一真相源"。
// 解析器将各平台 JSON 映射到此结构，
// 渲染器从此结构生成目标平台 JSON/Markdown。
//
// UIF 结构：
// {
//   meta: {
//     title:        string,       // 剧本名称
//     summary:      string,       // 简短摘要
//     description:  string,       // HTML 详情页（完整）
//     language:     string,       // 语言代码，如 "zh-Hans"
//     orientation:  string,       // 取向：男性向/女性向/通用
//     tags:         string[],     // 标签列表
//     source:       string|null,  // 来源平台标识
//     exportedAt:   string|null,  // 导出时间 ISO 8601
//   },
//   assets: {
//     coverUrl:     string|null,  // 封面图 URL
//     coverTinyUrl: string|null,  // 缩略封面 URL
//     bgImageUrl:   string|null,  // 背景图 URL
//     bgMobileUrl:  string|null,  // 移动端背景 URL
//     coverAnimated:boolean,      // 封面是否为动图
//   },
//   prompts: {
//     mainPrompt:   string,       // 核心系统提示词
//     suffixPrompt: string,       // 后缀提示词
//     postText:     string,       // 后置文本（风月用）
//     identityStyle:string,       // AI 身份/风格提示（MISS 用）
//     worldview:    string,       // 世界观提示（MISS 用）
//     writingStyle: string,       // 写作风格提示（MISS 用）
//   },
//   worldBook: [                   // 世界书条目
//     {
//       id:           string,     // 唯一标识
//       group:        string,     // 分组名
//       keywords:     string[],   // 触发关键词
//       content:      string,     // 词条内容
//       enabled:      boolean,    // 是否启用
//       probability:  number,     // 触发概率 0-100
//       matchMode:    string,     // 匹配模式: any/all
//       scanDepth:    number,     // 扫描深度
//       sortOrder:    number,     // 排序
//     }
//   ],
//   extras: {
//     customCss:      string,     // 自定义 CSS
//     quickCommands:  string[],   // 快捷指令
//     gameStateEnabled:boolean,   // 游戏状态面板
//     gameStateDesc:  string,
//     gameStateExample:string,
//     nextOptionsEnabled:boolean, // 下回合选项
//     nextPlotPrompt: string,
//     breakerText:    string,     // 分隔符文本
//     useCustomBreaker:boolean,
//     bannedWords:    string[],   // 屏蔽词
//     suggestedQuestions:string[],
//   }
// }

// ═══════════════════════════════════════
//  2. 工具函数
// ═══════════════════════════════════════

function flexGet(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (k in obj && obj[k] !== null && obj[k] !== undefined) return obj[k];
  }
  return undefined;
}

function flexStr(obj, ...keys) {
  const v = flexGet(obj, ...keys);
  return v !== undefined ? String(v) : '';
}

function flexArr(obj, ...keys) {
  const v = flexGet(obj, ...keys);
  return Array.isArray(v) ? v : [];
}

function flexBool(obj, ...keys) {
  const v = flexGet(obj, ...keys);
  return v === true || v === 'true';
}

function flexNum(obj, fallback, ...keys) {
  const v = flexGet(obj, ...keys);
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function findWorldBook(obj) {
  if (!obj || typeof obj !== 'object') return [];
  for (const key of ['worldBookEntries', 'world_book', 'worldBook', 'entries', 'worldBookEntry']) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
  }
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k]) && obj[k] !== null) {
      for (const key of ['worldBookEntries', 'world_book', 'worldBook', 'entries']) {
        if (Array.isArray(obj[k][key]) && obj[k][key].length > 0) return obj[k][key];
      }
    }
  }
  return [];
}

function findMainPrompt(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of ['mainPrompt', 'pre_prompt', 'systemPrompt', 'main_prompt', 'prompt']) {
    const v = flexStr(obj, key);
    if (v) return v;
  }
  if (obj.promptData && typeof obj.promptData === 'object') {
    const v = flexStr(obj.promptData, 'systemPrompt', 'mainPrompt', 'prompt');
    if (v) return v;
  }
  if (obj.work && typeof obj.work === 'object') {
    const v = flexStr(obj.work, 'mainPrompt', 'main_prompt');
    if (v) return v;
  }
  return '';
}

function findSuffixPrompt(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of ['suffixPrompt', 'postPrompt', 'post_prompt', 'postPromptText']) {
    const v = flexStr(obj, key);
    if (v) return v;
  }
  if (obj.promptData && typeof obj.promptData === 'object') {
    const v = flexStr(obj.promptData, 'postPrompt', 'suffixPrompt');
    if (v) return v;
  }
  if (obj.work && typeof obj.work === 'object') {
    return flexStr(obj.work, 'suffixPrompt');
  }
  return '';
}

function findPostText(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return flexStr(obj, 'post_text', 'postText', 'posttext');
}

function findCustomCss(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of ['customCss', 'customCSS', 'builtInCss', 'built_in_css', 'custom_css', 'css']) {
    const v = flexStr(obj, key);
    if (v) return v;
  }
  if (obj.work && typeof obj.work === 'object') {
    return flexStr(obj.work, 'customCss', 'custom_css');
  }
  return '';
}

function findCoverUrl(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of ['coverUrl', 'cover', 'cover_url', 'coverImage', 'cover_image']) {
    const v = flexGet(obj, key);
    if (v && typeof v === 'string' && v.startsWith('http')) return v;
  }
  if (obj.work && typeof obj.work === 'object') {
    const v = flexGet(obj.work, 'coverUrl', 'cover', 'cover_url');
    if (v && typeof v === 'string' && v.startsWith('http')) return v;
  }
  return null;
}

function findBgUrl(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of ['bgImageUrl', 'bg_image', 'bgImage', 'backgroundImage', 'bg_url']) {
    const v = flexGet(obj, key);
    if (v && typeof v === 'string' && v.startsWith('http')) return v;
  }
  if (obj.work && typeof obj.work === 'object') {
    const v = flexGet(obj.work, 'bgImageUrl', 'bg_image', 'bgImage');
    if (v && typeof v === 'string' && v.startsWith('http')) return v;
  }
  return null;
}

function findTags(obj) {
  if (!obj || typeof obj !== 'object') return [];
  for (const key of ['tags', 'tagIds', 'tag_ids', 'categories', 'categoryIds']) {
    const v = flexGet(obj, key);
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (typeof v[0] === 'string') return v;
      if (typeof v[0] === 'object' && v[0] !== null) {
        return v.map(t => t.name || t.label || t.id || String(t)).filter(Boolean);
      }
      if (typeof v[0] === 'number') {
        return v.map(id => 'tag:' + id);
      }
      return v.map(String);
    }
  }
  if (obj.work && typeof obj.work === 'object') {
    for (const key of ['tags', 'tagIds', 'categoryIds']) {
      const v = flexGet(obj.work, key);
      if (Array.isArray(v) && v.length > 0) {
        if (typeof v[0] === 'number') return v.map(id => 'tag:' + id);
        return v.map(String);
      }
    }
  }
  return [];
}

function findOrientation(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of ['orientation', 'genderOrientation', 'gender_orientation']) {
    const v = flexStr(obj, key);
    if (v) return v;
  }
  if (obj.extensions && typeof obj.extensions === 'object') {
    return flexStr(obj.extensions, 'orientation');
  }
  if (obj.work && typeof obj.work === 'object') {
    return flexStr(obj.work, 'orientation');
  }
  return '';
}

function findExportedAt(obj) {
  if (!obj || typeof obj !== 'object') return null;
  return flexGet(obj, 'exportedAt', 'exported_at', 'exportTime', 'export_time', 'createdAt', 'createTime');
}

function findLanguage(obj) {
  if (!obj || typeof obj !== 'object') return 'zh-Hans';
  return flexStr(obj, 'language', 'lang', 'locale');
}

function findQuickCommands(obj) {
  if (!obj || typeof obj !== 'object') return [];
  for (const key of ['quickCommands', 'shortcut_commands', 'shortcutCommands', 'commands']) {
    const v = flexGet(obj, key);
    if (Array.isArray(v)) return v;
  }
  if (obj.work && typeof obj.work === 'object') {
    return flexArr(obj.work, 'quickCommands');
  }
  return [];
}

function findBannedWords(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return flexArr(obj, 'banned_words', 'bannedWords', 'blockedWords', 'blocked_words', 'blacklist');
}

function findSuggestedQuestions(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return flexArr(obj, 'suggested_questions', 'suggestedQuestions', 'starterQuestions', 'questions');
}

// ═══════════════════════════════════════
//  3. 格式检测
// ═══════════════════════════════════════

function detectFormat(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.work && typeof raw.work === 'object' && raw.work.title) return 'chunchao';
  if (raw.format === 'missai') return 'miss';
  if (raw.promptData && typeof raw.promptData === 'object' && raw.promptData.systemPrompt) return 'miss';
  if (raw.name && (raw.pre_prompt || raw.world_book)) return 'fengyue';
  if (raw.name && raw.description && raw.tags) return 'fengyue';
  return null;
}

// ═══════════════════════════════════════
//  4. 解析器
// ═══════════════════════════════════════

function parseChunchao(raw) {
  const w = raw.work || raw;
  return {
    meta: {
      title: flexStr(w, 'title', 'name'),
      summary: (flexStr(w, 'intro', 'summary', 'description') || '').split('\n')[0].trim(),
      description: flexStr(w, 'detailIntro', 'description', 'intro'),
      language: findLanguage(w) || 'zh-Hans',
      orientation: findOrientation(w),
      tags: findTags(w),
      source: raw.source || 'chunchao',
      exportedAt: findExportedAt(raw),
    },
    assets: {
      coverUrl: findCoverUrl(w),
      coverTinyUrl: flexGet(w, 'coverTinyUrl', 'cover_tiny', 'coverThumb') || null,
      bgImageUrl: findBgUrl(w),
      bgMobileUrl: flexGet(w, 'bgMobileUrl', 'bg_mobile', 'bgMobile') || null,
      coverAnimated: flexBool(w, 'coverAnimated', 'animated'),
    },
    prompts: {
      mainPrompt: findMainPrompt(w),
      suffixPrompt: findSuffixPrompt(w),
      postText: '',
      identityStyle: '',
      worldview: flexStr(w, 'worldviewDefinition', 'worldViewDefinition', 'worldview', 'world_view'),
      writingStyle: '',
    },
    worldBook: parseWorldBookEntries(findWorldBook(w), 'chunchao'),
    landingPage: flexStr(w, 'detailIntro', 'description', 'intro') || '',
    extras: {
      customCss: findCustomCss(w),
      quickCommands: findQuickCommands(w),
      gameStateEnabled: flexBool(w, 'gameStateEnabled', 'game_state_enabled'),
      gameStateDesc: flexStr(w, 'gameStateDesc', 'game_state_desc'),
      gameStateExample: flexStr(w, 'gameStateExample', 'game_state_example'),
      nextOptionsEnabled: flexBool(w, 'nextOptionsEnabled', 'next_options_enabled'),
      nextPlotPrompt: flexStr(w, 'nextPlotPrompt', 'next_plot_prompt'),
      breakerText: flexStr(w, 'breakerText', 'breaker_text'),
      useCustomBreaker: flexBool(w, 'useCustomBreaker', 'use_custom_breaker'),
      bannedWords: [],
      suggestedQuestions: [],
    },
  };
}

function parseFengyue(raw) {
  return {
    meta: {
      title: flexStr(raw, 'name', 'title'),
      summary: flexStr(raw, 'summary', 'intro', 'description').split('\n')[0].trim(),
      description: flexStr(raw, 'description', 'detailIntro'),
      language: findLanguage(raw) || 'zh-Hans',
      orientation: findOrientation(raw),
      tags: findTags(raw),
      source: 'fengyue',
      exportedAt: findExportedAt(raw),
    },
    assets: {
      coverUrl: findCoverUrl(raw),
      coverTinyUrl: flexGet(raw, 'cover_tiny', 'coverTiny', 'coverThumb') || null,
      bgImageUrl: findBgUrl(raw),
      bgMobileUrl: flexGet(raw, 'bg_mobile', 'bgMobile', 'bgMobileUrl') || null,
      coverAnimated: false,
    },
    prompts: {
      mainPrompt: findMainPrompt(raw),
      suffixPrompt: findSuffixPrompt(raw),
      postText: findPostText(raw),
      identityStyle: '',
      worldview: '',
      writingStyle: '',
    },
    worldBook: parseWorldBookEntries(findWorldBook(raw), 'fengyue'),
    landingPage: flexStr(raw, 'description', 'detailIntro') || '',
    extras: {
      customCss: findCustomCss(raw),
      quickCommands: findQuickCommands(raw),
      gameStateEnabled: false,
      gameStateDesc: '',
      gameStateExample: '',
      nextOptionsEnabled: false,
      nextPlotPrompt: '',
      breakerText: '',
      useCustomBreaker: false,
      bannedWords: findBannedWords(raw),
      suggestedQuestions: findSuggestedQuestions(raw),
    },
  };
}

function parseMiss(raw) {
  const pd = raw.promptData || {};
  return {
    meta: {
      title: flexStr(raw, 'name', 'title'),
      summary: flexStr(raw, 'summary', 'intro').split('\n')[0].trim(),
      description: flexStr(raw, 'description', 'detailIntro'),
      language: findLanguage(raw) || 'zh-Hans',
      orientation: findOrientation(raw),
      tags: findTags(raw),
      source: 'miss',
      exportedAt: findExportedAt(raw),
    },
    assets: {
      coverUrl: findCoverUrl(raw),
      coverTinyUrl: null,
      bgImageUrl: findBgUrl(raw),
      bgMobileUrl: null,
      coverAnimated: false,
    },
    prompts: {
      mainPrompt: flexStr(pd, 'systemPrompt', 'mainPrompt', 'prompt'),
      suffixPrompt: flexStr(pd, 'postPrompt', 'suffixPrompt'),
      postText: '',
      identityStyle: flexStr(pd, 'aiIdentityStylePrompt', 'identityStyle', 'stylePrompt'),
      worldview: flexStr(pd, 'worldViewPrompt', 'worldview', 'worldView'),
      writingStyle: flexStr(pd, 'writingStylePrompt', 'writingStyle'),
    },
    worldBook: parseWorldBookEntries(findWorldBook(raw), 'miss'),
    landingPage: flexStr(raw, 'description', 'detailIntro') || '',
    extras: {
      customCss: findCustomCss(raw),
      quickCommands: [],
      gameStateEnabled: false,
      gameStateDesc: '',
      gameStateExample: '',
      nextOptionsEnabled: false,
      nextPlotPrompt: '',
      breakerText: '',
      useCustomBreaker: false,
      bannedWords: findBannedWords(raw),
      suggestedQuestions: [],
    },
  };
}

// ═══════════════════════════════════════
//  5. 世界书条目解析（平台无关）
// ═══════════════════════════════════════

function parseWorldBookEntries(entries, sourceFormat) {
  if (!Array.isArray(entries)) return [];
  return entries.map((e, i) => {
    let keywords = [];
    const rawKey = flexGet(e, 'keywords', 'key', 'keyword', 'keys', 'trigger', 'triggers');
    if (Array.isArray(rawKey)) {
      keywords = rawKey.filter(k => k && typeof k === 'string');
    } else if (typeof rawKey === 'string') {
      keywords = rawKey.split(/@wb@/).map(s => s.replace(/^_or_/, '').replace(/^_and_/, '')).filter(Boolean);
    }
    const group = flexStr(e, 'groupName', 'group', 'group_name', 'category');
    const content = flexStr(e, 'content', 'value', 'text', 'description', 'desc');
    let matchMode = 'any';
    const rawMode = flexGet(e, 'matchMode', 'match_mode', 'matchType', 'match_type');
    if (rawMode === 'all' || rawMode === 1 || rawMode === true || rawMode === '1') matchMode = 'all';
    if (e.and === true) matchMode = 'all';
    return {
      id: 'wb_' + i,
      group: group || '默认',
      keywords: keywords,
      content: content,
      enabled: e.enabled !== false && e.enable !== false,
      probability: flexNum(e, 100, 'probability', 'prob', 'chance'),
      matchMode: matchMode,
      scanDepth: flexNum(e, 8, 'scanDepth', 'scan_depth', 'depth', 'key_region', 'scanRegions'),
      sortOrder: flexNum(e, i, 'sortOrder', 'sort_order', 'sort', 'order', 'ord'),
    };
  });
}

// ═══════════════════════════════════════
//  6. 主解析入口
// ═══════════════════════════════════════

function parseJSON(raw) {
  const fmt = detectFormat(raw);
  if (!fmt) throw new Error('无法识别的剧本格式，请确认 JSON 结构是否正确');
  let uif;
  switch (fmt) {
    case 'chunchao': uif = parseChunchao(raw); break;
    case 'fengyue':  uif = parseFengyue(raw);  break;
    case 'miss':     uif = parseMiss(raw);     break;
    default: throw new Error('不支持的格式: ' + fmt);
  }
  uif._sourceFormat = fmt;
  uif._raw = raw;
  return uif;
}

// ═══════════════════════════════════════
//  7. 渲染器
// ═══════════════════════════════════════

function renderMarkdown(uif) {
  const { meta, assets, prompts, worldBook, extras } = uif;
  let md = '# ' + meta.title + '\n\n';
  if (meta.summary) md += '> ' + meta.summary + '\n\n';
  if (meta.source) md += '- **来源**: ' + meta.source + '\n';
  if (meta.orientation) md += '- **取向**: ' + meta.orientation + '\n';
  if (meta.exportedAt) md += '- **导出时间**: ' + meta.exportedAt + '\n';
  if (meta.tags && meta.tags.length) md += '- **标签**: ' + meta.tags.join('、') + '\n';
  md += '\n';
  if (assets.coverUrl) md += '![封面](' + assets.coverUrl + ')\n\n';
  if (prompts.mainPrompt) {
    md += '## 核心提示词\n\n```\n' + prompts.mainPrompt + '\n```\n\n';
  }
  if (worldBook && worldBook.length) {
    md += '## 世界书 (' + worldBook.length + ' 条)\n\n';
    worldBook.forEach((e, i) => {
      md += '### ' + (i + 1) + '. ' + (e.keywords.join('、') || '(无关键词)') + '\n';
      md += '- **分组**: ' + e.group + ' | **概率**: ' + e.probability + '% | **匹配**: ' + e.matchMode + '\n';
      md += '```\n' + e.content + '\n```\n\n';
    });
  }
  if (prompts.suffixPrompt || prompts.postText) {
    md += '## 后缀提示词\n\n```\n' + (prompts.suffixPrompt || prompts.postText) + '\n```\n\n';
  }
  if (extras.customCss) {
    md += '## 自定义样式\n\n```css\n' + extras.customCss + '\n```\n\n';
  }
  return md;
}

function renderChunchao(uif) {
  const { meta, assets, prompts, worldBook, extras } = uif;
  return JSON.stringify({
    schemaVersion: 1, source: 'chunchao', exportedAt: new Date().toISOString(),
    work: {
      title: meta.title, intro: meta.summary, detailIntro: meta.description,
      orientation: meta.orientation || '通用', categoryIds: [], tagIds: [],
      defaultModelId: null, coverUrl: assets.coverUrl, coverTinyUrl: assets.coverTinyUrl,
      coverAnimated: assets.coverAnimated, bgImageUrl: assets.bgImageUrl, bgMobileUrl: assets.bgMobileUrl,
      useCustomBreaker: extras.useCustomBreaker, breakerText: extras.breakerText,
      worldviewDefinition: prompts.worldview, mainPrompt: prompts.mainPrompt,
      suffixPrompt: [prompts.suffixPrompt, prompts.postText ? '[后置规则: ' + prompts.postText + ']' : '', prompts.identityStyle ? '[角色风格设定: ' + prompts.identityStyle + ']' : ''].filter(Boolean).join('\n\n'),
      gameStateEnabled: extras.gameStateEnabled, gameStateDesc: extras.gameStateDesc,
      gameStateExample: extras.gameStateExample, nextOptionsEnabled: extras.nextOptionsEnabled,
      useCustomNextPlot: false, nextPlotPrompt: extras.nextPlotPrompt,
      customCss: extras.customCss, quickCommands: extras.quickCommands,
      worldBookEntries: worldBook.map((e, i) => ({
        groupName: e.group, enabled: e.enabled, keywords: e.keywords,
        matchMode: e.matchMode, probability: e.probability,
        scanRegions: ['ai', 'system'], scanDepth: e.scanDepth,
        content: e.content, insertPosition: 'prompt', sortOrder: e.sortOrder,
      })),
    },
  }, null, 2);
}

function renderFengyue(uif) {
  const { meta, assets, prompts, worldBook, extras } = uif;
  return JSON.stringify({
    name: meta.title, description: meta.description, language: meta.language || 'zh-Hans',
    summary: meta.summary,
    world_book: worldBook.map((e, i) => ({
      key: e.keywords.length ? '_or_' + e.keywords.join('@wb@') : '', value: e.content,
      group: e.group === '默认' ? '' : e.group, key_region: 2, value_region: 1,
      sort: e.sortOrder, depth: e.scanDepth, probability: e.probability,
      match_type: e.matchMode === 'all' ? 1 : 2, enable: e.enabled,
    })),
    cg_book: [], pre_text: '',
    post_text: [prompts.postText, prompts.suffixPrompt ? '[后缀设定: ' + prompts.suffixPrompt + ']' : '', prompts.identityStyle ? '[角色风格设定: ' + prompts.identityStyle + ']' : ''].filter(Boolean).join('\n\n'),
    is_anonymous: false, banned_words: extras.bannedWords,
    pre_prompt: [prompts.mainPrompt, prompts.worldview ? '[世界观设定: ' + prompts.worldview + ']' : ''].filter(Boolean).join('\n\n'),
    cover: assets.coverUrl, cover_tiny: assets.coverTinyUrl || '',
    opening_statement: '选择一段开场白', suggested_questions: extras.suggestedQuestions,
    suggested_questions_after_answer: { enabled: true },
    bg_image: assets.bgImageUrl, bg_mobile: assets.bgMobileUrl,
    category: 0, builtInCss: extras.customCss, mod_permission: 4,
    shortcut_commands: extras.quickCommands, is_available_not_public: true,
    preset_type: 1, preset_chats: [],
    tags: meta.tags.map(t => ({ name: t, __isNew: true })),
  }, null, 2);
}

function renderMiss(uif) {
  const { meta, prompts, worldBook, extras } = uif;
  return JSON.stringify({
    format: 'missai', version: '1.0', exportTime: new Date().toISOString(),
    characterID: '', name: meta.title, summary: meta.summary, description: meta.description,
    tags: meta.tags, genderOrientation: meta.orientation || '男性向',
    extensions: { orientation: meta.orientation || '男性向', type: '异世界', source: meta.source || '', personality: '' },
    promptData: {
      breakArmorWord: '', aiIdentityStylePrompt: prompts.identityStyle || prompts.postText,
      worldViewPrompt: prompts.worldview, systemPrompt: prompts.mainPrompt,
      postPrompt: [prompts.suffixPrompt, prompts.postText ? '[后置补充: ' + prompts.postText + ']' : ''].filter(Boolean).join('\n\n'),
      writingStylePrompt: prompts.writingStyle,
    },
    customCSS: extras.customCss, blockedWords: extras.bannedWords,
    world_book: worldBook.map((e, i) => ({
      key: e.keywords, secondary_keys: [], value: e.content,
      and: e.matchMode === 'all', enabled: e.enabled, order: e.sortOrder,
      group: 0, constant: false, comment: '', useRegex: false, key_region: 6,
    })),
  }, null, 2);
}

// ═══════════════════════════════════════
//  8. IndexedDB 剧本库
// ═══════════════════════════════════════

const DB_NAME = 'ScriptLibrary';
const DB_VER = 1;
const STORE_NAME = 'scripts';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('sourceFormat', 'sourceFormat', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function dbAdd(uif) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const entry = {
    title: uif.meta.title || '未命名剧本',
    summary: (uif.meta.summary || '').slice(0, 200),
    tags: uif.meta.tags || [],
    orientation: uif.meta.orientation || '',
    sourceFormat: uif._sourceFormat || '',
    worldBookCount: (uif.worldBook || []).length,
    promptLength: (uif.prompts.mainPrompt || '').length,
    coverUrl: uif.meta.coverUrl || '',
    bgUrl: uif.meta.bgUrl || '',
    htmlLandingPage: uif.landingPage || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    uif: uif,
  };
  return new Promise((resolve, reject) => {
    const req = store.add(entry);
    req.onsuccess = () => { tx.commit(); resolve(req.result); };
    req.onerror = e => reject(e.target.error);
  });
}

// 轻量列表查询：只取卡片渲染需要的字段，跳过 uif 大对象
async function dbGetAll() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const results = [];
    const req = store.openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        const v = cursor.value;
        results.push({
          id: v.id,
          title: v.title,
          summary: v.summary,
          tags: v.tags,
          sourceFormat: v.sourceFormat,
          worldBookCount: v.worldBookCount,
          promptLength: v.promptLength,
          coverUrl: v.coverUrl,
          createdAt: v.createdAt,
        });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function dbGet(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function dbUpdate(id, updates) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (!entry) { reject(new Error('条目不存在')); return; }
      Object.assign(entry, updates, { updatedAt: Date.now() });
      const putReq = store.put(entry);
      putReq.onsuccess = () => { tx.commit(); resolve(); };
      putReq.onerror = e => reject(e.target.error);
    };
    getReq.onerror = e => reject(e.target.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => { tx.commit(); resolve(); };
    req.onerror = e => reject(e.target.error);
  });
}

async function dbSearch(query) {
  const all = await dbGetAll();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(e => e.title.toLowerCase().includes(q));
}

// ═══════════════════════════════════════
//  9. UI 逻辑
// ═══════════════════════════════════════

let currentUIF = null;
let currentRaw = null;
let viewingLibId = null;
let batchMode = false;
let batchFiles = [];

const $ = id => document.getElementById(id);
const jsonInput = $('jsonInput');
const outputArea = $('outputArea');
const fileInput = $('fileInput');
const uploadZone = $('uploadZone');
const formatSelector = $('formatSelector');
const statusText = $('statusText');
const statusDot = $('statusDot');
const inputCount = $('inputCount');
const outputCount = $('outputCount');
const batchModeChk = $('batchMode');
const batchFileList = $('batchFileList');
const batchActions = $('batchActions');
const batchHint = $('batchHint');
const libList = $('lib-list');
const libSearchInput = $('lib-search-input');
const libDetail = $('lib-detail');

function setStatus(text, type) {
  statusText.textContent = text;
  statusDot.className = 'dot ' + (type || 'idle');
}

function getSelectedFormat() {
  const active = formatSelector.querySelector('.format-opt.active');
  return active ? active.dataset.format : 'markdown';
}

function renderOutput() {
  if (!currentUIF) { outputArea.value = ''; outputCount.textContent = ''; return; }
  const fmt = getSelectedFormat();
  try {
    let result;
    switch (fmt) {
      case 'markdown': result = renderMarkdown(currentUIF); break;
      case 'chunchao': result = renderChunchao(currentUIF); break;
      case 'fengyue':  result = renderFengyue(currentUIF);  break;
      case 'miss':     result = renderMiss(currentUIF);     break;
      default: result = '未知格式';
    }
    outputArea.value = result;
    outputCount.textContent = result.split('\n').length + ' 行 · ' + result.length + ' 字符';
    setStatus('已转换为 ' + fmt + ' 格式', 'ok');
  } catch (e) {
    outputArea.value = '渲染错误: ' + e.message;
    setStatus('渲染失败: ' + e.message, 'err');
  }
}

function processInput(text) {
  try {
    const raw = JSON.parse(text);
    currentRaw = raw;
    currentUIF = parseJSON(raw);
    const fmt = currentUIF._sourceFormat;
    const fmtNames = { chunchao: '春潮', fengyue: '风月', miss: 'MISS' };
    const lines = text.split('\n').length;
    inputCount.textContent = lines + ' 行 · ' + text.length + ' 字符';
    setStatus('✅ 已识别 ' + (fmtNames[fmt] || fmt) + ' 格式，' + currentUIF.worldBook.length + ' 条世界书', 'ok');
    renderOutput();
    dbAdd(currentUIF).then(() => { renderLibList(); }).catch(() => {});
  } catch (e) {
    currentUIF = null;
    currentRaw = null;
    inputCount.textContent = '';
    outputArea.value = '';
    outputCount.textContent = '';
    setStatus('❌ ' + e.message, 'err');
  }
}

// ═══════════════════════════════════════
//  10. SPA 视图切换
// ═══════════════════════════════════════

function switchView(viewName) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $('nav-' + viewName).classList.add('active');
  document.querySelectorAll('.app-view').forEach(v => {
    v.classList.remove('active');
  });
  const target = $('view-' + viewName);
  target.classList.add('active');
  if (viewName === 'library') {
    renderLibList();
  }
}

$('nav-converter').addEventListener('click', () => switchView('converter'));
$('nav-library').addEventListener('click', () => switchView('library'));
$('nav-generator').addEventListener('click', () => switchView('generator'));

// ═══════════════════════════════════════
//  11. 剧本库 · 渲染列表 & 详情
// ═══════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  var a = String.fromCharCode(38, 97, 109, 112, 59);
  var l = String.fromCharCode(38, 108, 116, 59);
  var g = String.fromCharCode(38, 103, 116, 59);
  var q = String.fromCharCode(38, 113, 117, 111, 116, 59);
  var s = String.fromCharCode(38, 35, 51, 57, 59);
  return str.replace(/&/g, a).replace(/</g, l).replace(/>/g, g).replace(/"/g, q).replace(/'/g, s);
}

function formatBadge(src) {
  const map = { chunchao: ['cc', '春潮'], fengyue: ['fy', '风月'], miss: ['ms', 'MISS'] };
  const r = map[src] || ['', src || '未知'];
  return '<span class="lib-card-badge ' + r[0] + '">' + r[1] + '</span>';
}

async function renderLibList() {
  try {
    const query = libSearchInput ? libSearchInput.value.trim() : '';
    const all = query ? await dbSearch(query) : await dbGetAll();
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!libList) return;
    if (all.length === 0) {
      libList.innerHTML = '<div class="lib-empty"><div class="icon">📭</div>暂无保存的剧本<br>在转换器中解析剧本后会自动保存</div>';
      return;
    }
    libList.innerHTML = all.map(e => {
      const activeClass = viewingLibId === e.id ? ' active' : '';
      const tags = (e.tags || []).slice(0, 3).join(', ');
      const wbCount = e.worldBookCount || 0;
      return '<div class="lib-card' + activeClass + '" data-id="' + e.id + '">' +
        '<button class="lib-card-del" data-id="' + e.id + '" title="删除">✕</button>' +
        '<div class="lib-card-top">' +
          '<div class="lib-card-title">' + escapeHtml(e.title || '未命名剧本') + '</div>' +
          formatBadge(e.sourceFormat) +
        '</div>' +
        '<div class="lib-card-summary">' + escapeHtml(e.summary || '') + '</div>' +
        '<div class="lib-card-meta">' +
          '<span>📖 ' + wbCount + ' 条</span>' +
          '<span>📝 ' + (e.promptLength || 0) + ' 字</span>' +
          (tags ? '<span>🏷 ' + escapeHtml(tags) + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    // Card click -> show detail
    libList.querySelectorAll('.lib-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.lib-card-del')) return;
        const id = Number(card.dataset.id);
        viewingLibId = id;
        libList.querySelectorAll('.lib-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        showDetailInPanel(id);
      });
    });

    // Delete button
    libList.querySelectorAll('.lib-card-del').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        if (!confirm('确定删除此剧本？')) return;
        await dbDelete(id);
        if (viewingLibId === id) {
          viewingLibId = null;
          if (libDetail) libDetail.innerHTML = '<div class="empty-state">👈 请在左侧选择一个剧本以查看详情</div>';
        }
        renderLibList();
      });
    });
  } catch (e) {
    console.error('renderLibList error:', e);
  }
}

async function showDetailInPanel(id) {
  if (!libDetail) return;
  try {
    const entry = await dbGet(id);
    if (!entry) {
      libDetail.innerHTML = '<div class="empty-state">❌ 剧本未找到</div>';
      return;
    }
    const uif = entry.uif;
    if (!uif) {
      libDetail.innerHTML = '<div class="empty-state">❌ 数据损坏</div>';
      return;
    }
    const { meta, assets, prompts, worldBook, extras } = uif;
    const tags = (meta.tags || []).map(t => '<span class="modal-tag">' + escapeHtml(t) + '</span>').join('');

    let html = '';

    // Basic info
    html += '<div class="modal-section">';
    html += '<div class="modal-section-title">📋 基本信息</div>';
    html += '<div class="modal-field"><span class="modal-field-label">标题</span><span class="modal-field-value">' + escapeHtml(meta.title || '未命名') + '</span></div>';
    if (meta.summary) html += '<div class="modal-field"><span class="modal-field-label">摘要</span><span class="modal-field-value">' + escapeHtml(meta.summary) + '</span></div>';
    if (meta.orientation) html += '<div class="modal-field"><span class="modal-field-label">取向</span><span class="modal-field-value">' + escapeHtml(meta.orientation) + '</span></div>';
    if (meta.source) html += '<div class="modal-field"><span class="modal-field-label">来源</span><span class="modal-field-value">' + escapeHtml(meta.source) + '</span></div>';
    if (meta.exportedAt) html += '<div class="modal-field"><span class="modal-field-label">导出时间</span><span class="modal-field-value">' + escapeHtml(meta.exportedAt) + '</span></div>';
    if (tags) html += '<div class="modal-tags" style="margin-top:8px">' + tags + '</div>';
    html += '</div>';

    // Main prompt
    if (prompts.mainPrompt) {
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title">🎯 核心提示词 <button class="copy-btn" data-copy="' + escapeHtml(prompts.mainPrompt) + '">📋 复制</button></div>';
      html += '<div class="modal-prompt"><button class="copy-overlay" data-copy="' + escapeHtml(prompts.mainPrompt) + '">📋 复制</button>' + escapeHtml(prompts.mainPrompt) + '</div>';
      html += '</div>';
    }

    // Suffix prompt
    if (prompts.suffixPrompt || prompts.postText || prompts.identityStyle) {
      const parts = [prompts.suffixPrompt, prompts.postText];
      if (prompts.identityStyle) parts.push('[角色风格设定: ' + prompts.identityStyle + ']');
      const suffixText = parts.filter(Boolean).join('\n\n');
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title">📎 后缀提示词 <button class="copy-btn" data-copy="' + escapeHtml(suffixText) + '">📋 复制</button></div>';
      html += '<div class="modal-prompt"><button class="copy-overlay" data-copy="' + escapeHtml(suffixText) + '">📋 复制</button>' + escapeHtml(suffixText) + '</div>';
      html += '</div>';
    }

    // Extra prompts
    const extraPrompts = [];
    if (prompts.worldview) extraPrompts.push({ label: '🌍 世界观', content: prompts.worldview });
    if (prompts.identityStyle) extraPrompts.push({ label: '🎭 身份风格', content: prompts.identityStyle });
    if (prompts.writingStyle) extraPrompts.push({ label: '✍ 写作风格', content: prompts.writingStyle });
    extraPrompts.forEach(p => {
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title">' + p.label + ' <button class="copy-btn" data-copy="' + escapeHtml(p.content) + '">📋 复制</button></div>';
      html += '<div class="modal-prompt"><button class="copy-overlay" data-copy="' + escapeHtml(p.content) + '">📋 复制</button>' + escapeHtml(p.content) + '</div>';
      html += '</div>';
    });

    // World book
    if (worldBook && worldBook.length > 0) {
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title">📖 世界书 (' + worldBook.length + ' 条)</div>';
      html += '<div class="modal-wb-list">';
      worldBook.forEach((e, i) => {
        const kw = (e.keywords || []).join(', ') || '(无关键词)';
        const content = e.content || '';
        html += '<div class="modal-wb-item">';
        html += '<div class="wb-header">';
        html += '<span class="wb-keywords">#' + (i + 1) + ' ' + escapeHtml(kw) + '</span>';
        html += '<button class="wb-copy" data-copy="' + escapeHtml(content) + '">📋 复制</button>';
        html += '</div>';
        html += '<div class="wb-content">' + escapeHtml(content) + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // Landing page status
    var hasLandingPage = !!entry.htmlLandingPage;
    html += '<div class="modal-section">';
    html += '<div class="modal-section-title">🌐 专属宣发页</div>';
    if (hasLandingPage) {
      html += '<div class="modal-field"><span class="modal-field-label">状态</span><span class="modal-field-value" style="color:var(--accent-primary)">✅ 已铸造</span></div>';
      html += '<div style="margin-top:8px;display:flex;gap:8px">';
      html += '<button class="btn btn-sm" id="btnPreviewHtml" style="background:var(--accent-primary);color:#fff">👁 预览</button>';
      html += '<button class="btn btn-sm btn-secondary" id="btnDownloadHtml">⬇ 下载</button>';
      html += '<button class="btn btn-sm btn-secondary" id="btnRegenHtml">🔄 重新铸造</button>';
      html += '</div>';
    } else {
      html += '<div class="modal-field"><span class="modal-field-label">状态</span><span class="modal-field-value" style="color:var(--text-secondary)">⏳ 尚未铸造</span></div>';
      html += '<div style="margin-top:8px"><button class="btn btn-sm" id="btnGenHtml" style="background:var(--accent-primary);color:#fff">✨ AI 铸造专属主题宣发页</button></div>';
    }
    html += '</div>';

    // Action buttons
    html += '<div class="lib-detail-actions">';
    html += '<button class="btn btn-primary" id="btnLoadToConverter">🔄 加载到转换器</button>';
    html += '<button class="btn btn-danger" id="btnDeleteFromDetail">🗑 删除</button>';
    html += '</div>';

    libDetail.innerHTML = html;

    // Copy button events
    libDetail.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', function() {
        const text = this.dataset.copy;
        navigator.clipboard.writeText(text).then(() => {
          const orig = this.textContent;
          this.textContent = '✅ 已复制';
          setTimeout(() => { this.textContent = orig; }, 1500);
        }).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          const orig = this.textContent;
          this.textContent = '✅ 已复制';
          setTimeout(() => { this.textContent = orig; }, 1500);
        });
      });
    });

    // Load to converter
    const loadBtn = libDetail.querySelector('#btnLoadToConverter');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        if (entry.uif && entry.uif._raw) {
          jsonInput.value = JSON.stringify(entry.uif._raw, null, 2);
          processInput(jsonInput.value);
          switchView('converter');
        } else {
          setStatus('❌ 无法加载：原始数据丢失', 'err');
        }
      });
    }

    // Delete
    const delBtn = libDetail.querySelector('#btnDeleteFromDetail');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (!confirm('确定删除此剧本？')) return;
        await dbDelete(id);
        viewingLibId = null;
        libDetail.innerHTML = '<div class="empty-state">👈 请在左侧选择一个剧本以查看详情</div>';
        renderLibList();
      });
    }

    // Landing page: generate
    const genHtmlBtn = libDetail.querySelector('#btnGenHtml');
    if (genHtmlBtn) {
      genHtmlBtn.addEventListener('click', () => {
        generateLandingPage(id);
      });
    }

    // Landing page: preview (open in new tab via blob URL)
    const previewBtn = libDetail.querySelector('#btnPreviewHtml');
    if (previewBtn && entry.htmlLandingPage) {
      previewBtn.addEventListener('click', () => {
        var blob = new Blob([entry.htmlLandingPage], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // 注意：blob URL 在页面关闭后自动释放，无需 revoke
      });
    }

    // Landing page: download
    const downloadBtn = libDetail.querySelector('#btnDownloadHtml');
    if (downloadBtn && entry.htmlLandingPage) {
      downloadBtn.addEventListener('click', () => {
        var title = (entry.uif.meta && entry.uif.meta.title) || '剧本';
        var blob = new Blob([entry.htmlLandingPage], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = title + '_专属宣发页.html';
        a.click();
        URL.revokeObjectURL(url);
        setStatus('⬇ 宣发页已下载', 'ok');
      });
    }

    // Landing page: regenerate
    const regenBtn = libDetail.querySelector('#btnRegenHtml');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        generateLandingPage(id);
      });
    }
  } catch (e) {
    libDetail.innerHTML = '<div class="empty-state">❌ 加载失败: ' + escapeHtml(e.message) + '</div>';
  }
}

// ═══════════════════════════════════════
//  12. 批量转换
// ═══════════════════════════════════════

function addBatchFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const name = file.name;
    batchFiles.push({ name, text, status: 'pending' });
    renderBatchList();
    batchActions.style.display = 'flex';
    setTimeout(() => processBatchFile(batchFiles.length - 1), 50);
  };
  reader.readAsText(file, 'UTF-8');
}

function processBatchFile(idx) {
  const entry = batchFiles[idx];
  if (!entry) return;
  entry.status = 'processing';
  renderBatchList();
  try {
    const raw = JSON.parse(entry.text);
    const uif = parseJSON(raw);
    entry.uif = uif;
    entry.status = 'ok';
    dbAdd(uif).catch(() => {});
  } catch (err) {
    entry.status = 'err';
    entry.error = err.message;
  }
  renderBatchList();
}

function renderBatchList() {
  if (!batchFileList) return;
  if (batchFiles.length === 0) {
    batchFileList.style.display = 'none';
    batchActions.style.display = 'none';
    return;
  }
  batchFileList.style.display = 'block';
  batchFileList.innerHTML = batchFiles.map((f, i) => {
    const statusMap = {
      pending: '<span class="file-status pending">⏳ 等待</span>',
      processing: '<span class="file-status processing">🔄 解析中</span>',
      ok: '<span class="file-status ok">✅ 成功</span>',
      err: '<span class="file-status err">❌ 失败</span>',
    };
    const info = f.uif ? (f.uif.meta.title || '') + ' · ' + (f.uif.worldBook ? f.uif.worldBook.length : 0) + '条' : '';
    return '<div class="batch-file-item">' +
      '<span class="file-name">' + escapeHtml(f.name) + '</span>' +
      '<span class="file-info">' + escapeHtml(info) + '</span>' +
      (statusMap[f.status] || '') +
    '</div>';
  }).join('');
}

function getBatchFileName(idx, fmt) {
  const entry = batchFiles[idx];
  if (!entry) return 'batch_' + idx + '.' + fmt;
  const base = entry.name.replace(/\.json$/i, '');
  return base + '.' + fmt;
}

// ═══════════════════════════════════════
//  13. CRC-32 (ZIP)
// ═══════════════════════════════════════

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ═══════════════════════════════════════
//  14. 事件绑定
// ═══════════════════════════════════════

// Theme toggle
const themeToggle = $('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('theme', next);
  });
  // Restore saved theme
  const saved = localStorage.getItem('theme');
  if (saved && saved !== 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
    themeToggle.textContent = '☀️';
  }
}

// Drag & drop feedback
if (uploadZone) {
  ['dragenter', 'dragover'].forEach(evt => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-active');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-active');
    });
  });
}

// Format switch
formatSelector.addEventListener('click', e => {
  const btn = e.target.closest('.format-opt');
  if (!btn) return;
  formatSelector.querySelectorAll('.format-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderOutput();
});

// File upload
fileInput.addEventListener('change', () => {
  const files = fileInput.files;
  if (!files || files.length === 0) return;
  if (batchMode) {
    for (const f of files) addBatchFile(f);
  } else {
    const f = files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      jsonInput.value = e.target.result;
      processInput(jsonInput.value);
    };
    reader.readAsText(f, 'UTF-8');
  }
  fileInput.value = '';
});

// Drag & drop
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragenter', () => {
  uploadZone.classList.add('drag-active');
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
  uploadZone.classList.remove('drag-active');
});
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  uploadZone.classList.remove('drag-active');
  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;
  if (batchMode) {
    for (const f of files) addBatchFile(f);
  } else {
    const f = files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      jsonInput.value = e.target.result;
      processInput(jsonInput.value);
    };
    reader.readAsText(f, 'UTF-8');
  }
});
uploadZone.addEventListener('click', () => fileInput.click());

// Paste input
jsonInput.addEventListener('paste', () => {
  setTimeout(() => {
    if (jsonInput.value.trim()) processInput(jsonInput.value);
  }, 50);
});
jsonInput.addEventListener('input', () => {
  if (jsonInput.value.trim()) processInput(jsonInput.value);
});

// Copy button
$('btnCopy').addEventListener('click', () => {
  if (!outputArea.value) return;
  navigator.clipboard.writeText(outputArea.value).then(() => {
    setStatus('✅ 已复制到剪贴板', 'ok');
  }).catch(() => {
    outputArea.select();
    document.execCommand('copy');
    setStatus('✅ 已复制到剪贴板', 'ok');
  });
});

// Download button
$('btnDownload').addEventListener('click', () => {
  if (!outputArea.value) return;
  const fmt = getSelectedFormat();
  const ext = fmt === 'markdown' ? 'md' : 'json';
  const name = (currentUIF && currentUIF.meta && currentUIF.meta.title) ? currentUIF.meta.title : 'script';
  const blob = new Blob([outputArea.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.' + ext;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('⬇ 已下载 ' + name + '.' + ext, 'ok');
});

// Format button
$('btnFormat').addEventListener('click', () => {
  if (!outputArea.value) return;
  try {
    const parsed = JSON.parse(outputArea.value);
    outputArea.value = JSON.stringify(parsed, null, 2);
    setStatus('✨ 格式化完成', 'ok');
  } catch (e) {
    setStatus('❌ 格式化失败：输出不是有效 JSON', 'err');
  }
});

// Batch mode toggle
batchModeChk.addEventListener('change', () => {
  batchMode = batchModeChk.checked;
  batchHint.style.display = batchMode ? 'inline' : 'none';
  if (batchMode) {
    fileInput.setAttribute('multiple', 'multiple');
  } else {
    fileInput.removeAttribute('multiple');
  }
});

// Batch download all
$('btnBatchDownloadAll').addEventListener('click', async () => {
  const okFiles = batchFiles.filter(f => f.status === 'ok' && f.uif);
  if (okFiles.length === 0) {
    setStatus('❌ 没有可下载的剧本', 'err');
    return;
  }
  const fmt = getSelectedFormat();
  const ext = fmt === 'markdown' ? 'md' : 'json';

  if (okFiles.length === 1) {
    const f = okFiles[0];
    let result;
    switch (fmt) {
      case 'markdown': result = renderMarkdown(f.uif); break;
      case 'chunchao': result = renderChunchao(f.uif); break;
      case 'fengyue':  result = renderFengyue(f.uif);  break;
      case 'miss':     result = renderMiss(f.uif);     break;
    }
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name.replace(/\.json$/i, '') + '.' + ext;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('⬇ 已下载', 'ok');
    return;
  }

  // ZIP packaging
  setStatus('📦 正在打包 ZIP...', 'busy');
  try {
    const encoder = new TextEncoder();
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const f of okFiles) {
      let result;
      switch (fmt) {
        case 'markdown': result = renderMarkdown(f.uif); break;
        case 'chunchao': result = renderChunchao(f.uif); break;
        case 'fengyue':  result = renderFengyue(f.uif);  break;
        case 'miss':     result = renderMiss(f.uif);     break;
      }
      const data = encoder.encode(result);
      const fileName = (f.name.replace(/\.json$/i, '') + '.' + ext);
      const fileNameBytes = encoder.encode(fileName);
      const crc = crc32(data);
      const compSize = data.length;
      const uncompSize = data.length;

      // Local File Header
      const lh = new Uint8Array(30 + fileNameBytes.length);
      lh.set([0x50, 0x4B, 0x03, 0x04], 0);
      lh[4] = 20; lh[5] = 0;
      lh[6] = 0; lh[7] = 0;
      lh[8] = 0; lh[9] = 0;
      lh.set(new Uint8Array([crc & 0xFF, (crc >> 8) & 0xFF, (crc >> 16) & 0xFF, (crc >> 24) & 0xFF]), 14);
      lh.set(new Uint8Array([compSize & 0xFF, (compSize >> 8) & 0xFF, (compSize >> 16) & 0xFF, (compSize >> 24) & 0xFF]), 18);
      lh.set(new Uint8Array([uncompSize & 0xFF, (uncompSize >> 8) & 0xFF, (uncompSize >> 16) & 0xFF, (uncompSize >> 24) & 0xFF]), 22);
      lh.set(new Uint8Array([fileNameBytes.length & 0xFF, (fileNameBytes.length >> 8) & 0xFF]), 26);
      lh.set(fileNameBytes, 30);
      localHeaders.push({ header: lh, data: data });
      offset += lh.length + data.length;

      // Central Directory Header
      const ch = new Uint8Array(46 + fileNameBytes.length);
      ch.set([0x50, 0x4B, 0x01, 0x02], 0);
      ch[4] = 20; ch[5] = 0;
      ch[6] = 20; ch[7] = 0;
      ch[8] = 0; ch[9] = 0;
      ch[10] = 0; ch[11] = 0;
      ch.set(new Uint8Array([crc & 0xFF, (crc >> 8) & 0xFF, (crc >> 16) & 0xFF, (crc >> 24) & 0xFF]), 16);
      ch.set(new Uint8Array([compSize & 0xFF, (compSize >> 8) & 0xFF, (compSize >> 16) & 0xFF, (compSize >> 24) & 0xFF]), 20);
      ch.set(new Uint8Array([uncompSize & 0xFF, (uncompSize >> 8) & 0xFF, (uncompSize >> 16) & 0xFF, (uncompSize >> 24) & 0xFF]), 24);
      ch.set(new Uint8Array([fileNameBytes.length & 0xFF, (fileNameBytes.length >> 8) & 0xFF]), 28);
      ch[30] = 0; ch[31] = 0;
      ch[32] = 0; ch[33] = 0;
      ch[34] = 0; ch[35] = 0;
      ch[36] = 0; ch[37] = 0;
      ch.set(new Uint8Array([0, 0, 0, 0]), 38);
      ch.set(new Uint8Array([(offset - lh.length - data.length) & 0xFF, ((offset - lh.length - data.length) >> 8) & 0xFF, ((offset - lh.length - data.length) >> 16) & 0xFF, ((offset - lh.length - data.length) >> 24) & 0xFF]), 42);
      ch.set(fileNameBytes, 46);
      centralHeaders.push(ch);
    }

    // EOCD
    const centralOffset = offset;
    const centralSize = centralHeaders.reduce((s, h) => s + h.length, 0);
    const eocd = new Uint8Array(22);
    eocd.set([0x50, 0x4B, 0x05, 0x06], 0);
    eocd[4] = 0; eocd[5] = 0;
    eocd[6] = 0; eocd[7] = 0;
    eocd.set(new Uint8Array([okFiles.length & 0xFF, (okFiles.length >> 8) & 0xFF]), 8);
    eocd.set(new Uint8Array([okFiles.length & 0xFF, (okFiles.length >> 8) & 0xFF]), 10);
    eocd.set(new Uint8Array([centralSize & 0xFF, (centralSize >> 8) & 0xFF, (centralSize >> 16) & 0xFF, (centralSize >> 24) & 0xFF]), 12);
    eocd.set(new Uint8Array([centralOffset & 0xFF, (centralOffset >> 8) & 0xFF, (centralOffset >> 16) & 0xFF, (centralOffset >> 24) & 0xFF]), 16);
    eocd[20] = 0; eocd[21] = 0;

    // Assemble
    const totalSize = offset + centralSize + 22;
    const zip = new Uint8Array(totalSize);
    let pos = 0;
    for (const lh of localHeaders) {
      zip.set(lh.header, pos); pos += lh.header.length;
      zip.set(lh.data, pos); pos += lh.data.length;
    }
    for (const ch of centralHeaders) {
      zip.set(ch, pos); pos += ch.length;
    }
    zip.set(eocd, pos);

    const blob = new Blob([zip], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scripts_' + fmt + '.zip';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('📦 ZIP 已下载 (' + okFiles.length + ' 个文件)', 'ok');
  } catch (e) {
    setStatus('❌ ZIP 打包失败: ' + e.message, 'err');
  }
});

// Batch clear
$('btnBatchClear').addEventListener('click', () => {
  batchFiles = [];
  renderBatchList();
  setStatus('🗑 批量列表已清空', 'idle');
});

// Library search
if (libSearchInput) {
  libSearchInput.addEventListener('input', () => {
    clearTimeout(libSearchInput._debounce);
    libSearchInput._debounce = setTimeout(() => {
      renderLibList();
    }, 300);
  });
}

// ═══════════════════════════════════════
//  15. 右键菜单
// ═══════════════════════════════════════

const ctxMenu = $('app-context-menu');
let ctxTargetId = null;

function showContextMenu(e, cardId) {
  e.preventDefault();
  ctxTargetId = cardId;
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';
  ctxMenu.classList.remove('menu-hidden');
  ctxMenu.classList.add('menu-visible');
}

function hideContextMenu() {
  ctxMenu.style.display = 'none';
  ctxMenu.classList.remove('menu-visible');
  ctxMenu.classList.add('menu-hidden');
  ctxTargetId = null;
}

// Context menu actions
ctxMenu.addEventListener('click', async (e) => {
  const action = e.target.closest('.ctx-item');
  if (!action || !ctxTargetId) return;
  const cmd = action.dataset.cmd;
  hideContextMenu();

  try {
    const entry = await dbGet(ctxTargetId);
    if (!entry || !entry.uif) {
      setStatus('❌ 剧本数据不存在', 'err');
      return;
    }

    switch (cmd) {
      case 'load':
        if (entry.uif._raw) {
          jsonInput.value = JSON.stringify(entry.uif._raw, null, 2);
          processInput(jsonInput.value);
          switchView('converter');
        } else {
          setStatus('❌ 原始数据丢失', 'err');
        }
        break;

      case 'export-md':
      case 'export-chunchao':
      case 'export-fengyue':
      case 'export-miss': {
        const fmtMap = { 'export-md': 'markdown', 'export-chunchao': 'chunchao', 'export-fengyue': 'fengyue', 'export-miss': 'miss' };
        const fmt = fmtMap[cmd];
        const ext = fmt === 'markdown' ? 'md' : 'json';
        const renderers = { markdown: renderMarkdown, chunchao: renderChunchao, fengyue: renderFengyue, miss: renderMiss };
        const result = renderers[fmt](entry.uif);
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (entry.title || 'script') + '.' + ext;
        a.click();
        URL.revokeObjectURL(url);
        setStatus('⬇ 已导出 ' + fmt, 'ok');
        break;
      }

      case 'gen-html':
        generateLandingPage(ctxTargetId);
        break;

      case 'delete':
        if (!confirm('确定删除「' + (entry.title || '未命名') + '」？')) return;
        await dbDelete(ctxTargetId);
        if (viewingLibId === ctxTargetId) {
          viewingLibId = null;
          if (libDetail) libDetail.innerHTML = '<div class="empty-state">👈 请在左侧选择一个剧本以查看详情</div>';
        }
        renderLibList();
        setStatus('🗑 已删除', 'idle');
        break;
    }
  } catch (err) {
    setStatus('❌ 操作失败: ' + err.message, 'err');
  }
});

// Hide on click outside
document.addEventListener('click', (e) => {
  if (ctxMenu && !ctxMenu.contains(e.target)) {
    hideContextMenu();
  }
});

// Hide on right-click outside
document.addEventListener('contextmenu', (e) => {
  if (ctxMenu && !ctxMenu.contains(e.target) && ctxMenu.style.display === 'block') {
    hideContextMenu();
  }
});

// Wire up right-click on library cards (delegated)
if (libList) {
  libList.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.lib-card');
    if (card) {
      showContextMenu(e, Number(card.dataset.id));
    }
  });
}

// ═══════════════════════════════════════
//  16. AI 反应堆 (BYOK)
// ═══════════════════════════════════════

// ── AI 配置管理 ──
const AI_CONFIG_KEY = 'ai_config';

function loadAIConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveAIConfig(config) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

// ── callAI: 原生 LLM 调用接口 ──
// 支持任何兼容 OpenAI Chat Completions API 格式的端点
// expectJson=true 时自动解析 JSON 响应，失败时返回原始文本
async function callAI(systemPrompt, userMessage, expectJson) {
  const cfg = loadAIConfig();
  if (!cfg || !cfg.endpoint || !cfg.key) {
    throw new Error('请先在 🤖 AI 配置 中设置 API 端点和 Key');
  }

  const body = {
    model: cfg.model || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 4096,
  };

  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error('AI 请求失败 (' + res.status + '): ' + (errText.slice(0, 200) || res.statusText));
  }

  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : (typeof data === 'string' ? data : JSON.stringify(data));

  if (expectJson) {
    try {
      // 尝试从 markdown 代码块中提取 JSON
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
      return JSON.parse(jsonStr);
    } catch {
      return text;
    }
  }
  return text;
}

// ── AI 配置弹窗 ──
const aiDialog = $('ai-config-dialog');
const aiEndpoint = $('ai-endpoint');
const aiModel = $('ai-model');
const aiKey = $('ai-key');

function openAIConfig() {
  const cfg = loadAIConfig();
  if (cfg) {
    aiEndpoint.value = cfg.endpoint || '';
    aiModel.value = cfg.model || '';
    aiKey.value = cfg.key || '';
  } else {
    // 默认预设为 DeepSeek
    aiEndpoint.value = 'https://api.deepseek.com/v1/chat/completions';
    aiModel.value = 'deepseek-chat';
    aiKey.value = '';
  }
  aiDialog.showModal();
}

function closeAIConfig() {
  aiDialog.close();
}

// 加载已有配置填充
const existingCfg = loadAIConfig();
if (existingCfg) {
  aiEndpoint.value = existingCfg.endpoint || '';
  aiModel.value = existingCfg.model || '';
  aiKey.value = existingCfg.key || '';
} else {
  // 默认预设为 DeepSeek
  aiEndpoint.value = 'https://api.deepseek.com/v1/chat/completions';
  aiModel.value = 'deepseek-chat';
  aiKey.value = '';
}

$('btn-ai-config').addEventListener('click', openAIConfig);
$('btn-close-ai-config').addEventListener('click', closeAIConfig);
aiDialog.addEventListener('click', (e) => {
  if (e.target === aiDialog) closeAIConfig();
});

$('btn-save-ai-config').addEventListener('click', () => {
  const cfg = {
    endpoint: aiEndpoint.value.trim(),
    model: aiModel.value.trim(),
    key: aiKey.value.trim(),
  };
  if (!cfg.endpoint || !cfg.key) {
    setStatus('请填写 API 端点和 Key', 'err');
    return;
  }
  saveAIConfig(cfg);
  setStatus('AI 配置已保存', 'ok');
  closeAIConfig();
});

$('btn-test-ai').addEventListener('click', async () => {
  const cfg = {
    endpoint: aiEndpoint.value.trim(),
    model: aiModel.value.trim() || 'gpt-4o',
    key: aiKey.value.trim(),
  };
  if (!cfg.endpoint || !cfg.key) {
    setStatus('请先填写 API 端点和 Key', 'err');
    return;
  }
  setStatus('正在测试 AI 连接...', 'busy');
  try {
    const result = await callAI('你是一个连接测试助手。请仅回复"连接成功"四个字。', '测试连接', false);
    if (result.includes('连接成功')) {
      setStatus('AI 连接测试通过 ✅', 'ok');
    } else {
      setStatus('AI 响应异常: ' + result.slice(0, 60), 'err');
    }
  } catch (e) {
    setStatus('AI 连接失败: ' + e.message, 'err');
  }
});

// ═══════════════════════════════════════
//  17. AI 铸造专属主题宣发页 (Generative UI Engine)
// ═══════════════════════════════════════

// 从剧本 UIF 动态生成单文件 HTML 宣发页
// AI 根据剧本世界观"手搓"一套匹配主题的 CSS + 交互逻辑
// 每个剧本得到独一无二的视觉风格——废土=荧光绿故障风，修仙=水墨渐变，赛博=霓虹发光
const PROMPT_LANDING_PAGE = '你是一个拥有顶级审美的前端UI/UX设计师和交互开发专家。\n' +
  '你的任务是：根据用户提供的剧本世界观，编写一个【完全独立、单文件、可以直接在浏览器双击运行】的 HTML 游戏宣发与角色创建页。\n\n' +
  '【视觉与 CSS 要求】（绝对核心）：\n' +
  '1. 严禁使用任何普通的白底黑字。必须根据剧本的题材（如赛博、修仙、废土、日系等）原创一套极具沉浸感的 CSS 样式！\n' +
  '2. 灵活运用深色模式、背景渐变、霓虹发光、特殊字体排版、边框纹理来展现生态关系。\n' +
  '3. 必须包含响应式设计，界面要高级、精美、多层次。\n\n' +
  '【功能与交互要求】（强制实现）：\n' +
  '1. 页面上半部分：展示剧本标题、标签、高燃的背景简介。\n' +
  '2. 页面下半部分：必须提供一个"玩家自定义档案"的表单。包含：姓名、性别、年龄、表面身份/职业、外貌特征、额外隐藏背景(Textarea)。\n' +
  '3. 可以提供一些契合世界观的【预设词】在输入框旁边或作为 placeholder。\n' +
  '4. 页面最底部：必须有一个引人注目的【复制档案并启程】按钮。\n' +
  '5. 必须手写原生 JavaScript：点击复制按钮后，将玩家填写的表单信息拼接，并在最后自动加上一句"=> 档案确认完毕。请根据上述我的设定，开始游戏剧情第一幕。"然后写入剪贴板，并给出"复制成功"的按钮文字反馈。\n\n' +
  '【输出限制】：\n' +
  '直接输出完整的 <!DOCTYPE html> 代码，绝对不要包裹在 ```html ``` 标记中，不要输出任何解释性废话。';

async function generateLandingPage(scriptId) {
  if (!scriptId) {
    setStatus('❌ 未指定剧本', 'err');
    return;
  }

  // 检查 AI 是否已配置
  var aiCfg = loadAIConfig();
  if (!aiCfg || !aiCfg.endpoint || !aiCfg.key) {
    setStatus('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key', 'err');
    return;
  }

  withLoading('btnGenHtml', '✨ AI 正在铸造专属主题宣发页', async function() {
    var entry = await dbGet(scriptId);
    if (!entry || !entry.uif) {
      throw new Error('剧本数据不存在');
    }

    var uif = entry.uif;
    var meta = uif.meta || {};
    var prompts = uif.prompts || {};
    var worldBook = uif.worldBook || [];
    var title = meta.title || '未命名剧本';
    var summary = meta.summary || '';
    var description = meta.description || '';
    var worldview = prompts.worldview || '';
    var mainPrompt = prompts.mainPrompt || '';
    var tags = (meta.tags || []).join(', ');

    // 提取世界书摘要
    var wbSummary = worldBook.map(function(wb) {
      return wb.keywords ? wb.keywords.slice(0, 3).join('/') : (wb.title || '条目');
    }).join(', ');

    // 构建用户消息：剧本背景信息
    var userMsg = '剧本标题：' + title + '\n' +
      '剧本标签：' + tags + '\n' +
      '背景简介：' + summary + '\n' +
      '详细设定：' + description + '\n' +
      '核心法则：' + worldview + '\n' +
      '核心提示词：' + mainPrompt.slice(0, 500) + '\n' +
      '世界书摘要：' + wbSummary;

    var response = await callAI(PROMPT_LANDING_PAGE, userMsg, false);

    // 防御性清理：移除可能的 Markdown 代码块包裹
    var htmlContent = response.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

    // 验证是否包含 DOCTYPE（基本完整性检查）
    if (!/<!DOCTYPE\s+html/i.test(htmlContent)) {
      if (htmlContent.indexOf('<html') === -1) {
        htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
          escapeHtml(title) + ' - 专属宣发页</title></head><body>' + htmlContent + '</body></html>';
      }
    }

    // 入库：同时更新 UIF 顶层 landingPage + DB 索引字段 htmlLandingPage
    uif.landingPage = htmlContent;
    await dbUpdate(scriptId, { htmlLandingPage: htmlContent, uif: uif });

    // 刷新详情页显示
    if (viewingLibId === scriptId) {
      showDetailInPanel(scriptId);
    }

    setStatus('🎉 专属宣发页已入库，可在详情页预览和下载', 'ok');
  });
}

// ═══════════════════════════════════════
//  18. 剧本车间 · 4 步向导交互
// ═══════════════════════════════════════

// ── 全局状态机 ──
// 统一管理 4 步向导的上下文流转
const genState = {
  step: 1,
  seed: '',
  drafts: [],       // Step 1 生成的 4 个方向
  selectedIdx: -1,  // 选中的卡片索引
  selectedDraft: null, // 选中的卡片对象
  prompts: null,    // Step 3 生成的提示词 { systemPrompt, outline, expanded }
  worldBook: [],    // Step 4 萃取的世界书
};

// ── withLoading: 通用 UX 加载包装器 ──
// 自动管理按钮 loading 状态，统一错误处理
async function withLoading(btnId, loadingText, asyncTask) {
  const btn = $(btnId);
  if (!btn) return await asyncTask();
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ ' + loadingText + '...';
  try {
    await asyncTask();
  } catch (e) {
    setStatus('❌ ' + e.message, 'err');
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function goToStep(step) {
  genState.step = step;
  // 更新步进器
  document.querySelectorAll('.wizard-stepper .step').forEach(s => {
    const sNum = parseInt(s.dataset.step);
    s.classList.toggle('active', sNum === step);
    s.classList.toggle('completed', sNum < step);
  });
  // 切换步骤内容
  for (let i = 1; i <= 4; i++) {
    const el = $('gen-step-' + i);
    if (el) el.style.display = i === step ? '' : 'none';
  }
}

// ── Step 1 → Step 2: 选择卡片 ──
function selectCard(index) {
  genState.selectedIdx = index;
  genState.selectedDraft = genState.drafts[index];
  // 高亮选中卡片
  document.querySelectorAll('.gen-card').forEach((c, i) => {
    c.classList.toggle('selected', i === index);
  });
  // 渲染选中预览
  const preview = $('gen-selected-card');
  if (preview && genState.selectedDraft) {
    preview.innerHTML = renderCardHTML(genState.selectedDraft);
  }
  goToStep(2);
}

function renderCardHTML(card) {
  var tags = (card.tags || []).map(function(t) {
    return '<span class="card-tag">' + escapeHtml(t) + '</span>';
  }).join('');
  return '<div class="card-conflict">' + escapeHtml(card.conflict || '') + '</div>' +
    '<div class="card-title">' + escapeHtml(card.title || '') + '</div>' +
    '<div class="card-desc">' + escapeHtml(card.desc || '') + '</div>' +
    (tags ? '<div class="card-tags">' + tags + '</div>' : '');
}

// ── renderDraftCards: 渲染草稿卡片网格 ──
function renderDraftCards() {
  const container = $('gen-cards-container');
  if (!container) return;
  if (!genState.drafts || genState.drafts.length === 0) {
    container.innerHTML = '<div class="cards-placeholder">点击上方按钮生成剧本方向</div>';
    return;
  }
  container.innerHTML = '';
  genState.drafts.forEach(function(card, i) {
    var div = document.createElement('div');
    div.className = 'gen-card';
    if (i === genState.selectedIdx) div.classList.add('selected');
    div.innerHTML = renderCardHTML(card);
    div.addEventListener('click', function() { selectCard(i); });
    container.appendChild(div);
  });
}

// ── renderPrompts: 渲染提示词输出 ──
function renderPrompts() {
  const ta = $('gen-prompt-output');
  if (!ta) return;
  if (genState.prompts) {
    ta.value = genState.prompts.systemPrompt || genState.prompts.expanded || '';
  } else {
    ta.value = '';
  }
}

// ── Step 1: 灵魂级抽卡引擎 ──
// 角色设定为"创意剧本策划师"，输出严格 JSON 格式的 4 个剧本方向
const PROMPT_GEN_CARDS = '你是一位顶尖的创意剧本策划师，擅长从一句话灵感中挖掘出极具张力的叙事方向。' +
  '你的任务是：根据用户输入的一句话灵感，生成 **4 个截然不同** 的剧本方向。\n\n' +
  '每个方向必须包含以下字段：\n' +
  '- title（剧本标题，中文，有吸引力、有记忆点，不超过 15 字）\n' +
  '- conflict（核心冲突，一句话，必须包含明确的矛盾双方，如"当 A 遇上 B，却发现 C"）\n' +
  '- desc（详细设定，100-150 字，包含：时代背景、主角身份、核心困境、独特设定）\n' +
  '- tags（3-5 个标签，用于分类和检索，如"科幻""悬疑""情感"）\n\n' +
  '要求：\n' +
  '1. 4 个方向必须在类型、风格、基调上完全不同\n' +
  '2. 每个方向都要有独特的"钩子"——让读者一看就想深入了解\n' +
  '3. 避免陈词滥调，追求新颖的角度\n' +
  '4. 严格以 JSON 数组格式输出，不要 markdown 包裹，不要额外解释\n\n' +
  '输出格式：\n' +
  '[{"title":"...","conflict":"...","desc":"...","tags":["...","..."]}]\n\n' +
  '记住：你的每一个方向都可能成为一个完整的故事世界。请认真对待。';

$('btn-gen-cards').addEventListener('click', function() {
  var seed = $('gen-seed-input').value.trim();
  if (!seed) {
    setStatus('请先输入一句话灵感', 'err');
    return;
  }

  withLoading('btn-gen-cards', '🎲 AI 正在抽卡', async function() {
    genState.seed = seed;
    var result = await callAI(PROMPT_GEN_CARDS, seed, true);
    var cards = Array.isArray(result) ? result : (result.cards || result.directions || [result]);
    if (!cards || cards.length === 0) throw new Error('AI 返回格式异常，未生成有效方向');

    genState.drafts = cards;
    genState.selectedIdx = -1;
    genState.selectedDraft = null;
    renderDraftCards();
    setStatus('✅ 已生成 ' + cards.length + ' 个剧本方向，请选择一个进入精修', 'ok');
  });
});

// ── Step 2: 返回重选 ──
$('btn-back-to-step1').addEventListener('click', function() {
  goToStep(1);
});

// ── Step 2: AI 调优 ──
// 基于当前选中的草稿，根据用户指令进行精细化调整
$('btn-refine-ai').addEventListener('click', function() {
  if (!genState.selectedDraft) return;
  var refineInput = $('gen-refine-input').value.trim();
  if (!refineInput) {
    setStatus('请输入调优指令', 'err');
    return;
  }

  withLoading('btn-refine-ai', '🔄 AI 正在调优', async function() {
    var systemPrompt = '你是一个剧本设定调优助手。根据用户当前选中的剧本方向和调优指令，' +
      '输出优化后的剧本方向。保持 JSON 格式：{"title":"...","conflict":"...","desc":"...","tags":["..."]}。' +
      '只输出 JSON，不要额外解释。';

    var currentCard = JSON.stringify(genState.selectedDraft);
    var userMsg = '当前方向：' + currentCard + '\n调优指令：' + refineInput;

    var result = await callAI(systemPrompt, userMsg, true);
    var refined = result.title ? result : (result.card || result);
    if (!refined || !refined.title) throw new Error('返回格式异常');

    // 更新状态中的草稿
    genState.selectedDraft = refined;
    if (genState.selectedIdx >= 0) {
      genState.drafts[genState.selectedIdx] = refined;
    }

    var preview = $('gen-selected-card');
    if (preview) preview.innerHTML = renderCardHTML(genState.selectedDraft);
    setStatus('✅ 调优完成', 'ok');
  });
});

// ── Step 2 → Step 3: Prompt 膨胀引擎 ──
// 将短 outline 膨胀为 800+ 字的完整 System Prompt
const PROMPT_EXPAND = '你是一位顶级的 AI 提示词工程师（Prompt Engineer），专精于将简短的剧本设定膨胀为高质量的 AI 角色 System Prompt。\n\n' +
  '你的任务：根据用户提供的剧本设定（标题、冲突、描述、标签），生成一份 **完整的 System Prompt**。\n\n' +
  '## 结构要求（必须按此顺序）：\n\n' +
  '### 1. 角色定义\n' +
  '- 你是谁？用第一人称或第二人称"你"定义 AI 需要扮演的角色\n' +
  '- 一句话概括角色的核心身份\n\n' +
  '### 2. 世界观设定\n' +
  '- 故事发生的时代、地点、社会背景\n' +
  '- 这个世界独特的规则或法则\n' +
  '- 至少 3 个具体的世界细节，让世界有真实感\n\n' +
  '### 3. 角色设定\n' +
  '- 角色的外貌、性格、能力、背景故事\n' +
  '- 角色的动机与目标\n' +
  '- 角色的弱点和限制（让角色有层次感）\n\n' +
  '### 4. 行为规则\n' +
  '- AI 在对话中必须遵守的 5-8 条具体规则\n' +
  '- 包括：叙事风格、语言习惯、响应长度、禁忌内容\n' +
  '- 规则要可执行、可验证\n\n' +
  '### 5. 叙事风格\n' +
  '- 描述期望的叙事语调（如：冷峻写实、浪漫诗意、黑色幽默）\n' +
  '- 举例说明风格的运用方式\n\n' +
  '### 6. 开场引导\n' +
  '- 提供一个开场白示例，展示 AI 应该如何开始对话\n\n' +
  '## 质量要求：\n' +
  '- 总字数不少于 800 字\n' +
  '- 语言流畅、有感染力，避免机械化的列表感\n' +
  '- 使用第二人称"你"贯穿全文\n' +
  '- 直接输出 System Prompt 内容，不要额外解释，不要 markdown 包裹';

$('btn-to-step-3').addEventListener('click', function() {
  if (!genState.selectedDraft) return;

  withLoading('btn-to-step-3', '📝 AI 正在膨胀提示词', async function() {
    var card = genState.selectedDraft;
    var userMsg = '剧本标题：' + card.title + '\n核心冲突：' + card.conflict +
      '\n详细设定：' + card.desc + '\n标签：' + (card.tags || []).join('、');

    var expandedPrompt = await callAI(PROMPT_EXPAND, userMsg, false);

    genState.prompts = {
      outline: userMsg,
      expanded: expandedPrompt,
      systemPrompt: expandedPrompt,
    };

    renderPrompts();
    goToStep(3);
    setStatus('✅ 提示词膨胀完成（' + expandedPrompt.length + ' 字）', 'ok');
  });
});

// ── Step 3: 返回 ──
$('btn-back-to-step2').addEventListener('click', function() {
  goToStep(2);
});

// ── Step 3: 复制提示词 ──
$('btn-copy-prompt').addEventListener('click', function() {
  var ta = $('gen-prompt-output');
  ta.select();
  document.execCommand('copy');
  setStatus('📋 提示词已复制', 'ok');
});

// ── Step 3: 重新生成 ──
$('btn-regenerate-prompt').addEventListener('click', function() {
  if (!genState.selectedDraft) return;

  withLoading('btn-regenerate-prompt', '🔄 重新生成提示词', async function() {
    var card = genState.selectedDraft;
    var userMsg = '剧本标题：' + card.title + '\n核心冲突：' + card.conflict +
      '\n详细设定：' + card.desc + '\n标签：' + (card.tags || []).join('、');

    var expandedPrompt = await callAI(PROMPT_EXPAND, userMsg, false);

    genState.prompts = {
      outline: userMsg,
      expanded: expandedPrompt,
      systemPrompt: expandedPrompt,
    };

    renderPrompts();
    setStatus('✅ 提示词重新生成完成（' + expandedPrompt.length + ' 字）', 'ok');
  });
});

// ── Step 3 → Step 4: 萃取世界书 ──
$('btn-to-step-4').addEventListener('click', function() {
  var promptText = genState.prompts ? (genState.prompts.systemPrompt || genState.prompts.expanded) : '';
  if (!promptText) {
    setStatus('请先生成提示词', 'err');
    return;
  }

  withLoading('btn-to-step-4', '📖 AI 正在萃取世界书', async function() {
    var systemPrompt = '你是一个世界书构建专家。根据系统提示词，提取 5-10 条世界书条目。' +
      '每条包含：keywords（触发关键词数组，3-5个词）、content（条目内容，50-100字）。' +
      '以 JSON 数组格式返回，不要 markdown 包裹。格式：[{"keywords":["关键词1","关键词2"],"content":"条目内容"}]';

    var wbResult = await callAI(systemPrompt, promptText, true);
    var wbList = Array.isArray(wbResult) ? wbResult : [];
    genState.worldBook = wbList;

    var list = $('gen-wb-list');
    list.innerHTML = '';
    if (wbList.length === 0) {
      list.innerHTML = '<div class="cards-placeholder">未萃取到世界书条目</div>';
    } else {
      wbList.forEach(function(wb) {
        var div = document.createElement('div');
        div.className = 'gen-wb-item';
        div.innerHTML = '<div class="wb-keywords">🔑 ' + escapeHtml((wb.keywords || []).join('、')) + '</div>' +
          '<div class="wb-content">' + escapeHtml(wb.content || '') + '</div>';
        list.appendChild(div);
      });
    }

    goToStep(4);
    setStatus('✅ 世界书萃取完成：' + wbList.length + ' 条', 'ok');
  });
});

// ── Step 4: 返回 ──
$('btn-back-to-step3').addEventListener('click', function() {
  goToStep(3);
});

// ── Step 4: 重新萃取 ──
$('btn-regenerate-wb').addEventListener('click', function() {
  $('btn-to-step-4').click();
});

// ── Step 4: 保存剧本（File System Access 物理写入 + IndexedDB 回退） ──
// 优先写入挂载的物理文件夹，回退到 IndexedDB
$('btn-save-script').addEventListener('click', function() {
  if (!genState.selectedDraft || !genState.prompts) {
    setStatus('请完成所有步骤后再保存', 'err');
    return;
  }

  withLoading('btn-save-script', '💾 正在保存剧本', async function() {
    var card = genState.selectedDraft;
    var promptText = genState.prompts.systemPrompt || genState.prompts.expanded || '';

    // 构建 UIF 格式剧本
    var script = {
      meta: {
        title: card.title || '未命名剧本',
        summary: card.conflict || '',
        description: card.desc || '',
        tags: card.tags || [],
        source: 'generator',
        exportedAt: new Date().toISOString(),
      },
      prompts: {
        mainPrompt: promptText,
      },
      worldBook: genState.worldBook.map(function(wb, i) {
        return {
          id: 'wb_' + i,
          keywords: wb.keywords || [],
          content: wb.content || '',
          enabled: true,
        };
      }),
    };

    var fileName = (card.title || '剧本') + '.json';
    var jsonStr = JSON.stringify(script, null, 2);

    // 策略 1: File System Access 物理写入（优先）
    if (window._mountedDirHandle) {
      try {
        var fileHandle = await window._mountedDirHandle.getFileHandle(fileName, { create: true });
        var writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        setStatus('💾 已保存到文件夹：' + fileName, 'ok');
        return;
      } catch (fsaError) {
        console.warn('FSA 写入失败，回退到 IndexedDB:', fsaError);
        // 回退到 IndexedDB
      }
    }

    // 策略 2: IndexedDB 回退
    await dbAdd(script);
    setStatus('💾 已保存到剧本库：' + fileName, 'ok');

    // 刷新剧本库列表
    renderLibList();
  });
});

// ═══════════════════════════════════════
//  18. 实体工作区 · 挂载本地文件夹
// ═══════════════════════════════════════

$('btn-mount-folder').addEventListener('click', async function() {
  // File System Access API — 请求文件夹权限
  if (!window.showDirectoryPicker) {
    setStatus('您的浏览器不支持 File System Access API，请使用 Chrome 86+', 'err');
    return;
  }

  try {
    var dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    var mountStatus = $('mount-status');
    mountStatus.textContent = '已挂载：' + dirHandle.name;
    mountStatus.classList.add('active');
    setStatus('📂 已挂载文件夹：' + dirHandle.name, 'ok');

    // 读取文件夹中的 JSON 文件
    var entries = [];
    for await (var entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        entries.push(entry);
      }
    }

    if (entries.length > 0) {
      setStatus('📂 已挂载 ' + dirHandle.name + '（发现 ' + entries.length + ' 个剧本）', 'ok');
    }

    // 存储句柄供后续使用
    window._mountedDirHandle = dirHandle;
  } catch (e) {
    if (e.name !== 'AbortError' && e.name !== 'SecurityError') {
      setStatus('挂载失败: ' + e.message, 'err');
    }
  }
});

// ═══════════════════════════════════════
//  19. 初始化完成
// ═══════════════════════════════════════

// Initial render
renderLibList();

console.log('🎭 剧本格式路由中枢 v2.0 · SPA 架构');
console.log('📚 剧本库已就绪');
console.log('✨ 剧本车间已就绪');
console.log('🤖 AI 反应堆待配置');\n// ═══════════════════════════════════════\n
// ═══════════════════════════════════════
//  樱花 WebGL 背景 (动态创建 Canvas)
// ═══════════════════════════════════════

// --- Shader 源码 (内联, 不依赖 DOM script 标签) ---
var SAKURA_SHADERS = {
  pp_final_vsh: 'uniform vec3 uResolution;attribute vec2 aPosition;varying vec2 texCoord;varying vec2 screenCoord;void main(void){gl_Position=vec4(aPosition,0.0,1.0);texCoord=aPosition.xy*0.5+vec2(0.5,0.5);screenCoord=aPosition.xy*vec2(uResolution.z,1.0);}',
  pp_final_fsh: '#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D uSrc;uniform sampler2D uBloom;uniform vec2 uDelta;varying vec2 texCoord;varying vec2 screenCoord;void main(void){vec4 srccol=texture2D(uSrc,texCoord)*2.0;vec4 bloomcol=texture2D(uBloom,texCoord);vec4 col;col=srccol+bloomcol*(vec4(1.0)+srccol);col*=smoothstep(1.0,0.0,pow(length((texCoord-vec2(0.5))*2.0),1.2)*0.5);col=pow(col,vec4(0.45454545454545));gl_FragColor=vec4(col.rgb,1.0);gl_FragColor.a=1.0;}',
  sakura_point_vsh: 'uniform mat4 uProjection;uniform mat4 uModelview;uniform vec3 uResolution;uniform vec3 uOffset;uniform vec3 uDOF;uniform vec3 uFade;attribute vec3 aPosition;attribute vec3 aEuler;attribute vec2 aMisc;varying vec3 pposition;varying float psize;varying float palpha;varying float pdist;varying vec3 normX;varying vec3 normY;varying vec3 normZ;varying vec3 normal;varying float diffuse;varying float specular;varying float rstop;varying float distancefade;void main(void){vec4 pos=uModelview*vec4(aPosition+uOffset,1.0);gl_Position=uProjection*pos;gl_PointSize=aMisc.x*uProjection[1][1]/-pos.z*uResolution.y*0.5;pposition=pos.xyz;psize=aMisc.x;pdist=length(pos.xyz);palpha=smoothstep(0.0,1.0,(pdist-0.1)/uFade.z);vec3 elrsn=sin(aEuler);vec3 elrcs=cos(aEuler);mat3 rotx=mat3(1.0,0.0,0.0,0.0,elrcs.x,elrsn.x,0.0,-elrsn.x,elrcs.x);mat3 roty=mat3(elrcs.y,0.0,-elrsn.y,0.0,1.0,0.0,elrsn.y,0.0,elrcs.y);mat3 rotz=mat3(elrcs.z,elrsn.z,0.0,-elrsn.z,elrcs.z,0.0,0.0,0.0,1.0);mat3 rotmat=rotx*roty*rotz;normal=rotmat[2];mat3 trrotm=mat3(rotmat[0][0],rotmat[1][0],rotmat[2][0],rotmat[0][1],rotmat[1][1],rotmat[2][1],rotmat[0][2],rotmat[1][2],rotmat[2][2]);normX=trrotm[0];normY=trrotm[1];normZ=trrotm[2];const vec3 lit=vec3(0.6917144638660746,0.6917144638660746,-0.20751433915982237);float tmpdfs=dot(lit,normal);if(tmpdfs<0.0){normal=-normal;tmpdfs=dot(lit,normal);}diffuse=0.4+tmpdfs;vec3 eyev=normalize(-pos.xyz);if(dot(eyev,normal)>0.0){vec3 hv=normalize(eyev+lit);specular=pow(max(dot(hv,normal),0.0),20.0);}else{specular=0.0;}rstop=clamp((abs(pdist-uDOF.x)-uDOF.y)/uDOF.z,0.0,1.0);rstop=pow(rstop,0.5);distancefade=min(1.0,exp((uFade.x-pdist)*0.69315/uFade.y));}',
  sakura_point_fsh: '#ifdef GL_ES\nprecision highp float;\n#endif\nuniform vec3 uDOF;uniform vec3 uFade;const vec3 fadeCol=vec3(0.08,0.03,0.06);varying vec3 pposition;varying float psize;varying float palpha;varying float pdist;varying vec3 normX;varying vec3 normY;varying vec3 normZ;varying vec3 normal;varying float diffuse;varying float specular;varying float rstop;varying float distancefade;float ellipse(vec2 p,vec2 o,vec2 r){vec2 lp=(p-o)/r;return length(lp)-1.0;}void main(void){vec3 p=vec3(gl_PointCoord-vec2(0.5,0.5),0.0)*2.0;vec3 d=vec3(0.0,0.0,-1.0);float nd=normZ.z;if(abs(nd)<0.0001)discard;float np=dot(normZ,p);vec3 tp=p+d*np/nd;vec2 coord=vec2(dot(normX,tp),dot(normY,tp));const float flwrsn=0.258819045102521;const float flwrcs=0.965925826289068;mat2 flwrm=mat2(flwrcs,-flwrsn,flwrsn,flwrcs);vec2 flwrp=vec2(abs(coord.x),coord.y)*flwrm;float r;if(flwrp.x<0.0){r=ellipse(flwrp,vec2(0.065,0.024)*0.5,vec2(0.36,0.96)*0.5);}else{r=ellipse(flwrp,vec2(0.065,0.024)*0.5,vec2(0.58,0.96)*0.5);}if(r>rstop)discard;vec3 col=mix(vec3(1.0,0.8,0.75),vec3(1.0,0.9,0.87),r);float grady=mix(0.0,1.0,pow(coord.y*0.5+0.5,0.35));col*=vec3(1.0,grady,grady);col*=mix(0.8,1.0,pow(abs(coord.x),0.3));col=col*diffuse+specular;col=mix(fadeCol,col,distancefade);float alpha=(rstop>0.001)?(0.5-r/(rstop*2.0)):1.0;alpha=smoothstep(0.0,1.0,alpha)*palpha;gl_FragColor=vec4(col*0.5,alpha);}',
  fx_common_vsh: 'uniform vec3 uResolution;attribute vec2 aPosition;varying vec2 texCoord;varying vec2 screenCoord;void main(void){gl_Position=vec4(aPosition,0.0,1.0);texCoord=aPosition.xy*0.5+vec2(0.5,0.5);screenCoord=aPosition.xy*vec2(uResolution.z,1.0);}',
  bg_fsh: '#ifdef GL_ES\nprecision highp float;\n#endif\nuniform vec2 uTimes;varying vec2 texCoord;varying vec2 screenCoord;void main(void){vec3 col;float c;vec2 tmpv=texCoord*vec2(0.8,1.0)-vec2(0.95,1.0);c=exp(-pow(length(tmpv)*1.8,2.0));col=mix(vec3(0.02,0.0,0.03),vec3(0.96,0.98,1.0)*1.5,c);gl_FragColor=vec4(col*0.5,1.0);}',
  fx_brightbuf_fsh: '#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D uSrc;uniform vec2 uDelta;varying vec2 texCoord;varying vec2 screenCoord;void main(void){vec4 col=texture2D(uSrc,texCoord);gl_FragColor=vec4(col.rgb*2.0-vec3(0.5),1.0);}',
  fx_dirblur_r4_fsh: '#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D uSrc;uniform vec2 uDelta;uniform vec4 uBlurDir;varying vec2 texCoord;varying vec2 screenCoord;void main(void){vec4 col=texture2D(uSrc,texCoord);col=col+texture2D(uSrc,texCoord+uBlurDir.xy*uDelta);col=col+texture2D(uSrc,texCoord-uBlurDir.xy*uDelta);col=col+texture2D(uSrc,texCoord+(uBlurDir.xy+uBlurDir.zw)*uDelta);col=col+texture2D(uSrc,texCoord-(uBlurDir.xy+uBlurDir.zw)*uDelta);gl_FragColor=col/5.0;}'
};

// --- 工具函数 ---
var sakuraV3 = {};
var sakuraM44 = {};
sakuraV3.create = function(x,y,z){return {x:x,y:y,z:z};};
sakuraV3.dot = function(v0,v1){return v0.x*v1.x+v0.y*v1.y+v0.z*v1.z;};
sakuraV3.cross = function(v,v0,v1){v.x=v0.y*v1.z-v0.z*v1.y;v.y=v0.z*v1.x-v0.x*v1.z;v.z=v0.x*v1.y-v0.y*v1.x;};
sakuraV3.normalize = function(v){var l=v.x*v.x+v.y*v.y+v.z*v.z;if(l>0.00001){l=1.0/Math.sqrt(l);v.x*=l;v.y*=l;v.z*=l;}};
sakuraV3.arrayForm = function(v){if(v.array){v.array[0]=v.x;v.array[1]=v.y;v.array[2]=v.z;}else{v.array=new Float32Array([v.x,v.y,v.z]);}return v.array;};
sakuraM44.createIdentity = function(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);};
sakuraM44.loadProjection = function(m,aspect,vdeg,near,far){var h=near*Math.tan(vdeg*Math.PI/180.0*0.5)*2.0;var w=h*aspect;m[0]=2.0*near/w;m[1]=0;m[2]=0;m[3]=0;m[4]=0;m[5]=2.0*near/h;m[6]=0;m[7]=0;m[8]=0;m[9]=0;m[10]=-(far+near)/(far-near);m[11]=-1;m[12]=0;m[13]=0;m[14]=-2.0*far*near/(far-near);m[15]=0;};
sakuraM44.loadLookAt = function(m,vpos,vlook,vup){var frontv=sakuraV3.create(vpos.x-vlook.x,vpos.y-vlook.y,vpos.z-vlook.z);sakuraV3.normalize(frontv);var sidev=sakuraV3.create(1,0,0);sakuraV3.cross(sidev,vup,frontv);sakuraV3.normalize(sidev);var topv=sakuraV3.create(1,0,0);sakuraV3.cross(topv,frontv,sidev);sakuraV3.normalize(topv);m[0]=sidev.x;m[1]=topv.x;m[2]=frontv.x;m[3]=0;m[4]=sidev.y;m[5]=topv.y;m[6]=frontv.y;m[7]=0;m[8]=sidev.z;m[9]=topv.z;m[10]=frontv.z;m[11]=0;m[12]=-(vpos.x*m[0]+vpos.y*m[4]+vpos.z*m[8]);m[13]=-(vpos.x*m[1]+vpos.y*m[5]+vpos.z*m[9]);m[14]=-(vpos.x*m[2]+vpos.y*m[6]+vpos.z*m[10]);m[15]=1;};

// --- 樱花背景主函数 ---
function initSakuraBg(){
  // 动态创建 Canvas
  var canvas = document.createElement('canvas');
  canvas.id = 'sakura-bg';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;opacity:0.5';
  document.body.insertBefore(canvas, document.body.firstChild);

  // 设置全屏尺寸
  var fullw = Math.max(document.body.clientWidth, document.body.scrollWidth, document.documentElement.scrollWidth, document.documentElement.clientWidth);
  var fullh = Math.max(document.body.clientHeight, document.body.scrollHeight, document.documentElement.scrollHeight, document.documentElement.clientHeight);
  canvas.width = fullw;
  canvas.height = fullh;

  // 初始化 WebGL
  var gl;
  try {
    gl = canvas.getContext('experimental-webgl');
  } catch(e) {
    console.warn('Sakura: WebGL not supported', e);
    return;
  }
  if(!gl) { console.warn('Sakura: WebGL not available'); return; }

  // requestAnimationFrame polyfill
  (function(w,r){w['r'+r]=w['r'+r]||w['webkitR'+r]||w['mozR'+r]||w['msR'+r]||w['oR'+r]||function(c){w.setTimeout(c,1000/60);};})(window,'equestAnimationFrame');

  // --- 渲染规格 ---
  var renderSpec = {
    width:0, height:0, aspect:1, array:new Float32Array(3),
    halfWidth:0, halfHeight:0, halfArray:new Float32Array(3),
    pointSize:{min:0,max:0},
    setSize:function(w,h){
      this.width=w;this.height=h;this.aspect=w/h;
      this.array[0]=w;this.array[1]=h;this.array[2]=this.aspect;
      this.halfWidth=Math.floor(w/2);this.halfHeight=Math.floor(h/2);
      this.halfArray[0]=this.halfWidth;this.halfArray[1]=this.halfHeight;this.halfArray[2]=this.halfWidth/this.halfHeight;
    }
  };

  // --- 时间 ---
  var timeInfo = {start:0,prev:0,delta:0,elapsed:0};

  // --- 投影 & 相机 ---
  var projection = {angle:60,nearfar:new Float32Array([0.1,100]),matrix:sakuraM44.createIdentity()};
  var camera = {
    position:sakuraV3.create(0,0,100), lookat:sakuraV3.create(0,0,0), up:sakuraV3.create(0,1,0),
    dof:sakuraV3.create(10,4,8), matrix:sakuraM44.createIdentity()
  };

  // --- 渲染目标管理 ---
  function deleteRenderTarget(rt){
    gl.deleteFramebuffer(rt.frameBuffer);
    gl.deleteRenderbuffer(rt.renderBuffer);
    gl.deleteTexture(rt.texture);
  }
  function createRenderTarget(w,h){
    var ret = {
      width:w,height:h,sizeArray:new Float32Array([w,h,w/h]),dtxArray:new Float32Array([1/w,1/h])
    };
    ret.frameBuffer=gl.createFramebuffer();
    ret.renderBuffer=gl.createRenderbuffer();
    ret.texture=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,ret.texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER,ret.frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ret.texture,0);
    gl.bindRenderbuffer(gl.RENDERBUFFER,ret.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,ret.renderBuffer);
    gl.bindTexture(gl.TEXTURE_2D,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return ret;
  }

  // --- Shader 编译 ---
  function compileShader(shtype,shsrc){
    var retsh=gl.createShader(shtype);
    gl.shaderSource(retsh,shsrc);
    gl.compileShader(retsh);
    if(!gl.getShaderParameter(retsh,gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(retsh));
      gl.deleteShader(retsh);
      return null;
    }
    return retsh;
  }
  function createShader(vtxsrc,frgsrc,uniformlist,attrlist){
    var vsh=compileShader(gl.VERTEX_SHADER,vtxsrc);
    var fsh=compileShader(gl.FRAGMENT_SHADER,frgsrc);
    if(vsh==null||fsh==null)return null;
    var prog=gl.createProgram();
    gl.attachShader(prog,vsh);gl.attachShader(prog,fsh);
    gl.deleteShader(vsh);gl.deleteShader(fsh);
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){console.error(gl.getProgramInfoLog(prog));return null;}
    if(uniformlist){prog.uniforms={};for(var i=0;i<uniformlist.length;i++)prog.uniforms[uniformlist[i]]=gl.getUniformLocation(prog,uniformlist[i]);}
    if(attrlist){prog.attributes={};for(var i=0;i<attrlist.length;i++)prog.attributes[attrlist[i]]=gl.getAttribLocation(prog,attrlist[i]);}
    return prog;
  }
  function useShader(prog){
    gl.useProgram(prog);
    for(var attr in prog.attributes)gl.enableVertexAttribArray(prog.attributes[attr]);
  }
  function unuseShader(prog){
    for(var attr in prog.attributes)gl.disableVertexAttribArray(prog.attributes[attr]);
    gl.useProgram(null);
  }

  // --- 粒子系统 ---
  var pointFlower = {};
  var BlossomParticle = function(){
    this.velocity=new Array(3);this.rotation=new Array(3);
    this.position=new Array(3);this.euler=new Array(3);
    this.size=1.0;this.alpha=1.0;this.zkey=0.0;
  };
  BlossomParticle.prototype.setVelocity=function(vx,vy,vz){this.velocity[0]=vx;this.velocity[1]=vy;this.velocity[2]=vz;};
  BlossomParticle.prototype.setRotation=function(rx,ry,rz){this.rotation[0]=rx;this.rotation[1]=ry;this.rotation[2]=rz;};
  BlossomParticle.prototype.setPosition=function(nx,ny,nz){this.position[0]=nx;this.position[1]=ny;this.position[2]=nz;};
  BlossomParticle.prototype.setEulerAngles=function(rx,ry,rz){this.euler[0]=rx;this.euler[1]=ry;this.euler[2]=rz;};
  BlossomParticle.prototype.setSize=function(s){this.size=s;};
  BlossomParticle.prototype.update=function(dt,et){
    this.position[0]+=this.velocity[0]*dt;this.position[1]+=this.velocity[1]*dt;this.position[2]+=this.velocity[2]*dt;
    this.euler[0]+=this.rotation[0]*dt;this.euler[1]+=this.rotation[1]*dt;this.euler[2]+=this.rotation[2]*dt;
  };

  function createPointFlowers(){
    var prm=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    renderSpec.pointSize={min:prm[0],max:prm[1]};
    pointFlower.program=createShader(SAKURA_SHADERS.sakura_point_vsh,SAKURA_SHADERS.sakura_point_fsh,['uProjection','uModelview','uResolution','uOffset','uDOF','uFade'],['aPosition','aEuler','aMisc']);
    useShader(pointFlower.program);
    pointFlower.offset=new Float32Array([0,0,0]);
    pointFlower.fader=sakuraV3.create(0,10,0);
    pointFlower.numFlowers=800;
    pointFlower.particles=new Array(pointFlower.numFlowers);
    pointFlower.dataArray=new Float32Array(pointFlower.numFlowers*(3+3+2));
    pointFlower.positionArrayOffset=0;
    pointFlower.eulerArrayOffset=pointFlower.numFlowers*3;
    pointFlower.miscArrayOffset=pointFlower.numFlowers*6;
    pointFlower.buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,pointFlower.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,pointFlower.dataArray,gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);
    unuseShader(pointFlower.program);
    for(var i=0;i<pointFlower.numFlowers;i++)pointFlower.particles[i]=new BlossomParticle();
  }

  function initPointFlowers(){
    pointFlower.area=sakuraV3.create(20,20,20);
    pointFlower.area.x=pointFlower.area.y*renderSpec.aspect;
    pointFlower.fader.x=10;pointFlower.fader.y=pointFlower.area.z;pointFlower.fader.z=0.1;
    var PI2=Math.PI*2;
    var tmpv3=sakuraV3.create(0,0,0);
    var tmpv=0;
    var symmetryrand=function(){return Math.random()*2-1;};
    for(var i=0;i<pointFlower.numFlowers;i++){
      var tmpprtcl=pointFlower.particles[i];
      tmpv3.x=symmetryrand()*0.3+0.8;tmpv3.y=symmetryrand()*0.2-1.0;tmpv3.z=symmetryrand()*0.3+0.5;
      sakuraV3.normalize(tmpv3);tmpv=2+Math.random()*1;
      tmpprtcl.setVelocity(tmpv3.x*tmpv,tmpv3.y*tmpv,tmpv3.z*tmpv);
      tmpprtcl.setRotation(symmetryrand()*PI2*0.5,symmetryrand()*PI2*0.5,symmetryrand()*PI2*0.5);
      tmpprtcl.setPosition(symmetryrand()*pointFlower.area.x,symmetryrand()*pointFlower.area.y,symmetryrand()*pointFlower.area.z);
      tmpprtcl.setEulerAngles(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2);
      tmpprtcl.setSize(0.9+Math.random()*0.1);
    }
  }

  function renderPointFlowers(){
    var PI2=Math.PI*2;
    var limit=[pointFlower.area.x,pointFlower.area.y,pointFlower.area.z];
    var repeatPos=function(prt,cmp,limit){if(Math.abs(prt.position[cmp])-prt.size*0.5>limit){if(prt.position[cmp]>0)prt.position[cmp]-=limit*2;else prt.position[cmp]+=limit*2;}};
    var repeatEuler=function(prt,cmp){prt.euler[cmp]=prt.euler[cmp]%PI2;if(prt.euler[cmp]<0)prt.euler[cmp]+=PI2;};
    for(var i=0;i<pointFlower.numFlowers;i++){
      var prtcl=pointFlower.particles[i];
      prtcl.update(timeInfo.delta,timeInfo.elapsed);
      repeatPos(prtcl,0,pointFlower.area.x);repeatPos(prtcl,1,pointFlower.area.y);repeatPos(prtcl,2,pointFlower.area.z);
      repeatEuler(prtcl,0);repeatEuler(prtcl,1);repeatEuler(prtcl,2);
      prtcl.alpha=1;
      prtcl.zkey=(camera.matrix[2]*prtcl.position[0]+camera.matrix[6]*prtcl.position[1]+camera.matrix[10]*prtcl.position[2]+camera.matrix[14]);
    }
    pointFlower.particles.sort(function(p0,p1){return p0.zkey-p1.zkey;});
    var ipos=pointFlower.positionArrayOffset;
    var ieuler=pointFlower.eulerArrayOffset;
    var imisc=pointFlower.miscArrayOffset;
    for(var i=0;i<pointFlower.numFlowers;i++){
      var prtcl=pointFlower.particles[i];
      pointFlower.dataArray[ipos]=prtcl.position[0];pointFlower.dataArray[ipos+1]=prtcl.position[1];pointFlower.dataArray[ipos+2]=prtcl.position[2];ipos+=3;
      pointFlower.dataArray[ieuler]=prtcl.euler[0];pointFlower.dataArray[ieuler+1]=prtcl.euler[1];pointFlower.dataArray[ieuler+2]=prtcl.euler[2];ieuler+=3;
      pointFlower.dataArray[imisc]=prtcl.size;pointFlower.dataArray[imisc+1]=prtcl.alpha;imisc+=2;
    }
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    var prog=pointFlower.program;useShader(prog);
    gl.uniformMatrix4fv(prog.uniforms.uProjection,false,projection.matrix);
    gl.uniformMatrix4fv(prog.uniforms.uModelview,false,camera.matrix);
    gl.uniform3fv(prog.uniforms.uResolution,renderSpec.array);
    gl.uniform3fv(prog.uniforms.uDOF,sakuraV3.arrayForm(camera.dof));
    gl.uniform3fv(prog.uniforms.uFade,sakuraV3.arrayForm(pointFlower.fader));
    gl.bindBuffer(gl.ARRAY_BUFFER,pointFlower.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,pointFlower.dataArray,gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(prog.attributes.aPosition,3,gl.FLOAT,false,0,pointFlower.positionArrayOffset*Float32Array.BYTES_PER_ELEMENT);
    gl.vertexAttribPointer(prog.attributes.aEuler,3,gl.FLOAT,false,0,pointFlower.eulerArrayOffset*Float32Array.BYTES_PER_ELEMENT);
    gl.vertexAttribPointer(prog.attributes.aMisc,2,gl.FLOAT,false,0,pointFlower.miscArrayOffset*Float32Array.BYTES_PER_ELEMENT);
    for(var i=1;i<2;i++){var zpos=i*-2;pointFlower.offset[0]=pointFlower.area.x*-1;pointFlower.offset[1]=pointFlower.area.y*-1;pointFlower.offset[2]=pointFlower.area.z*zpos;gl.uniform3fv(prog.uniforms.uOffset,pointFlower.offset);gl.drawArrays(gl.POINT,0,pointFlower.numFlowers);pointFlower.offset[0]=pointFlower.area.x*-1;pointFlower.offset[1]=pointFlower.area.y*1;pointFlower.offset[2]=pointFlower.area.z*zpos;gl.uniform3fv(prog.uniforms.uOffset,pointFlower.offset);gl.drawArrays(gl.POINT,0,pointFlower.numFlowers);pointFlower.offset[0]=pointFlower.area.x*1;pointFlower.offset[1]=pointFlower.area.y*-1;pointFlower.offset[2]=pointFlower.area.z*zpos;gl.uniform3fv(prog.uniforms.uOffset,pointFlower.offset);gl.drawArrays(gl.POINT,0,pointFlower.numFlowers);pointFlower.offset[0]=pointFlower.area.x*1;pointFlower.offset[1]=pointFlower.area.y*1;pointFlower.offset[2]=pointFlower.area.z*zpos;gl.uniform3fv(prog.uniforms.uOffset,pointFlower.offset);gl.drawArrays(gl.POINT,0,pointFlower.numFlowers);}
    pointFlower.offset[0]=0;pointFlower.offset[1]=0;pointFlower.offset[2]=0;gl.uniform3fv(prog.uniforms.uOffset,pointFlower.offset);gl.drawArrays(gl.POINT,0,pointFlower.numFlowers);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);unuseShader(prog);
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  }

  // --- 特效系统 ---
  var effectLib = {};
  function createEffectProgram(vtxsrc,frgsrc,exunifs,exattrs){
    var ret={};var unifs=['uResolution','uSrc','uDelta'];if(exunifs)unifs=unifs.concat(exunifs);var attrs=['aPosition'];if(exattrs)attrs=attrs.concat(exattrs);
    ret.program=createShader(vtxsrc,frgsrc,unifs,attrs);useShader(ret.program);
    ret.dataArray=new Float32Array([-1,-1,1,-1,-1,1,1,1]);ret.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ret.buffer);gl.bufferData(gl.ARRAY_BUFFER,ret.dataArray,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,null);unuseShader(ret.program);
    return ret;
  }
  function useEffect(fxobj,srctex){var prog=fxobj.program;useShader(prog);gl.uniform3fv(prog.uniforms.uResolution,renderSpec.array);if(srctex!=null){gl.uniform2fv(prog.uniforms.uDelta,srctex.dtxArray);gl.uniform1i(prog.uniforms.uSrc,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,srctex.texture);}}
  function drawEffect(fxobj){gl.bindBuffer(gl.ARRAY_BUFFER,fxobj.buffer);gl.vertexAttribPointer(fxobj.program.attributes.aPosition,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
  function unuseEffect(fxobj){unuseShader(fxobj.program);}

  function createEffectLib(){
    var cmnvtxsrc=SAKURA_SHADERS.fx_common_vsh;
    effectLib.sceneBg=createEffectProgram(cmnvtxsrc,SAKURA_SHADERS.bg_fsh,['uTimes'],null);
    effectLib.mkBrightBuf=createEffectProgram(cmnvtxsrc,SAKURA_SHADERS.fx_brightbuf_fsh,null,null);
    effectLib.dirBlur=createEffectProgram(cmnvtxsrc,SAKURA_SHADERS.fx_dirblur_r4_fsh,['uBlurDir'],null);
    effectLib.finalComp=createEffectProgram(SAKURA_SHADERS.pp_final_vsh,SAKURA_SHADERS.pp_final_fsh,['uBloom'],null);
  }

  function renderBackground(){
    gl.disable(gl.DEPTH_TEST);
    useEffect(effectLib.sceneBg,null);
    gl.uniform2f(effectLib.sceneBg.program.uniforms.uTimes,timeInfo.elapsed,timeInfo.delta);
    drawEffect(effectLib.sceneBg);
    unuseEffect(effectLib.sceneBg);
    gl.enable(gl.DEPTH_TEST);
  }

  // --- 后处理 ---
  var postProcess = {};
  function renderPostProcess(){
    gl.enable(gl.TEXTURE_2D);gl.disable(gl.DEPTH_TEST);
    var bindRT=function(rt,isclear){gl.bindFramebuffer(gl.FRAMEBUFFER,rt.frameBuffer);gl.viewport(0,0,rt.width,rt.height);if(isclear){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);}};
    bindRT(renderSpec.wHalfRT0,true);
    useEffect(effectLib.mkBrightBuf,renderSpec.mainRT);
    drawEffect(effectLib.mkBrightBuf);
    unuseEffect(effectLib.mkBrightBuf);
    for(var i=0;i<2;i++){var p=1.5+1*i;var s=2.0+1*i;bindRT(renderSpec.wHalfRT1,true);useEffect(effectLib.dirBlur,renderSpec.wHalfRT0);gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir,p,0.0,s,0.0);drawEffect(effectLib.dirBlur);unuseEffect(effectLib.dirBlur);bindRT(renderSpec.wHalfRT0,true);useEffect(effectLib.dirBlur,renderSpec.wHalfRT1);gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir,0.0,p,0.0,s);drawEffect(effectLib.dirBlur);unuseEffect(effectLib.dirBlur);}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,renderSpec.width,renderSpec.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    useEffect(effectLib.finalComp,renderSpec.mainRT);
    gl.uniform1i(effectLib.finalComp.program.uniforms.uBloom,1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,renderSpec.wHalfRT0.texture);
    drawEffect(effectLib.finalComp);
    unuseEffect(effectLib.finalComp);
    gl.enable(gl.DEPTH_TEST);
  }

  // --- 场景 ---
  var sceneStandBy = false;
  function createScene(){
    createEffectLib();
    renderBackground();
    createPointFlowers();
    renderPostProcess();
    sceneStandBy = true;
  }
  function initScene(){
    initPointFlowers();
    camera.position.z = pointFlower.area.z + projection.nearfar[0];
    projection.angle = Math.atan2(pointFlower.area.y, camera.position.z + pointFlower.area.z) * 180.0 / Math.PI * 2.0;
    sakuraM44.loadProjection(projection.matrix, renderSpec.aspect, projection.angle, projection.nearfar[0], projection.nearfar[1]);
  }
  function renderScene(){
    sakuraM44.loadLookAt(camera.matrix, camera.position, camera.lookat, camera.up);
    gl.enable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderSpec.mainRT.frameBuffer);
    gl.viewport(0, 0, renderSpec.mainRT.width, renderSpec.mainRT.height);
    gl.clearColor(0.005, 0, 0.05, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderBackground();
    renderPointFlowers();
    renderPostProcess();
  }

  // --- 窗口大小变化 ---
  function onResize(){
    var b=document.body;var d=document.documentElement;
    canvas.width=Math.max(b.clientWidth,b.scrollWidth,d.scrollWidth,d.clientWidth);
    canvas.height=Math.max(b.clientHeight,b.scrollHeight,d.scrollHeight,d.clientHeight);
    setViewports();
    if(sceneStandBy) initScene();
  }
  window.addEventListener('resize', onResize);

  function setViewports(){
    renderSpec.setSize(canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.5, 1.0);
    gl.viewport(0, 0, renderSpec.width, renderSpec.height);
    var rtfunc=function(rtname,rtw,rth){var rt=renderSpec[rtname];if(rt)deleteRenderTarget(rt);renderSpec[rtname]=createRenderTarget(rtw,rth);};
    rtfunc('mainRT',renderSpec.width,renderSpec.height);
    rtfunc('wFullRT0',renderSpec.width,renderSpec.height);
    rtfunc('wFullRT1',renderSpec.width,renderSpec.height);
    rtfunc('wHalfRT0',renderSpec.halfWidth,renderSpec.halfHeight);
    rtfunc('wHalfRT1',renderSpec.halfWidth,renderSpec.halfHeight);
  }

  // --- 启动 ---
  setViewports();
  createScene();
  initScene();
  timeInfo.start = new Date();
  timeInfo.prev = timeInfo.start;

  function animate(){
    var curdate = new Date();
    timeInfo.elapsed = (curdate - timeInfo.start) / 1000.0;
    timeInfo.delta = (curdate - timeInfo.prev) / 1000.0;
    timeInfo.prev = curdate;
    requestAnimationFrame(animate);
    renderScene();
  }
  animate();
}

// 启动樱花背景
initSakuraBg();