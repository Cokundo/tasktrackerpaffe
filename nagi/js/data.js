/* =========================================================
   data.js — 固定の文言と初期値
   画面に出る言葉は、横から覗かれても意味が伝わらない
   やわらかい言い方にそろえている。
   ========================================================= */

/* 波が来たときの「今の状態」 */
const STATES = [
  { key: 'taikutsu', label: '退屈',       icon: '🫧', hint: '手持ち無沙汰。何か刺激がほしい' },
  { key: 'kyomu',    label: '虚無',       icon: '🌫', hint: '何もしたくない。でも何かで埋めたい' },
  { key: 'tsukare',  label: '疲れ',       icon: '🕯', hint: '頭が回らない。集中が切れた' },
  { key: 'sabishi',  label: 'さみしい',   icon: '🌙', hint: '誰かに構ってほしい感じ' },
  { key: 'sowa',     label: 'そわそわ',   icon: '🔥', hint: '体の奥が落ち着かない' },
  { key: 'kakitai',  label: '出したい',   icon: '🪶', hint: 'この展開・台詞を外に出さないと落ち着かない' },
  { key: 'nigetai',  label: '逃げたい',   icon: '🚪', hint: 'やるべき作業から離れたい' }
];

/* 状態ごとの「代わりの行動」初期値。設定画面で書き換えられる */
const DEFAULT_ESCAPES = {
  taikutsu: ['コンビニまで歩いて、羊羹かチョコミントを1つ買う', 'MINTIAを2粒かんで、窓を開ける', '花札のひとり遊びを1回'],
  kyomu:    ['顔を洗って、服を外に出られるものに着替える', 'シャワーを浴びる', 'ベッドから離れた場所に座り直す'],
  tsukare:  ['スマホを別の部屋に置いて、10分横になる', '白湯かお茶を1杯いれる', '目を閉じて深呼吸を10回'],
  sabishi:  ['和歌を1首、紙に書き写す', '好きな香りをまとって、外の空気を吸う', '誰かにスタンプをひとつだけ送る'],
  sowa:     ['スクワットを15回', '冷たい水で手首を冷やす', '部屋を出て、階段か外を5分歩く'],
  kakitai:  ['出し切り箱に3行だけ書いて封をする', '紙のノートに箇条書きで書く（AIには渡さない）'],
  nigetai:  ['タイマー5分だけ、最初の1問だけやる', '机の上を1か所だけ片付ける', '作業の「最初の一手」だけ紙に書く']
};

/* 鍵を自分以外に預けるチェックリスト */
const LOCKS = [
  { key: 'card',    text: '生成AIサービス側の支払い方法（カード）を削除した' },
  { key: 'prepaid', text: '決済はプリペイドや上限付きのものだけにした' },
  { key: 'storepw', text: 'アプリ内課金に毎回パスワードを求める設定にした' },
  { key: 'passcode',text: 'スクリーンタイム等のパスコードを信頼できる人に設定してもらった' },
  { key: 'bedroom', text: '寝る場所にスマホとPCを持ち込まない日を決めた' },
  { key: 'doctor',  text: '婦人科・相談窓口の候補を1つメモした' }
];

/* 波の長さ（分） */
const WAVE_MINUTES = 10;

/* 波が終わったあとに出す一言。責めない言葉だけ */
const AFTER_WORDS_OK = [
  '越えられた。波はちゃんと引く、という証拠がひとつ増えた。',
  '10分、自分の側に立っていられた。',
  'よう踏みとどまった。今の感覚、覚えといて。'
];
const AFTER_WORDS_NG = [
  '流れてしもた日も、記録できた時点で観測はできてる。',
  'データがひとつ増えただけ。次の波のための材料になる。',
  '責めるより、何がきっかけやったかを見る方が効く。'
];

/* =========================================================
   ご褒美 — しのいだ瞬間に返ってくるもの
   越えるたびに伝統色を1枚引く。ランダムに出るから、次が気になる。
   rarity: 1=よく出る 2=ときどき 3=まれ
   ========================================================= */

const COLORS = [
  { key: 'geppaku',     name: '月白',     yomi: 'げっぱく',       hex: '#eaf4fc', rarity: 3, words: '月がのぼる前、東の空がうっすら白む色。' },
  { key: 'ruri',        name: '瑠璃色',   yomi: 'るりいろ',       hex: '#1e50a2', rarity: 3, words: '七宝のひとつ。深い夜に灯る、青い宝石。' },
  { key: 'kogane',      name: '黄金色',   yomi: 'こがねいろ',     hex: '#e6b422', rarity: 3, words: '実りの穂が、夕陽を浴びたときの光。' },
  { key: 'edomurasaki', name: '江戸紫',   yomi: 'えどむらさき',   hex: '#745399', rarity: 3, words: '粋を好んだ町が、誇りにした青みの紫。' },
  { key: 'shinonome',   name: '東雲色',   yomi: 'しののめいろ',   hex: '#f19072', rarity: 3, words: '夜明けの雲が、最初に染まる色。' },
  { key: 'shikkoku',    name: '漆黒',     yomi: 'しっこく',       hex: '#0d0015', rarity: 3, words: '塗り重ねた漆の、底の見えない黒。' },

  { key: 'fujimurasaki',name: '藤紫',     yomi: 'ふじむらさき',   hex: '#a59aca', rarity: 2, words: '藤棚の下、風がふれたあとの残り香。' },
  { key: 'kikyou',      name: '桔梗色',   yomi: 'ききょういろ',   hex: '#5654a2', rarity: 2, words: '秋の野にひとつ、凛と立つ花の色。' },
  { key: 'wasurenagusa',name: '勿忘草色', yomi: 'わすれなぐさいろ', hex: '#89c3eb', rarity: 2, words: '「忘れないで」と名づけられた空色。' },
  { key: 'kamenozoki',  name: '瓶覗',     yomi: 'かめのぞき',     hex: '#a2d7dd', rarity: 2, words: '藍瓶をちょっと覗いただけの、淡い青。' },
  { key: 'konjou',      name: '紺青',     yomi: 'こんじょう',     hex: '#192f60', rarity: 2, words: '冬の夜更け、星が冴える空の奥。' },
  { key: 'gunjou',      name: '群青色',   yomi: 'ぐんじょういろ', hex: '#4c6cb3', rarity: 2, words: '砕いた岩から生まれる、群れなす青。' },
  { key: 'kodaimurasaki',name:'古代紫',   yomi: 'こだいむらさき', hex: '#895b8a', rarity: 2, words: '古い装束に残る、くすんだ高貴さ。' },
  { key: 'sumire',      name: '菫色',     yomi: 'すみれいろ',     hex: '#7058a3', rarity: 2, words: '道ばたで、小さく深く咲く紫。' },
  { key: 'beni_fuji',   name: '紅藤',     yomi: 'べにふじ',       hex: '#cca6bf', rarity: 2, words: '藤に紅をひとさし。頬のような薄紫。' },
  { key: 'seiji',       name: '青磁色',   yomi: 'せいじいろ',     hex: '#7ebea5', rarity: 2, words: '焼きものの肌に宿る、澄んだ翠。' },
  { key: 'akane',       name: '茜色',     yomi: 'あかねいろ',     hex: '#b7282e', rarity: 2, words: '根から染めた、夕焼けの深い赤。' },
  { key: 'yamabuki',    name: '山吹色',   yomi: 'やまぶきいろ',   hex: '#f8b500', rarity: 2, words: '春の川辺に、こぼれるように咲く黄。' },

  { key: 'shiraai',     name: '白藍',     yomi: 'しらあい',       hex: '#c1e4e9', rarity: 1, words: '藍を白に溶かした、朝の水の色。' },
  { key: 'fujiiro',     name: '藤色',     yomi: 'ふじいろ',       hex: '#bbbcde', rarity: 1, words: '房がゆれるたび、光を含む淡い紫。' },
  { key: 'usumurasaki', name: '薄紫',     yomi: 'うすむらさき',   hex: '#c0a2c7', rarity: 1, words: '夕暮れの端に、少しだけ残る紫。' },
  { key: 'shion',       name: '紫苑色',   yomi: 'しおんいろ',     hex: '#867ba9', rarity: 1, words: '「君を忘れず」の花言葉を持つ色。' },
  { key: 'mizuasagi',   name: '水浅葱',   yomi: 'みずあさぎ',     hex: '#80aba9', rarity: 1, words: '浅葱を水でうすめた、静かな青緑。' },
  { key: 'aiiro',       name: '藍色',     yomi: 'あいいろ',       hex: '#165e83', rarity: 1, words: '何度も甕にくぐらせて、深くなる青。' },
  { key: 'tetsukon',    name: '鉄紺',     yomi: 'てつこん',       hex: '#17184b', rarity: 1, words: '夜の底に沈む、重たい紺。' },
  { key: 'fukagawanezu',name: '深川鼠',   yomi: 'ふかがわねず',   hex: '#97a791', rarity: 1, words: '川風の町で好まれた、緑がかった灰。' },
  { key: 'ginnezu',     name: '銀鼠',     yomi: 'ぎんねず',       hex: '#afafb0', rarity: 1, words: '雨上がりの瓦に光る、銀の灰。' },
  { key: 'shironezu',   name: '白鼠',     yomi: 'しろねず',       hex: '#dcdddd', rarity: 1, words: '雪曇りの空の、やさしい白灰。' },
  { key: 'fujinezu',    name: '藤鼠',     yomi: 'ふじねず',       hex: '#a6a5c4', rarity: 1, words: '藤色に灰をひと匙。落ち着いた紫。' },
  { key: 'hatobanezu',  name: '鳩羽鼠',   yomi: 'はとばねずみ',   hex: '#9e8b8e', rarity: 1, words: '鳩の羽に見る、赤みを帯びた灰。' },
  { key: 'sakura',      name: '桜色',     yomi: 'さくらいろ',     hex: '#fef4f4', rarity: 1, words: '花びら一枚を、光に透かした色。' },
  { key: 'haizakura',   name: '灰桜',     yomi: 'はいざくら',     hex: '#e8d3d1', rarity: 1, words: '花曇りの日の、灰をまとった桜。' },
  { key: 'nadeshiko',   name: '撫子色',   yomi: 'なでしこいろ',   hex: '#eebbcb', rarity: 1, words: '撫でたくなるほど、かわいらしい紅。' },
  { key: 'sango',       name: '珊瑚色',   yomi: 'さんごいろ',     hex: '#f5b1aa', rarity: 1, words: '南の海の底で育つ、あたたかな桃色。' },
  { key: 'koubai',      name: '紅梅色',   yomi: 'こうばいいろ',   hex: '#f2a0a1', rarity: 1, words: 'まだ寒い頃に咲く、紅い梅の色。' },
  { key: 'zouge',       name: '象牙色',   yomi: 'ぞうげいろ',     hex: '#f8f4e6', rarity: 1, words: 'ほんのり黄みを含んだ、なめらかな白。' },
  { key: 'kinari',      name: '生成り色', yomi: 'きなりいろ',     hex: '#fbfaf5', rarity: 1, words: '染める前の、素のままの布の色。' },
  { key: 'unohana',     name: '卯の花色', yomi: 'うのはないろ',   hex: '#f7fcfe', rarity: 1, words: '初夏の垣根に咲く、青みの白。' },
  { key: 'gofun',       name: '胡粉色',   yomi: 'ごふんいろ',     hex: '#fffffc', rarity: 1, words: '貝殻を砕いてつくる、日本画の白。' },
  { key: 'torinoko',    name: '鳥の子色', yomi: 'とりのこいろ',   hex: '#fff1cf', rarity: 1, words: '卵の殻のような、やわらかい淡黄。' },
  { key: 'kariyasu',    name: '刈安色',   yomi: 'かりやすいろ',   hex: '#f5e56b', rarity: 1, words: '野の草から染めた、素朴な黄。' },
  { key: 'wakatake',    name: '若竹色',   yomi: 'わかたけいろ',   hex: '#68be8d', rarity: 1, words: '今年生えた竹の、みずみずしい緑。' },
  { key: 'chitose',     name: '千歳緑',   yomi: 'ちとせみどり',   hex: '#316745', rarity: 1, words: '千年変わらない松の、深い緑。' },
  { key: 'shironeri',   name: '白練',     yomi: 'しろねり',       hex: '#f3f3f2', rarity: 1, words: '練った絹の、光をやわらげる白。' },
  { key: 'sumi',        name: '墨色',     yomi: 'すみいろ',       hex: '#595857', rarity: 1, words: '硯ですった墨の、にじむ黒。' },
  { key: 'gin',         name: '銀色',     yomi: 'ぎんいろ',       hex: '#c0c0c0', rarity: 1, words: '月の光を受けた、しずかな金属の色。' }
];

/* 引く確率（%）。合計100 */
const RARITY_ODDS = { 3: 8, 2: 27, 1: 65 };
const RARITY_LABEL = { 3: 'まれ', 2: 'ときどき', 1: '' };

/* ポイント：越えたら 5 + 波の強さ。流れても押せた分 1 */
function crossPoints(before) { return 5 + before; }
const PRESS_POINTS = 1;
/* もう持っている色が出たら、重ね塗りのおまけ */
const DUP_BONUS = 3;

/* 現実のご褒美の初期値。あとで自由に書き換えられる。
   ※ 課金やAIのクレジットは入れない。ループの燃料になるから */
const DEFAULT_REWARDS = [
  { name: 'いつもよりいい羊羹を1本', cost: 60 },
  { name: 'チョコミントのアイスかお菓子', cost: 40 },
  { name: '新しいMINTIAの味を試す', cost: 20 },
  { name: '焚火のできる場所へ出かける', cost: 400 },
  { name: '花札をひとそろい買う', cost: 300 }
];
