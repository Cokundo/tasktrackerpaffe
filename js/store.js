/* =========================================================
   store.js — 記録の保存とXPの再計算
   記録(log)だけを唯一の真実とし、XPは常にlogから導出する。
   （チェックを外せばXPもきちんと戻る）
   ========================================================= */

const STORAGE_KEY = 'growth-parfait-v1';

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

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayKey() {
  return dateKey(new Date());
}

/* ---------- 状態 ---------- */

const Store = {
  state: { version: 1, log: {}, notes: {}, milestones: {} },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = {
          version: 1,
          log: parsed.log && typeof parsed.log === 'object' ? parsed.log : {},
          notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
          milestones: parsed.milestones && typeof parsed.milestones === 'object' ? parsed.milestones : {}
        };
      }
    } catch (e) {
      console.warn('保存データを読めませんでした。新規に開始します。', e);
      this.state = { version: 1, log: {}, notes: {}, milestones: {} };
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('保存に失敗しました。', e);
    }
  },

  /** 指定日の達成リスト */
  dayList(key) {
    return this.state.log[key] || [];
  },

  isDone(key, statKey) {
    return this.dayList(key).indexOf(statKey) !== -1;
  },

  /** 達成のON/OFF。戻り値は切り替え後の状態(true=達成) */
  toggle(key, statKey) {
    const list = this.dayList(key).slice();
    const i = list.indexOf(statKey);
    if (i === -1) list.push(statKey);
    else list.splice(i, 1);

    if (list.length === 0) delete this.state.log[key];
    else this.state.log[key] = list;

    this.save();
    return i === -1;
  },

  setNote(key, text) {
    if (text && text.trim()) this.state.notes[key] = text.trim();
    else delete this.state.notes[key];
    this.save();
  },

  getNote(key) {
    return this.state.notes[key] || '';
  },

  /* --- スペシャル実績 --- */

  getMilestone(key) {
    return this.state.milestones[key] || null;
  },

  /** 達成を記録。TOEICなど繰り返し可のものは回数を積む */
  achieve(key, extra) {
    const prev = this.state.milestones[key];
    const rec = Object.assign({ date: todayKey(), count: 0 }, prev, extra || {});
    rec.count = (prev ? prev.count || 1 : 0) + 1;
    rec.date = todayKey();
    this.state.milestones[key] = rec;
    this.save();
    return rec;
  },

  clearMilestone(key) {
    delete this.state.milestones[key];
    this.save();
  },

  clearAll() {
    this.state = { version: 1, log: {}, notes: {}, milestones: {} };
    this.save();
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.log !== 'object') {
      throw new Error('形式が違います');
    }
    this.state = {
      version: 1,
      log: parsed.log || {},
      notes: parsed.notes || {},
      milestones: parsed.milestones || {}
    };
    this.save();
  },

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }
};

/* ---------- 集計 ---------- */

/** 記録のある日を古い順に並べる */
function sortedLogKeys(log) {
  return Object.keys(log).filter(k => (log[k] || []).length > 0).sort();
}

/**
 * その日までの連続達成日数（何か1つでも達成した日を連続とみなす）
 */
function streakAt(log, key) {
  let n = 0;
  let d = parseKey(key);
  while ((log[dateKey(d)] || []).length > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** 今日を基準にした現在の連続日数（今日未達成なら昨日までの連続を見る） */
function currentStreak(log) {
  const today = todayKey();
  if ((log[today] || []).length > 0) return streakAt(log, today);
  const y = dateKey(addDays(new Date(), -1));
  return (log[y] || []).length > 0 ? streakAt(log, y) : 0;
}

/** 最長連続日数 */
function bestStreak(log) {
  const keys = sortedLogKeys(log);
  let best = 0;
  let run = 0;
  let prev = null;
  keys.forEach(k => {
    if (prev && dateKey(addDays(parseKey(prev), 1)) === k) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = k;
  });
  return best;
}

/**
 * logから各ステータスの累計XPを再計算する。
 * その日の連続日数に応じたボーナスが、その日達成した各項目に加算される。
 * スペシャル実績のボーナスXPもここで足し込む。
 */
function computeXp(log, milestones) {
  const xp = {};
  STATS.forEach(s => (xp[s.key] = 0));

  const keys = sortedLogKeys(log);
  let run = 0;
  let prev = null;

  keys.forEach(k => {
    if (prev && dateKey(addDays(parseKey(prev), 1)) === k) run++;
    else run = 1;
    prev = k;

    const gain = BASE_XP + streakBonus(run);
    (log[k] || []).forEach(statKey => {
      if (xp[statKey] !== undefined) xp[statKey] += gain;
    });
  });

  if (milestones) {
    MILESTONES.forEach(m => {
      const rec = milestones[m.key];
      if (rec && xp[m.stat] !== undefined) {
        xp[m.stat] += m.xp * (m.repeatable ? Math.max(1, rec.count || 1) : 1);
      }
    });
  }

  return xp;
}

/** 各ステータスの現在レベル */
function computeLevels(xp) {
  const levels = {};
  STATS.forEach(s => (levels[s.key] = levelOf(xp[s.key] || 0).level));
  return levels;
}

/** 総達成回数 */
function totalChecks(log) {
  return Object.keys(log).reduce((a, k) => a + (log[k] || []).length, 0);
}
