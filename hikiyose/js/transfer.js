/* =========================================================
   transfer.js — 端末をまたいで記録を持ち運ぶ

   記録は端末のブラウザにしか入っていないので、
   PCで書いたものをスマホで見るには、自分で運ぶしかない。
   ここでは記録を1本の文字列（引き継ぎコード）にする。
   LINEのKeepメモや自分宛のメールに貼って、
   もう一方の端末で貼り付ければ入る。

   HKY1: gzipで縮めたもの（たいてい元の1/5以下）
   HKY0: 縮められないブラウザ用（そのままbase64）
   ========================================================= */

const Transfer = {

  b64(u8) {
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < u8.length; i += CH) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    }
    return btoa(s);
  },

  unb64(str) {
    const bin = atob(str);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  },

  async encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      return 'HKY1:' + this.b64(buf);
    }
    return 'HKY0:' + this.b64(bytes);
  },

  async decode(code) {
    const t = String(code || '').trim();
    if (!t) throw new Error('コードが空です');

    // メールやトーク画面で改行が入ることがあるので、空白は落としてから読む
    const packed = t.replace(/\s+/g, '');

    if (packed.startsWith('HKY1:')) {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('このブラウザでは縮めたコードを開けません。もう一方の端末で「縮めずに作る」を使ってください。');
      }
      const u8 = this.unb64(packed.slice(5));
      const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    }
    if (packed.startsWith('HKY0:')) {
      return JSON.parse(new TextDecoder().decode(this.unb64(packed.slice(5))));
    }
    // 書き出したJSONファイルの中身をそのまま貼られた場合も受ける
    return JSON.parse(t);
  }
};
