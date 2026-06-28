/**
 * build.js - 极简构建器
 * 将 src/template.html + src/styles.css + src/main.js 合并为 index.html
 * 使用方式: node build.js
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const template = fs.readFileSync(path.join(srcDir, 'template.html'), 'utf-8');
const css = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf-8');
const js = fs.readFileSync(path.join(srcDir, 'main.js'), 'utf-8');

const result = template
  .replace('<!-- CSS_INJECT_POINT -->', '<style>\n' + css + '\n</style>')
  .replace('<!-- JS_INJECT_POINT -->', '<script>\n' + js + '\n</script>');

fs.writeFileSync(path.join(__dirname, 'index.html'), result, 'utf-8');
console.log('Build complete: index.html (' + result.length + ' bytes)');
