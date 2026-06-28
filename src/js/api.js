//  16. AI 反应堆 (BYOK) — 双模式
// ═══════════════════════════════════════
// 支持 DeepSeek 原生模式 + 中转站模式，双配置隔离存储
// 同一弹窗内 Tab 切换，因为同时只能使用一个 AI

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
function classifyFetchError(e) {
  var msg = e.message || String(e);
  // 网络不通 / 浏览器安全限制（file://）
  if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('NetworkError') !== -1) {
    return '🌐 网络请求失败：浏览器无法连接到 AI 服务器。\n可能原因：① 当前页面以 file:// 协议打开（请用 Live Server 或部署到 HTTP 服务后使用）；② 网络不通或 API 地址不可达；③ 浏览器安全策略拦截。';
  }
  // 超时
  if (msg.indexOf('timeout') !== -1 || msg.indexOf('Timeout') !== -1 || msg.indexOf('timed out') !== -1) {
    return '⏱️ AI 请求超时：服务器响应过慢，请检查网络或稍后重试。';
  }
  // DNS 解析失败
  if (msg.indexOf('DNS') !== -1 || msg.indexOf('ENOTFOUND') !== -1) {
    return '🌐 DNS 解析失败：API 域名无法解析，请检查 API 端点地址是否正确。';
  }
  // 连接被拒绝
  if (msg.indexOf('ECONNREFUSED') !== -1) {
    return '🔌 连接被拒绝：API 服务器拒绝连接，请检查端点地址和端口是否正确。';
  }
  // 证书错误
  if (msg.indexOf('certificate') !== -1 || msg.indexOf('SSL') !== -1 || msg.indexOf('CERT') !== -1) {
    return '🔒 SSL/TLS 证书错误：API 服务器证书异常，请检查端点地址或联系服务商。';
  }
  // 4xx / 5xx 类错误（由 callAI 内部 throw 的 Error）
  if (msg.indexOf('AI 请求失败') !== -1 || msg.indexOf('获取模型列表失败') !== -1) {
    return '🤖 ' + msg;
  }
  // 解析错误
  if (msg.indexOf('JSON') !== -1 || msg.indexOf('parse') !== -1 || msg.indexOf('Parse') !== -1) {
    return '📄 AI 返回数据解析失败：服务器返回了非预期的格式。可能是模型不兼容或 API 版本问题。';
  }
  // 其他未知错误
  return '❌ ' + msg;
}

// ── 智能拼接 OpenAI 兼容的聊天补全路径 ──
function ensureChatEndpoint(url) {
  var u = url.trim();
  if (u.indexOf('/chat/completions') !== -1) return u;
  // 去掉尾部斜杠，追加 /chat/completions
  return u.replace(/\/+$/, '') + '/chat/completions';
}

async function callAI(systemPrompt, userMessage, expectJson) {
  var cfg = loadAIConfig();
  if (!cfg || !cfg.endpoint || !cfg.key) {
    throw new Error('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key');
  }

  // ── 最高指令注入：强制前置到 System Prompt ──
  var supremeDirective = localStorage.getItem('aiSupremeDirective');
  var finalSystemPrompt = supremeDirective
    ? '【全局最高指令】\n' + supremeDirective + '\n\n---\n\n' + systemPrompt
    : systemPrompt;

  // 智能拼接路径：防止用户只填了 base URL 没加 /chat/completions
  var endpoint = ensureChatEndpoint(cfg.endpoint);

  // ── 优雅重载：userMessage 为数组时视为多轮对话历史 ──
  var messagesPayload = [{ role: 'system', content: finalSystemPrompt }];
  if (Array.isArray(userMessage)) {
    messagesPayload = messagesPayload.concat(userMessage);
  } else {
    messagesPayload.push({ role: 'user', content: String(userMessage) });
  }

  var body = {
    model: cfg.model || 'gpt-4o',
    messages: messagesPayload,
    temperature: 0.8,
    max_tokens: 4096,
  };

  var res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(classifyFetchError(e));
  }

  if (!res.ok) {
    var errText = await res.text().catch(function() { return ''; });
    var detail = errText.slice(0, 200) || res.statusText;
    if (res.status === 401 || res.status === 403) {
      throw new Error('🔑 API 认证失败 (' + res.status + ')：请检查 API Key 是否正确。' + (detail ? ' 服务器返回: ' + detail : ''));
    } else if (res.status === 404) {
      throw new Error('🤖 AI 接口返回 404：该 API 端点不支持聊天补全请求。\n可能原因：① 端点地址有误（检查是否以 /chat/completions 结尾）；② 该中转站使用非标准路径；③ 模型不支持。\n服务器返回: ' + detail);
    } else if (res.status === 429) {
      throw new Error('⏳ API 请求过于频繁 (' + res.status + ')：触发了速率限制，请稍后重试。');
    } else if (res.status >= 500) {
      throw new Error('🔴 AI 服务器错误 (' + res.status + ')：服务端异常，请稍后重试或联系服务商。' + (detail ? ' 详情: ' + detail : ''));
    } else {
      throw new Error('🤖 AI 请求失败 (' + res.status + ')：' + detail);
    }
  }

  var data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('📄 AI 返回数据解析失败：服务器返回了非 JSON 格式的数据。可能是网络代理或网关问题。');
  }

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
  // 智能拼接 models 路径：去掉 /chat/completions 后缀，追加 /models
  var base = endpoint.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
  var url = base + '/models';
  var res;
  try {
    res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + key },
    });
  } catch (e) {
    throw new Error(classifyFetchError(e));
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('🔑 API 认证失败 (' + res.status + ')：请检查中转站 API Key 是否正确。');
    } else if (res.status === 404) {
      throw new Error('🔗 模型列表接口不存在 (' + res.status + ')：请检查 API 端点地址是否正确。');
    } else {
      throw new Error('🤖 获取模型列表失败 (' + res.status + ')');
    }
  }
  var data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('📄 模型列表数据解析失败：服务器返回了非 JSON 格式的数据。');
  }
  var models = data.data || data;
  if (!Array.isArray(models)) throw new Error('📄 无法解析模型列表：服务器返回了非预期的数据格式。');
  return models.map(function(m) {
    return typeof m === 'string' ? m : (m.id || m.model || '');
  }).filter(Boolean);
}

// ═══════════════════════════════════════
//  弹窗交互
// ═══════════════════════════════════════

var aiDialog = $('ai-config-dialog');
var aiDsUrl = $('ai-ds-url');
var aiDsModel = $('ai-ds-model');
var aiDsKey = $('ai-ds-key');
var aiRelayUrl = $('ai-relay-url');
var aiRelayKey = $('ai-relay-key');
var aiRelayModel = $('ai-relay-model');

// ── 打开弹窗 ──
function openAIConfig() {
  var mode = getActiveMode();

  // 切换 Tab 到当前激活模式
  switchAITab(mode);

  // 加载 DeepSeek 配置
  var dsCfg = loadModeConfig('deepseek');
  if (dsCfg) {
    aiDsUrl.value = dsCfg.endpoint || '';
    aiDsModel.value = dsCfg.model || '';
    aiDsKey.value = dsCfg.key || '';
  } else {
    aiDsUrl.value = 'https://api.deepseek.com/v1/chat/completions';
    aiDsModel.value = 'deepseek-chat';
    aiDsKey.value = '';
  }

  // 加载中转站配置
  var relayCfg = loadModeConfig('relay');
  if (relayCfg) {
    aiRelayUrl.value = relayCfg.endpoint || 'https://api.yuegle.com/v1/chat/completions';
    aiRelayKey.value = relayCfg.key || '';
    if (relayCfg.model) {
      // select 下拉框：创建 option 并选中
      var opt = document.createElement('option');
      opt.value = relayCfg.model;
      opt.textContent = relayCfg.model;
      opt.selected = true;
      aiRelayModel.innerHTML = '';
      aiRelayModel.appendChild(opt);
    }
  } else {
    aiRelayUrl.value = 'https://api.yuegle.com/v1/chat/completions';
    aiRelayKey.value = '';
    aiRelayModel.innerHTML = '<option value="">-- 请先填入 Key 并获取模型列表 --</option>';
  }

  aiDialog.showModal();
}

function closeAIConfig() {
  aiDialog.close();
}

// ── 关闭按钮 ──
$('btn-close-ai').addEventListener('click', closeAIConfig);
aiDialog.addEventListener('click', function(e) {
  if (e.target === aiDialog) closeAIConfig();
});

// ── 保存配置 ──
$('btn-save-ai').addEventListener('click', function() {
  var activeBtn = aiDialog.querySelector('.ai-tab-btn.active');
  var mode = activeBtn ? activeBtn.dataset.mode : 'deepseek';

  var cfg;
  if (mode === 'relay') {
    var endpoint = aiRelayUrl.value.trim();
    var key = aiRelayKey.value.trim();
    var model = aiRelayModel.value.trim();
    if (!endpoint || !key) {
      setStatus('请填写中转站的 API 端点和 Key', 'err');
      return;
    }
    cfg = { endpoint: endpoint, key: key, model: model || 'gpt-4o' };
  } else {
    var endpoint = aiDsUrl.value.trim();
    var key = aiDsKey.value.trim();
    var model = aiDsModel.value.trim();
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

// ── 测试连接（用实时输入框的值直接 fetch，不经过 callAI） ──
$('btn-test-ai').addEventListener('click', async function() {
  var activeBtn = aiDialog.querySelector('.ai-tab-btn.active');
  var mode = activeBtn ? activeBtn.dataset.mode : 'deepseek';
  var feedback = $('ai-global-feedback');

  // 从输入框读取实时值
  var rawUrl, key, model;
  if (mode === 'relay') {
    rawUrl = aiRelayUrl.value.trim();
    model = aiRelayModel.value.trim() || 'gpt-4o';
    key = aiRelayKey.value.trim();
  } else {
    rawUrl = aiDsUrl.value.trim();
    model = aiDsModel.value.trim() || 'deepseek-chat';
    key = aiDsKey.value.trim();
  }

  if (!rawUrl || !key) {
    var msg = '请先填写 API 端点和 Key';
    setStatus(msg, 'err');
    if (feedback) { feedback.textContent = '⚠️ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
    return;
  }

  // 智能拼接路径：防止用户只填了 base URL 没加 /chat/completions
  var endpoint = ensureChatEndpoint(rawUrl);

  setStatus('正在测试 AI 连接...', 'busy');
  if (feedback) { feedback.textContent = '⏳ 正在测试 AI 连接...'; feedback.style.display = 'block'; feedback.style.background = 'rgba(251,191,36,0.15)'; feedback.style.color = '#fbbf24'; }

  // 直接用实时输入值发起 fetch，不经过 callAI（callAI 只读 localStorage）
  var testBody = {
    model: model,
    messages: [
      { role: 'user', content: 'ping' },
    ],
    max_tokens: 5,
  };

  var res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify(testBody),
    });
  } catch (e) {
    var msg = classifyFetchError(e);
    setStatus('AI 连接失败', 'err');
    if (feedback) { feedback.textContent = '❌ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
    return;
  }

  if (!res.ok) {
    var errText = await res.text().catch(function() { return ''; });
    var detail = errText.slice(0, 200) || res.statusText;
    var msg;
    if (res.status === 401 || res.status === 403) {
      msg = '🔑 API 认证失败 (' + res.status + ')：请检查 API Key 是否正确。' + (detail ? ' 服务器返回: ' + detail : '');
    } else if (res.status === 404) {
      msg = '🤖 AI 接口返回 404：该 API 端点不支持聊天补全请求。\n可能原因：① 端点地址有误（检查是否以 /chat/completions 结尾）；② 该中转站使用非标准路径；③ 模型不支持。\n服务器返回: ' + detail;
    } else if (res.status === 429) {
      msg = '⏳ API 请求过于频繁 (' + res.status + ')：触发了速率限制，请稍后重试。';
    } else if (res.status >= 500) {
      msg = '🔴 AI 服务器错误 (' + res.status + ')：服务端异常，请稍后重试或联系服务商。' + (detail ? ' 详情: ' + detail : '');
    } else {
      msg = '🤖 AI 请求失败 (' + res.status + ')：' + detail;
    }
    setStatus('AI 连接失败', 'err');
    if (feedback) { feedback.textContent = '❌ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
    return;
  }

  // 解析响应 — 能走到这里说明 HTTP 200，连接成功
  var data;
  try {
    data = await res.json();
  } catch (e) {
    var msg = '📄 AI 返回数据解析失败：服务器返回了非 JSON 格式的数据。';
    setStatus('AI 连接失败', 'err');
    if (feedback) { feedback.textContent = '❌ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
    return;
  }

  var reply = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '无回复';

  // HTTP 200 = 连接成功，显示 AI 回复内容（绿色）
  var successMsg = '✅ 测试成功！AI 响应: ' + reply.slice(0, 100);
  setStatus(successMsg, 'ok');
  if (feedback) { feedback.textContent = successMsg; feedback.style.display = 'block'; feedback.style.background = 'rgba(16,185,129,0.1)'; feedback.style.color = '#10b981'; }
});

// ── 获取模型列表 ──
$('btn-fetch-models').addEventListener('click', async function() {
  var endpoint = aiRelayUrl.value.trim();
  var key = aiRelayKey.value.trim();
  var feedback = $('ai-global-feedback');
  if (!endpoint || !key) {
    var msg = '请先填写中转站的 API 端点和 Key';
    setStatus(msg, 'err');
    if (feedback) { feedback.textContent = '⚠️ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
    return;
  }
  setStatus('正在获取模型列表...', 'busy');
  if (feedback) { feedback.textContent = '⏳ 正在获取模型列表...'; feedback.style.display = 'block'; feedback.style.background = 'rgba(251,191,36,0.15)'; feedback.style.color = '#fbbf24'; }
  try {
    var models = await fetchRelayModels(endpoint, key);
    if (models.length === 0) {
      var msg = '未获取到可用模型';
      setStatus(msg, 'err');
      if (feedback) { feedback.textContent = '⚠️ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
      return;
    }
    aiRelayModel.innerHTML = '';
    models.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      aiRelayModel.appendChild(opt);
    });
    aiRelayModel.selectedIndex = 0;
    setStatus('获取到 ' + models.length + ' 个模型 ✅', 'ok');
    if (feedback) { feedback.textContent = '✅ 获取到 ' + models.length + ' 个模型'; feedback.style.display = 'block'; feedback.style.background = 'rgba(74,222,128,0.15)'; feedback.style.color = '#4ade80'; }
  } catch (e) {
    console.error('fetchRelayModels error:', e);
    var msg = '获取模型列表失败: ' + e.message;
    setStatus(msg, 'err');
    if (feedback) { feedback.textContent = '❌ ' + msg; feedback.style.display = 'block'; feedback.style.background = 'rgba(248,113,113,0.15)'; feedback.style.color = '#f87171'; }
  }
});

// ── 入口 ──
$('btn-ai-config').addEventListener('click', openAIConfig);

// ═══════════════════════════════════════
