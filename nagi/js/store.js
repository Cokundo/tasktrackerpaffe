/* =========================================================
   store.js — 保存と日付
   記録はすべてこの端末の localStorage。通信は一切しない。
   ========================================================= */

const NAGI_KEY = 'nagi-v1';

/* ---------- 日付ユーティリティ ---------- */

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function todayKey() {
  return dateKey(new Date());
}

function jpDate(d) {
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日(${w})`;
}

function jpTime(d) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function yen(n) {
  return '¥' + Math.round(n || 0).toLocaleString('ja-JP');
}

/* ---------- 状態 ---------- */

const Store = {
  state: null,

  fresh() {
    return {
      version: 1,
      waves: [],        // {id, at, state, before, after, rode, escape, memo}
      box: [],          // {id, at, text, done}
      mornings: {},     // dateKey -> {first, leaveAt, place, small: ['', '', '']}
      escapes: JSON.parse(JSON.stringify(DEFAULT_ESCAPES)),
      goals: [],        // {id, name, amount, saved}
      guarded: [],      // {id, at, amount, what}  買わずに守れた金額
      hold: [],         // {id, at, what, amount, decided: '' | 'skip' | 'buy'}  24時間保留
      locks: {},        // LOCKSのkey -> true
      active: null,     // 進行中の波 {at, state, before, escape}。アプリを閉じても続きから
      colors: {},       // COLORSのkey -> 引いた回数
      points: 0,        // ご褒美ポイントの残高
      earned: 0,        // これまでに貯めたポイントの合計
      rewards: DEFAULT_REWARDS.map(r => ({ id: uid(), ...r })),
      redeemed: []      // {id, at, name, cost}
    };
  },

  load() {
    this.state = this.fresh();
    try {
      const raw = localStorage.getItem(NAGI_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      const s = this.state;
      for (const k of ['waves', 'box', 'goals', 'guarded', 'hold', 'rewards', 'redeemed']) {
        if (Array.isArray(p[k])) s[k] = p[k];
      }
      for (const k of ['points', 'earned']) {
        if (Number.isFinite(p[k])) s[k] = p[k];
      }
      for (const k of ['mornings', 'locks', 'colors']) {
        if (p[k] && typeof p[k] === 'object') s[k] = p[k];
      }
      if (p.active && typeof p.active === 'object') s.active = p.active;
      if (p.escapes && typeof p.escapes === 'object') {
        for (const st of STATES) {
          if (Array.isArray(p.escapes[st.key])) s.escapes[st.key] = p.escapes[st.key];
        }
      }
    } catch (e) {
      console.warn('nagi: 読み込みに失敗したので初期状態で始めます', e);
    }
  },

  save() {
    try {
      localStorage.setItem(NAGI_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('nagi: 保存に失敗しました', e);
    }
  },

  exportJson() {
    return JSON.stringify(this.state, null, 2);
  },

  importJson(text) {
    const p = JSON.parse(text);
    if (!p || typeof p !== 'object' || !Array.isArray(p.waves)) {
      throw new Error('凪の書き出しファイルではないみたい');
    }
    localStorage.setItem(NAGI_KEY, JSON.stringify(p));
    this.load();
  },

  /* 伝統色を1枚引く。まれなものほど出にくい */
  drawColor() {
    let r = Math.random() * 100;
    let rarity = 1;
    for (const k of [3, 2, 1]) {
      if (r < RARITY_ODDS[k]) { rarity = k; break; }
      r -= RARITY_ODDS[k];
    }
    const pool = COLORS.filter(c => c.rarity === rarity);
    const c = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !this.state.colors[c.key];
    this.state.colors[c.key] = (this.state.colors[c.key] || 0) + 1;
    return { color: c, isNew };
  },

  addPoints(n) {
    this.state.points += n;
    this.state.earned += n;
  },

  /* 直近 n 日の波 */
  recentWaves(n) {
    const from = addDays(new Date(), -(n - 1)).getTime();
    return this.state.waves.filter(w => w.at >= from);
  }
};
