/* =========================================================
   parfait.js — ステータスに応じて姿を変える固有のパフェ
   ドット絵素材（assets/parts/）を積み上げて組み立てる。

     筋トレ   → てっぺんの生クリーム（レベルで大きさ・さくらんぼ付きに）
     VBA      → 狐プレート／ロールクッキー／プレッツェル（枚数が増える）
     簿記     → チョコフレークの地層＋ブラウニー（厚みが増す）
     マナー   → 席・金縁・金の受け皿・スプーン（段階的に格が上がる）
     英語     → 世界のフルーツ（種類が増える）
     脱毛     → クリスタル・花ゼリー・かき氷（澄んでいく）
     家事     → アイシングクッキー・団子・チョコツイスト（仕上げ）

   スペシャル実績のどデカトッピングは別枠（ワッフル・チーズケーキ・地球グミ・チョコミント）。
   ========================================================= */

const VW = 340, VH = 520;                 // 仮想座標系

/* グラスの配置と、中身を入れられる内側の範囲 */
const GLASS = { cx: 170, w: 200, bottom: 430 };
const GLASS_H = GLASS.w * 640 / 354;      // 素材の縦横比
const GLASS_TOP = GLASS.bottom - GLASS_H;
const INNER_TOP = GLASS_TOP + GLASS_H * 0.062;
const INNER_BOT = GLASS_TOP + GLASS_H * 0.800;
const INNER_HW_TOP = GLASS.w * 0.400;     // 口の内側の半幅
const INNER_HW_BOT = GLASS.w * 0.125;     // 底の内側の半幅

const Parfait = {
  canvas: null,
  ctx: null,
  levels: {},
  shown: {},
  milestones: {},
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

  setMilestones(ms) {
    this.milestones = ms || {};
  },

  lv(key) {
    return this.shown[key] || 0;
  },

  /* ---------- 描画の下ごしらえ ---------- */

  /** 高さ y における器の内側の半幅 */
  halfWAt(y) {
    const t = Math.max(0, Math.min(1, (y - INNER_TOP) / (INNER_BOT - INNER_TOP)));
    return INNER_HW_TOP + (INNER_HW_BOT - INNER_HW_TOP) * t;
  },

  /** 器の内側（中身を描ける範囲） */
  innerPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(GLASS.cx - INNER_HW_TOP, INNER_TOP);
    ctx.lineTo(GLASS.cx + INNER_HW_TOP, INNER_TOP);
    ctx.lineTo(GLASS.cx + INNER_HW_BOT, INNER_BOT);
    ctx.quadraticCurveTo(GLASS.cx, INNER_BOT + 10, GLASS.cx - INNER_HW_BOT, INNER_BOT);
    ctx.closePath();
  },

  /**
   * 素材を1枚描く。cx を中心に、bottomY を下端として幅 w で配置する。
   * 戻り値は描いた高さ（積み上げに使う）。
   */
  put(name, cx, bottomY, w, opt) {
    const im = Assets.get(name);
    if (!im) return 0;
    const o = opt || {};
    const h = (w * im.naturalHeight) / im.naturalWidth;
    const ctx = this.ctx;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.rot) {
      ctx.translate(cx, bottomY - h / 2);
      ctx.rotate(o.rot);
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(im, cx - w / 2, bottomY - h, w, h);
    }
    ctx.restore();
    return h;
  },

  /* ---------- 本体 ---------- */

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VW, VH);

    const manner = this.lv('manner');

    this.drawTable(manner);

    if (!Assets.ready) {
      ctx.fillStyle = 'rgba(140,115,100,0.7)';
      ctx.font = '13px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('素材を読み込み中…', VW / 2, VH / 2);
      return;
    }

    // 中身（器の内側だけに描く）
    ctx.save();
    this.innerPath(ctx);
    ctx.clip();
    const contentTop = this.drawContents();
    const peakInside = this.drawTop(contentTop);
    ctx.restore();

    // マナー：金の受け皿（器の下に敷く）
    if (manner >= 6) this.drawCharger(manner);

    // 器（線と艶が中身の上に重なり、ガラス越しに見える）
    this.put('glass', GLASS.cx, GLASS.bottom, GLASS.w);
    if (manner >= 3) this.drawGoldRim(manner);
    if (manner >= 12) this.drawSpoon(manner);

    // 器の口より上（あふれた部分は器の手前に）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, INNER_TOP + 2);
    ctx.clip();
    this.drawTop(contentTop);
    ctx.restore();

    this.drawSpecials(peakInside);
    this.drawSparkles(peakInside, manner, this.lv('housework'), this.lv('hairremoval'));

    const total = STATS.reduce((a, s) => a + this.lv(s.key), 0);
    if (total < 0.2 && Object.keys(this.milestones).length === 0) {
      ctx.fillStyle = 'rgba(120,95,80,0.85)';
      ctx.font = 'bold 14px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('からっぽのグラス', VW / 2, 52);
      ctx.font = '12px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.fillText('今日の達成をチェックしよう', VW / 2, 72);
    }
  },

  /** マナー：席（テーブルとレース）。磨くほど場が整う */
  drawTable(manner) {
    const im = Assets.get('table_doily');
    const ctx = this.ctx;
    if (!im) return;
    const scale = Math.max(VW / im.naturalWidth, VH / im.naturalHeight);
    const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.30 + manner * 0.042);
    ctx.drawImage(im, (VW - w) / 2, VH - h, w, h);
    ctx.restore();
  },

  /**
   * 器の中身を下から積む。
   * 簿記・脱毛・家事の合計が上がるほど器が満ちていき、
   * レベルの解禁に応じて層の種類が増える。戻り値は中身の上端y。
   */
  drawContents() {
    const book = this.lv('bookkeeping');
    const hair = this.lv('hairremoval');
    const house = this.lv('housework');

    const layers = [];
    if (book > 0) layers.push({ name: 'choco_flakes', weight: 1 + book * 0.05 });
    if (book >= 10) layers.push({ name: 'brownie', weight: 0.8 });
    if (hair > 0) layers.push({ name: 'purple_crystal', weight: 1 + hair * 0.04 });
    if (hair >= 7) layers.push({ name: 'flower_jelly', weight: 1.1 });
    if (hair >= 14) layers.push({ name: 'shaved_ice', weight: 1.0 });
    if (house >= 2) layers.push({ name: 'icing_cookies', weight: 0.7 + house * 0.02 });
    if (!layers.length) return INNER_BOT;

    // 満ち具合（0.1 〜 1.0）
    const fill = Math.min(0.95, 0.10 + ((book + hair + house) / (3 * MAX_LEVEL)) * 1.0);
    const total = (INNER_BOT - INNER_TOP) * fill;
    const sum = layers.reduce((a, l) => a + l.weight, 0);

    let y = INNER_BOT + 6;
    layers.forEach(l => {
      const im = Assets.get(l.name);
      if (!im) return;
      const slot = (total * l.weight) / sum;
      const h = slot * 1.75;                       // 層どうしが重なって見えるよう大きめに
      const w = (h * im.naturalWidth) / im.naturalHeight;
      this.put(l.name, GLASS.cx, y, w);            // 器からはみ出た分はクリップされる
      y -= slot;
    });

    return Math.max(y, INNER_TOP - 2);
  },

  /**
   * 器の上の盛り付け。器の内側と外側で2回呼ばれるので、
   * 時間以外の乱れを持たない（同じ絵が2回描かれる）。
   * 戻り値はてっぺんのy。
   */
  drawTop(contentTop) {
    const muscle = this.lv('muscle');
    const vba = this.lv('vba');
    const eng = this.lv('english');
    const house = this.lv('housework');

    // 中身の上に載る。中身が少なければ器の中に沈み、満ちていれば口からあふれる
    const base = Math.max(contentTop + 14, INNER_TOP + 60);

    // VBA：狐プレートを後ろに立てる
    if (vba > 0) {
      const n = vba >= 17 ? 3 : vba >= 9 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        const idx = Math.floor(i / 2);
        this.put('fox_plate', GLASS.cx + dir * (48 + idx * 26), base - 22,
          46 + vba * 1.3, { rot: dir * (0.1 + idx * 0.1) });
      }
    }
    if (vba >= 7) this.put('wafer_stick', GLASS.cx + 54, base + 10, 54 + vba, { rot: 0.35 });
    if (vba >= 13) this.put('pretzel_sticks', GLASS.cx - 58, base + 6, 44 + vba * 0.6, { rot: -0.2 });

    // 筋トレ：てっぺんの生クリーム
    let peak = base;
    if (muscle > 0) {
      const name = muscle >= 6 ? 'whip_cherry' : 'whip_small';
      const im = Assets.get(name);
      const w = 86 + muscle * 2.8;
      const h = im ? (w * im.naturalHeight) / im.naturalWidth : 0;
      const bottom = Math.max(base + 6, 26 + h);   // 高く育っても画面からはみ出さない
      this.put(name, GLASS.cx, bottom, w);
      peak = bottom - h;
    }

    // 英語：世界のフルーツ。レベルが上がるほど種類が増える
    const fruits = [
      [1, 'strawberry', 170, 26, 42],
      [4, 'blueberry', 133, 48, 40],
      [7, 'pineapple_chunks', 208, 44, 48],
      [10, 'orange_segment', 137, 84, 46],
      [13, 'lemon_star', 205, 84, 44],
      [16, 'melon_pistachio', 170, 108, 48],
      [19, 'pineapple_slice', 112, 116, 30]
    ];
    fruits.forEach(([need, name, x, dy, w]) => {
      if (eng < need) return;
      const bob = Math.sin(this.t * 1.1 + need) * 1.2;
      this.put(name, x, peak + dy + bob, w);
    });

    // 家事：仕上げの添え物
    if (house >= 8) this.put('dango', GLASS.cx + 66, peak + 150, 22, { rot: 0.28 });
    if (house >= 14) this.put('choco_twist', GLASS.cx - 62, peak + 128, 62, { rot: -0.18 });

    // Unity実績：チョコミントアイスはてっぺんに丸ごと
    if (this.milestones.unity) {
      const h = this.put('chocomint_scoops', GLASS.cx + 4, peak + 30, 78);
      peak = peak + 26 - h;
    }

    return peak;
  },

  /**
   * マナー：器の口の金縁。
   * Lv3 で細く入り、Lv9 で太く、Lv16 で二重、Lv19 からきらめく。
   */
  drawGoldRim(manner) {
    const ctx = this.ctx;
    const y = GLASS_TOP + GLASS_H * 0.036;
    const shine = manner >= 19 ? 0.75 + Math.abs(Math.sin(this.t * 1.6)) * 0.25 : 1;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(GLASS.cx, y, GLASS.w * 0.478, GLASS.w * 0.055, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201,162,39,${Math.min(0.95, 0.45 + manner * 0.04) * shine})`;
    ctx.lineWidth = manner >= 9 ? 3.4 : 1.8;
    ctx.stroke();

    if (manner >= 16) {
      ctx.beginPath();
      ctx.ellipse(GLASS.cx, y + 9, GLASS.w * 0.455, GLASS.w * 0.05, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230,198,110,${0.85 * shine})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  },

  /** マナー：器の下に敷く金の受け皿（レベルで広がる） */
  drawCharger(manner) {
    const ctx = this.ctx;
    const y = GLASS.bottom - 2;
    const r = 62 + manner * 1.8;
    ctx.save();

    ctx.beginPath();
    ctx.ellipse(GLASS.cx, y, r, r * 0.24, 0, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(GLASS.cx - r, y, GLASS.cx + r, y);
    g.addColorStop(0, 'rgba(214,178,84,0.85)');
    g.addColorStop(0.45, 'rgba(248,232,176,0.92)');
    g.addColorStop(1, 'rgba(206,168,74,0.85)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,30,0.75)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(GLASS.cx, y, r - 10, (r - 10) * 0.24, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,244,200,0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 縁の飾り（レベルが上がるほど数が増える）
    const dots = Math.min(24, 10 + manner);
    for (let i = 0; i < dots; i++) {
      const a = (Math.PI * 2 * i) / dots;
      ctx.beginPath();
      ctx.arc(GLASS.cx + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5) * 0.24, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,225,0.9)';
      ctx.fill();
    }
    ctx.restore();
  },

  /** マナー：添えられるパフェスプーン */
  drawSpoon(manner) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(GLASS.cx + 74, 250);
    ctx.rotate(0.2);

    // 柄
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-4, -190, 8, 210, 4);
    else ctx.rect(-4, -190, 8, 210);
    const g = ctx.createLinearGradient(-4, 0, 4, 0);
    g.addColorStop(0, '#9fb0ba');
    g.addColorStop(0.35, '#f2f7fa');
    g.addColorStop(1, '#a8b8c2');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,120,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // すくう部分
    ctx.beginPath();
    ctx.ellipse(0, 30, 11, 17, 0, 0, Math.PI * 2);
    const g2 = ctx.createLinearGradient(-11, 0, 11, 0);
    g2.addColorStop(0, '#93a5b0');
    g2.addColorStop(0.4, '#eef5f8');
    g2.addColorStop(1, '#9fb1bb');
    ctx.fillStyle = g2;
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,120,0.8)';
    ctx.stroke();

    // 柄の先の飾り（高マナーで金になる）
    ctx.beginPath();
    ctx.ellipse(0, -192, 6, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = manner >= 16 ? '#e8c86a' : '#dce7ec';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,120,0.8)';
    ctx.stroke();

    ctx.restore();
  },

  /* ---------- スペシャル実績のどデカトッピング ---------- */

  /**
   * 4つの大勝負（VBAベーシック／簿記3級／TOEIC更新／Unity1画面）は、
   * 日々の積み上げとは別格の大きさでパフェに載る。
   * ※ Unityのチョコミントアイスは盛り付けの一部として drawTop() で描く。
   */
  drawSpecials(peakY) {
    const ms = this.milestones;
    if (!ms || Object.keys(ms).length === 0) return;

    const aY = Math.max(76, Math.min(peakY, 150));
    const bob = i => Math.sin(this.t * 0.9 + i) * 1.6;

    // 簿記3級：特大チーズケーキをグラスに立てかける
    if (ms.boki3) {
      this.shadow(244, Math.min(aY + 186, 316), 40);
      this.put('cheesecake', 244, Math.min(aY + 186, 316) + bob(1), 96, { rot: 0.12 });
    }

    // VBAベーシック：特大ワッフルクッキー
    if (ms.vba_basic) {
      this.shadow(250, aY + 82, 34);
      this.put('waffle_cookie', 250, aY + 82 + bob(2), 82, { rot: -0.12 });
    }

    // TOEIC：地球グミ。更新した回数だけ星が増える
    if (ms.toeic) this.drawEarthGummy(88, aY + 50, ms.toeic);
  },

  /** 素材の足元に落ちる影 */
  shadow(cx, bottomY, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY - 2, r, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,90,60,0.20)';
    ctx.fill();
  },

  /** TOEIC：地球グミ（星の数＝更新回数、帯にベストスコア） */
  drawEarthGummy(cx, cy, rec) {
    const ctx = this.ctx;
    const count = Math.max(1, (rec && rec.count) || 1);
    const score = rec && rec.score;
    const w = 74;
    const im = Assets.get('earth_gummy');
    const h = im ? (w * im.naturalHeight) / im.naturalWidth : w;

    this.shadow(cx, cy + h / 2 + 4, 28);
    this.put('earth_gummy', cx, cy + h / 2 + Math.sin(this.t * 0.9) * 1.6, w);

    const R = Math.max(w, h) / 2;
    const stars = Math.min(8, count);
    for (let i = 0; i < stars; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / Math.max(4, stars) + this.t * 0.15;
      this.star(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12), 5.5, '#f5c542');
    }

    if (score) {
      const label = `TOEIC ${score}`;
      ctx.save();
      ctx.font = 'bold 11px "Hiragino Sans", "Yu Gothic", sans-serif';
      const bw = ctx.measureText(label).width + 14;
      const by = cy + R + 8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - bw / 2, by, bw, 17, 8);
      else ctx.rect(cx - bw / 2, by, bw, 17);
      ctx.fillStyle = '#26478f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,190,90,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, by + 9);
      ctx.restore();
    }
  },

  /** 小さな星 */
  star(x, y, r, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  },

  /** きらめき（マナー・家事・脱毛が高いほど輝く） */
  drawSparkles(peakY, manner, house, hair) {
    const shine = (manner + house + hair) / (MAX_LEVEL * 3);
    if (shine <= 0.02) return;
    const ctx = this.ctx;
    const n = Math.round(3 + shine * 12);
    for (let i = 0; i < n; i++) {
      const seedX = 70 + ((i * 71) % 200);
      const seedY = Math.max(20, peakY - 20) + ((i * 97) % 300);
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
