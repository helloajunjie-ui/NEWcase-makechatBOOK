//  17. 捏人工坊 · AI 人物生成器
// ═══════════════════════════════════════

// 一句话描述 → AI 生成完整人物档案
// 输出结构化 JSON：姓名/年龄/性别/外貌/身份/身世/性格/能力/口头禅/背景故事
const PROMPT_CHAR_CREATOR = '你是一个专业的角色设定专家。根据用户提供的一句话人物描述，生成一个完整、立体、有深度的人物档案。\n\n' +
  '请严格按照以下 JSON 格式输出，不要包含任何其他文字或 markdown 代码块标记：\n' +
  '{\n' +
  '  "name": "角色姓名",\n' +
  '  "age": "年龄（如：28岁 / 外表看起来约20岁，实际已活了三百年）",\n' +
  '  "gender": "性别",\n' +
  '  "badge": "一句话标签（如：废土独眼机械师 / 仙界落魄散修）",\n' +
  '  "appearance": "外貌详情（100-200字，包含体型、面容、穿着、标志性特征）",\n' +
  '  "identity": "身份与职业",\n' +
  '  "background": "身世背景（150-300字，包含出身、关键经历、转折点）",\n' +
  '  "personality": "性格特征（50-100字，包含核心性格、矛盾点、习惯）",\n' +
  '  "ability": "能力与特长（50-100字）",\n' +
  '  "catchphrase": "经典口头禅或座右铭",\n' +
  '  "story": "一段简短的背景故事或高光时刻（100-200字）"\n' +
  '}\n\n' +
  '要求：人物要有血有肉，有矛盾感和成长弧光，避免脸谱化。外貌、身世、性格要相互呼应。';

async function generateCharacter() {
  var seedInput = $('char-seed-input');
  var seed = seedInput.value.trim();
  if (!seed) {
    setStatus('⚠️ 请先输入人物描述', 'err');
    return;
  }

  // 检查 AI 配置
  var aiCfg = loadAIConfig();
  if (!aiCfg || !aiCfg.endpoint || !aiCfg.key) {
    setStatus('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key', 'err');
    return;
  }

  await withLoading('btn-gen-character', '🎨 AI 正在捏人', async function() {
    var response = await callAI(PROMPT_CHAR_CREATOR, seed, true);

    // 如果返回的是字符串（JSON 解析失败），尝试提取 JSON
    var charData;
    if (typeof response === 'string') {
      var jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { charData = JSON.parse(jsonMatch[0]); } catch(e) { charData = null; }
      } else {
        charData = null;
      }
    } else {
      charData = response;
    }

    if (!charData || !charData.name) {
      throw new Error('AI 返回的人物数据不完整，请重试');
    }

    // 保存到 localStorage 供剧本车间导入
    try { localStorage.setItem('_last_char_result', JSON.stringify(charData)); } catch(e) {}

    // 渲染人物卡片
    renderCharacterCard(charData);

    // 隐藏空状态，显示结果区
    $('char-empty-state').style.display = 'none';
    $('char-result-area').style.display = 'block';

    setStatus('🎉 人物「' + charData.name + '」已生成', 'ok');
  });
}

function renderCharacterCard(data) {
  $('char-name').textContent = data.name || '—';
  $('char-badge').textContent = data.badge || data.gender || '—';

  var sections = [
    { title: '📋 基本信息', items: [
      { label: '年龄', value: data.age },
      { label: '性别', value: data.gender },
      { label: '身份', value: data.identity },
    ]},
    { title: '👤 外貌详情', text: data.appearance },
    { title: '📜 身世背景', text: data.background },
    { title: '💭 性格特征', text: data.personality },
    { title: '⚡ 能力特长', text: data.ability },
    { title: '💬 口头禅', text: data.catchphrase },
    { title: '🌟 背景故事', text: data.story },
  ];

  var html = '';
  sections.forEach(function(s) {
    html += '<div class="char-section">';
    html += '<div class="char-section-title">' + s.title + '</div>';
    if (s.items) {
      s.items.forEach(function(item) {
        if (item.value) {
          html += '<p><strong>' + item.label + '：</strong>' + escapeHtml(item.value) + '</p>';
        }
      });
    }
    if (s.text) {
      html += '<p>' + escapeHtml(s.text) + '</p>';
    }
    html += '</div>';
  });

  $('char-card-body').innerHTML = html;

  // 存储当前人物数据供复制使用
  window._currentCharData = data;
}

function copyCharacterProfile() {
  var data = window._currentCharData;
  if (!data) {
    setStatus('⚠️ 没有可复制的人物档案', 'err');
    return;
  }

  var SEP = '════════════════════════════════';
  var text = SEP + '\n' +
    '          🧑 人物档案\n' +
    SEP + '\n\n' +
    '【姓名】' + (data.name || '—') + '\n' +
    '【年龄】' + (data.age || '—') + '\n' +
    '【性别】' + (data.gender || '—') + '\n' +
    '【身份】' + (data.identity || '—') + '\n' +
    '【标签】' + (data.badge || '—') + '\n\n' +
    '─── 外貌详情 ───\n' + (data.appearance || '—') + '\n\n' +
    '─── 身世背景 ───\n' + (data.background || '—') + '\n\n' +
    '─── 性格特征 ───\n' + (data.personality || '—') + '\n\n' +
    '─── 能力特长 ───\n' + (data.ability || '—') + '\n\n' +
    '─── 口头禅 ───\n' + (data.catchphrase || '—') + '\n\n' +
    '─── 背景故事 ───\n' + (data.story || '—') + '\n\n' +
    SEP + '\n' +
    '由「尼可剧本工具 · 捏人工坊」生成';

  navigator.clipboard.writeText(text).then(function() {
    setStatus('📋 人物档案已复制到剪贴板', 'ok');
  }).catch(function() {
    // fallback
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setStatus('📋 人物档案已复制到剪贴板', 'ok');
  });
}

// ── 捏人工坊事件绑定 ──
$('btn-gen-character').addEventListener('click', generateCharacter);
$('btn-copy-char').addEventListener('click', copyCharacterProfile);
$('btn-regenerate-char').addEventListener('click', generateCharacter);

// 回车触发生成
$('char-seed-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generateCharacter();
  }
});

// 捏人视图切换
$('nav-char-creator').addEventListener('click', function() {
  switchView('char-creator');
});

// ═══════════════════════════════════════
//  16.5 世界观构建 · AI World Builder
// ═══════════════════════════════════════

var PROMPT_WORLD_BUILDER = '你是一个专业的世界观构建专家。根据用户提供的一句话世界设定，构建一个完整、自洽、有深度的世界观档案。\n\n' +
  '请严格按照以下 JSON 格式输出，不要包含任何其他文字或 markdown 代码块标记：\n' +
  '{\n' +
  '  "name": "世界名称",\n' +
  '  "badge": "一句话标签（如：灵气复苏·赛博修仙 / 废土冰河纪）",\n' +
  '  "era": "时代背景（历史时期、纪元、年份）",\n' +
  '  "geography": "地理环境（主要区域、地貌特征、气候）",\n' +
  '  "laws": "核心法则（这个世界运行的底层规则、物理/魔法规律）",\n' +
  '  "extra": "其他补充内容（包含主要势力、种族、科技体系、冲突危机、标志场景、氛围关键词等，用自然段落描述，200-500字）"\n' +
  '}\n\n' +
  '要求：世界观要有内在逻辑自洽性，核心法则要独特且有延展性，地理环境要服务于世界观氛围。extra 字段用于收纳所有无法归入上述字段的丰富细节。';

async function generateWorld() {
  var seedInput = $('world-seed-input');
  var seed = seedInput.value.trim();
  if (!seed) {
    setStatus('⚠️ 请先输入世界设定描述', 'err');
    return;
  }

  var aiCfg = loadAIConfig();
  if (!aiCfg || !aiCfg.endpoint || !aiCfg.key) {
    setStatus('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key', 'err');
    return;
  }

  await withLoading('btn-gen-world', '🌍 AI 正在构建世界观', async function() {
    var response = await callAI(PROMPT_WORLD_BUILDER, seed, true);

    var worldData;
    if (typeof response === 'string') {
      var jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { worldData = JSON.parse(jsonMatch[0]); } catch(e) { worldData = null; }
      } else {
        worldData = null;
      }
    } else {
      worldData = response;
    }

    if (!worldData || !worldData.name) {
      throw new Error('AI 返回的世界观数据不完整，请重试');
    }

    // 保存到 localStorage 供剧本车间导入
    try { localStorage.setItem('_last_world_result', JSON.stringify(worldData)); } catch(e) {}

    renderWorldCard(worldData);

    $('world-empty-state').style.display = 'none';
    $('world-result-area').style.display = 'block';

    setStatus('🌍 世界观「' + worldData.name + '」已构建完成', 'ok');
  });
}

function renderWorldCard(data) {
  $('world-name').textContent = data.name || '—';
  $('world-badge').textContent = data.badge || '—';

  // 通用字段（始终显示）
  var sections = [
    { title: '📖 时代背景', text: data.era },
    { title: '🗺️ 地理环境', text: data.geography },
    { title: '⚖️ 核心法则', text: data.laws },
  ];

  var html = '';
  sections.forEach(function(s) {
    if (s.text) {
      html += '<div class="char-section">';
      html += '<div class="char-section-title">' + s.title + '</div>';
      html += '<p>' + escapeHtml(s.text) + '</p>';
      html += '</div>';
    }
  });

  // 补充内容（折叠）
  if (data.extra) {
    html += '<div class="char-section">';
    html += '<div class="char-section-title">📦 补充内容</div>';
    html += '<div class="world-extra-toggle" id="world-extra-toggle">';
    html += '  展开更多细节 <span class="arrow">▼</span>';
    html += '</div>';
    html += '<div class="world-extra-content" id="world-extra-content">';
    html += '<p>' + escapeHtml(data.extra) + '</p>';
    html += '</div>';
    html += '</div>';
  }

  $('world-card-body').innerHTML = html;

  // 折叠面板交互
  var toggle = $('world-extra-toggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      var content = $('world-extra-content');
      var arrow = toggle.querySelector('.arrow');
      var isOpen = content.classList.toggle('open');
      arrow.classList.toggle('open', isOpen);
      toggle.textContent = isOpen ? '收起补充内容 ▲' : '展开更多细节 ▼';
      // 重新插入箭头元素
      var newArrow = document.createElement('span');
      newArrow.className = 'arrow' + (isOpen ? ' open' : '');
      newArrow.textContent = isOpen ? '▲' : '▼';
      toggle.appendChild(newArrow);
    });
  }

  window._currentWorldData = data;
}

function copyWorldProfile() {
  var data = window._currentWorldData;
  if (!data) {
    setStatus('⚠️ 没有可复制的世界观档案', 'err');
    return;
  }

  var SEP = '════════════════════════════════';
  var text = SEP + '\n' +
    '          🌍 世界观档案\n' +
    SEP + '\n\n' +
    '【世界名称】' + (data.name || '—') + '\n' +
    '【标签】' + (data.badge || '—') + '\n\n' +
    '─── 时代背景 ───\n' + (data.era || '—') + '\n\n' +
    '─── 地理环境 ───\n' + (data.geography || '—') + '\n\n' +
    '─── 核心法则 ───\n' + (data.laws || '—') + '\n\n';

  if (data.extra) {
    text += '─── 补充内容 ───\n' + data.extra + '\n\n';
  }

  text += SEP + '\n' +
    '由「尼可剧本工具 · 世界观构建」生成';

  navigator.clipboard.writeText(text).then(function() {
    setStatus('📋 世界观档案已复制到剪贴板', 'ok');
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setStatus('📋 世界观档案已复制到剪贴板', 'ok');
  });
}

// ── 世界观构建事件绑定 ──
$('btn-gen-world').addEventListener('click', generateWorld);
$('btn-copy-world').addEventListener('click', copyWorldProfile);
$('btn-regenerate-world').addEventListener('click', generateWorld);

// 回车触发生成
$('world-seed-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generateWorld();
  }
});

// 世界观视图切换
$('nav-world-builder').addEventListener('click', function() {
  switchView('world-builder');
});

// ═══════════════════════════════════════
//  16.75 体系工坊 · Power System Builder
// ═══════════════════════════════════════

var PROMPT_POWER_BUILDER = '你是一个专业的体系架构设计师，擅长构建各种力量体系、升级规则和能力框架。根据用户提供的一句话描述，构建一个完整、自洽、有层次的体系框架。\n\n' +
  '请严格按照以下 JSON 格式输出，不要包含任何其他文字或 markdown 代码块标记：\n' +
  '{\n' +
  '  "name": "体系名称",\n' +
  '  "badge": "一句话标签（如：九阶修仙·雷法专精 / D→SSS 异能觉醒）",\n' +
  '  "type": "体系类型（修炼体系/异能体系/功法体系/血脉体系/装备体系/其他）",\n' +
  '  "levels": "等级划分（从低到高列出所有等级，用 → 连接，如：练气→筑基→金丹→元婴→化神→渡劫→大乘）",\n' +
  '  "mechanics": "核心机制（体系运行的核心规则，如突破方式、觉醒条件、升级所需资源等，100-200字）",\n' +
  '  "extra": "其他补充内容（包含各等级详细描述、特殊能力分支、稀有变异路线、体系间的克制关系、相关传说或禁忌等，用自然段落描述，200-500字）"\n' +
  '}\n\n' +
  '要求：体系要有清晰的递进逻辑，每个等级要有明确的提升维度，核心机制要独特且有可玩性。extra 字段用于收纳所有无法归入上述字段的丰富细节。';

async function generatePowerSystem() {
  var seedInput = $('power-seed-input');
  var seed = seedInput.value.trim();
  if (!seed) {
    setStatus('⚠️ 请先输入体系设定描述', 'err');
    return;
  }

  var aiCfg = loadAIConfig();
  if (!aiCfg || !aiCfg.endpoint || !aiCfg.key) {
    setStatus('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key', 'err');
    return;
  }

  await withLoading('btn-gen-power', '⚡ AI 正在构建体系', async function() {
    var response = await callAI(PROMPT_POWER_BUILDER, seed, true);

    var powerData;
    if (typeof response === 'string') {
      var jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { powerData = JSON.parse(jsonMatch[0]); } catch(e) { powerData = null; }
      } else {
        powerData = null;
      }
    } else {
      powerData = response;
    }

    if (!powerData || !powerData.name) {
      throw new Error('AI 返回的体系数据不完整，请重试');
    }

    // 保存到 localStorage 供剧本车间导入
    try { localStorage.setItem('_last_power_result', JSON.stringify(powerData)); } catch(e) {}

    renderPowerCard(powerData);

    $('power-empty-state').style.display = 'none';
    $('power-result-area').style.display = 'block';

    setStatus('⚡ 体系「' + powerData.name + '」已构建完成', 'ok');
  });
}

function renderPowerCard(data) {
  $('power-name').textContent = data.name || '—';
  $('power-badge').textContent = data.badge || data.type || '—';

  var sections = [
    { title: '🏷️ 体系类型', text: data.type },
    { title: '📊 等级划分', text: data.levels },
    { title: '⚙️ 核心机制', text: data.mechanics },
  ];

  var html = '';
  sections.forEach(function(s) {
    if (s.text) {
      html += '<div class="char-section">';
      html += '<div class="char-section-title">' + s.title + '</div>';
      html += '<p>' + escapeHtml(s.text) + '</p>';
      html += '</div>';
    }
  });

  // 补充内容（折叠）
  if (data.extra) {
    html += '<div class="char-section">';
    html += '<div class="char-section-title">📦 补充内容</div>';
    html += '<div class="world-extra-toggle" id="power-extra-toggle">';
    html += '  展开更多细节 <span class="arrow">▼</span>';
    html += '</div>';
    html += '<div class="world-extra-content" id="power-extra-content">';
    html += '<p>' + escapeHtml(data.extra) + '</p>';
    html += '</div>';
    html += '</div>';
  }

  $('power-card-body').innerHTML = html;

  // 折叠面板交互
  var toggle = $('power-extra-toggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      var content = $('power-extra-content');
      var isOpen = content.classList.toggle('open');
      toggle.innerHTML = isOpen ? '收起补充内容 <span class="arrow open">▲</span>' : '展开更多细节 <span class="arrow">▼</span>';
    });
  }

  window._currentPowerData = data;
}

function copyPowerSystem() {
  var data = window._currentPowerData;
  if (!data) {
    setStatus('⚠️ 没有可复制的体系档案', 'err');
    return;
  }

  var SEP = '════════════════════════════════';
  var text = SEP + '\n' +
    '          ⚡ 体系档案\n' +
    SEP + '\n\n' +
    '【体系名称】' + (data.name || '—') + '\n' +
    '【标签】' + (data.badge || '—') + '\n' +
    '【类型】' + (data.type || '—') + '\n\n' +
    '─── 等级划分 ───\n' + (data.levels || '—') + '\n\n' +
    '─── 核心机制 ───\n' + (data.mechanics || '—') + '\n\n';

  if (data.extra) {
    text += '─── 补充内容 ───\n' + data.extra + '\n\n';
  }

  text += SEP + '\n' +
    '由「尼可剧本工具 · 体系工坊」生成';

  navigator.clipboard.writeText(text).then(function() {
    setStatus('📋 体系档案已复制到剪贴板', 'ok');
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setStatus('📋 体系档案已复制到剪贴板', 'ok');
  });
}

// ── 体系工坊事件绑定 ──
$('btn-gen-power').addEventListener('click', generatePowerSystem);
$('btn-copy-power').addEventListener('click', copyPowerSystem);
$('btn-regenerate-power').addEventListener('click', generatePowerSystem);

// 回车触发生成
$('power-seed-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generatePowerSystem();
  }
});

// 体系视图切换
$('nav-power-builder').addEventListener('click', function() {
  switchView('power-builder');
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
  '【功能与交互要求】（强制实现，必须全部手写原生 JS，不可依赖任何外部库）：\n' +
  '1. 页面上半部分：展示剧本标题、标签、高燃的背景简介。\n' +
  '2. 页面下半部分：必须提供一个"玩家自定义档案"的表单。包含：姓名、性别、年龄、表面身份/职业、外貌特征、额外隐藏背景(Textarea)。\n' +
  '3. 必须提供 3-5 个契合世界观的【预设词卡片/标签】，点击后自动填入对应输入框（用 onclick 直接绑定，不要用 addEventListener）。\n' +
  '4. 页面最底部：必须有一个引人注目的【复制档案并启程】按钮，用 onclick 直接绑定。\n' +
  '5. 复制功能实现（必须严格按以下方式）：\n' +
  '   - 点击复制按钮后，读取所有表单字段的值\n' +
  '   - 拼接成一段完整的角色档案文本，格式如："姓名：xxx\\n性别：xxx\\n年龄：xxx\\n身份：xxx\\n外貌：xxx\\n隐藏背景：xxx\\n\\n=> 档案确认完毕。请根据上述我的设定，开始游戏剧情第一幕。"\n' +
  '   - 使用 navigator.clipboard.writeText() 写入剪贴板\n' +
  '   - 按钮文字变为"✅ 复制成功！"，1.5 秒后恢复原样\n' +
  '   - 如果某个字段为空，自动填入"待定"或随机生成一个符合世界观的默认值，不允许留空\n\n' +
  '【输出限制】：\n' +
  '直接输出完整的 <!DOCTYPE html> 代码，绝对不要包裹在 ```html ``` 标记中，不要输出任何解释性废话。';

/**
 * 弹出主角身份确认 dialog
 * @param {string} hint - 从剧本中提取的主角线索，预填到输入框
 * @returns {Promise<string|null>} - 用户输入的主角身份，null 表示取消
 */
function askProtagonist(hint) {
  return new Promise(function(resolve) {
    var dialog = document.getElementById('protagonist-dialog');
    var input = document.getElementById('protagonist-input');
    var confirmBtn = document.getElementById('btn-confirm-protagonist');
    var skipBtn = document.getElementById('btn-skip-protagonist');
    var closeBtn = document.getElementById('btn-close-protagonist');

    if (!dialog || !input) {
      // fallback: 直接返回 hint
      resolve(hint);
      return;
    }

    // 预填建议值
    input.value = hint;

    function cleanup() {
      dialog.close();
      confirmBtn.removeEventListener('click', onConfirm);
      skipBtn.removeEventListener('click', onSkip);
      closeBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
    }

    function onConfirm() {
      var val = input.value.trim();
      cleanup();
      resolve(val || hint);
    }

    function onSkip() {
      cleanup();
      resolve(hint);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    confirmBtn.addEventListener('click', onConfirm);
    skipBtn.addEventListener('click', onSkip);
    closeBtn.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);

    dialog.showModal();
  });
}

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

  // 获取剧本数据
  var entry = await dbGet(scriptId);
  if (!entry || !entry.uif) {
    setStatus('❌ 剧本数据不存在', 'err');
    return;
  }

  var uif = entry.uif;
  var meta = uif.meta || {};
  var prompts = uif.prompts || {};
  var mainPrompt = prompts.mainPrompt || '';

  // 直接从 meta.protagonist 读取已确认的主角（Step 2 时已定下）
  var protagonist = meta.protagonist || '';

  withLoading('btnGenHtml', '✨ AI 正在铸造专属主题宣发页', async function() {
    var worldBook = uif.worldBook || [];
    var title = meta.title || '未命名剧本';
    var summary = meta.summary || '';
    var description = meta.description || '';
    var worldview = prompts.worldview || '';
    var tags = (meta.tags || []).join(', ');

    // 提取世界书摘要
    var wbSummary = worldBook.map(function(wb) {
      return wb.keywords ? wb.keywords.slice(0, 3).join('/') : (wb.title || '条目');
    }).join(', ');

    // 构建用户消息：剧本背景信息 + 主角身份
    var userMsg = '剧本标题：' + title + '\n' +
      '剧本标签：' + tags + '\n' +
      (protagonist ? '玩家扮演角色：' + protagonist + '\n' : '') +
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
  // 新增：素材导入 & 主角
  materials: [],    // 导入的素材 [{ type, label, content }]
  protagonist: '',  // 玩家扮演角色
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

// ── Step 2: 素材导入 ──
// 从捏人/世界观/体系工具的结果中导入素材
function getLastResult(storageKey) {
  try {
    var raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function importMaterial(type, label) {
  var storageKey = '';
  if (type === 'char') storageKey = '_last_char_result';
  else if (type === 'world') storageKey = '_last_world_result';
  else if (type === 'power') storageKey = '_last_power_result';
  else return;

  var data = getLastResult(storageKey);
  if (!data) {
    setStatus('⚠️ 没有找到已生成的' + label + '，请先在对应工具中生成', 'err');
    return;
  }

  // 检查是否已导入相同类型
  if (genState.materials.some(function(m) { return m.type === type; })) {
    setStatus('⚠️ ' + label + ' 已导入，如需更新请先清除', 'err');
    return;
  }

  var content = '';
  if (typeof data === 'object') {
    // 将对象展平为可读文本
    Object.keys(data).forEach(function(k) {
      var v = data[k];
      if (Array.isArray(v)) {
        content += k + '：' + v.join('、') + '\n';
      } else if (typeof v === 'object' && v !== null) {
        content += k + '：\n';
        Object.keys(v).forEach(function(sk) {
          var sv = v[sk];
          if (typeof sv === 'string') content += '  ' + sk + '：' + sv + '\n';
        });
      } else if (typeof v === 'string') {
        content += k + '：' + v + '\n';
      }
    });
  } else {
    content = String(data);
  }

  genState.materials.push({ type: type, label: label, content: content });
  renderImportedMaterials();
  setStatus('✅ 已导入' + label, 'ok');
}

function renderImportedMaterials() {
  var container = $('gen-imported-materials');
  if (!container) return;
  if (genState.materials.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = genState.materials.map(function(m) {
    return '<div class="imported-material-item">' +
      '<span class="mat-label">' + escapeHtml(m.label) + '</span>' +
      escapeHtml(m.content.slice(0, 120)) + (m.content.length > 120 ? '...' : '') +
      '</div>';
  }).join('');
}

// 素材导入按钮
$('btn-import-char').addEventListener('click', function() { importMaterial('char', '🧑 捏人'); });
$('btn-import-world').addEventListener('click', function() { importMaterial('world', '🌍 世界观'); });
$('btn-import-power').addEventListener('click', function() { importMaterial('power', '⚡ 体系'); });

// 素材区折叠切换
var toggleMaterials = $('toggle-materials');
if (toggleMaterials) {
  toggleMaterials.addEventListener('click', function() {
    var body = $('gen-materials-area');
    if (body) {
      var isHidden = body.style.display === 'none';
      body.style.display = isHidden ? '' : 'none';
      toggleMaterials.classList.toggle('open', isHidden);
    }
  });
  // 默认折叠
  var matBody = $('gen-materials-area');
  if (matBody) matBody.style.display = 'none';
}

$('btn-to-step-3').addEventListener('click', function() {
  if (!genState.selectedDraft) return;

  // 保存主角输入
  var protoInput = $('gen-protagonist-input');
  if (protoInput) {
    genState.protagonist = protoInput.value.trim();
  }

  withLoading('btn-to-step-3', '📝 AI 正在膨胀提示词', async function() {
    var card = genState.selectedDraft;
    var userMsg = '剧本标题：' + card.title + '\n核心冲突：' + card.conflict +
      '\n详细设定：' + card.desc + '\n标签：' + (card.tags || []).join('、');

    // 追加素材上下文
    if (genState.materials.length > 0) {
      userMsg += '\n\n【玩家提供的素材】\n';
      genState.materials.forEach(function(m) {
        userMsg += '--- ' + m.label + ' ---\n' + m.content + '\n';
      });
    }

    // 追加主角身份
    if (genState.protagonist) {
      userMsg += '\n【玩家扮演角色】\n' + genState.protagonist + '\n';
    }

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
function renderWorldBookList() {
  var list = $('gen-wb-list');
  if (!list) return;
  list.innerHTML = '';
  if (genState.worldBook.length === 0) {
    list.innerHTML = '<div class="cards-placeholder">未萃取到世界书条目</div>';
  } else {
    genState.worldBook.forEach(function(wb) {
      var div = document.createElement('div');
      div.className = 'gen-wb-item';
      div.innerHTML = '<div class="wb-keywords">🔑 ' + escapeHtml((wb.keywords || []).join('、')) + '</div>' +
        '<div class="wb-content">' + escapeHtml(wb.content || '') + '</div>';
      list.appendChild(div);
    });
  }
}

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

    // 注入主角和素材上下文
    var contextMsg = promptText;
    if (genState.protagonist) {
      contextMsg += '\n\n【玩家扮演角色】\n' + genState.protagonist;
    }
    if (genState.materials.length > 0) {
      contextMsg += '\n\n【玩家提供的素材】\n';
      genState.materials.forEach(function(m) {
        contextMsg += '--- ' + m.label + ' ---\n' + m.content + '\n';
      });
    }

    var wbResult = await callAI(systemPrompt, contextMsg, true);
    var wbList = Array.isArray(wbResult) ? wbResult : [];
    genState.worldBook = wbList;

    renderWorldBookList();
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

// ── Step 4: 世界书迭代 ──
// 玩家可追加指令，AI 增量生成新条目合并到现有世界书
$('btn-iterate-wb').addEventListener('click', function() {
  var iterateInput = $('gen-wb-iterate-input');
  var instruction = iterateInput ? iterateInput.value.trim() : '';
  if (!instruction) {
    setStatus('请输入要追加的内容描述', 'err');
    return;
  }

  withLoading('btn-iterate-wb', '🚀 AI 正在追加世界书', async function() {
    var promptText = genState.prompts ? (genState.prompts.systemPrompt || genState.prompts.expanded) : '';

    var systemPrompt = '你是一个世界书构建专家。当前已有一些世界书条目，根据用户的追加指令，生成新的世界书条目。' +
      '每条包含：keywords（触发关键词数组，3-5个词）、content（条目内容，50-100字）。' +
      '以 JSON 数组格式返回，不要 markdown 包裹。格式：[{"keywords":["关键词1","关键词2"],"content":"条目内容"}]';

    var userMsg = '【剧本核心设定】\n' + promptText.slice(0, 800) + '\n\n';
    if (genState.protagonist) {
      userMsg += '【玩家扮演角色】\n' + genState.protagonist + '\n\n';
    }
    userMsg += '【已有世界书条目】\n';
    genState.worldBook.forEach(function(wb, i) {
      userMsg += (i + 1) + '. ' + (wb.keywords || []).join('、') + ' → ' + (wb.content || '').slice(0, 60) + '\n';
    });
    userMsg += '\n【追加指令】\n' + instruction;

    var wbResult = await callAI(systemPrompt, userMsg, true);
    var newEntries = Array.isArray(wbResult) ? wbResult : [];
    if (newEntries.length === 0) {
      setStatus('⚠️ AI 未生成新条目，请调整指令重试', 'err');
      return;
    }

    // 合并到现有世界书
    genState.worldBook = genState.worldBook.concat(newEntries);
    renderWorldBookList();

    // 清空输入
    if (iterateInput) iterateInput.value = '';
    setStatus('✅ 已追加 ' + newEntries.length + ' 条世界书条目（共 ' + genState.worldBook.length + ' 条）', 'ok');
  });
});

// ── Step 4: 折叠/展开世界书迭代区 ──
var toggleWbIterate = $('toggle-wb-iterate');
if (toggleWbIterate) {
  toggleWbIterate.addEventListener('click', function() {
    var body = $('gen-wb-iterate-area');
    if (body) {
      var isHidden = body.style.display === 'none';
      body.style.display = isHidden ? '' : 'none';
      toggleWbIterate.classList.toggle('open', isHidden);
    }
  });
  // 默认折叠
  var wbIterateBody = $('gen-wb-iterate-area');
  if (wbIterateBody) wbIterateBody.style.display = 'none';
}

// ── Step 4: 向导内生成宣发页 ──
$('btn-gen-html-from-wizard').addEventListener('click', function() {
  if (!genState.selectedDraft || !genState.prompts) {
    setStatus('请先完成提示词生成', 'err');
    return;
  }

  // 检查 AI 配置
  var aiCfg = loadAIConfig();
  if (!aiCfg || !aiCfg.endpoint || !aiCfg.key) {
    setStatus('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key', 'err');
    return;
  }

  withLoading('btn-gen-html-from-wizard', '🌐 AI 正在铸造宣发页', async function() {
    var card = genState.selectedDraft;
    var promptText = genState.prompts.systemPrompt || genState.prompts.expanded || '';
    var protagonist = genState.protagonist || '';

    // 构建用户消息
    var userMsg = '剧本标题：' + (card.title || '') + '\n';
    if (protagonist) userMsg += '玩家扮演角色：' + protagonist + '\n';
    userMsg += '背景简介：' + (card.desc || '') + '\n';
    userMsg += '核心提示词：' + promptText.slice(0, 500) + '\n';

    // 世界书摘要
    if (genState.worldBook.length > 0) {
      userMsg += '世界书摘要：' + genState.worldBook.map(function(wb) {
        return wb.keywords ? wb.keywords.slice(0, 3).join('/') : '条目';
      }).join(', ') + '\n';
    }

    var response = await callAI(PROMPT_LANDING_PAGE, userMsg, false);
    var htmlContent = response.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!/<!DOCTYPE\s+html/i.test(htmlContent)) {
      if (htmlContent.indexOf('<html') === -1) {
        htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
          escapeHtml(card.title || '剧本') + ' - 专属宣发页</title></head><body>' + htmlContent + '</body></html>';
      }
    }

    // 预览
    var blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // 暂存到 genState 供保存时入库
    genState._landingPage = htmlContent;

    setStatus('🎉 宣发页已生成，保存剧本时将一并入库', 'ok');
  });
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

    // 构建 UIF 格式剧本（含主角信息和宣发页）
    var script = {
      meta: {
        title: card.title || '未命名剧本',
        summary: card.conflict || '',
        description: card.desc || '',
        tags: card.tags || [],
        source: 'generator',
        exportedAt: new Date().toISOString(),
        protagonist: genState.protagonist || '',  // 保存主角信息
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
      landingPage: genState._landingPage || '',  // 保存宣发页
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
      }
    }

    // 策略 2: IndexedDB 回退（含宣发页）
    var dbEntry = {
      uif: script,
      title: card.title || '未命名剧本',
      summary: card.conflict || '',
      sourceFormat: 'generator',
      tags: card.tags || [],
      worldBookCount: genState.worldBook.length,
      promptLength: promptText.length,
      htmlLandingPage: genState._landingPage || '',
      createdAt: Date.now(),
    };
    await dbAdd(dbEntry);
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
console.log('🤖 AI 反应堆待配置');
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