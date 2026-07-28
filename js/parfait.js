/* =========================================================
   parfait.js — ステータスに応じて姿を変える固有のパフェ
   ドット絵素材（assets/parts/）を積み上げて組み立てる。

     筋トレ   → てっぺんの生クリーム（レベルで大きさ・さくらんぼ付きに）
     VBA      → ウエハース／ロールクッキー／プレッツェル（本数が増える）
     簿記     → チョコフレークの地層＋ブラウニー（厚みが増す）
     マナー   → 器とレースの席（きれいに整い、金縁が付く）
     英語     → 世界のフルーツ（種類が増える）
     脱毛     → クリスタル・花ゼリー・かき氷（澄んでいく）
     家事     → アイシングクッキー・団子・チョコツイスト（仕上げ）

   スペシャル実績のどデカトッピングは別枠（歯車・帳簿・地球儀・チョコミント）。
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

    // 器（線と艶が中身の上に重なり、ガラス越しに見える）
    this.put('glass', GLASS.cx, GLASS.bottom, GLASS.w);
    if (manner >= 8) this.drawGoldRim(manner);

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
    ctx.globalAlpha = Math.min(1, 0.45 + manner * 0.028);
    ctx.drawImage(im, (VW - w) / 2, VH - h + 40, w, h);
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

    // VBA：ウエハースを後ろに立てる
    if (vba > 0) {
      const n = 1 + Math.floor(vba / 8);
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        const idx = Math.floor(i / 2);
        this.put('wafer_board', GLASS.cx + dir * (44 + idx * 20), base - 4,
          26 + vba * 0.5, { rot: dir * (0.2 + idx * 0.12) });
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

  /** マナー：器の口の金縁 */
  drawGoldRim(manner) {
    const ctx = this.ctx;
    const y = GLASS_TOP + GLASS_H * 0.036;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(GLASS.cx, y, GLASS.w * 0.478, GLASS.w * 0.055, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201,162,39,${Math.min(0.95, 0.35 + manner * 0.05)})`;
    ctx.lineWidth = manner >= 15 ? 3 : 2;
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

    if (ms.boki3) this.drawBookCake(246, Math.min(aY + 168, 300), 0.26);
    if (ms.toeic) this.drawGlobeMacaron(92, aY + 48, 33, ms.toeic);
    if (ms.vba_basic) this.drawGearCookie(250, aY + 40, 36);
  },

  /** VBAベーシック：ゆっくり回る巨大な歯車クッキー */
  drawGearCookie(cx, cy, R) {
    const ctx = this.ctx;
    const teeth = 9;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.ellipse(2, R * 0.9, R * 0.8, R * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,90,60,0.22)';
    ctx.fill();

    ctx.rotate(this.t * 0.22);

    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (Math.PI * i) / teeth;
      const r = i % 2 ? R * 0.74 : R;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, '#e0b071');
    g.addColorStop(0.45, '#c98f4e');
    g.addColorStop(1, '#a56c31');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,70,26,0.8)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, R * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#8a5a25';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,200,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.68, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(110,70,26,0.35)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const p = (i * R) / 4;
      ctx.beginPath(); ctx.moveTo(p, -R); ctx.lineTo(p, R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R, p); ctx.lineTo(R, p); ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(226,190,90,0.9)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.restore();
  },

  /** 簿記3級：グラスに立てかけた特大の帳簿ブックケーキ */
  drawBookCake(cx, cy, rot) {
    const ctx = this.ctx;
    const w = 84, h = 58;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot || 0);

    ctx.beginPath();
    ctx.ellipse(4, h / 2 + 6, w * 0.45, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,90,60,0.22)';
    ctx.fill();

    const round = (x, y, ww, hh, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, r);
      else ctx.rect(x, y, ww, hh);
    };
    round(-w / 2 + 5, -h / 2 + 4, w - 6, h - 6, 4);
    ctx.fillStyle = '#fdf6e6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,130,90,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(150,120,80,0.4)';
    for (let i = 1; i < 7; i++) {
      const y = -h / 2 + 4 + ((h - 6) * i) / 7;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 8, y);
      ctx.lineTo(w / 2 - 4, y);
      ctx.stroke();
    }

    round(-w / 2, -h / 2, w - 10, h, 5);
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, '#8c5a26');
    g.addColorStop(0.5, '#b07d3a');
    g.addColorStop(1, '#7a4a1e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,42,14,0.8)';
    ctx.stroke();

    round(-w / 2, -h / 2, 11, h, 5);
    ctx.fillStyle = 'rgba(60,36,12,0.55)';
    ctx.fill();

    round(-w / 2 + 17, -h / 2 + 8, w - 36, h - 16, 3);
    ctx.strokeStyle = 'rgba(230,196,120,0.95)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#f1dda2';
    ctx.font = 'bold 19px "Hiragino Sans", "Yu Gothic", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('簿', -w / 2 + (w - 10) / 2 + 3, 1);

    ctx.beginPath();
    ctx.moveTo(w / 2 - 22, h / 2 - 2);
    ctx.lineTo(w / 2 - 12, h / 2 - 2);
    ctx.lineTo(w / 2 - 12, h / 2 + 16);
    ctx.lineTo(w / 2 - 17, h / 2 + 10);
    ctx.lineTo(w / 2 - 22, h / 2 + 16);
    ctx.closePath();
    ctx.fillStyle = '#d1452f';
    ctx.fill();

    ctx.restore();
  },

  /** TOEIC：地球儀マカロン。更新するほど星が増える */
  drawGlobeMacaron(cx, cy, R, rec) {
    const ctx = this.ctx;
    const count = Math.max(1, (rec && rec.count) || 1);
    const score = rec && rec.score;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.ellipse(0, R + 6, R * 0.8, R * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,90,60,0.22)';
    ctx.fill();

    const g = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.2, 0, 0, R);
    g.addColorStop(0, '#8fc0f5');
    g.addColorStop(0.6, '#3d6fd1');
    g.addColorStop(1, '#26478f');
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#5fb36a';
    [[-0.35, -0.30, 0.34, 0.22, 0.3],
     [0.28, -0.10, 0.30, 0.30, -0.4],
     [-0.10, 0.42, 0.30, 0.20, 0.1],
     [0.42, 0.40, 0.20, 0.14, 0.5]].forEach(([x, y, rw, rh, rot]) => {
      ctx.beginPath();
      ctx.ellipse(x * R, y * R, rw * R, rh * R, rot, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(255,247,232,0.95)';
    ctx.fillRect(-R, -R * 0.16, R * 2, R * 0.32);
    ctx.strokeStyle = 'rgba(200,170,130,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-R, -R * 0.16); ctx.lineTo(R, -R * 0.16);
    ctx.moveTo(-R, R * 0.16); ctx.lineTo(R, R * 0.16);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, R * (i / 3), R, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(-R * 0.34, -R * 0.42, R * 0.26, R * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.12, R * 0.42, -0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(226,190,90,0.95)';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    const stars = Math.min(8, count);
    for (let i = 0; i < stars; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / Math.max(4, stars) + this.t * 0.15;
      this.star(Math.cos(a) * (R + 15), Math.sin(a) * (R + 15), 5.5, '#f5c542');
    }

    if (score) {
      const label = `TOEIC ${score}`;
      ctx.font = 'bold 11px "Hiragino Sans", "Yu Gothic", sans-serif';
      const w = ctx.measureText(label).width + 14;
      const y = R + 14;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, y, w, 17, 8);
      else ctx.rect(-w / 2, y, w, 17);
      ctx.fillStyle = '#26478f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,190,90,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, y + 9);
    }

    ctx.restore();
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
