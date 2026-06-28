/**
 * build.js - 智能拼接构建器
 * 将 src/html/*, src/css/*, src/js/* 按顺序合并为 index.html
 * 使用方式: node build.js
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// ── HTML 分卷顺序 ──
const htmlFiles = [
  'html/head.html',
  'html/nav.html',
  'html/views/view-converter.html',
  'html/views/view-generator.html',
  'html/views/view-chat.html',
  'html/views/view-library.html',
  'html/views/view-char-creator.html',
  'html/views/view-world-builder.html',
  'html/views/view-power-builder.html',
  'html/dialogs.html',
  'html/footer.html',
];

// ── CSS 分卷顺序 ──
const cssFiles = [
  'css/vars.css',
  'css/layout.css',
  'css/components.css',
];

// ── JS 分卷顺序 ──
const jsFiles = [
  'js/config.js',
  'js/db.js',
  'js/ui.js',
  'js/api.js',
  'js/features/main-features.js',
  'js/features/chat.js',
];

// ── 拼接函数 ──
function concatFiles(fileList) {
  return fileList.map(f => {
    const fullPath = path.join(srcDir, f);
    if (!fs.existsSync(fullPath)) {
      console.warn('⚠ 文件不存在，跳过:', f);
      return '';
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }).join('\n');
}

// ── 构建 ──
const html = concatFiles(htmlFiles);
const css = concatFiles(cssFiles);
const js = concatFiles(jsFiles);

// 将 CSS_INJECT_POINT 替换为 <style>...</style>
// 将 JS_INJECT_POINT 替换为 <script>...</script>
let result = html
  .replace('<!-- CSS_INJECT_POINT -->', '<style>\n' + css + '\n</style>')
  .replace('<!-- JS_INJECT_POINT -->', '<script>\n' + js + '\n</script>');

fs.writeFileSync(path.join(__dirname, 'index.html'), result, 'utf-8');
console.log('✅ Build complete: index.html (' + result.length + ' bytes)');
console.log('   HTML:', html.length, 'bytes (' + htmlFiles.length + ' files)');
console.log('   CSS:', css.length, 'bytes (' + cssFiles.length + ' files)');
console.log('   JS:', js.length, 'bytes (' + jsFiles.length + ' files)');
