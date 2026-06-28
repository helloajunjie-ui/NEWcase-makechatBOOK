//  16. AI 反应堆 (BYOK) — 双模式
// ═══════════════════════════════════════
// 支持 DeepSeek 原生模式 + 中转站模式，双配置隔离存储

// ── 常量 ──
const AI_MODE_KEY = 'ai_active_mode';       // 'deepseek' | 'relay'
const AI_CFG_DS = 'ai_config_deepseek';
const AI_CFG_RELAY = 'ai_config_relay';

// ── 模式管理 ──
function getActiveMode() {
  return localStorage.getItem(AI_MODE_KEY) || 'deepseek';
}
function setActiveMode(mode) {
  localStorage.setItem(AI_MODE_KEY, mode);
}

function loadModeConfig(mode) {
  var key = mode === 'relay' ? AI_CFG_RELAY : AI_CFG_DS;
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveModeConfig(mode, config) {
  var key = mode === 'relay' ? AI_CFG_RELAY : AI_CFG_DS;
  localStorage.setItem(key, JSON.stringify(config));
}

// ── 获取当前激活的配置（供 callAI 使用） ──
function loadAIConfig() {
  return loadModeConfig(getActiveMode());
}

// ── callAI: 原生 LLM 调用接口 ──
// 支持任何兼容 OpenAI Chat Completions API 格式的端点
// expectJson=true 时自动解析 JSON 响应，失败时返回原始文本
async function callAI(systemPrompt, userMessage, expectJson) {
  var cfg = loadAIConfig();
  if (!cfg || !cfg.endpoint || !cfg.key) {
    throw new Error('请先在 🤖 AI 配置 中设置 API 端点和 Key');
  }

  var body = {
    model: cfg.model || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 4096,
  };

  var res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    var errText = await res.text().catch(function() { return ''; });
    throw new Error('AI 请求失败 (' + res.status + '): ' + (errText.slice(0, 200) || res.statusText));
  }

  var data = await res.json();
  var text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : (typeof data === 'string' ? data : JSON.stringify(data));

  if (expectJson) {
    try {
      var jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      var jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
      return JSON.parse(jsonStr);
    } catch {
      return text;
    }
  }
  return text;
}

// ── 获取中转站模型列表 ──
async function fetchRelayModels(endpoint, key) {
  var url = endpoint.replace(/\/chat\/completions\/?$/, '') + '/models';
  var res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + key },
  });
  if (!res.ok) throw new Error('获取模型列表失败 (' + res.status + ')');
  var data = await res.json();
  // 兼容多种返回格式: data 可能是数组或 {data:[...]}
  var models = data.data || data;
  if (!Array.isArray(models)) throw new Error('无法解析模型列表');
  return models.map(function(m) {
    return typeof m === 'string' ? m : (m.id || m.model || '');
  }).filter(Boolean);
}

// ── DOM 引用 ──
var aiDialog = $('ai-config-dialog');
// DeepSeek 模式字段
var aiEndpointDS = $('ai-endpoint-ds');
var aiModelDS = $('ai-model-ds');
var aiKeyDS = $('ai-key-ds');
// 中转站模式字段
var aiEndpointRelay = $('ai-endpoint-relay');
var aiKeyRelay = $('ai-key-relay');
var aiModelRelay = $('ai-model-relay');
var btnFetchModels = $('btn-fetch-models');
// Tab 按钮
var modeTabs = aiDialog.querySelectorAll('.ai-mode-tab');
var modePanels = {
  deepseek: $('ai-config-deepseek'),
  relay: $('ai-config-relay'),
};

// ── 切换 Tab ──
function switchAIMode(mode) {
  modeTabs.forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  if (modePanels.deepseek) modePanels.deepseek.classList.toggle('active', mode === 'deepseek');
  if (modePanels.relay) modePanels.relay.classList.toggle('active', mode === 'relay');
}

// ── 打开配置弹窗 ──
function openAIConfig() {
  var mode = getActiveMode();
  switchAIMode(mode);

  // 加载 DeepSeek 配置
  var dsCfg = loadModeConfig('deepseek');
  if (dsCfg) {
    aiEndpointDS.value = dsCfg.endpoint || '';
    aiModelDS.value = dsCfg.model || '';
    aiKeyDS.value = dsCfg.key || '';
  } else {
    aiEndpointDS.value = 'https://api.deepseek.com/v1/chat/completions';
    aiModelDS.value = 'deepseek-chat';
    aiKeyDS.value = '';
  }

  // 加载中转站配置
  var relayCfg = loadModeConfig('relay');
  if (relayCfg) {
    aiEndpointRelay.value = relayCfg.endpoint || 'https://api.yuegle.com/v1/chat/completions';
    aiKeyRelay.value = relayCfg.key || '';
    // 恢复模型下拉
    if (relayCfg.model) {
      var opt = document.createElement('option');
      opt.value = relayCfg.model;
      opt.textContent = relayCfg.model;
      opt.selected = true;
      aiModelRelay.innerHTML = '';
      aiModelRelay.appendChild(opt);
    }
  } else {
    aiEndpointRelay.value = 'https://api.yuegle.com/v1/chat/completions';
    aiKeyRelay.value = '';
    aiModelRelay.innerHTML = '<option value="">— 请先填入 Key 并获取模型列表 —</option>';
  }

  aiDialog.showModal();
}

function closeAIConfig() {
  aiDialog.close();
}

// ── Tab 点击事件 ──
modeTabs.forEach(function(tab) {
  tab.addEventListener('click', function() {
    switchAIMode(tab.dataset.mode);
  });
});

// ── 获取模型列表 ──
btnFetchModels.addEventListener('click', async function() {
  var endpoint = aiEndpointRelay.value.trim();
  var key = aiKeyRelay.value.trim();
  if (!endpoint || !key) {
    setStatus('请先填写中转站的 API 端点和 Key', 'err');
    return;
  }
  setStatus('正在获取模型列表...', 'busy');
  try {
    var models = await fetchRelayModels(endpoint, key);
    if (models.length === 0) {
      setStatus('未获取到可用模型', 'err');
      return;
    }
    aiModelRelay.innerHTML = '';
    models.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      aiModelRelay.appendChild(opt);
    });
    // 自动选择第一个
    aiModelRelay.selectedIndex = 0;
    setStatus('获取到 ' + models.length + ' 个模型 ✅', 'ok');
  } catch (e) {
    setStatus('获取模型列表失败: ' + e.message, 'err');
  }
});

// ── 关闭按钮 ──
$('btn-close-ai-config').addEventListener('click', closeAIConfig);
aiDialog.addEventListener('click', function(e) {
  if (e.target === aiDialog) closeAIConfig();
});

// ── 保存配置 ──
$('btn-save-ai-config').addEventListener('click', function() {
  // 获取当前激活的 tab
  var activeTab = aiDialog.querySelector('.ai-mode-tab.active');
  var mode = activeTab ? activeTab.dataset.mode : 'deepseek';

  var cfg;
  if (mode === 'relay') {
    var endpoint = aiEndpointRelay.value.trim();
    var key = aiKeyRelay.value.trim();
    var model = aiModelRelay.value;
    if (!endpoint || !key) {
      setStatus('请填写中转站的 API 端点和 Key', 'err');
      return;
    }
    cfg = { endpoint: endpoint, key: key, model: model || 'gpt-4o' };
  } else {
    var endpoint = aiEndpointDS.value.trim();
    var key = aiKeyDS.value.trim();
    var model = aiModelDS.value.trim();
    if (!endpoint || !key) {
      setStatus('请填写 DeepSeek 的 API 端点和 Key', 'err');
      return;
    }
    cfg = { endpoint: endpoint, key: key, model: model || 'deepseek-chat' };
  }

  saveModeConfig(mode, cfg);
  setActiveMode(mode);
  setStatus('AI 配置已保存（当前模式: ' + (mode === 'relay' ? '🔄 中转站' : '🔴 DeepSeek') + '）', 'ok');
  closeAIConfig();
});

// ── 测试连接 ──
$('btn-test-ai').addEventListener('click', async function() {
  var activeTab = aiDialog.querySelector('.ai-mode-tab.active');
  var mode = activeTab ? activeTab.dataset.mode : 'deepseek';

  var cfg;
  if (mode === 'relay') {
    cfg = {
      endpoint: aiEndpointRelay.value.trim(),
      model: aiModelRelay.value || 'gpt-4o',
      key: aiKeyRelay.value.trim(),
    };
  } else {
    cfg = {
      endpoint: aiEndpointDS.value.trim(),
      model: aiModelDS.value.trim() || 'deepseek-chat',
      key: aiKeyDS.value.trim(),
    };
  }

  if (!cfg.endpoint || !cfg.key) {
    setStatus('请先填写 API 端点和 Key', 'err');
    return;
  }

  setStatus('正在测试 AI 连接...', 'busy');
  try {
    var result = await callAI('你是一个连接测试助手。请仅回复"连接成功"四个字。', '测试连接', false);
    if (result.indexOf('连接成功') !== -1) {
      setStatus('AI 连接测试通过 ✅', 'ok');
    } else {
      setStatus('AI 响应异常: ' + result.slice(0, 60), 'err');
    }
  } catch (e) {
    setStatus('AI 连接失败: ' + e.message, 'err');
  }
});

// ── 初始加载：填充当前激活模式的配置到 DOM ──
(function initAIConfigUI() {
  var mode = getActiveMode();
  var cfg = loadModeConfig(mode);
  if (cfg) {
    if (mode === 'relay') {
      aiEndpointRelay.value = cfg.endpoint || 'https://api.yuegle.com/v1/chat/completions';
      aiKeyRelay.value = cfg.key || '';
      if (cfg.model) {
        var opt = document.createElement('option');
        opt.value = cfg.model;
        opt.textContent = cfg.model;
        opt.selected = true;
        aiModelRelay.innerHTML = '';
        aiModelRelay.appendChild(opt);
      }
    } else {
      aiEndpointDS.value = cfg.endpoint || '';
      aiModelDS.value = cfg.model || '';
      aiKeyDS.value = cfg.key || '';
    }
  } else {
    // 默认 DeepSeek 预设
    aiEndpointDS.value = 'https://api.deepseek.com/v1/chat/completions';
    aiModelDS.value = 'deepseek-chat';
    aiKeyDS.value = '';
  }
})();

$('btn-ai-config').addEventListener('click', openAIConfig);


// ═══════════════════════════════════════
