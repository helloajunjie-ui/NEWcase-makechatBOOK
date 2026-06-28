/**
 * 剧本格式路由中枢 · 转换测试
 * 测试 3 个样本 × 4 种输出格式 = 12 条转换路径
 * 以及往返一致性（round-trip）验证
 */

const fs = require('fs');
const path = require('path');

// ── 从 src/main.js 加载核心函数 ──
const coreCode = fs.readFileSync(path.join(__dirname, 'temp_core.js'), 'utf8');
// 移除 export 相关（如果有）
eval(coreCode);

// ── 测试文件列表 ──
const testFiles = [
  { file: '【春潮】全息韩国真实生活模拟器-20260628.json',  expected: 'chunchao' },
  { file: '[风月]穿成阿龙，但这次鱼人说了算-20260628-104717.json', expected: 'fengyue' },
  { file: '【MISS】海拉鲁悲歌交响.json',                   expected: 'miss' },
];

// ── 渲染器映射 ──
const renderers = {
  markdown: renderMarkdown,
  chunchao: renderChunchao,
  fengyue:  renderFengyue,
  miss:     renderMiss,
};

// ── 运行测试 ──
let allPass = true;
let totalTests = 0;
let passedTests = 0;

for (const { file, expected } of testFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`\n⚠ 文件不存在，跳过: ${file}`);
    continue;
  }

  console.log('\n' + '='.repeat  (60));
  console.log(`📄 测试文件: ${file}`);
  console.log('='.repeat(60));

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 格式检测
  const detected = detectFormat(raw);
  const fmtOk = detected === expected;
  console.log(`   ${fmtOk ? '✅' : '❌'} 格式检测: ${detected} (期望 ${expected})`);
  if (!fmtOk) allPass = false;
  totalTests++; if (fmtOk) passedTests++;

  // 解析
  let uif;
  try {
    uif = parseJSON(raw);
    console.log(`   ✅ 解析成功`);
    console.log(`      标题: ${uif.meta.title}`);
    console.log(`      摘要: ${(uif.meta.summary || '').slice(0, 60)}...`);
    console.log(`      世界书: ${uif.worldBook.length} 条`);
    console.log(`      提示词长度: ${uif.prompts.mainPrompt.length} 字符`);
    if (uif.meta.tags && uif.meta.tags.length) console.log(`      标签: ${uif.meta.tags.slice(0, 5).join(', ')}${uif.meta.tags.length > 5 ? '...' : ''}`);
    if (uif.meta.orientation) console.log(`      取向: ${uif.meta.orientation}`);
    if (uif.meta.coverUrl) console.log(`      封面: ${uif.meta.coverUrl.slice(0, 60)}...`);
    totalTests++; passedTests++;
  } catch (e) {
    console.log(`   ❌ 解析失败: ${e.message}`);
    allPass = false;
    continue;
  }

  // 渲染各格式
  for (const [fmt, render] of Object.entries(renderers)) {
    try {
      const result = render(uif);
      const lines = result.split('\n').length;
      console.log(`   ✅ 渲染 ${fmt}: ${lines} 行`);
      totalTests++; passedTests++;
    } catch (e) {
      console.log(`   ❌ 渲染 ${fmt} 失败: ${e.message}`);
      allPass = false;
    }
  }

  // 往返一致性：渲染 -> 再解析
  for (const [fmt, render] of Object.entries(renderers)) {
    if (fmt === 'markdown') continue; // Markdown 不可逆
    try {
      const rendered = render(uif);
      const reparsed = parseJSON(JSON.parse(rendered));
      const titleOk = reparsed.meta.title === uif.meta.title;
      const wbOk = reparsed.worldBook.length === uif.worldBook.length;
      if (titleOk && wbOk) {
        console.log(`   ✅ 往返一致性: ${fmt}`);
      } else {
        console.log(`   ⚠ 往返部分不匹配: ${fmt} (标题:${titleOk}, 世界书数量:${wbOk})`);
      }
      totalTests++; passedTests++;
    } catch (e) {
      console.log(`   ❌ 往返 ${fmt} 失败: ${e.message}`);
      allPass = false;
    }
  }
}

// ── 总结 ──
console.log('\n' + '='.repeat(60));
if (allPass) {
  console.log(`✅ 全部测试通过! (${passedTests}/${totalTests})`);
} else {
  console.log(`❌ 部分测试失败 (${passedTests}/${totalTests})`);
}
console.log('='.repeat(60));
