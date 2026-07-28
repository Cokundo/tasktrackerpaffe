/* =========================================================
   data.js — 7つの成長ステータス定義とレベル計算
   ========================================================= */

/**
 * 7項目。それぞれに「特徴」を割り振り、パフェの構成要素へ対応させる。
 * key      : 内部ID
 * name     : 表示名
 * kanji    : 一文字の特徴印
 * trait    : 特徴（性質）
 * parfait  : パフェ上でのパーツ
 * color    : テーマカラー（レーダー／カード／パーツ）
 * ranks    : レベル帯ごとの称号（0-4 / 5-9 / 10-14 / 15-19 / 20）
 * examples : 「達成」の目安
 */
const STATS = [
  {
    key: 'muscle',
    name: '筋トレ',
    kanji: '剛',
    trait: '力・ボリューム',
    parfait: 'てっぺんの生クリーム',
    desc: '積むほどクリームが大きくなり、Lv6でさくらんぼが載る。',
    color: '#e2574c',
    color2: '#ffb1a4',
    ranks: ['なまり肉', '目覚めた筋繊維', '鍛錬者', '鋼の躰', '筋肉神'],
    example: '10分でも動かしたら達成'
  },
  {
    key: 'vba',
    name: 'VBA',
    kanji: '巧',
    trait: '効率・自動化',
    parfait: 'ウエハースとプレッツェル',
    desc: '伸ばすほど本数が増え、Lv7でロールクッキー、Lv13でプレッツェル。',
    color: '#3f8f6b',
    color2: '#9fd9bd',
    ranks: ['手作業', 'マクロ記録', 'ループ使い', '関数設計者', '自動化の魔術師'],
    example: '1行でも書いた／読んだら達成'
  },
  {
    key: 'bookkeeping',
    name: '簿記',
    kanji: '律',
    trait: '正確・積算',
    parfait: 'チョコフレークの地層',
    desc: '積むほど地層が厚くなり、Lv10でブラウニーが重なる。',
    color: '#b07d3a',
    color2: '#e6c48f',
    ranks: ['どんぶり勘定', '仕訳見習い', '帳簿係', '決算の使い手', '貸借一致の賢者'],
    example: '仕訳1問でも解いたら達成'
  },
  {
    key: 'manner',
    name: 'マナー',
    kanji: '雅',
    trait: '品格・所作',
    parfait: 'レースの席と金縁の器',
    desc: '磨くほど席が整い、Lv8で器の口に金の縁が入る。',
    color: '#c9a227',
    color2: '#f2e0a0',
    ranks: ['素の器', '心得はじめ', '礼を知る', '所作の人', '一流の風格'],
    example: '所作を1つ意識できたら達成'
  },
  {
    key: 'english',
    name: '英語',
    kanji: '彩',
    trait: '越境・彩り',
    parfait: '世界のフルーツ',
    desc: '3レベルごとに果物が1種増える（いちご→ブルーベリー→…）。',
    color: '#3d6fd1',
    color2: '#a8c4f5',
    ranks: ['沈黙', '単語拾い', '意思疎通', '会話者', '越境者'],
    example: '5分の音読・単語でも達成'
  },
  {
    key: 'hairremoval',
    name: '脱毛',
    kanji: '透',
    trait: '透明感・なめらかさ',
    parfait: 'クリスタルと花ゼリー',
    desc: '進むほど層が澄み、Lv7で花ゼリー、Lv14でかき氷。',
    color: '#8f61c4',
    color2: '#d5bff0',
    ranks: ['未処理', '手入れ開始', 'なめらか', 'つるん', '陶器肌'],
    example: 'ケア・保湿をしたら達成'
  },
  {
    key: 'housework',
    name: '家事',
    kanji: '暖',
    trait: '整え・温かみ',
    parfait: 'アイシングクッキーと甘味',
    desc: 'Lv2でクッキー、Lv8で団子、Lv14でチョコツイストが添う。',
    color: '#4aa3a3',
    color2: '#a8e0e0',
    ranks: ['散らかり', '一日一片づけ', '整い', '整然', '暮らしの匠'],
    example: '皿洗い・一箇所の片づけで達成'
  }
];

/**
 * スペシャル実績。達成すると、パフェに「どデカトッピング」が載る。
 * 日々のチェックとは別枠の、一度きり（TOEICは何度でも）の大勝負。
 * stat/xp … 達成時にその項目へまとめて加算されるボーナスXP
 */
const MILESTONES = [
  {
    key: 'vba_basic',
    name: 'VBAベーシック取得',
    detail: 'VBAエキスパート ベーシック合格',
    topping: '巨大ロジック歯車クッキー',
    note: 'ゆっくり回る金の歯車がパフェに刺さる',
    stat: 'vba',
    xp: 200,
    color: '#3f8f6b',
    emoji: '⚙️'
  },
  {
    key: 'boki3',
    name: '簿記3級取得',
    detail: '日商簿記3級 合格',
    topping: '特大 帳簿ブックケーキ',
    note: '金箔押しの帳簿がグラスに立てかけられる',
    stat: 'bookkeeping',
    xp: 200,
    color: '#b07d3a',
    emoji: '📒'
  },
  {
    key: 'toeic',
    name: 'TOEIC点数更新',
    detail: 'ベストスコア更新（何度でも）',
    topping: '地球儀マカロン',
    note: '更新するたび、まわりの星が増える',
    stat: 'english',
    xp: 150,
    color: '#3d6fd1',
    emoji: '🌏',
    repeatable: true
  },
  {
    key: 'unity',
    name: 'Unityゲーム 1画面完成',
    detail: 'チョコミントアイスクリーム',
    topping: 'ダブルスクープのチョコミントアイス',
    note: 'パフェのてっぺんに丸ごと載る',
    stat: 'vba',
    xp: 200,
    color: '#4aa3a3',
    emoji: '🍦'
  }
];

const MAX_LEVEL = 20;
const BASE_XP = 10;      // 1日達成あたりの基礎XP
const STREAK_BONUS_CAP = 10; // 連続日数ボーナスの上限XP

/** レベル L → L+1 に必要なXP */
function xpToNext(level) {
  return 30 + 10 * level;
}

/** 累計XP → { level, cur, need, ratio } */
function levelOf(xp) {
  let level = 0;
  let rest = Math.max(0, xp | 0);
  while (level < MAX_LEVEL && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  if (level >= MAX_LEVEL) return { level: MAX_LEVEL, cur: 0, need: 0, ratio: 1 };
  const need = xpToNext(level);
  return { level, cur: rest, need, ratio: rest / need };
}

/** レベル → 称号 */
function rankOf(stat, level) {
  if (level >= MAX_LEVEL) return stat.ranks[4];
  return stat.ranks[Math.min(3, Math.floor(level / 5))];
}

/** 連続日数からボーナスXPを算出（7日で最大） */
function streakBonus(streak) {
  if (streak <= 1) return 0;
  return Math.min(STREAK_BONUS_CAP, Math.floor((streak - 1) * 1.5));
}

/* ---------- パフェ名の生成 ---------------------------------- */

const CROWN = {
  muscle: '鋼塔',
  vba: '自動機構',
  bookkeeping: '積層帳',
  manner: '金縁',
  english: '七彩',
  hairremoval: '硝子',
  housework: '白雪'
};

const SUFFIX = {
  muscle: 'クリーム仕立て',
  vba: 'ウエハース添え',
  bookkeeping: 'チョコフレーク地層盛り',
  manner: 'レース席仕立て',
  english: 'ワールドフルーツ',
  hairremoval: 'クリスタルジュレ',
  housework: 'クッキー仕上げ'
};

/**
 * 上位2ステータスから固有のパフェ名を作る。
 * スペシャル実績があれば「◯冠」が付く。
 * 何も育っていないときは「まだ名もなきパフェ」。
 */
function parfaitName(levels, milestones) {
  const crowns = milestones ? Object.keys(milestones).length : 0;
  const suffix = crowns > 0 ? `〈${crowns}冠〉` : '';

  const ranked = STATS
    .map(s => ({ key: s.key, lv: levels[s.key] || 0 }))
    .sort((a, b) => b.lv - a.lv);

  if (ranked[0].lv === 0) return (crowns ? suffix + ' ' : '') + 'まだ名もなきパフェ';

  const first = CROWN[ranked[0].key];
  const second = ranked[1].lv > 0 ? SUFFIX[ranked[1].key] : null;
  const total = ranked.reduce((a, b) => a + b.lv, 0);

  let grade = '';
  if (total >= 120) grade = '伝説の';
  else if (total >= 80) grade = '極上の';
  else if (total >= 45) grade = '特製';
  else if (total >= 20) grade = '育ちゆく';

  const head = `${suffix}${grade}${first}パフェ`;
  return second ? `${head} 〜${second}〜` : head;
}

/** 全項目が均等に育っているほど高い「調和度」(0-100) */
function harmonyOf(levels) {
  const vals = STATS.map(s => levels[s.key] || 0);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg === 0) return 0;
  const variance = vals.reduce((a, v) => a + (v - avg) ** 2, 0) / vals.length;
  const sd = Math.sqrt(variance);
  return Math.max(0, Math.round((1 - sd / (avg + sd)) * 100));
}
