/* =========================================================
   build-nagi.js — 凪の全部入り1枚HTMLを書き出す

   CSS・JS・アイコンを nagi/index.html に埋め込み、dist/nagi.html を作る。
   ダウンロードして開くだけで動く（サーバーもネットも要らない）。

   使い方:  node tools/build-nagi.js
   ========================================================= */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'nagi');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'nagi.html');

const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');

function main() {
  let html = read('index.html');

  // --- CSS ---
  html = html.replace(
    '<link rel="stylesheet" href="css/style.css">',
    () => '<style>\n' + read('css/style.css') + '\n</style>'
  );

  // --- アイコンは data URI に。1枚版ではマニフェストは使えないので外す ---
  const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icon.svg')).toString('base64');
  html = html.replace(/href="icon\.svg"/g, `href="${icon}"`);
  html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');

  // --- JS（読み込み順はそのまま） ---
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
  for (const [tag, src] of scripts) {
    html = html.replace(tag, () => '<script>\n' + read(src) + '\n</script>');
  }

  if (/(href|src)="(css|js)\//.test(html)) throw new Error('埋め込み漏れがある');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`dist/nagi.html  ${kb}KB`);
}

main();
