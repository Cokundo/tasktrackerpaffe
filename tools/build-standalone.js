/* =========================================================
   build-standalone.js — 全部入りの1枚HTMLを書き出す

   CSS・JS・素材PNG（base64）をすべて index.html に埋め込み、
   dist/ikuteru-parfait.html を作る。
   サーバーもネットもGitHubも要らず、ファイルを開くだけで動く。
   （リポジトリを private にして GitHub Pages が止まっても、これがあれば使える）

   使い方:  node tools/build-standalone.js
   ========================================================= */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'ikuteru-parfait.html');

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

function main() {
  let html = read('index.html');

  // --- 素材を base64 で埋め込む ---
  const partsDir = path.join(ROOT, 'assets', 'parts');
  const data = {};
  fs.readdirSync(partsDir).filter(f => f.endsWith('.png')).forEach(f => {
    data[f.replace('.png', '')] =
      'data:image/png;base64,' + fs.readFileSync(path.join(partsDir, f)).toString('base64');
  });

  // --- CSS ---
  html = html.replace(
    /<link rel="stylesheet" href="css\/style\.css">/,
    '<style>\n' + read('css/style.css') + '\n</style>'
  );

  // --- JS（読み込み順はそのまま） ---
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
  scripts.forEach(([tag, src]) => {
    html = html.replace(tag, '<script>\n' + read(src) + '\n</script>');
  });

  // 素材データは最初のスクリプトより前に置く
  html = html.replace('<script>',
    '<script>window.ASSET_DATA = ' + JSON.stringify(data) + ';</script>\n<script>');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);

  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`dist/ikuteru-parfait.html  ${mb}MB  （素材 ${Object.keys(data).length} 点を同梱）`);
}

main();
