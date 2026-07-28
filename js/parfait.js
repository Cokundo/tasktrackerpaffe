/* =========================================================
   parfait.js — ステータスに応じて姿を変える固有のパフェ
   すべてCanvasで手描き。各ステータスが担当パーツを持つ。

     筋トレ   → クリームの高さ・渦
     VBA      → 格子ウエハーの本数
     簿記     → グラノーラ地層の厚みと縞
     マナー   → 器（脚・金縁・ドイリー）
     英語     → 果実の種類と数
     脱毛     → ジュレの透明感と気泡
     家事     → ホワイトソース・粉雪・ミント
   ========================================================= */

const VW = 340, VH = 520; // 仮想座標系

const Parfait = {
  canvas: null,
  ctx: null,
  levels: {},
  shown: {},
  t: 0,
  running: false,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    STATS.forEach(s => {
      this.levels[s.key] = 0;
      this.shown[s.key] = 0;
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.t += 1 / 60;
      STATS.forEach(s => {
        const d = this.levels[s.key] - this.shown[s.key];
        this.shown[s.key] += Math.abs(d) > 0.005 ? d * 0.08 : d;
      });
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.min(360, Math.max(240, rect.width - 24));
    const h = (w * VH) / VW;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.scale = (w / VW) * dpr;
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  },

  setLevels(levels) {
    STATS.forEach(s => (this.levels[s.key] = levels[s.key] || 0));
  },

  lv(key) {
    return this.shown[key] || 0;
  },

  /* ------------------------------------------------------ */

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VW, VH);

    const muscle = this.lv('muscle');
    const vba = this.lv('vba');
    const book = this.lv('bookkeeping');
    const manner = this.lv('manner');
    const eng = this.lv('english');
    const hair = this.lv('hairremoval');
    const house = this.lv('housework');

    this.drawDoily(manner, house);
    this.drawGlassBack(manner);

    // --- 中身（グラスの内側にクリップ） ---
    ctx.save();
    this.bowlPath(ctx);
    ctx.clip();

    const bottomY = 400;
    const rimY = 170;
    const inner = bottomY - rimY;

    let hGranola = book > 0 ? 16 + 4.0 * book : 0;
    let hJelly = hair > 0 ? 14 + 3.6 * hair : 0;
    let hSauce = house > 0 ? 5 + 1.3 * house : 0;
    let hCream = muscle > 0 ? 22 + 6.0 * muscle : 0;

    // 器からあふれない範囲に収める
    const sum = hGranola + hJelly + hSauce + hCream;
    if (sum > inner) {
      const k = inner / sum;
      hGranola *= k; hJelly *= k; hSauce *= k; hCream *= k;
    }

    let y = bottomY;
    if (hGranola > 0) { this.drawGranola(y - hGranola, hGranola, book); y -= hGranola; }
    if (hJelly > 0) { this.drawJelly(y - hJelly, hJelly, hair); y -= hJelly; }
    if (hSauce > 0) { this.drawSauce(y - hSauce, hSauce); y -= hSauce; }
    if (hCream > 0) { this.drawCreamInCup(y - hCream, hCream); y -= hCream; }

    ctx.restore();

    // --- 盛り付け（クリームの山・ウエハー・果実・仕上げ） ---
    // 器に沈む部分はガラスの内側に、せり出す部分はガラスの外側に描く。
    const topY = Math.max(rimY - 4, y);
    const peakY = muscle > 0 ? this.creamGeom(topY, muscle).peak : topY;
    const drawTop = () => {
      if (vba > 0) this.drawWafers(peakY, vba);      // ウエハーはクリームの後ろに立てる
      if (muscle > 0) this.drawCreamMound(topY, muscle);
      if (eng > 0) this.drawFruits(peakY, eng);
      if (house > 0) this.drawFinish(peakY, house);
    };

    ctx.save();
    this.bowlPath(ctx);
    ctx.clip();
    drawTop();
    ctx.restore();

    this.drawGlassFront(manner);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, rimY + 1);
    ctx.clip();
    drawTop();
    ctx.restore();

    this.drawSparkles(peakY, manner, house, hair);

    // --- 何も育っていないとき ---
    const total = STATS.reduce((a, s) => a + this.lv(s.key), 0);
    if (total < 0.2) {
      ctx.fillStyle = 'rgba(140,115,100,0.6)';
      ctx.font = '14px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('からっぽのグラス', VW / 2, 120);
      ctx.font = '12px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.fillText('今日の達成をチェックしよう', VW / 2, 142);
    }
  },

  /* ---------- 器 ---------- */

  bowlPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(95, 170);
    ctx.bezierCurveTo(103, 300, 120, 360, 137, 385);
    ctx.quadraticCurveTo(170, 406, 203, 385);
    ctx.bezierCurveTo(220, 360, 237, 300, 245, 170);
    ctx.closePath();
  },

  drawDoily(manner, house) {
    if (manner < 3) return;
    const ctx = this.ctx;
    const cx = 170, cy = 486;
    const r = 62 + manner * 1.6;
    const petals = 16;

    ctx.save();
    ctx.globalAlpha = Math.min(1, manner / 8);
    ctx.beginPath();
    for (let i = 0; i <= petals; i++) {
      const a = (Math.PI * 2 * i) / petals;
      const rr = r + Math.cos(a * petals) * 0;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.24;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // レース模様
    for (let i = 0; i < petals; i++) {
      const a = (Math.PI * 2 * i) / petals;
      const x = cx + Math.cos(a) * (r - 7);
      const yy = cy + Math.sin(a) * (r - 7) * 0.24;
      ctx.beginPath();
      ctx.arc(x, yy, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,162,39,0.35)';
      ctx.fill();
    }
    if (house > 6) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r - 14, (r - 14) * 0.24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201,162,39,0.3)';
      ctx.stroke();
    }
    ctx.restore();
  },

  drawGlassBack(manner) {
    const ctx = this.ctx;
    const stemH = 34 + manner * 2.2;   // マナーが高いほど脚が伸びて格が上がる
    const baseR = 40 + manner * 1.5;
    const baseY = 478;
    const stemTop = 400;
    const stemBottom = baseY - 6;

    // 台座
    ctx.beginPath();
    ctx.ellipse(170, baseY, baseR, baseR * 0.22, 0, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(170 - baseR, 0, 170 + baseR, 0);
    g.addColorStop(0, 'rgba(215,232,238,0.9)');
    g.addColorStop(0.45, 'rgba(250,255,255,0.95)');
    g.addColorStop(1, 'rgba(205,222,230,0.9)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,185,195,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 脚
    const sw = 7;
    ctx.beginPath();
    ctx.moveTo(170 - sw, stemTop);
    ctx.bezierCurveTo(170 - sw + 1, stemTop + stemH * 0.5, 170 - sw - 3, stemBottom - 8, 170 - sw - 6, stemBottom);
    ctx.lineTo(170 + sw + 6, stemBottom);
    ctx.bezierCurveTo(170 + sw + 3, stemBottom - 8, 170 + sw - 1, stemTop + stemH * 0.5, 170 + sw, stemTop);
    ctx.closePath();
    const gs = ctx.createLinearGradient(160, 0, 182, 0);
    gs.addColorStop(0, 'rgba(200,222,232,0.95)');
    gs.addColorStop(0.4, 'rgba(255,255,255,0.98)');
    gs.addColorStop(1, 'rgba(198,218,228,0.95)');
    ctx.fillStyle = gs;
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,185,195,0.75)';
    ctx.stroke();

    // 節（マナーが育つと現れる装飾）
    if (manner >= 6) {
      ctx.beginPath();
      ctx.ellipse(170, stemTop + 26, 12, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,252,255,0.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,185,195,0.8)';
      ctx.stroke();
    }
    if (manner >= 12) {
      ctx.beginPath();
      ctx.ellipse(170, baseY, baseR - 9, (baseR - 9) * 0.22, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201,162,39,0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // グラスの内側の陰
    ctx.save();
    this.bowlPath(ctx);
    ctx.fillStyle = 'rgba(236,246,250,0.75)';
    ctx.fill();
    ctx.restore();
  },

  drawGlassFront(manner) {
    const ctx = this.ctx;
    ctx.save();
    this.bowlPath(ctx);

    // ガラスのつや
    const g = ctx.createLinearGradient(95, 0, 245, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.42)');
    g.addColorStop(0.16, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.93, 'rgba(255,255,255,0.34)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = 'rgba(150,180,192,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 縦のハイライト
    ctx.beginPath();
    ctx.moveTo(110, 190);
    ctx.bezierCurveTo(114, 270, 124, 330, 136, 366);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 口縁（マナーで金縁になる）
    ctx.beginPath();
    ctx.ellipse(170, 170, 75, 13, 0, 0, Math.PI * 2);
    ctx.strokeStyle = manner >= 4 ? 'rgba(201,162,39,0.95)' : 'rgba(150,180,192,0.9)';
    ctx.lineWidth = manner >= 10 ? 3 : 2;
    ctx.stroke();
    if (manner >= 16) {
      ctx.beginPath();
      ctx.ellipse(170, 176, 71, 11, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(230,205,120,0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  },

  /* ---------- 中身の層 ---------- */

  drawGranola(y, h, lv) {
    const ctx = this.ctx;
    ctx.fillStyle = '#b07d3a';
    ctx.fillRect(80, y, 180, h + 10);

    // 簿記＝正確さ。レベルが上がるほど縞がきっちり等間隔に整う
    const rows = Math.max(2, Math.round(2 + lv / 2));
    const gap = h / rows;
    const jitter = Math.max(0, 6 - lv * 0.35);
    for (let i = 0; i < rows; i++) {
      const yy = y + gap * i + (i % 2 ? jitter * 0.4 : 0);
      ctx.fillStyle = i % 2 ? 'rgba(230,196,143,0.75)' : 'rgba(140,96,42,0.55)';
      ctx.fillRect(80, yy, 180, gap * 0.42);
    }
    // 粒
    for (let i = 0; i < 26; i++) {
      const rx = 88 + ((i * 61) % 164);
      const ry = y + ((i * 37) % Math.max(1, h));
      ctx.beginPath();
      ctx.arc(rx, ry, 1.6 + ((i * 7) % 3) * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 ? 'rgba(255,236,200,0.6)' : 'rgba(90,58,25,0.45)';
      ctx.fill();
    }
  },

  drawJelly(y, h, lv) {
    const ctx = this.ctx;
    const clarity = Math.min(1, lv / MAX_LEVEL);          // 脱毛＝透明感
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(196,150,224,${0.85 - clarity * 0.35})`);
    g.addColorStop(1, `rgba(143,97,196,${0.9 - clarity * 0.35})`);
    ctx.fillStyle = g;
    ctx.fillRect(80, y, 180, h + 2);

    // 気泡（つるんとするほど増える）
    const bubbles = Math.round(3 + clarity * 16);
    for (let i = 0; i < bubbles; i++) {
      const bx = 92 + ((i * 47) % 156);
      const drift = Math.sin(this.t * 0.8 + i) * 2;
      const by = y + 4 + ((i * 29) % Math.max(1, h - 6)) + drift;
      ctx.beginPath();
      ctx.arc(bx, by, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
    }
    // 表面のつや
    ctx.beginPath();
    ctx.ellipse(140, y + 5, 26, 4, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.2 + clarity * 0.45})`;
    ctx.fill();
  },

  drawSauce(y, h) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,252,246,0.95)';
    ctx.fillRect(80, y, 180, h + 2);
    ctx.beginPath();
    ctx.ellipse(170, y + 1, 78, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
  },

  drawCreamInCup(y, h) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(80, 0, 260, 0);
    g.addColorStop(0, '#f4dfc8');
    g.addColorStop(0.35, '#fff8ee');
    g.addColorStop(1, '#eed3b6');
    ctx.fillStyle = g;
    ctx.fillRect(80, y, 180, h + 4);
  },

  /* ---------- せり出す造形 ---------- */

  /** クリームの山の寸法（描く前に頂点を知るため） */
  creamGeom(topY, lv) {
    const height = 14 + lv * 5.2;                       // 高さ＝筋トレLv
    const turns = Math.max(2, Math.round(2 + lv / 3));  // 渦の段数
    const baseY = topY;                                 // 中身の上に載る
    const step = height / turns;
    const rwTop = 72 * (1 - ((turns - 1) / turns) * 0.6);
    const peak = baseY - step * (turns - 1) - Math.max(6.5, rwTop * 0.36) - 8;
    return { height, turns, baseY, step, peak };
  },

  /** 筋トレ：クリームの山 */
  drawCreamMound(topY, lv) {
    const ctx = this.ctx;
    const { turns, baseY, step } = this.creamGeom(topY, lv);
    let peak = baseY;

    for (let i = 0; i < turns; i++) {
      const p = i / turns;
      const cy = baseY - step * i;
      const rw = 72 * (1 - p * 0.6);
      const rh = Math.max(6.5, rw * 0.36);
      const off = Math.sin(i * 1.9) * rw * 0.13;

      // 段の落ち影（渦の重なりを見せる）
      ctx.beginPath();
      ctx.ellipse(170 + off, cy + rh * 0.42, rw, rh, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(196,152,112,0.40)';
      ctx.fill();

      // 本体
      ctx.beginPath();
      ctx.ellipse(170 + off, cy, rw, rh, 0, 0, Math.PI * 2);
      const g = ctx.createLinearGradient(170 + off - rw, cy - rh, 170 + off + rw, cy + rh);
      g.addColorStop(0, '#e4c39f');
      g.addColorStop(0.35, '#fffaf2');
      g.addColorStop(0.72, '#f7e6d2');
      g.addColorStop(1, '#dcb894');
      ctx.fillStyle = g;
      ctx.fill();

      // つや
      ctx.beginPath();
      ctx.ellipse(170 + off - rw * 0.28, cy - rh * 0.32, rw * 0.30, rh * 0.30, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();

      peak = cy - rh;
    }

    // てっぺんのとがり
    ctx.beginPath();
    ctx.moveTo(163, peak + 9);
    ctx.quadraticCurveTo(170, peak - 10, 177, peak + 9);
    ctx.closePath();
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
  },

  /** VBA：格子ウエハー。レベルで本数と格子の密度が増す */
  drawWafers(peakY, lv) {
    const ctx = this.ctx;
    const count = Math.min(5, Math.max(1, Math.round(lv / 4 + 0.6)));
    const grid = Math.min(6, 2 + Math.round(lv / 4)); // 格子の目の数

    for (let i = 0; i < count; i++) {
      const dir = i % 2 ? 1 : -1;
      const idx = Math.floor(i / 2);
      const x = 170 + dir * (34 + idx * 16);
      const y = peakY + 42 + idx * 10;
      const angle = dir * (0.28 + idx * 0.12);
      const w = 26, h = 74 + lv * 1.2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 3) : ctx.rect(-w / 2, -h / 2, w, h);
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, '#c98f4e');
      g.addColorStop(0.4, '#e8b978');
      g.addColorStop(1, '#b87e40');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,78,32,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 格子模様＝ロジックの目
      ctx.strokeStyle = 'rgba(120,78,32,0.45)';
      for (let c = 1; c < grid; c++) {
        const xx = -w / 2 + (w * c) / grid;
        ctx.beginPath(); ctx.moveTo(xx, -h / 2); ctx.lineTo(xx, h / 2); ctx.stroke();
      }
      const rowsN = Math.round(grid * 2.2);
      for (let r = 1; r < rowsN; r++) {
        const yy = -h / 2 + (h * r) / rowsN;
        ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); ctx.stroke();
      }
      ctx.restore();
    }
  },

  /** 英語：世界の果実。レベルで種類と数が増える */
  drawFruits(peakY, lv) {
    const ctx = this.ctx;
    const kinds = Math.min(5, 1 + Math.floor(lv / 4));
    const count = Math.min(9, 1 + Math.floor(lv / 2));
    const spots = [
      [170, peakY + 2], [140, peakY + 30], [200, peakY + 28],
      [163, peakY + 56], [190, peakY + 72], [130, peakY + 66],
      [210, peakY + 98], [146, peakY + 96], [176, peakY + 110]
    ];

    for (let i = 0; i < count; i++) {
      const [x, y0] = spots[i];
      const y = y0 + Math.sin(this.t * 1.2 + i) * 0.6;
      const kind = i % kinds;
      const r = i === 0 ? 21 : 15;

      // クリームに載っている影
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.62, r * 0.78, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(184,142,106,0.28)';
      ctx.fill();

      switch (kind) {
        case 0: this.fruitStrawberry(x, y, r); break;
        case 1: this.fruitBerry(x, y, r * 0.8, '#4a63c8', '#8fa3ee'); break;
        case 2: this.fruitKiwi(x, y, r * 0.95); break;
        case 3: this.fruitBerry(x, y, r * 0.85, '#e88a2a', '#ffc47a'); break;
        default: this.fruitBerry(x, y, r * 0.85, '#7a3fa0', '#c396e0'); break;
      }
    }
  },

  fruitStrawberry(x, y, r) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r, r * 0.4, -r * 0.9, -r * 0.7, 0, -r * 0.8);
    ctx.bezierCurveTo(r * 0.9, -r * 0.7, r, r * 0.4, 0, r);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#f4645c');
    g.addColorStop(1, '#c62f2c');
    ctx.fillStyle = g;
    ctx.fill();
    // 種
    ctx.fillStyle = 'rgba(255,235,180,0.9)';
    for (let i = 0; i < 6; i++) {
      const a = -1.2 + i * 0.45;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.35 + 1, 0.9, 1.4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // ヘタ
    ctx.fillStyle = '#4b9b52';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.35, -r * 0.75 + Math.sin(a) * 2, r * 0.34, r * 0.16, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  fruitBerry(x, y, r, c1, c2) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r);
    g.addColorStop(0, c2);
    g.addColorStop(1, c1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  },

  fruitKiwi(x, y, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#8fae3e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#b7d45f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#f4f7e2';
    ctx.fill();
    ctx.fillStyle = '#2f3b1a';
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, 1, 1.6, a, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** 家事：仕上げ（ミント・粉雪・皿の艶） */
  drawFinish(peakY, lv) {
    const ctx = this.ctx;
    // ミント
    if (lv >= 2) {
      ctx.save();
      ctx.translate(182, peakY - 2);
      ctx.rotate(0.3);
      [[0, 0, 14, 7, -0.5], [6, -6, 12, 6, 0.2]].forEach(([dx, dy, rw, rh, rot]) => {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
        const g = ctx.createLinearGradient(-rw, 0, rw, 0);
        g.addColorStop(0, '#3f7d45');
        g.addColorStop(1, '#79c274');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,80,40,0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-rw, 0); ctx.lineTo(rw, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
    // 粉雪（粉糖）
    const n = Math.round(lv * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < n; i++) {
      const x = 110 + ((i * 53) % 120);
      const y = peakY + 10 + ((i * 31) % 110);
      ctx.beginPath();
      ctx.arc(x, y, 0.9 + (i % 2) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** きらめき（マナー・家事・脱毛が高いほど輝く） */
  drawSparkles(peakY, manner, house, hair) {
    const shine = (manner + house + hair) / (MAX_LEVEL * 3);
    if (shine <= 0.02) return;
    const ctx = this.ctx;
    const n = Math.round(3 + shine * 12);
    for (let i = 0; i < n; i++) {
      const seedX = 78 + ((i * 71) % 190);
      const seedY = peakY - 20 + ((i * 97) % 300);
      const phase = (this.t * 1.4 + i * 0.7) % 3;
      const a = phase < 1 ? phase : phase < 2 ? 2 - phase : 0;
      if (a <= 0) continue;
      const r = 3 + a * 5;
      ctx.save();
      ctx.globalAlpha = a * (0.4 + shine * 0.6);
      ctx.translate(seedX, seedY);
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.quadraticCurveTo(0.8, -0.8, r, 0);
      ctx.quadraticCurveTo(0.8, 0.8, 0, r);
      ctx.quadraticCurveTo(-0.8, 0.8, -r, 0);
      ctx.quadraticCurveTo(-0.8, -0.8, 0, -r);
      ctx.fillStyle = manner > house ? 'rgba(255,238,170,0.95)' : 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.restore();
    }
  },

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
};
