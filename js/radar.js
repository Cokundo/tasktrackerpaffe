/* =========================================================
   radar.js — 7角形の成長グラフ（レーダーチャート）
   ========================================================= */

const Radar = {
  canvas: null,
  ctx: null,
  anim: null,
  shown: {},   // 描画中の値（アニメーション用）
  target: {},

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    STATS.forEach(s => {
      this.shown[s.key] = 0;
      this.target[s.key] = 0;
    });
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 320;
    const h = w; // 正方形
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  },

  setLevels(levels) {
    STATS.forEach(s => (this.target[s.key] = levels[s.key] || 0));
    this.animate();
  },

  animate() {
    if (this.anim) cancelAnimationFrame(this.anim);
    const step = () => {
      let moving = false;
      STATS.forEach(s => {
        const d = this.target[s.key] - this.shown[s.key];
        if (Math.abs(d) > 0.01) {
          this.shown[s.key] += d * 0.15;
          moving = true;
        } else {
          this.shown[s.key] = this.target[s.key];
        }
      });
      this.draw();
      if (moving) this.anim = requestAnimationFrame(step);
    };
    step();
  },

  draw() {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const cx = w / 2, cy = h / 2 + 4;
    const R = Math.min(w, h) / 2 - 46;
    const n = STATS.length;
    const angle = i => -Math.PI / 2 + (Math.PI * 2 * i) / n;

    ctx.clearRect(0, 0, w, h);

    // --- 背景の同心多角形 ---
    for (let ring = 5; ring >= 1; ring--) {
      const r = (R * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = angle(i);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = ring % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,246,238,0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,120,100,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // --- 軸 ---
    ctx.strokeStyle = 'rgba(150,120,100,0.28)';
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }

    // --- データ多角形 ---
    const pt = i => {
      const a = angle(i);
      const v = Math.max(0.03, this.shown[STATS[i].key] / MAX_LEVEL);
      return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
    };

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, R);
    grad.addColorStop(0, 'rgba(255,168,120,0.55)');
    grad.addColorStop(1, 'rgba(226,87,76,0.30)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#e2574c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- 頂点 ---
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = STATS[i].color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // --- ラベル ---
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      const lx = cx + Math.cos(a) * (R + 26);
      const ly = cy + Math.sin(a) * (R + 22);
      const lv = Math.round(this.target[STATS[i].key]);

      ctx.fillStyle = STATS[i].color;
      ctx.font = 'bold 13px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.fillText(STATS[i].name, lx, ly - 7);
      ctx.fillStyle = 'rgba(90,70,60,0.75)';
      ctx.font = '11px "Hiragino Sans", "Yu Gothic", sans-serif';
      ctx.fillText('Lv.' + lv, lx, ly + 8);
    }
  }
};
