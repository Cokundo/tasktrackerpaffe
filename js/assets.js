/* =========================================================
   assets.js — パフェ素材（透過PNG）の読み込み
   元画像は assets/raw/、背景を抜いたものが assets/parts/。
   変換は  node tools/make-assets.js  でやり直せる。
   ========================================================= */

const ASSET_DIR = 'assets/parts/';

const ASSET_NAMES = [
  'glass', 'table_doily',
  'choco_flakes', 'brownie', 'wafer_board', 'wafer_stick', 'pretzel_sticks',
  'purple_crystal', 'flower_jelly', 'shaved_ice',
  'whip_small', 'whip_cherry',
  'strawberry', 'strawberry_half', 'blueberry', 'pineapple_chunks', 'pineapple_slice',
  'orange_segment', 'lemon_star', 'melon_pistachio',
  'icing_cookies', 'dango', 'choco_twist',
  'chocomint_scoops',
  'matcha_0', 'matcha_1', 'matcha_2', 'matcha_3', 'matcha_4', 'matcha_5', 'matcha_6'
];

const Assets = {
  img: {},
  loaded: 0,
  total: 0,

  load(onProgress) {
    this.total = ASSET_NAMES.length;
    ASSET_NAMES.forEach(name => {
      const im = new Image();
      const done = ok => {
        this.loaded++;
        if (!ok) console.warn('素材を読み込めませんでした:', name);
        if (onProgress) onProgress(this.loaded, this.total);
      };
      im.onload = () => done(true);
      im.onerror = () => done(false);
      im.src = ASSET_DIR + name + '.png';
      this.img[name] = im;
    });
  },

  /** 読み込み済みの画像を返す（未完了なら null） */
  get(name) {
    const im = this.img[name];
    return im && im.complete && im.naturalWidth > 0 ? im : null;
  },

  get ready() {
    return this.loaded >= this.total && this.total > 0;
  }
};
