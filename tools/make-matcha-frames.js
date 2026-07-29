/* =========================================================
   make-matcha-frames.js — 抹茶ラテのスプライトシートを1枚ずつに切り出す

   assets/raw/matcha_sheet.png（マゼンタ背景・満タン→空の7コマ）を、
   背景を抜いた assets/parts/matcha_0.png 〜 matcha_6.png にする。
   すべて同じ画素サイズで書き出すので、切り替えても位置がずれない。

   使い方:  node tools/make-matcha-frames.js
   ========================================================= */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'raw', 'matcha_sheet.png');
const OUT = path.join(ROOT, 'assets', 'parts');
const CHROME = process.env.CHROME_PATH || undefined;

const KEY = [255, 0, 255];   // 抜く色（マゼンタ）
const MAX_W = 300;           // 書き出しの横幅

async function main() {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await browser.newPage();
  await page.setContent('<body></body>');

  const uri = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');
  const frames = await page.evaluate(cut, { uri, key: KEY, maxW: MAX_W });

  frames.forEach((png, i) => {
    const file = path.join(OUT, `matcha_${i}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    console.log(`matcha_${i}.png  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`);
  });

  await browser.close();
}

async function cut({ uri, key, maxW }) {
  const img = new Image();
  img.src = uri;
  await img.decode();

  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;

  const NEAR = 90, FAR = 150;
  const dist = i => {
    const dr = d[i] - key[0], dg = d[i + 1] - key[1], db = d[i + 2] - key[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // --- 背景を抜く ---
  for (let i = 0; i < d.length; i += 4) {
    const v = dist(i);
    d[i + 3] = v <= NEAR ? 0 : v >= FAR ? 255 : Math.round(((v - NEAR) / (FAR - NEAR)) * 255);
  }

  // --- 残ったマゼンタの色かぶりを落とす（ガラスの半透明部分がピンクになるのを防ぐ） ---
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const spill = (d[i] + d[i + 2]) / 2 - d[i + 1];
    if (spill > 0) {
      d[i] = Math.max(0, d[i] - spill);
      d[i + 2] = Math.max(0, d[i + 2] - spill);
    }
  }

  // --- 半透明の画素の色を、隣の不透明な色で塗り直す（マゼンタのにじみ止め） ---
  const copy = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (copy[i + 3] > 200) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = (ny * W + nx) * 4;
          if (copy[j + 3] > 200) { r += copy[j]; g += copy[j + 1]; b += copy[j + 2]; n++; }
        }
      }
      if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
    }
  }
  ctx.putImageData(id, 0, 0);

  // --- コマの位置を探す（中身のある列のかたまり＝1コマ） ---
  const colHas = new Uint8Array(W);
  const rowHas = new Uint8Array(H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 40) { colHas[x] = 1; rowHas[y] = 1; }
    }
  }
  const runs = [];
  let start = -1;
  for (let x = 0; x <= W; x++) {
    if (x < W && colHas[x]) { if (start < 0) start = x; }
    else if (start >= 0) { if (x - start > 20) runs.push([start, x - 1]); start = -1; }
  }
  let y0 = 0, y1 = H - 1;
  while (y0 < H && !rowHas[y0]) y0++;
  while (y1 > y0 && !rowHas[y1]) y1--;

  // --- 全コマ共通の大きさで切り出す（切り替えてもずれないように） ---
  const pad = 6;
  const halfW = Math.max(...runs.map(([a, b]) => (b - a) / 2)) + pad;
  const boxW = Math.round(halfW * 2);
  const boxH = y1 - y0 + 1 + pad * 2;
  const k = maxW / boxW;

  return runs.map(([a, b]) => {
    const cx = (a + b) / 2;
    const out = document.createElement('canvas');
    out.width = Math.round(boxW * k);
    out.height = Math.round(boxH * k);
    const octx = out.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(cv, cx - halfW, y0 - pad, boxW, boxH, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  });
}

main();
