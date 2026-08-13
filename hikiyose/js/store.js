/* =========================================================
   store.js — 保存と日付、そして「今どのステージか」の判定
   記録はすべて localStorage。通信は一切しない。
   ========================================================= */

const HIKI_KEY = 'hikiyose-blitz-v1';

/* ---------- 日付ユーティリティ ---------- */

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function todayKey() {
  return dateKey(new Date());
}

function diffDays(aKey, bKey) {
  const a = parseKey(aKey), b = parseKey(bKey);
  return Math.round((b - a) / 86400000);
}

function jpDate(d) {
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${w})`;
}

function jpShort(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- 1日ぶんの空データ ---------- */

function emptyDay() {
  return {
    mood: 0,                                   // 感情スケールの位置(1-22, 0=未記録)
    jiai: { love: 0, perfect: 0, best: 0, allow: 0 },
    notice: [],                                // 淡々と気づいたネガティブ
    good: ['', '', ''],                        // いいことノート
    thanks: ['', '', ''],                      // 感謝ワーク
    m369: { am: 0, noon: 0, pm: 0 },
    m55: 0,
    sec68: 0,                                  // 68秒を通した回数
    sats: false,
    arigatou: 0,
    declutter: 0,
    kouten: '',                                // 好転反応メモ
    acted: []                                  // その日の現実の行動
  };
}

/* ---------- 状態 ---------- */

const Store = {
  state: null,

  fresh() {
    return {
      version: 1,
      profile: {
        nickname: 'ゆゆ',
        weddingDate: '',      // 決めた入籍日
        blitzDays: 120,       // 出会いから入籍まで＝電撃度
        decidedAt: '',        // 「決めた」日
        metDate: '',          // すでに出会っているなら実際の出会いの日
        targetMode: 'open'    // open=相手を特定しない / named=特定の相手がいる
      },
      affirmation: { text: '', discomfort: 5, fixedAt: '' },
      order: { text: '', startedAt: '', lastDay: '', streak: 0, checkAt: '' }, // 55×5のワンオーダー
      satsScene: '',
      usePhoto: false,   // SATSの絵に、線画ではなく自分の写真を使う
      list: [],          // {id, cat, text, at}
      blocks: {},        // key -> {noticed, memo, at}
      road: {},          // ROADMAPのkey -> {done, at}
      pre: {},           // PREACTIONSのkey -> {done, at}
      diary: [],         // {id, at, text}
      solo: [],          // {id, at, text}  自分単体の未来
      release: [],       // {at, calm}  手放しチェック
      swap: [],          // {id, at, from}
      days: {},
      updatedAt: 0       // 最後に保存した時刻（引き継ぎの新旧判定に使う）
    };
  },

  load() {
    this.state = this.fresh();
    try {
      const raw = localStorage.getItem(HIKI_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        const s = this.state;
        Object.assign(s.profile, p.profile || {});
        Object.assign(s.affirmation, p.affirmation || {});
        Object.assign(s.order, p.order || {});
        s.satsScene = p.satsScene || '';
        s.usePhoto = !!p.usePhoto;
        s.list = Array.isArray(p.list) ? p.list : [];
        s.blocks = p.blocks && typeof p.blocks === 'object' ? p.blocks : {};
        s.road = p.road && typeof p.road === 'object' ? p.road : {};
        s.pre = p.pre && typeof p.pre === 'object' ? p.pre : {};
        s.diary = Array.isArray(p.diary) ? p.diary : [];
        s.solo = Array.isArray(p.solo) ? p.solo : [];
        s.release = Array.isArray(p.release) ? p.release : [];
        s.swap = Array.isArray(p.swap) ? p.swap : [];
        s.days = p.days && typeof p.days === 'object' ? p.days : {};
        s.updatedAt = Number(p.updatedAt) || 0;
      }
    } catch (e) {
      console.warn('保存データを読めませんでした。新規に開始します。', e);
      this.state = this.fresh();
    }
    return this.state;
  },

  save() {
    try {
      // 引き継ぎのとき「どちらが新しい端末か」を決めるのに使う
      this.state.updatedAt = Date.now();
      localStorage.setItem(HIKI_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('保存できませんでした。', e);
    }
  },

  /* その日のデータ（なければ作る） */
  day(key) {
    const k = key || todayKey();
    if (!this.state.days[k]) this.state.days[k] = emptyDay();
    const d = this.state.days[k];
    const base = emptyDay();
    for (const f in base) if (d[f] === undefined) d[f] = base[f];
    return d;
  },

  today() {
    return this.day(todayKey());
  },

  /* 直近n日のキー（古い順） */
  recentKeys(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(dateKey(addDays(new Date(), -i)));
    return out;
  },

  /* ---------- 集計 ---------- */

  /* その日に何かしら実践したか */
  didSomething(k) {
    const d = this.state.days[k];
    if (!d) return false;
    const j = d.jiai || {};
    return !!(d.mood || j.love || j.perfect || j.best || j.allow ||
      d.good.some(Boolean) || d.thanks.some(Boolean) ||
      d.m369.am || d.m369.noon || d.m369.pm || d.m55 || d.sec68 ||
      d.sats || d.arigatou || d.declutter || (d.acted || []).length);
  },

  /* 連続実践日数（今日まだなら昨日までを数える） */
  streak() {
    let n = 0;
    let cur = new Date();
    if (!this.didSomething(todayKey())) cur = addDays(cur, -1);
    for (;;) {
      if (!this.didSomething(dateKey(cur))) break;
      n++;
      cur = addDays(cur, -1);
      if (n > 3650) break;
    }
    return n;
  },

  /* 自愛を続けた日数（直近14日で jiai が動いた日） */
  jiaiDays(n) {
    return this.recentKeys(n).filter(k => {
      const d = this.state.days[k];
      if (!d) return false;
      const j = d.jiai || {};
      return j.love + j.perfect + j.best + j.allow > 0;
    }).length;
  },

  /* 刷り込み（369/55×5/SATS/68秒）をやった日数 */
  imprintDays(n) {
    return this.recentKeys(n).filter(k => {
      const d = this.state.days[k];
      if (!d) return false;
      return d.sats || d.m55 >= 55 || d.sec68 > 0 ||
        (d.m369.am >= 3 && d.m369.noon >= 6 && d.m369.pm >= 9);
    }).length;
  },

  /* 直近の気分（記録がある日だけの平均。数字が小さいほど上の段） */
  moodAvg(keys) {
    const v = keys.map(k => this.state.days[k]).filter(d => d && d.mood).map(d => d.mood);
    if (!v.length) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
  },

  listCount(cat) {
    return cat ? this.state.list.filter(x => x.cat === cat).length : this.state.list.length;
  },

  calmHits() {
    return this.state.release.filter(r => r.calm >= 7).length;
  },

  preCount() {
    return Object.values(this.state.pre).filter(x => x && x.done).length;
  },

  /* ---------- ステージ判定 ----------
     条件を満たした最大のステージを返す。飛び級はしない。 */
  stage() {
    const s = this.state;
    let n = 0;
    const okS0 = this.jiaiDays(14) >= 7 && s.affirmation.discomfort <= 5;
    const okS1 = okS0 && this.listCount() >= 100 && this.listCount('feel') >= 10 && !!s.affirmation.fixedAt;
    const okS2 = okS1 && this.imprintDays(14) >= 7;
    const okS3 = okS2 && this.calmHits() >= 3;
    if (okS0) n = 1;
    if (okS1) n = 2;
    if (okS2) n = 3;
    if (okS3) n = 4;
    return n;
  },

  /* 次のステージへ行くために足りていないもの */
  stageGaps() {
    const s = this.state, gaps = [];
    const st = this.stage();
    if (st === 0) {
      const j = this.jiaiDays(14);
      if (j < 7) gaps.push(`自愛の実践があと${7 - j}日（直近14日で7日）`);
      if (s.affirmation.discomfort > 5) gaps.push('アファメーションの違和感を5以下に（緩和形を使ってよい）');
    } else if (st === 1) {
      const c = this.listCount(), f = this.listCount('feel');
      if (c < 100) gaps.push(`理想の相手リストがあと${100 - c}項目`);
      if (f < 10) gaps.push(`フィーリング（どんな気持ちでいたいか）があと${10 - f}項目`);
      if (!s.affirmation.fixedAt) gaps.push('アファメーションを1本「これでいく」と確定する');
    } else if (st === 2) {
      const i = this.imprintDays(14);
      if (i < 7) gaps.push(`刷り込み（SATS／369／55×5／68秒）があと${7 - i}日`);
    } else if (st === 3) {
      const c = this.calmHits();
      if (c < 3) gaps.push(`手放しチェックで穏やかさ7以上が、あと${3 - c}回`);
    } else {
      const p = this.preCount();
      if (p < 3) gaps.push(`先取り行動があと${3 - p}個`);
      else gaps.push('ここから先は日常。気分が下がったらステージ0（自愛）に戻る');
    }
    return gaps;
  },

  /* ---------- 警告（実践のベンチマーク） ---------- */
  warnings() {
    const out = [];

    // ①気分が慢性的に下がっている → 方法が合っていないサイン
    const recent = this.moodAvg(this.recentKeys(7));
    const before = this.moodAvg(this.recentKeys(14).slice(0, 7));
    if (recent !== null && before !== null && recent > before + 2 && recent > 12) {
      out.push({
        level: 'warn',
        text: '直近1週間、気分が慢性的に下がっています。方法が合っていないサインとされます。刷り込み系を一度やめて、自愛といい気分の選択だけに戻ってください。'
      });
    }

    // ②焦り・欠乏 → 願望設定が他人軸になっていないか
    const anx = this.recentKeys(7).filter(k => {
      const d = this.state.days[k];
      return d && d.mood >= 10 && d.mood <= 14;
    }).length;
    if (anx >= 4) {
      out.push({
        level: 'warn',
        text: '焦り・心配の段が続いています。願いから「周りが」「年齢が」を抜いても残るか点検を（他人軸チェック）。'
      });
    }

    // ③好転反応が長期化 → 立ち止まる
    const kouten = this.recentKeys(28).filter(k => {
      const d = this.state.days[k];
      return d && d.kouten;
    }).length;
    if (kouten >= 14) {
      out.push({
        level: 'stop',
        text: '「好転反応」の記録が4週間で14日を超えました。これは好転反応の枠組みで扱うものではないかもしれません。一度立ち止まり、必要なら医療・専門家に相談してください。'
      });
    }

    // ④執着が強いまま先取り行動だけ進んでいる
    const lastCalm = this.state.release.length ? this.state.release[this.state.release.length - 1].calm : null;
    if (lastCalm !== null && lastCalm <= 3 && this.preCount() >= 3) {
      out.push({
        level: 'note',
        text: '行動は進んでいますが、直近の手放しチェックの穏やかさが低いままです。恋愛はここが成否を分けるとされます。ステージ3に戻る日を作ってください。'
      });
    }

    return out;
  },

  /* ---------- 書き出し／読み込み ---------- */

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  replaceWith(p) {
    if (!p || typeof p !== 'object') throw new Error('形式が違います');
    localStorage.setItem(HIKI_KEY, JSON.stringify(p));
    this.load();
  },

  importJSON(text) {
    this.replaceWith(JSON.parse(text));
  },

  /* ---------- 合体（マージ） ----------
     スマホとPCの両方で記録がついている前提で、消さずに1つにまとめる。
     回数は多いほう、チェックは片方でも付いていれば付いたまま、
     文章は空でないほう。両方に中身があってぶつかったときだけ、
     updatedAt が新しい端末の側を採る。 */
  mergeFrom(o) {
    if (!o || typeof o !== 'object') throw new Error('形式が違います');
    const s = this.state;
    const theirs = (Number(o.updatedAt) || 0) > (Number(s.updatedAt) || 0);
    const stat = { days: 0, list: 0, diary: 0, solo: 0, swap: 0, release: 0 };

    const pickStr = (a, b) => (!a ? (b || '') : (!b ? a : (theirs ? b : a)));
    const pickNum = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);
    const union = (a, b) => {
      const out = Array.isArray(a) ? a.slice() : [];
      for (const x of (Array.isArray(b) ? b : [])) if (!out.includes(x)) out.push(x);
      return out;
    };

    /* 日ごとの記録 */
    for (const [k, od] of Object.entries(o.days || {})) {
      if (!od || typeof od !== 'object') continue;
      const before = JSON.stringify(this.state.days[k] || null);
      const d = this.day(k);
      d.mood = (d.mood && od.mood) ? (theirs ? od.mood : d.mood) : (d.mood || od.mood || 0);
      for (const j of ['love', 'perfect', 'best', 'allow']) d.jiai[j] = pickNum(d.jiai[j], (od.jiai || {})[j]);
      for (const m of ['am', 'noon', 'pm']) d.m369[m] = pickNum(d.m369[m], (od.m369 || {})[m]);
      d.m55 = pickNum(d.m55, od.m55);
      d.sec68 = pickNum(d.sec68, od.sec68);
      d.arigatou = pickNum(d.arigatou, od.arigatou);
      d.declutter = pickNum(d.declutter, od.declutter);
      d.sats = d.sats || !!od.sats;
      d.notice = union(d.notice, od.notice);
      d.acted = union(d.acted, od.acted);
      for (let i = 0; i < 3; i++) {
        d.good[i] = pickStr(d.good[i], (od.good || [])[i]);
        d.thanks[i] = pickStr(d.thanks[i], (od.thanks || [])[i]);
      }
      d.kouten = pickStr(d.kouten, od.kouten);
      if (before !== JSON.stringify(d)) stat.days++;
    }

    /* idで持っているもの（重複しないので、そのまま足す） */
    const byId = (mine, their) => {
      const have = new Set(mine.map(x => x && x.id));
      let n = 0;
      for (const x of (Array.isArray(their) ? their : [])) {
        if (x && x.id && !have.has(x.id)) { mine.push(x); have.add(x.id); n++; }
      }
      return n;
    };
    stat.list = byId(s.list, o.list);
    stat.diary = byId(s.diary, o.diary);
    stat.solo = byId(s.solo, o.solo);
    stat.swap = byId(s.swap, o.swap);

    /* 手放しチェック（1日1件） */
    for (const r of (Array.isArray(o.release) ? o.release : [])) {
      if (!r || !r.at) continue;
      const ex = s.release.find(x => x.at === r.at);
      if (!ex) { s.release.push(r); stat.release++; }
      else if (theirs && ex.calm !== r.calm) { ex.calm = r.calm; stat.release++; }
    }
    s.release.sort((a, b) => (a.at < b.at ? -1 : 1));

    /* チェック類（片方でも付いていれば付いたまま） */
    const mergeMap = (mine, their, doneKey) => {
      for (const [k, v] of Object.entries(their || {})) {
        if (!v || typeof v !== 'object') continue;
        const cur = mine[k] || {};
        const next = Object.assign({}, cur);
        next[doneKey] = !!(cur[doneKey] || v[doneKey]);
        next.at = cur.at || v.at || '';
        if (cur.memo !== undefined || v.memo !== undefined) next.memo = pickStr(cur.memo, v.memo);
        mine[k] = next;
      }
    };
    mergeMap(s.blocks, o.blocks, 'noticed');
    mergeMap(s.road, o.road, 'done');
    mergeMap(s.pre, o.pre, 'done');

    /* 1つしか持てないもの */
    const op = o.profile || {};
    for (const k of ['nickname', 'weddingDate', 'metDate', 'decidedAt', 'targetMode']) {
      s.profile[k] = pickStr(s.profile[k], op[k]);
    }
    if (op.blitzDays && (theirs || !s.profile.blitzDays)) s.profile.blitzDays = op.blitzDays;

    const oa = o.affirmation || {};
    if (oa.text && (theirs || !s.affirmation.text)) s.affirmation = Object.assign({}, s.affirmation, oa);
    const oo = o.order || {};
    if (oo.text && (theirs || !s.order.text)) s.order = Object.assign({}, s.order, oo);
    s.satsScene = pickStr(s.satsScene, o.satsScene);

    s.updatedAt = Math.max(Number(s.updatedAt) || 0, Number(o.updatedAt) || 0);
    this.save();
    return stat;
  },

  clear() {
    localStorage.removeItem(HIKI_KEY);
    this.state = this.fresh();
  }
};
