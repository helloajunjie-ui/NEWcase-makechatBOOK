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
      case 'rili':     result = renderRili(currentUIF);     break;
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
    const fmtNames = { chunchao: '春潮', fengyue: '风月', miss: 'MISS', rili: '日礼' };
    const lines = text.split('\n').length;
    inputCount.textContent = lines + ' 行 · ' + text.length + ' 字符';
    setStatus('✅ 已识别 ' + (fmtNames[fmt] || fmt) + ' 格式，' + currentUIF.worldBook.length + ' 条世界书', 'ok');
    renderOutput();
    dbAdd(currentUIF).then(() => { renderLibList(); }).catch(e => console.error('❌ 剧本自动入库失败:', e));
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

// ── 路由中枢：所有导航按钮统一绑定在此 ──
$('nav-converter').addEventListener('click', () => switchView('converter'));
$('nav-library').addEventListener('click', () => switchView('library'));
$('nav-generator').addEventListener('click', () => switchView('generator'));
$('nav-chat').addEventListener('click', () => switchView('chat'));
$('nav-char-creator').addEventListener('click', () => switchView('char-creator'));
$('nav-world-builder').addEventListener('click', () => switchView('world-builder'));
$('nav-power-builder').addEventListener('click', () => switchView('power-builder'));
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
      const hasHtml = !!e.htmlLandingPage;
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
          '<span class="lib-card-html-badge" title="' + (hasHtml ? '点击预览宣发页' : '点击生成宣发页') + '" style="cursor:pointer;' + (hasHtml ? 'color:var(--accent-primary)' : 'color:var(--text-dim);opacity:0.5') + '">' + (hasHtml ? '🌐' : '🌐') + '</span>' +
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

    // HTML badge click -> preview or generate
    libList.querySelectorAll('.lib-card-html-badge').forEach(badge => {
      badge.addEventListener('click', async e => {
        e.stopPropagation();
        const card = badge.closest('.lib-card');
        const id = Number(card.dataset.id);
        const entry = await dbGet(id);
        if (entry && entry.htmlLandingPage) {
          // 已有宣发页 → 预览
          const w = window.open('', '_blank');
          if (w) {
            w.document.write(entry.htmlLandingPage);
            w.document.close();
          }
        } else {
          // 没有 → 生成
          generateLandingPage(id);
        }
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

    // Landing page status (放在基本信息之后，prompt 之前)
    var hasLandingPage = !!entry.htmlLandingPage;
    html += '<div class="modal-section">';
    html += '<div class="modal-section-title">🌐 专属宣发页</div>';
    if (hasLandingPage) {
      html += '<div class="modal-field"><span class="modal-field-label">状态</span><span class="modal-field-value" style="color:var(--accent-primary)">✅ 已铸造</span></div>';
      html += '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">';
      html += '<button class="btn btn-sm" id="btnPreviewHtml" style="background:var(--accent-primary);color:#fff">👁 预览</button>';
      html += '<button class="btn btn-sm btn-secondary" id="btnDownloadHtml">⬇ 下载</button>';
      html += '<button class="btn btn-sm btn-secondary" id="btnViewSource">📄 查看源码</button>';
      html += '<button class="btn btn-sm btn-secondary" id="btnRegenHtml">🔄 重新铸造</button>';
      html += '</div>';
    } else {
      html += '<div class="modal-field"><span class="modal-field-label">状态</span><span class="modal-field-value" style="color:var(--text-secondary)">⏳ 尚未铸造</span></div>';
      html += '<div style="margin-top:8px"><button class="btn btn-sm" id="btnGenHtml" style="background:var(--accent-primary);color:#fff">✨ AI 铸造专属主题宣发页</button></div>';
    }
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

    // Landing page: view source (open modal with editable textarea + copy)
    const viewSourceBtn = libDetail.querySelector('#btnViewSource');
    if (viewSourceBtn && entry.htmlLandingPage) {
      viewSourceBtn.addEventListener('click', () => {
        openSourceEditor(entry.htmlLandingPage, id);
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
//  13b. AI 铸造专属主题宣发页
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
//  13c. AI 配置 Tab 切换（内联样式硬编码版）
// ═══════════════════════════════════════

// 互斥 Tab 切换：直接操作内联 style.display，无视任何 CSS 权重
function switchAITab(mode) {
  // 1. 切换 Tab 按钮样式
  document.querySelectorAll('.ai-tab-btn').forEach(function(b) {
    b.classList.remove('active');
    b.style.background = 'transparent';
    b.style.color = 'var(--text-muted)';
    b.style.borderColor = 'var(--border-color)';
  });
  var activeBtn = document.querySelector('.ai-tab-btn[data-mode="' + mode + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.background = 'var(--bg-hover)';
    activeBtn.style.color = 'var(--text-main)';
    activeBtn.style.borderColor = 'var(--accent-primary)';
  }

  // 2. 强制内联切换面板（直接通过 ID 操作，杜绝任何 DOM 结构误解）
  document.getElementById('ai-panel-deepseek').style.display = 'none';
  document.getElementById('ai-panel-relay').style.display = 'none';
  document.getElementById('ai-panel-' + mode).style.display = 'block';
}

// Tab 点击事件（委托到 document，避免 DOM 未就绪问题）
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.ai-tab-btn');
  if (btn && btn.closest('#ai-config-dialog')) {
    switchAITab(btn.dataset.mode);
  }
});

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
    for (const f of files) {
      if (!f.name.endsWith('.json')) { setStatus('⚠️ 跳过非 JSON 文件: ' + f.name, 'err'); continue; }
      addBatchFile(f);
    }
  } else {
    const f = files[0];
    if (!f.name.endsWith('.json')) { setStatus('⚠️ 请选择 JSON 文件', 'err'); fileInput.value = ''; return; }
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
    for (const f of files) {
      if (!f.name.endsWith('.json')) { setStatus('⚠️ 跳过非 JSON 文件: ' + f.name, 'err'); continue; }
      addBatchFile(f);
    }
  } else {
    const f = files[0];
    if (!f.name.endsWith('.json')) { setStatus('⚠️ 请拖入 JSON 文件', 'err'); return; }
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
//  最高指令（Global System Directive）
// ═══════════════════════════════════════

const STORAGE_KEY_SUPREME = 'aiSupremeDirective';

function openSupremeDirective() {
  const dialog = document.getElementById('supreme-directive-dialog');
  const input = document.getElementById('supreme-directive-input');
  const feedback = document.getElementById('supreme-directive-feedback');
  if (!dialog || !input) return;

  // 加载已保存的指令
  input.value = localStorage.getItem(STORAGE_KEY_SUPREME) || '';
  feedback.textContent = '';
  feedback.style.color = 'var(--text-muted)';

  dialog.showModal();
}

function saveSupremeDirective() {
  const input = document.getElementById('supreme-directive-input');
  const feedback = document.getElementById('supreme-directive-feedback');
  if (!input || !feedback) return;

  const val = input.value.trim();
  if (val) {
    localStorage.setItem(STORAGE_KEY_SUPREME, val);
    feedback.textContent = '✅ 最高指令已保存，将注入到所有 AI 请求中。';
    feedback.style.color = '#22c55e';
  } else {
    localStorage.removeItem(STORAGE_KEY_SUPREME);
    feedback.textContent = 'ℹ️ 已清空最高指令，AI 请求将不再注入额外指令。';
    feedback.style.color = 'var(--text-muted)';
  }
}

function clearSupremeDirective() {
  const input = document.getElementById('supreme-directive-input');
  const feedback = document.getElementById('supreme-directive-feedback');
  if (!input || !feedback) return;

  input.value = '';
  localStorage.removeItem(STORAGE_KEY_SUPREME);
  feedback.textContent = '🗑️ 最高指令已清空。';
  feedback.style.color = 'var(--text-muted)';
}

// ── 绑定最高指令 UI 事件 ──
document.addEventListener('DOMContentLoaded', function() {
  const btnOpen = document.getElementById('btn-supreme-directive');
  const btnClose = document.getElementById('btn-close-supreme');
  const btnSave = document.getElementById('btn-save-supreme');
  const btnClear = document.getElementById('btn-clear-supreme');
  const dialog = document.getElementById('supreme-directive-dialog');

  if (btnOpen && dialog) {
    btnOpen.addEventListener('click', openSupremeDirective);
  }
  if (btnClose && dialog) {
    btnClose.addEventListener('click', function() { dialog.close(); });
  }
  if (btnSave) {
    btnSave.addEventListener('click', saveSupremeDirective);
  }
  if (btnClear) {
    btnClear.addEventListener('click', clearSupremeDirective);
  }

  // 点击弹窗外部关闭
  if (dialog) {
    dialog.addEventListener('click', function(e) {
      if (e.target === dialog) dialog.close();
    });
  }
});

// ═══════════════════════════════════════
//  13f. 宣发页源码查看/编辑弹窗
// ═══════════════════════════════════════
var _sourceEditorScriptId = null;

function openSourceEditor(htmlContent, scriptId) {
  var dialog = document.getElementById('source-editor-dialog');
  var textarea = document.getElementById('source-editor-textarea');
  if (!dialog || !textarea) return;

  textarea.value = htmlContent;
  _sourceEditorScriptId = scriptId;
  dialog.showModal();
}

// ── 绑定源码编辑器事件 ──
document.addEventListener('DOMContentLoaded', function() {
  var dialog = document.getElementById('source-editor-dialog');
  var textarea = document.getElementById('source-editor-textarea');
  var btnClose = document.getElementById('btn-close-source-editor');
  var btnCopy = document.getElementById('btn-source-copy');
  var btnFormat = document.getElementById('btn-source-format');
  var btnSave = document.getElementById('btn-source-save');

  if (!dialog || !textarea) return;

  // 关闭
  if (btnClose) {
    btnClose.addEventListener('click', function() { dialog.close(); });
  }

  // 点击外部关闭
  dialog.addEventListener('click', function(e) {
    if (e.target === dialog) dialog.close();
  });

  // 一键复制
  if (btnCopy) {
    btnCopy.addEventListener('click', function() {
      var text = textarea.value;
      navigator.clipboard.writeText(text).then(function() {
        var orig = btnCopy.textContent;
        btnCopy.textContent = '✅ 已复制';
        btnCopy.style.background = '#22c55e';
        btnCopy.style.color = '#fff';
        setTimeout(function() {
          btnCopy.textContent = orig;
          btnCopy.style.background = '';
          btnCopy.style.color = '';
        }, 1500);
      }).catch(function() {
        // fallback
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btnCopy.textContent = '✅ 已复制';
        setTimeout(function() { btnCopy.textContent = '📋 一键复制'; }, 1500);
      });
    });
  }

  // 格式化 HTML
  if (btnFormat) {
    btnFormat.addEventListener('click', function() {
      try {
        // 简单的缩进格式化：按标签换行 + 缩进
        var formatted = textarea.value
          .replace(/>\s*</g, '>\n<')
          .split('\n')
          .map(function(line) {
            var indent = 0;
            if (/^<\/\w/.test(line.trim())) indent = -1;
            else if (/^<\w/.test(line.trim())) indent = 0;
            var spaces = '';
            // 计算当前缩进层级（基于闭合标签）
            var trimmed = line.trim();
            if (/^<\/\w/.test(trimmed)) {
              // 闭合标签减少缩进
              var closeCount = (trimmed.match(/<\//g) || []).length;
              var openCount = (trimmed.match(/<[^/]/g) || []).length;
              var netIndent = openCount - closeCount;
              // 简单处理：闭合标签前退一格
              spaces = '  '.repeat(Math.max(0, netIndent));
            } else if (/^<\w/.test(trimmed)) {
              spaces = '';
            }
            return spaces + trimmed;
          })
          .join('\n')
          .replace(/\n{3,}/g, '\n\n'); // 去除多余空行
        textarea.value = formatted;
        setStatus('🔧 HTML 已格式化', 'ok');
      } catch (e) {
        setStatus('❌ 格式化失败: ' + e.message, 'err');
      }
    });
  }

  // 保存修改
  if (btnSave) {
    btnSave.addEventListener('click', async function() {
      var newHtml = textarea.value.trim();
      if (!newHtml) {
        setStatus('❌ 源码不能为空', 'err');
        return;
      }
      var id = _sourceEditorScriptId;
      if (!id) {
        setStatus('❌ 剧本 ID 丢失', 'err');
        return;
      }

      // 更新 DB
      await dbUpdate(id, { htmlLandingPage: newHtml });

      // 同步更新 uif.landingPage
      var entry = await dbGet(id);
      if (entry && entry.uif) {
        entry.uif.landingPage = newHtml;
        await dbUpdate(id, { uif: entry.uif });
      }

      // 刷新详情面板
      if (viewingLibId === id) {
        showDetailInPanel(id);
      }

      dialog.close();
      setStatus('✅ 宣发页源码已保存', 'ok');
    });
  }
});
