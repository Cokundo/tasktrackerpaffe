/* =========================================================
   photo.js — SATSで使う自分の写真（1枚だけ）

   線画の場面カードで足りないときは、自分の写真を1枚入れられる。
   端末の中で縮めてから localStorage に置くだけで、どこにも送らない。

   記録本体（Store）とは別のキーに入れてある。理由は2つ：
     ・引き継ぎコードに写真が乗ると、貼り付けられない長さになる
     ・写真は端末ごとに好きなものを入れたいことが多い
   ========================================================= */

const PHOTO_KEY = 'hikiyose-photo-v1';

const Photo = {

  get() {
    try { return localStorage.getItem(PHOTO_KEY) || ''; } catch (e) { return ''; }
  },

  set(dataUrl) {
    localStorage.setItem(PHOTO_KEY, dataUrl);   // 容量が足りなければ例外
  },

  clear() {
    try { localStorage.removeItem(PHOTO_KEY); } catch (e) { /* 消せなければそのまま */ }
  },

  /* ファイルを読んで、長辺1100pxまで縮めたJPEGのデータURLにする */
  async fromFile(file) {
    if (!file || !/^image\//.test(file.type || '')) {
      throw new Error('画像ファイルを選んでください');
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('この画像は開けませんでした'));
        i.src = url;
      });

      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error('この画像は開けませんでした');

      const scale = Math.min(1, 1100 / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      let out = canvas.toDataURL('image/jpeg', 0.82);
      if (out.length > 1500000) out = canvas.toDataURL('image/jpeg', 0.6);   // まだ重ければもう一段
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  /* だいたいの重さ（KB） */
  sizeKB(dataUrl) {
    return Math.round((dataUrl || '').length * 0.75 / 1024);
  }
};
