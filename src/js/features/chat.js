// ═══════════════════════════════════════
//  18. 灵感对话 · 多轮聊天室（工业级）
//  特性：无感存档(localStorage) + 滑动窗口(20条) + TXT导出
// ═══════════════════════════════════════

(() => {
var chatMemory = []; // 完整对话历史 [{role, content}, ...]
var MAX_CONTEXT_MSGS = 20; // 滑动窗口：只发最近 20 条给 AI（约 10 回合）

document.addEventListener('DOMContentLoaded', function() {
  var btnSend = document.getElementById('btn-send-chat');
  var btnClear = document.getElementById('btn-clear-chat');
  var btnExport = document.getElementById('btn-export-chat');
  var chatInput = document.getElementById('chat-input');
  var historyBox = document.getElementById('chat-history-box');

  if (!btnSend || !historyBox) return;

  // ── 1. 初始化：从无感缓存恢复记忆 ──
  function initChat() {
    var saved = localStorage.getItem('aiChatMemory');
    if (saved) {
      try {
        chatMemory = JSON.parse(saved);
        // 清空默认欢迎语，渲染历史记录
        historyBox.innerHTML = '';
        chatMemory.forEach(function(msg) {
          appendMessage(msg.role, msg.content);
        });
      } catch(e) {
        console.error('解析聊天记录失败', e);
      }
    }
  }

  // ── 2. 无感存档 ──
  function saveChat() {
    try {
      localStorage.setItem('aiChatMemory', JSON.stringify(chatMemory));
    } catch(e) {
      console.warn('聊天记录存档失败（可能 localStorage 已满）', e);
    }
  }

  // ── 3. 渲染单条消息 ──
  function appendMessage(role, content) {
    var isUser = role === 'user';
    var msgDiv = document.createElement('div');

    msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgDiv.style.background = isUser ? 'var(--accent-primary)' : 'var(--bg-panel)';
    msgDiv.style.color = isUser ? '#fff' : 'var(--text-main)';
    msgDiv.style.padding = '12px 16px';
    msgDiv.style.borderRadius = isUser ? '8px 8px 0 8px' : '8px 8px 8px 0';
    msgDiv.style.border = isUser ? 'none' : '1px solid var(--border-color)';
    msgDiv.style.maxWidth = '80%';
    msgDiv.style.lineHeight = '1.6';
    msgDiv.style.whiteSpace = 'pre-wrap';
    msgDiv.style.wordBreak = 'break-word';
    msgDiv.textContent = content;

    historyBox.appendChild(msgDiv);
    historyBox.scrollTop = historyBox.scrollHeight;
  }

  // ── 4. 核心发送逻辑（含滑动窗口） ──
  async function handleSend() {
    var text = chatInput.value.trim();
    if (!text) return;

    // 检查 AI 是否已配置（兼容新旧 key 存储方式）
    var cfg = loadAIConfig();
    if (!cfg || !cfg.endpoint || !cfg.key) {
      alert('⚠️ 请先在右上角 [🤖 AI 配置] 中设置 API 端点和 Key');
      return;
    }

    // 上屏用户消息
    appendMessage('user', text);
    chatMemory.push({ role: 'user', content: text });
    saveChat(); // 无感存档
    chatInput.value = '';

    // 显示 loading
    var loadingId = 'chat-loading-' + Date.now();
    var loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.style.alignSelf = 'flex-start';
    loadingDiv.style.color = 'var(--text-muted)';
    loadingDiv.style.padding = '12px 16px';
    loadingDiv.style.fontSize = '13px';
    loadingDiv.textContent = '⏳ AI 思考中...';
    historyBox.appendChild(loadingDiv);
    historyBox.scrollTop = historyBox.scrollHeight;

    try {
      var systemPrompt = '你是一个专业、幽默、富有创造力的网文/剧本写作灵感助理。请用简洁的语言回答用户的提问，提供世界观推演、起名、科普等帮助。';

      // 【核心】滑动窗口截取：无论 UI 有多少条，只发最近 MAX_CONTEXT_MSGS 条给 AI
      var contextToSend = chatMemory.slice(-MAX_CONTEXT_MSGS);

      var responseText = await callAI(systemPrompt, contextToSend, false);

      // 移除 loading，上屏 AI 回复
      var loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();
      appendMessage('assistant', responseText);

      // 记录 AI 回复并存档
      chatMemory.push({ role: 'assistant', content: responseText });
      saveChat();

    } catch (err) {
      var loadingEl = document.getElementById(loadingId);
      if (loadingEl) {
        loadingEl.textContent = '❌ ' + err.message;
        loadingEl.style.color = '#ef4444';
      }
      // 失败则弹出刚才的提问，防止污染记录
      chatMemory.pop();
      saveChat();
    }
  }

  // ── 5. 清空记忆 ──
  btnClear.addEventListener('click', function() {
    if (!confirm('确定要清空当前的对话记忆吗？')) return;
    chatMemory = [];
    saveChat();
    historyBox.innerHTML =
      '<div style="align-self: flex-start; background: var(--bg-panel); padding: 16px 20px; border-radius: 8px 8px 8px 0; border: 1px solid var(--border-color); max-width: 80%; color: var(--text-main); line-height: 1.6;">' +
        '🧹 记忆已清空。让我们开启新的脑洞吧！' +
      '</div>';
  });

  // ── 6. 导出 TXT ──
  if (btnExport) {
    btnExport.addEventListener('click', function() {
      if (chatMemory.length === 0) {
        alert('当前没有可导出的聊天记录！');
        return;
      }

      var txtContent = '【灵感对话记录】\n';
      txtContent += '====================\n\n';

      chatMemory.forEach(function(msg) {
        var roleName = msg.role === 'user' ? '【我】' : '【AI 副驾】';
        txtContent += roleName + '\n' + msg.content + '\n\n--------------------\n\n';
      });

      var blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '灵感记录_' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── 7. 绑定发送事件 ──
  btnSend.addEventListener('click', handleSend);

  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // ── 启动初始化：从缓存恢复 ──
  initChat();
});
})();
