//  8. IndexedDB 剧本库
// ═══════════════════════════════════════

const DB_NAME = 'ScriptLibrary';
const DB_VER = 2;
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
        store.createIndex('uid', 'uid', { unique: true });
      } else {
        // 版本升级：为已有 store 添加 uid 索引
        if (!e.target.transaction.objectStore(STORE_NAME).indexNames.contains('uid')) {
          e.target.transaction.objectStore(STORE_NAME).createIndex('uid', 'uid', { unique: true });
        }
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

// 基于剧本元数据生成确定性 UID（12 位十六进制）
function generateUid(uifData) {
  var seed = (uifData.meta ? uifData.meta.title : uifData.title || '') + '|' +
    (uifData._sourceFormat || uifData.sourceFormat || '') + '|' +
    (uifData.meta ? uifData.meta.exportedAt : '');
  // 简单哈希：crc32 风格，保证确定性
  var hash = 0;
  for (var i = 0; i < seed.length; i++) {
    var ch = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 转 12 位十六进制，补零
  return 'u' + (Math.abs(hash) % 0xFFFFFFFF).toString(16).padStart(8, '0') + '_' + Date.now().toString(36).slice(-3);
}

// 通过 uid 查找已有条目
async function dbFindByUid(uid) {
  if (!uid) return null;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('uid');
  return new Promise((resolve, reject) => {
    const req = index.get(uid);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = e => reject(e.target.error);
  });
}

async function dbAdd(uif) {
  // ── 1. 在打开事务之前，完成所有数据组装 + 异步查询 ──
  var landingPage = uif.htmlLandingPage || (uif.uif && uif.uif.landingPage) || uif.landingPage || '';
  var uifData = uif.uif || uif;
  var uid = uif.uid || uifData.uid || generateUid(uifData);

  // 先查 uid 是否已存在（await 在这里是安全的，因为还没打开事务）
  var existing = await dbFindByUid(uid);

  const entry = {
    uid: uid,
    title: uifData.meta ? (uifData.meta.title || '未命名剧本') : (uif.title || '未命名剧本'),
    summary: uifData.meta ? (uifData.meta.summary || '').slice(0, 200) : (uif.summary || ''),
    tags: uifData.meta ? (uifData.meta.tags || []) : (uif.tags || []),
    orientation: uifData.meta ? (uifData.meta.orientation || '') : '',
    sourceFormat: uif._sourceFormat || uif.sourceFormat || '',
    worldBookCount: (uifData.worldBook || []).length,
    promptLength: (uifData.prompts ? (uifData.prompts.mainPrompt || '').length : 0),
    coverUrl: uifData.meta ? (uifData.meta.coverUrl || '') : '',
    bgUrl: uifData.meta ? (uifData.meta.bgUrl || '') : '',
    htmlLandingPage: landingPage,
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
    uif: uifData,
  };

  if (existing) {
    entry.id = existing.id; // 保留主键，执行更新
  }

  // ── 2. 打开事务（此时所有 await 已完成，事务不会被中断） ──
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // ── 3. 立即执行 DB 操作 ──
  return new Promise((resolve, reject) => {
    const req = existing ? store.put(entry) : store.add(entry);
    req.onsuccess = () => { tx.commit(); resolve(existing ? entry.id : req.result); };
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
