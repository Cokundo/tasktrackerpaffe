/* =========================================================
   checks.js — 言葉のチェッカー
   流派を超えてほぼ共通とされる作法を、書いた文にその場で当てる。
     ・主語は「私は」（他人を変える文言は効果が薄いとされる）
     ・語尾は「〜したい」ではなく「〜している／〜した」
     ・否定形・ネガティブ語を使わない
     ・五感で描写できるほど具体的に
   判定はあくまで目安。赤が出ても、本人がしっくりくるならそれが正解。
   ========================================================= */

const Checks = {

  /* アファメーション／未来日記／リスト項目に共通の診断 */
  affirmation(text) {
    const t = (text || '').trim();
    const issues = [];
    const goods = [];
    if (!t) return { score: 0, issues: [{ type: 'empty', msg: 'まだ何も書かれていません。' }], goods: [] };

    // ① 主語
    if (/^私(は|が|の|、)/.test(t) || /^わたし/.test(t)) {
      goods.push('主語が「私」になっている');
    } else if (/^[私わ]/.test(t)) {
      goods.push('主語が「私」になっている');
    } else {
      issues.push({
        type: 'subject',
        msg: '主語が「私」ではありません。他人を変える文言は効果が薄いとされます。文頭に「私は」を置いてください。',
        fix: t => '私は' + t
      });
    }

    // ② 他人主語（「彼が〜してくれる」型）
    const other = NG_OTHER.find(w => t.includes(w));
    if (other) {
      issues.push({
        type: 'other',
        msg: `「${other}」で相手を動かす形になっています。「〇〇にしてほしい」ではなく「そうなった私」「互いに幸せな関係」へ言い換えてください。`
      });
    }

    // ③ 願望形
    const wish = NG_WISH.find(w => t.includes(w));
    if (wish) {
      issues.push({
        type: 'wish',
        msg: `「${wish}」は願望形です。「今は達成していない＝不足」を刷り込むため、現在形・完了形（〜している／〜した）にします。`,
        fix: t => t.replace(/(し)?たいです。?$/, 'しています。').replace(/たい。?$/, 'ています。').replace(/ますように。?$/, 'ています。')
      });
    }

    // ④ 否定形・ネガティブ語
    const negPat = /(し|れ|え|け|て|で|ら|わ|た|ま|か)ない|ません|なくて|ずに|ないで|不安|心配|無理|寂し|さみし|独りぼ|焦/;
    const negHit = t.match(negPat);
    if (negHit) {
      issues.push({
        type: 'negative',
        msg: `「${negHit[0]}」が入っています。潜在意識は否定形を認識しにくいとされます。「ない」ではなく「ある」で書き直してください（例：「不安がない」→「安心している」）。`
      });
    }

    // ⑤ 語尾（現在形・現在進行形・完了形）※文末で見る。「したい」を「した」と誤認しないため
    if (/(している|しています|ている|ています|ていた|でいる|いる|した|しました|ました|なった|なっている|です|ます|だ|である|られている|られた)[。．.！!]?$/.test(t)) {
      goods.push('語尾が現在形／完了形になっている');
    } else {
      issues.push({
        type: 'tense',
        msg: '語尾が「している／した／なった／です」のいずれでもありません。すでにそうである前提の言い方に寄せてください。'
      });
    }

    // ⑥ 五感・具体性
    const senses = SENSE_WORDS.filter(w => t.includes(w));
    if (senses.length >= 2) goods.push(`五感で描けている（${senses.slice(0, 3).join('・')}）`);
    else if (t.length >= 30) goods.push('具体的な長さがある');
    else issues.push({
      type: 'sense',
      msg: '五感で描写できるほど具体的にすると強くなるとされます。朝の光、声、手ざわり、匂いなどを1つ足してみてください。'
    });

    // 採点（100点満点・目安）
    let score = 100;
    for (const i of issues) {
      score -= (i.type === 'sense' ? 10 : i.type === 'subject' ? 25 : 20);
    }
    score = Math.max(0, Math.min(100, score));
    return { score, issues, goods };
  },

  /* 違和感が強いときの緩和形（認知的不協和の回避） */
  soften(text) {
    const t = (text || '').trim();
    if (!t) return [];
    // 「私は◯◯している。」から中身◯◯を粗く抜く
    let core = t.replace(/^私(は|が)/, '').replace(/[。.！!]$/, '');
    core = core.replace(/(しています|している|しました|した|です|ます|ています|ている)$/, '');
    core = core.trim() || t;
    return SOFTENERS.map(tpl => tpl.replace('{X}', core));
  },

  /* SATSの場面チェック：「叶った瞬間の歓喜」を選んでいないか */
  satsScene(text) {
    const t = (text || '').trim();
    if (!t) return { ok: false, msg: 'まだ場面が登録されていません。' };
    const peak = SATS_PEAK_WORDS.find(w => t.includes(w));
    if (peak) {
      return {
        ok: false,
        msg: `「${peak}」は“叶った瞬間の歓喜”に寄っています。SATSでよくある失敗はここ。推奨は「叶ったあとの、ありふれた日常の一場面」——たとえば二人ぶんの洗濯物をたたんでいる、隣で寝息が聞こえる、台所で水を出している、など。`
      };
    }
    const senses = SENSE_WORDS.filter(w => t.includes(w));
    if (senses.length === 0) {
      return { ok: true, msg: '静かな場面が登録されています。手ざわり・音・匂いをもう1つ足すと、中に入りやすくなります。' };
    }
    return { ok: true, msg: '静けさのある日常の場面です。この質感のまま眠ってください。' };
  },

  /* リスト項目：否定形で書かれていないか（肯定形で書くのが作法） */
  listItem(text) {
    const t = (text || '').trim();
    if (!t) return null;
    const m = t.match(/(し|れ|え|け|て|で|ら|わ|た|ま|か)ない|ません|嫌な|苦手/);
    if (m) {
      return `「${m[0]}」は否定形です。潜在意識は否定形を認識しないとされます。「怒らない人」→「機嫌のいい人」のように、欲しい状態そのものに書き換えてください。`;
    }
    return null;
  }
};
