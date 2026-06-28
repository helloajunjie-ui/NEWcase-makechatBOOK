// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
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
// ═══════════════════════════════════════
function parseChunchao(raw) {
  const w = raw.work || raw;
  // 从 detailIntro/description 提取 HTML 网页（如果存在）
  var rawDesc = flexStr(w, 'detailIntro', 'description', 'intro') || '';
  var landingPage = '';
  var plainDesc = rawDesc;
  if (rawDesc.indexOf('<!DOCTYPE') !== -1 || rawDesc.indexOf('<html') !== -1) {
    landingPage = rawDesc;
    // 去掉 HTML 标签取纯文本作为 description
    plainDesc = rawDesc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainDesc.length > 500) plainDesc = plainDesc.slice(0, 500);
  }
  return {
    meta: {
      title: flexStr(w, 'title', 'name'),
      summary: (flexStr(w, 'intro', 'summary', 'description') || '').split('\n')[0].trim(),
      description: plainDesc,
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
    landingPage: landingPage,
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
  // 从 description/detailIntro 提取 HTML 网页（如果存在）
  var rawDesc = flexStr(raw, 'description', 'detailIntro') || '';
  var landingPage = '';
  var plainDesc = rawDesc;
  if (rawDesc.indexOf('<!DOCTYPE') !== -1 || rawDesc.indexOf('<html') !== -1) {
    landingPage = rawDesc;
    // 去掉 HTML 标签取纯文本作为 description
    plainDesc = rawDesc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainDesc.length > 500) plainDesc = plainDesc.slice(0, 500);
  }
  return {
    meta: {
      title: flexStr(raw, 'name', 'title'),
      summary: flexStr(raw, 'summary', 'intro').split('\n')[0].trim(),
      description: plainDesc,
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
    landingPage: landingPage,
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
// ═══════════════════════════════════════
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
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// ═══════════════════════════════════════