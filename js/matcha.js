/* =========================================================
   matcha.js — 抹茶ラテのメモリ表示
   サボるほど減り、皆勤で戻る「継続のゲージ」。
   カップの絵は7コマのドット絵（assets/parts/matcha_0〜6.png）を
   残りメモリに応じて差し替えている。
   ========================================================= */

const MVW = 170, MVH = 232;        // 仮想座標系
const MUG = { cx: 85, bottom: 186, w: 138 };
const MATCHA_FRAMES = 7;

const Matcha = {
  canvas: null,
  ctx: null,
  state: { level: MATCHA_MAX, pending: 0, empty: false, started: false },
  t: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    const loop = () => {
      this.t += 1 / 60;
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

  /** 残りメモリ → コマ番号（0が満タン、6が空） */
  frameOf(level) {
    const i = Math.round(((MATCHA_MAX - level) * (MATCHA_FRAMES - 1)) / MATCHA_MAX);
    return Math.max(0, Math.min(MATCHA_FRAMES - 1, i));
  },

  draw() {
    const ctx = this.ctx;
    const level = Math.max(0, Math.min(MATCHA_MAX, this.state.level));
    ctx.clearRect(0, 0, MVW, MVH);

    // 受け皿の影
    ctx.beginPath();
    ctx.ellipse(MUG.cx, MUG.bottom + 4, 56, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,120,95,0.16)';
    ctx.fill();

    // カップ
    const im = Assets.get('matcha_' + this.frameOf(level));
    let top = MUG.bottom - 100;
    if (im) {
      const h = (MUG.w * im.naturalHeight) / im.naturalWidth;
      top = MUG.bottom - h;
      ctx.drawImage(im, MUG.cx - MUG.w / 2, top, MUG.w, h);
    }

    // 湯気（残りが多いときだけ）
    if (level >= MATCHA_MAX - 1) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        const x0 = MUG.cx - 14 + i * 24;
        ctx.moveTo(x0, top - 6);
        for (let k = 0; k <= 6; k++) {
          ctx.lineTo(x0 + Math.sin(this.t * 1.6 + k * 0.8 + i) * 4, top - 6 - k * 5);
        }
        ctx.strokeStyle = 'rgba(150,180,140,0.5)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // メモリ（残り数のドット）
    const gap = 18;
    const x0 = MUG.cx - (gap * (MATCHA_MAX - 1)) / 2;
    for (let i = 0; i < MATCHA_MAX; i++) {
      const on = i < level;
      const x = x0 + i * gap;
      const y = MVH - 22;
      ctx.beginPath();
      ctx.arc(x, y, on ? 5.4 : 4, 0, Math.PI * 2);
      ctx.fillStyle = on ? (level <= 2 ? '#d08a20' : '#7aa844') : 'rgba(150,140,130,0.25)';
      ctx.fill();
      if (on) {
        ctx.beginPath();
        ctx.arc(x - 1.6, y - 1.8, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fill();
      }
    }

    // 今日まだ0項目なら、次に減るメモリが点滅する
    if (this.state.started && this.state.todayCount === 0 && level > 0) {
      const x = x0 + (level - 1) * gap;
      const y = MVH - 22;
      const a = 0.35 + Math.abs(Math.sin(this.t * 2.2)) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(208,138,32,${a})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};
