/* =========================================================
   scenes.js — SATSで入る「叶ったあとの、ありふれた日常」の場面

   絵はすべてインラインSVGの線画。外部の画像を読まないので、
   通信なし・1枚HTMLのままで動く。currentColor で描いているので、
   明るいカードの上でも、SATSの暗い画面の上でも同じ絵が使える。

   選ぶ場面をあえて地味にしてあるのは作法の都合。
   プロポーズ・結婚式・号泣は「叶った瞬間の歓喜」で、
   ネヴィル系ではよくある失敗とされる。狙うのは静けさのほう。
   ========================================================= */

const SCENES = [
  {
    key: 'table',
    title: '夕方の卓',
    text: '夕方、家の卓に花が一輪。湯呑みが二つ。隣で笑いながら、しょうもない話をしている。',
    svg: `
      <g transform="rotate(6 34 58)">
        <circle cx="34" cy="35" r="6.5"/>
        <path d="M20 58c0-9 6-15 14-15s14 6 14 15"/>
      </g>
      <g transform="rotate(-6 86 58)">
        <circle cx="86" cy="35" r="6.5"/>
        <path d="M72 58c0-9 6-15 14-15s14 6 14 15"/>
      </g>
      <path d="M60 54V41"/>
      <g transform="translate(60 36)">
        <ellipse cy="-4.2" rx="2.2" ry="3.4"/>
        <ellipse cy="-4.2" rx="2.2" ry="3.4" transform="rotate(72)"/>
        <ellipse cy="-4.2" rx="2.2" ry="3.4" transform="rotate(144)"/>
        <ellipse cy="-4.2" rx="2.2" ry="3.4" transform="rotate(216)"/>
        <ellipse cy="-4.2" rx="2.2" ry="3.4" transform="rotate(288)"/>
        <circle r="1.6"/>
      </g>
      <ellipse cx="60" cy="68" rx="44" ry="8"/>
      <path d="M60 76v5M50 82h20"/>
      <path d="M57.5 54h5l-1 16h-3z"/>
      <ellipse cx="60" cy="54" rx="2.5" ry="1"/>
      <path d="M36 61h10l-1.5 8h-7z"/>
      <ellipse cx="41" cy="61" rx="5" ry="1.6"/>
      <path d="M74 61h10l-1.5 8h-7z"/>
      <ellipse cx="79" cy="61" rx="5" ry="1.6"/>`
  },
  {
    key: 'mugs',
    title: '朝のマグが二つ',
    text: '朝、台所にマグが二つ出ている。片方からまだ湯気が立っている。',
    svg: `
      <path d="M6 70H114"/>
      <rect x="26" y="40" width="27" height="27" rx="4"/>
      <path d="M53 46c9 3 9 12 0 15"/>
      <rect x="66" y="46" width="22" height="21" rx="4"/>
      <path d="M88 51c7 2 7 9 0 11"/>
      <path d="M34 34c5-5 0-9 2-13"/>
      <path d="M45 32c5-5 0-9 2-13"/>
      <path d="M74 40c4-4 0-7 2-10"/>`
  },
  {
    key: 'brush',
    title: '歯ブラシが二本',
    text: '洗面所のコップに、歯ブラシが二本ささっている。',
    svg: `
      <path d="M44 44h32l-4 28H48z"/>
      <path d="M6 76H114"/>
      <path d="M55 46 47 18"/>
      <rect x="41" y="8" width="8" height="13" rx="4" transform="rotate(-16 45 14)"/>
      <path d="M66 46 74 20"/>
      <rect x="70" y="10" width="8" height="13" rx="4" transform="rotate(16 74 16)"/>
      <path d="M30 22h14"/>`
  },
  {
    key: 'keys',
    title: '玄関の鍵が二つ',
    text: '玄関に鍵が二つ下がっている。どちらもこの家の鍵。',
    svg: `
      <path d="M14 16h92"/>
      <path d="M14 16v6M106 16v6"/>
      <g transform="translate(0 4)">
        <path d="M44 22v-6"/>
        <circle cx="44" cy="30" r="8"/>
        <circle cx="44" cy="30" r="3"/>
        <path d="M44 38v26"/>
        <path d="M44 54h7M44 61h6"/>
      </g>
      <g transform="translate(0 4)">
        <path d="M78 22v-6"/>
        <circle cx="78" cy="28" r="7"/>
        <circle cx="78" cy="28" r="2.5"/>
        <path d="M78 35v21"/>
        <path d="M78 47h6M78 53h5"/>
      </g>`
  },
  {
    key: 'laundry',
    title: '二人分の洗濯物',
    text: 'ベランダに二人分の洗濯物が揺れている。日向の匂いがする。',
    svg: `
      <path d="M4 16c36 10 76 10 112 0"/>
      <path d="M32 25 22 33l6 7 4-3v23h20V37l4 3 6-7-10-8z"/>
      <path d="M32 25c6 4 14 4 20 0"/>
      <path d="M76 27 68 34l5 6 3-2v19h16V38l3 2 5-6-7-7z"/>
      <path d="M76 27c5 3 12 3 16 0"/>
      <path d="M34 21v5M50 21v5M78 23v5M90 23v5"/>`
  },
  {
    key: 'table',
    title: '夕飯の皿が二枚',
    text: '夕飯の皿が二枚。向かいで箸が動く音がする。',
    svg: `
      <path d="M4 70H116"/>
      <ellipse cx="42" cy="50" rx="24" ry="9"/>
      <ellipse cx="42" cy="50" rx="15" ry="5"/>
      <ellipse cx="88" cy="56" rx="17" ry="7"/>
      <ellipse cx="88" cy="56" rx="10" ry="4"/>
      <path d="M70 36 84 30M71 40 85 34"/>
      <path d="M22 30h14l-2 14H24z"/>`
  },
  {
    key: 'futon',
    title: '隣の寝息',
    text: '夜、隣で寝息が聞こえる。布団が少し重い。',
    svg: `
      <path d="M12 54c28-9 68-9 96 0v16H12z"/>
      <path d="M12 70v6M108 70v6"/>
      <rect x="24" y="40" width="28" height="14" rx="6"/>
      <rect x="64" y="40" width="28" height="14" rx="6"/>
      <path d="M100 10a11 11 0 1 0 9 14 9 9 0 1 1-9-14z"/>`
  }
];

/* 「決めた」欄に置く二つの指輪 */
const RINGS_SVG = `
  <circle cx="26" cy="22" r="13"/>
  <circle cx="44" cy="22" r="13"/>
  <path d="M22 9l4-6h4l4 6"/>`;
