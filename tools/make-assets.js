/* =========================================================
   make-assets.js — 素材PNGの背景を自動で透過し、余白を切り詰めて縮小する
   （元画像は assets/raw/、書き出し先は assets/parts/）

   使い方:  node tools/make-assets.js
   Chromium(Playwright) のCanvasで画像処理を行う。

   手順:
     1. 画像の外周から背景色を推定（白・黒・灰・市松など何でも可）
     2. 外周から塗りつぶし探索し、背景と地続きの領域だけを透明化
        （素材の内部にある白などは残る）
     3. 縁のにじみ止め → 余白のトリミング → 長辺を縮小
   ========================================================= */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'assets', 'raw');
const OUT = path.join(ROOT, 'assets', 'parts');
const CHROME = process.env.CHROME_PATH || undefined;

/** 元ファイル名 → 素材名。背景として使うものは keepBg: true */
const MAP = require('./asset-map.json');

const MAX_SIDE = 448;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>');

  const report = [];
  for (const item of MAP) {
    const src = path.join(RAW, item.file);
    if (!fs.existsSync(src)) { console.warn('見つかりません:', item.file); continue; }
    const dataUri = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');

    const res = await page.evaluate(processImage, {
      uri: dataUri,
      keepBg: !!item.keepBg,
      maxSide: item.maxSide || MAX_SIDE,
      near: item.near || 34,   // これ以下の色差は背景
      far: item.far || 74,     // これ以上の色差は素材（探索を止める）
      erode: item.erode || 0,  // 元画像のふちの光（ハロー）を削る画素数
      colorkey: item.colorkey || null, // 指定色を全面的に抜く（ガラスのように中も透かしたいもの）
      rotate: item.rotate || 0,       // 180 を指定すると上下逆さに焼き込む
      solid: item.solid || 0          // 白い素材が白背景に食われるときの穴埋め幅（画素）
    });

    const outPath = path.join(OUT, item.name + '.png');
    fs.writeFileSync(outPath, Buffer.from(res.png.split(',')[1], 'base64'));
    report.push(`${item.name.padEnd(20)} ${res.w}x${res.h}  ${(fs.statSync(outPath).size / 1024).toFixed(0)}KB`);
  }
  await browser.close();
  console.log(report.join('\n'));
}

/* ---- ブラウザ内で動く処理本体 ---- */
async function processImage({ uri, keepBg, maxSide, near, far, erode, colorkey, rotate, solid }) {
  const img = new Image();
  img.src = uri;
  await img.decode();

  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  let box = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };

  // 指定色を画像全体から抜く（グラスのように、内側も透かしたい場合）
  if (colorkey) {
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;
    const [kr, kg, kb] = colorkey;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.sqrt((d[i] - kr) ** 2 + (d[i + 1] - kg) ** 2 + (d[i + 2] - kb) ** 2);
      d[i + 3] = v <= near ? 0 : v >= far ? 255 : Math.round(((v - near) / (far - near)) * 255);
    }
    ctx.putImageData(id, 0, 0);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= x0 && y1 >= y0) box = { x0, y0, x1, y1 };
  } else if (!keepBg) {
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;

    // --- 1. 外周のピクセルから背景色の候補を拾う（市松模様にも対応するため複数色） ---
    const hist = new Map();
    const addEdge = (x, y) => {
      const i = (y * W + x) * 4;
      const key = (d[i] >> 4) * 4096 + (d[i + 1] >> 4) * 256 + (d[i + 2] >> 4) * 16;
      hist.set(key, (hist.get(key) || 0) + 1);
    };
    for (let x = 0; x < W; x++) { addEdge(x, 0); addEdge(x, H - 1); }
    for (let y = 0; y < H; y++) { addEdge(0, y); addEdge(W - 1, y); }
    const edgeCount = W * 2 + H * 2;
    // グラデーションの背景も拾えるよう、少ない割合の色も候補に入れる
    const bg = [...hist.entries()]
      .filter(([, n]) => n / edgeCount > 0.012)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([key]) => {
        const r = Math.floor(key / 4096) * 16 + 8;
        const g = Math.floor((key % 4096) / 256) * 16 + 8;
        const b = Math.floor((key % 256) / 16) * 16 + 8;
        return [r, g, b];
      });

    const NEAR = near, FAR = far;
    const dist = i => {
      let min = 1e9;
      for (const [r, g, b] of bg) {
        const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
        const v = Math.sqrt(dr * dr + dg * dg + db * db);
        if (v < min) min = v;
      }
      return min;
    };

    // --- 2. 外周から塗りつぶし探索（背景と地続きの部分だけ透明化） ---
    const seen = new Uint8Array(W * H);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const p = y * W + x;
      if (seen[p]) return;
      seen[p] = 1;
      stack.push(p);
    };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

    while (stack.length) {
      const p = stack.pop();
      const i = p * 4;
      const v = dist(i);
      if (v >= FAR) continue;                       // 素材にぶつかったので止める
      d[i + 3] = v <= NEAR ? 0 : Math.round(((v - NEAR) / (FAR - NEAR)) * 255); // 境界はやわらかく
      const x = p % W, y = (p - (p % W)) / W;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }

    // --- 2.4 白い素材が白背景に食われた分を埋め戻す ---
    // 素材の中に背景と同じ色（真っ白なハイライトなど）があると、そこから塗りつぶしが
    // 中へ漏れてスカスカになる。確実に素材の画素を太らせて輪郭を閉じ、
    // 閉じた輪郭の内側を「素材」として塗り直したうえで、太らせた分を元に戻す。
    if (solid) {
      const K = solid;
      const strong = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) if (dist(p * 4) >= FAR) strong[p] = 1;

      const grow = (src, times) => {
        let cur = src;
        for (let t = 0; t < times; t++) {
          const next = new Uint8Array(cur);
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const p = y * W + x;
              if (cur[p]) continue;
              if ((x > 0 && cur[p - 1]) || (x < W - 1 && cur[p + 1]) ||
                  (y > 0 && cur[p - W]) || (y < H - 1 && cur[p + W])) next[p] = 1;
            }
          }
          cur = next;
        }
        return cur;
      };
      const shrink = (src, times) => {
        let cur = src;
        for (let t = 0; t < times; t++) {
          const next = new Uint8Array(cur);
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const p = y * W + x;
              if (!cur[p]) continue;
              if ((x > 0 && !cur[p - 1]) || (x < W - 1 && !cur[p + 1]) ||
                  (y > 0 && !cur[p - W]) || (y < H - 1 && !cur[p + W])) next[p] = 0;
            }
          }
          cur = next;
        }
        return cur;
      };

      // 太らせた素材の外側だけを外周からたどる（内側の穴は残る＝素材とみなす）
      const fat = grow(strong, K);
      const outside = new Uint8Array(W * H);
      const st = [];
      const seed = (x, y) => {
        const p = y * W + x;
        if (fat[p] || outside[p]) return;
        outside[p] = 1; st.push(p);
      };
      for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
      for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
      while (st.length) {
        const p = st.pop();
        const x = p % W, y = (p - (p % W)) / W;
        if (x > 0) seed(x - 1, y);
        if (x < W - 1) seed(x + 1, y);
        if (y > 0) seed(x, y - 1);
        if (y < H - 1) seed(x, y + 1);
      }
      let filled = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) filled[p] = outside[p] ? 0 : 1;
      filled = shrink(filled, K);            // 太らせた分を戻す

      for (let p = 0; p < W * H; p++) if (filled[p]) d[p * 4 + 3] = 255;
    }

    // --- 2.5 ふちを削る（元画像が持っている光のにじみを落とす） ---
    for (let it = 0; it < erode; it++) {
      const alpha = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) alpha[p] = d[p * 4 + 3];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const p = y * W + x;
          if (alpha[p] === 0) continue;
          const l = x > 0 ? alpha[p - 1] : 0;
          const r = x < W - 1 ? alpha[p + 1] : 0;
          const u = y > 0 ? alpha[p - W] : 0;
          const dn = y < H - 1 ? alpha[p + W] : 0;
          if (l < 8 || r < 8 || u < 8 || dn < 8) d[p * 4 + 3] = 0;
        }
      }
    }

    // --- 3. 透明ピクセルの色を隣の素材色で埋める（縮小時の縁のにじみ止め） ---
    const copy = new Uint8ClampedArray(d);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (copy[i + 3] > 24) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = (ny * W + nx) * 4;
            if (copy[j + 3] > 128) { r += copy[j]; g += copy[j + 1]; b += copy[j + 2]; n++; }
          }
        }
        if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
      }
    }
    ctx.putImageData(id, 0, 0);

    // --- 4. 余白のトリミング ---
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= x0 && y1 >= y0) box = { x0, y0, x1, y1 };
  }

  // --- 5. 縮小して書き出し ---
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const k = Math.min(1, maxSide / Math.max(bw, bh));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(bw * k));
  out.height = Math.max(1, Math.round(bh * k));
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  if (rotate === 180) {
    octx.translate(out.width, out.height);
    octx.rotate(Math.PI);
  }
  octx.drawImage(cv, box.x0, box.y0, bw, bh, 0, 0, out.width, out.height);

  return { png: out.toDataURL('image/png'), w: out.width, h: out.height };
}

main();
