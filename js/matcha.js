/* =========================================================
   matcha.js — 抹茶ラテのメモリ表示
   サボるほど減り、皆勤で戻る「継続のゲージ」。
   ========================================================= */

const MVW = 170, MVH = 250;                 // 仮想座標系

/* グラスの形（外側） */
const CUP = { top: 44, bottom: 224, halfTop: 44, halfBottom: 37, cx: 78 };
const CUP_INNER_TOP = CUP.top + 8;
const CUP_INNER_BOT = CUP.bottom - 7;

const Matcha = {
  canvas: null,
  ctx: null,
  state: { level: MATCHA_MAX, pending: 0, empty: false, started: false },
  shown: MATCHA_MAX,
  t: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    const loop = () => {
      this.t += 1 / 60;
      const d = this.state.level - this.shown;
      this.shown += Math.abs(d) > 0.004 ? d * 0.09 : d;
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.min(190, Math.max(130, rect.width - 20));
    const h = (w * MVH) / MVW;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform((w / MVW) * dpr, 0, 0, (w / MVW) * dpr, 0, 0);
  },

  set(state) {
    this.state = state;
  },

  /** 高さ y におけるグラスの半幅 */
  halfAt(y) {
    const t = Math.max(0, Math.min(1, (y - CUP.top) / (CUP.bottom - CUP.top)));
    return CUP.halfTop + (CUP.halfBottom - CUP.halfTop) * t;
  },

  cupPath(ctx, inset) {
    const i = inset || 0;
    const top = CUP.top + i, bot = CUP.bottom - i;
    const ht = this.halfAt(top) - i, hb = this.halfAt(bot) - i;
    ctx.beginPath();
    ctx.moveTo(CUP.cx - ht, top);
    ctx.lineTo(CUP.cx - hb, bot - 10);
    ctx.quadraticCurveTo(CUP.cx - hb, bot, CUP.cx - hb + 10, bot);
    ctx.lineTo(CUP.cx + hb - 10, bot);
    ctx.quadraticCurveTo(CUP.cx + hb, bot, CUP.cx + hb, bot - 10);
    ctx.lineTo(CUP.cx + ht, top);
    ctx.closePath();
  },

  draw() {
    const ctx = this.ctx;
    const lv = Math.max(0, this.shown);
    const empty = this.state.level <= 0;
    ctx.clearRect(0, 0, MVW, MVH);

    // コースター
    ctx.beginPath();
    ctx.ellipse(CUP.cx, CUP.bottom + 8, 52, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,120,95,0.18)';
    ctx.fill();

    // 中身
    ctx.save();
    this.cupPath(ctx, 5);
    ctx.clip();

    const innerH = CUP_INNER_BOT - CUP_INNER_TOP;
    const ratio = lv / MATCHA_MAX;
    const surface = CUP_INNER_BOT - innerH * ratio;

    if (lv > 0.02) {
      // ミルク（下）→ 抹茶（上）のグラデーション
      const g = ctx.createLinearGradient(0, surface, 0, CUP_INNER_BOT);
      g.addColorStop(0, '#8fbb52');
      g.addColorStop(0.42, '#a8cd72');
      g.addColorStop(0.75, '#e8ecd2');
      g.addColorStop(1, '#f6f3e6');
      ctx.fillStyle = g;
      ctx.fillRect(0, surface, MVW, CUP_INNER_BOT - surface + 4);

      // 液面のゆらぎ
      ctx.beginPath();
      ctx.moveTo(0, surface + 3);
      for (let x = 0; x <= MVW; x += 6) {
        ctx.lineTo(x, surface + 3 + Math.sin(x / 16 + this.t * 1.4) * 1.4);
      }
      ctx.lineTo(MVW, surface - 8);
      ctx.lineTo(0, surface - 8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();

      // 泡
      ctx.beginPath();
      ctx.ellipse(CUP.cx, surface + 2, this.halfAt(surface) - 6, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(247,250,235,0.85)';
      ctx.fill();

      // 満タンのときは泡に葉のアート
      if (this.state.level >= MATCHA_MAX) {
        ctx.save();
        ctx.translate(CUP.cx, surface + 2);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.quadraticCurveTo(7, -2, 0, 7);
        ctx.quadraticCurveTo(-7, -2, 0, -7);
        ctx.fillStyle = 'rgba(120,160,70,0.75)';
        ctx.fill();
        ctx.restore();
      }
    } else {
      // 空：底に少しだけ残る
      ctx.fillStyle = 'rgba(180,190,150,0.5)';
      ctx.fillRect(0, CUP_INNER_BOT - 4, MVW, 6);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(CUP.cx - 12 + i * 12, CUP_INNER_BOT - 9 - (i % 2) * 5, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(170,185,140,0.55)';
        ctx.fill();
      }
    }
    ctx.restore();

    // グラス
    this.cupPath(ctx, 0);
    const gg = ctx.createLinearGradient(CUP.cx - 44, 0, CUP.cx + 44, 0);
    gg.addColorStop(0, 'rgba(255,255,255,0.40)');
    gg.addColorStop(0.18, 'rgba(255,255,255,0.08)');
    gg.addColorStop(0.82, 'rgba(255,255,255,0.06)');
    gg.addColorStop(1, 'rgba(255,255,255,0.34)');
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = empty ? 'rgba(150,150,140,0.75)' : 'rgba(120,150,120,0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 口
    ctx.beginPath();
    ctx.ellipse(CUP.cx, CUP.top, CUP.halfTop, 7, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120,150,120,0.6)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // メモリ（目盛り）
    for (let i = 1; i <= MATCHA_MAX; i++) {
      const y = CUP_INNER_BOT - (innerH * i) / MATCHA_MAX;
      const on = i <= Math.round(lv);
      const x = CUP.cx + this.halfAt(y);
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 7, y);
      ctx.strokeStyle = on ? 'rgba(90,130,60,0.85)' : 'rgba(150,140,130,0.35)';
      ctx.lineWidth = on ? 2 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + 13, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#7aa844' : 'rgba(160,150,140,0.3)';
      ctx.fill();
    }

    // ストロー
    ctx.save();
    ctx.translate(CUP.cx + 16, CUP.top + 6);
    ctx.rotate(0.22);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-5, -34, 10, 120, 5);
    else ctx.rect(-5, -34, 10, 120);
    ctx.fillStyle = empty ? '#cfcac0' : '#d9b48a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,60,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 湯気（元気なとき）
    if (this.state.level >= MATCHA_MAX - 1) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        const x0 = CUP.cx - 12 + i * 22;
        ctx.moveTo(x0, CUP.top - 12);
        for (let k = 0; k <= 6; k++) {
          const yy = CUP.top - 12 - k * 5;
          ctx.lineTo(x0 + Math.sin(this.t * 1.6 + k * 0.8 + i) * 4, yy);
        }
        ctx.strokeStyle = 'rgba(160,190,150,0.45)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }
};
