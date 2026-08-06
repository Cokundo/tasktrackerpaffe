/* =========================================================
   build-hikiyose.js — 電撃婚ノートを1枚のHTMLに書き出す

   CSS・JSをすべて hikiyose/index.html に埋め込み、
   dist/dengekikon-note.html を作る。
   素材画像がないので、パフェ版と違って軽い。
   サーバーもネットもGitHubも要らず、ファイルを開くだけで動く。

   使い方:  node tools/build-hikiyose.js
   ========================================================= */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'hikiyose');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'dengekikon-note.html');

const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');

function main() {
  let html = read('index.html');

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

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`dist/dengekikon-note.html  ${kb}KB`);
}

main();
