/* =========================================================
   app.js — 画面の組み立てと操作
   ========================================================= */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let S;            // Store.state の別名
let curCat = 'look';
let promptIdx = 0;

/* ---------- トースト ---------- */

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
}

function save() {
  Store.save();
}

/* =========================================================
   タブ
   ========================================================= */

function initTabs() {
  $('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-on', b === btn));
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.toggle('is-on', p.id === 'panel-' + btn.dataset.panel);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* =========================================================
   ヘッダー・ステージ・警告
   ========================================================= */

function renderHeader() {
  const st = Store.stage();
  $('hStage').textContent = st;
  const mood = Store.today().mood;
  $('hMood').textContent = mood ? mood : '–';
  $('hMood').classList.toggle('good', !!mood && mood <= 7);
  $('hMood').classList.toggle('low', !!mood && mood >= 15);
  $('hStreak').textContent = Store.streak();

  const w = S.profile.weddingDate;
  if (w) {
    const n = diffDays(todayKey(), w);
    $('hCount').textContent = n > 0 ? n + '日' : (n === 0 ? '今日' : '済');
  } else {
    $('hCount').textContent = '未定';
  }
}

function renderStage() {
  const n = Store.stage();
  const st = STAGES[n];
  const gaps = Store.stageGaps();
  $('stageBox').innerHTML = `
    <div class="stage-line">
      ${STAGES.map(s => `<span class="stage-dot ${s.n < n ? 'past' : s.n === n ? 'now' : ''}">${s.n}</span>`).join('<i></i>')}
    </div>
    <h3 class="stage-title">ステージ${st.n}：${st.title}<small>${st.span}</small></h3>
    <p class="stage-lead">${st.lead}</p>
    <ul class="stage-todo">${st.todo.map(t => `<li>${t}</li>`).join('')}</ul>
    <div class="stage-next">
      <b>次へ進む目安</b>
      <ul>${gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
    </div>`;
}

function renderWarnings() {
  const ws = Store.warnings();
  $('warnBox').innerHTML = ws.map(w => `
    <div class="card warn warn-${w.level}">
      <b>${w.level === 'stop' ? '立ち止まってください' : w.level === 'warn' ? 'ベンチマーク' : 'メモ'}</b>
      <p>${esc(w.text)}</p>
    </div>`).join('');
}

/* =========================================================
   今日：感情のスケール
   ========================================================= */

function renderScale() {
  const cur = Store.today().mood;
  $('scale').innerHTML = EMOTION_SCALE.map(e => `
    <button class="sc ${cur === e.n ? 'is-on' : ''} ${cur && e.n === cur - 1 ? 'is-next' : ''}"
            data-n="${e.n}" style="--t:${(e.n - 1) / 21}">
      <span class="sc-n">${e.n}</span><span class="sc-l">${e.label}</span>
    </button>`).join('');

  if (!cur) {
    $('bridge').innerHTML = '<p class="hint">今の気分にいちばん近い段を押してください。正直に押すほど役に立ちます。</p>';
    return;
  }
  const now = EMOTION_SCALE[cur - 1];
  const up = cur > 1 ? EMOTION_SCALE[cur - 2] : null;
  $('bridge').innerHTML = `
    <div class="bridge-in">
      <p class="bridge-now">いま <b>${cur}. ${now.label}</b></p>
      <p class="bridge-do">${esc(now.bridge)}</p>
      ${up ? `<p class="bridge-up">次に目指すのは <b>${up.n}. ${up.label}</b> だけ。それ以上は狙わない。</p>`
           : '<p class="bridge-up">最上段です。17秒だけ味わって、あとは手を離してください。</p>'}
    </div>`;
}

/* =========================================================
   今日：自愛
   ========================================================= */

const JIAI = [
  { key: 'love', label: '愛してる', note: '鏡に向かって' },
  { key: 'perfect', label: '完璧', note: 'そのままで' },
  { key: 'best', label: '最高', note: '理由はいらない' },
  { key: 'allow', label: '許可する', note: 'ありのままで存在することを' }
];

function renderJiai() {
  const d = Store.today();
  $('jiaiRow').innerHTML = JIAI.map(j => `
    <button class="tap ${d.jiai[j.key] ? 'is-on' : ''}" data-jiai="${j.key}">
      <span class="tap-label">${j.label}</span>
      <span class="tap-note">${j.note}</span>
      <span class="tap-num">${d.jiai[j.key]}</span>
    </button>`).join('');

  $('noticeList').innerHTML = (d.notice || []).map(t => `<li>${esc(t)}</li>`).join('');
}

/* =========================================================
   今日：夜のノート
   ========================================================= */

function renderNight() {
  const d = Store.today();
  $('goodInputs').innerHTML = d.good.map((v, i) =>
    `<input type="text" class="line-in" data-good="${i}" value="${esc(v)}" placeholder="${i + 1}つめ">`).join('');
  $('thanksInputs').innerHTML = d.thanks.map((v, i) =>
    `<input type="text" class="line-in" data-thanks="${i}" value="${esc(v)}" placeholder="${i + 1}つめ">`).join('');
}

/* =========================================================
   今日：実践チェック
   ========================================================= */

function todayItems() {
  const d = Store.today();
  const j = d.jiai;
  return [
    { stage: 0, label: '感情の段を記録', done: !!d.mood },
    { stage: 0, label: '自愛（鏡のワーク）', done: j.love + j.perfect + j.best + j.allow > 0 },
    { stage: 0, label: 'いいことノート3つ', done: d.good.filter(Boolean).length >= 3 },
    { stage: 0, label: '感謝3つ', done: d.thanks.filter(Boolean).length >= 3 },
    { stage: 1, label: 'リスト100項目', done: Store.listCount() >= 100 },
    { stage: 2, label: '369（朝3昼6夜9）', done: d.m369.am >= 3 && d.m369.noon >= 6 && d.m369.pm >= 9 },
    { stage: 2, label: '55×5（55回）', done: d.m55 >= 55 },
    { stage: 2, label: '68秒を通す', done: d.sec68 > 0 },
    { stage: 2, label: 'SATS', done: !!d.sats },
    { stage: 2, label: 'ありがとう500回', done: d.arigatou >= 500 },
    { stage: 3, label: '手放しチェック', done: S.release.some(r => r.at === todayKey()) },
    { stage: 3, label: '1つ手放す', done: d.declutter > 0 },
    { stage: 4, label: '現実の一歩', done: (d.acted || []).length > 0 }
  ];
}

function renderTodayCheck() {
  const st = Store.stage();
  $('todayCheck').innerHTML = todayItems().map(it => `
    <li class="tc ${it.done ? 'done' : ''} ${it.stage === st ? 'now' : ''}">
      <span class="tc-mark">${it.done ? '✓' : '·'}</span>
      <span class="tc-label">${it.label}</span>
      <span class="tc-stage">S${it.stage}</span>
    </li>`).join('');
}

/* =========================================================
   決める：電撃婚の設定とロードマップ
   ========================================================= */

function renderProfile() {
  $('pfName').value = S.profile.nickname || '';
  $('pfWedding').value = S.profile.weddingDate || '';
  $('pfBlitz').value = String(S.profile.blitzDays || 120);
  $('pfMet').value = S.profile.metDate || '';

  const box = $('decidedBox');
  if (!S.profile.weddingDate) {
    box.innerHTML = '<p class="hint">日付が決まると、ここに「もう決まっている予定」として表示されます。</p>';
    return;
  }
  const w = parseKey(S.profile.weddingDate);
  const left = diffDays(todayKey(), S.profile.weddingDate);
  const D = blitzSpan();
  const meetKey = dateKey(addDays(w, -D));
  const meetLeft = diffDays(todayKey(), meetKey);
  const name = S.profile.nickname || '私';

  box.innerHTML = `
    <div class="decided-in">
      <p class="dc-date">${jpDate(w)}</p>
      <p class="dc-line">${esc(name)}は、この日に入籍している。</p>
      <p class="dc-sub">${left > 0 ? `あと ${left} 日` : left === 0 ? '今日です' : `${-left} 日前に過ぎました（新しい日付を決めてください）`}
        ${S.profile.decidedAt ? ` ／ ${S.profile.decidedAt} に決めた` : ''}</p>
      <p class="dc-meet">
        ${S.profile.metDate
          ? `出会いは ${jpDate(parseKey(S.profile.metDate))}。そこから ${diffDays(S.profile.metDate, S.profile.weddingDate)} 日での入籍。`
          : meetLeft > 0
            ? `逆算すると、出会うのは <b>${jpDate(parseKey(meetKey))}ごろ</b>（あと${meetLeft}日）。`
            : `逆算した出会いの日は <b>もう過ぎています</b>。相手はすでに知り合いの中にいるか、これから前倒しで現れる、ということ。`}
      </p>
    </div>`;
}

/* 電撃期間D：出会っているならその実日数、いなければ設定値 */
function blitzSpan() {
  if (S.profile.metDate && S.profile.weddingDate) {
    const d = diffDays(S.profile.metDate, S.profile.weddingDate);
    if (d > 0) return d;
  }
  return Number(S.profile.blitzDays) || 120;
}

function renderRoad() {
  const box = $('road');
  if (!S.profile.weddingDate) {
    box.innerHTML = '<li class="road-empty">まず上で入籍する日を決めてください。決まった瞬間に、ここに道のりが引かれます。</li>';
    return;
  }
  const w = parseKey(S.profile.weddingDate);
  const D = blitzSpan();

  // 日付を出してから、時間順に並べ替える。
  // 納期の都合で前倒しになった段取りが、物語の順序を追い越すことがある ── それも含めて現実。
  const items = ROADMAP.map(r => {
    let d = addDays(w, -Math.round(D * r.ratio));
    let caution = '';
    if (r.lead) {
      const lim = addDays(w, -r.lead);
      if (d > lim) {
        d = lim;
        caution = `納期から逆算して ${jpShort(lim)} に前倒し。`;
      }
    }
    return { r, d, caution };
  }).sort((a, b) => a.d - b.d);

  box.innerHTML = items.map(({ r, d, caution }) => {
    const key = dateKey(d);
    const rec = S.road[r.key] || {};
    const past = diffDays(todayKey(), key) < 0;
    return `
      <li class="road-item ${rec.done ? 'done' : ''} ${past && !rec.done ? 'past' : ''}">
        <button class="road-check" data-road="${r.key}">${rec.done ? '✓' : ''}</button>
        <div class="road-body">
          <p class="road-head"><b>${r.label}</b><span class="road-date">${jpShort(d)}</span></p>
          <p class="road-note">${r.note}${caution ? ` <em>${caution}</em>` : ''}</p>
          ${rec.done ? `<p class="road-done">${rec.at} に完了</p>` : ''}
        </div>
      </li>`;
  }).join('');
}

/* =========================================================
   決める：100項目リスト
   ========================================================= */

function renderList() {
  const total = Store.listCount();
  $('lpNum').textContent = `${total} / 100`;
  $('lpFill').style.width = Math.min(100, total) + '%';

  $('catTabs').innerHTML = LIST_CATS.map(c => `
    <button class="cat ${curCat === c.key ? 'is-on' : ''}" data-cat="${c.key}">
      ${c.label}<span>${Store.listCount(c.key)}</span>
    </button>`).join('');

  const cat = LIST_CATS.find(c => c.key === curCat);
  $('listHint').innerHTML = esc(cat.hint) +
    (curCat !== 'feel' && Store.listCount('feel') < 10
      ? ' <b>／ フィーリングがまだ' + Store.listCount('feel') + '項目です。条件だけ追うと本当の願いとズレます。</b>'
      : '');

  const items = S.list.filter(x => x.cat === curCat);
  $('wishList').innerHTML = items.length
    ? items.map(x => `<li><span>${esc(x.text)}</span><button class="x" data-del="${x.id}">×</button></li>`).join('')
    : '<li class="empty">まだありません。下の問いに答えるつもりで書くと出てきます。</li>';

  $('promptText').textContent = LIST_PROMPTS[promptIdx % LIST_PROMPTS.length];
}

/* =========================================================
   決める：アファメーション
   ========================================================= */

function renderAff() {
  const a = S.affirmation;
  if ($('affText').value !== a.text) $('affText').value = a.text || '';
  $('affDiscomfort').value = a.discomfort;
  $('affDiscomfortOut').textContent = a.discomfort;

  const r = Checks.affirmation(a.text);
  $('affScore').textContent = r.score;
  $('affScore').className = 'score-ring ' + (r.score >= 80 ? 'hi' : r.score >= 50 ? 'mid' : 'lo');
  $('affDetail').innerHTML =
    (r.goods.length ? `<ul class="ok-list">${r.goods.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : '') +
    (r.issues.length ? `<ul class="ng-list">${r.issues.map(i => `<li>${esc(i.msg)}</li>`).join('')}</ul>` : '');

  const soft = $('softenBox');
  if (a.discomfort >= 6 && a.text) {
    soft.innerHTML = '<p class="soft-head">違和感が強いので、断定を弱めた形を置いておきます。押すと差し替わります。</p>' +
      Checks.soften(a.text).map(s => `<button class="soft" data-soft="${esc(s)}">${esc(s)}</button>`).join('');
  } else {
    soft.innerHTML = '';
  }
  $('affFixedAt').textContent = a.fixedAt ? `${a.fixedAt} に確定` : '';
}

/* =========================================================
   刷り込む：SATS
   ========================================================= */

let satsTimer = null;

function renderSats() {
  $('satsScene').value = S.satsScene || '';
  const r = Checks.satsScene(S.satsScene);
  $('satsHint').innerHTML = `<span class="${r.ok ? 'ok' : 'ng'}">${esc(r.msg)}</span>`;
  $('satsDone').checked = !!Store.today().sats;
}

function startSats() {
  let i = 0, left = SATS_STEPS[0].sec;
  $('satsStart').hidden = true;
  $('satsStop').hidden = false;

  const draw = () => {
    const s = SATS_STEPS[i];
    $('satsStage').innerHTML = `
      <div class="sats-now">
        <p class="sats-step">${s.title}</p>
        <p class="sats-body">${s.body}</p>
        ${i === 2 && S.satsScene ? `<p class="sats-scene">${esc(S.satsScene)}</p>` : ''}
        <p class="sats-left">${left}</p>
        <div class="sats-bar"><span style="width:${100 * (1 - left / s.sec)}%"></span></div>
        <p class="sats-of">${i + 1} / ${SATS_STEPS.length}</p>
      </div>`;
  };
  draw();

  satsTimer = setInterval(() => {
    left--;
    if (left <= 0) {
      i++;
      if (i >= SATS_STEPS.length) {
        stopSats();
        Store.today().sats = true;
        save();
        $('satsStage').innerHTML = '<div class="sats-now done"><p class="sats-step">おやすみなさい</p><p class="sats-body">静けさのまま、そこで眠ってください。日中の内的会話（メンタル・ダイエット）は、この夜の作業を守るためにあります。</p></div>';
        renderAll();
        return;
      }
      left = SATS_STEPS[i].sec;
    }
    draw();
  }, 1000);
}

function stopSats() {
  clearInterval(satsTimer);
  satsTimer = null;
  $('satsStart').hidden = false;
  $('satsStop').hidden = true;
}

/* =========================================================
   刷り込む：369 / 55×5
   ========================================================= */

const M369 = [
  { key: 'am', label: '朝', need: 3 },
  { key: 'noon', label: '昼', need: 6 },
  { key: 'pm', label: '夜', need: 9 }
];

function render369() {
  const d = Store.today();
  const aff = S.affirmation.text;
  $('m369').innerHTML = `
    ${aff ? `<p class="m369-aff">${esc(aff)}</p>` : '<p class="hint">先に「決める」タブでアファメーションを書いてください。</p>'}
    <div class="m369-row">
      ${M369.map(m => {
        const v = d.m369[m.key];
        return `<button class="m369-btn ${v >= m.need ? 'is-on' : ''}" data-m369="${m.key}">
          <span class="m-label">${m.label}</span>
          <span class="m-num">${v} / ${m.need}</span>
          <span class="m-dots">${Array.from({ length: m.need }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span>
        </button>`;
      }).join('')}
    </div>`;
}

function render55() {
  const o = S.order;
  const d = Store.today();
  const box = $('orderBox');
  if (o.text) $('orderInput').value = '';
  if (!o.text) {
    box.innerHTML = '<p class="hint">まだオーダーがありません。願いを1つだけ注文してください。</p>';
    return;
  }
  const dayNo = o.startedAt ? Math.min(5, diffDays(o.startedAt, todayKey()) + 1) : 1;
  const doneDays = o.streak || 0;
  box.innerHTML = `
    <p class="order-text">${esc(o.text)}</p>
    <div class="m55-days">
      ${[1, 2, 3, 4, 5].map(n => `<span class="d55 ${n <= doneDays ? 'on' : ''} ${n === doneDays + 1 ? 'cur' : ''}">${n}日目</span>`).join('')}
    </div>
    <div class="m55-count">
      <b id="m55Num">${d.m55}</b> / 55 回
      <div class="m55-bar"><span style="width:${Math.min(100, d.m55 / 55 * 100)}%"></span></div>
    </div>
    <div class="row-btns">
      <button class="btn primary" id="m55p1">書いた +1</button>
      <button class="btn ghost" id="m55p5">+5</button>
      <button class="btn ghost" id="orderClear">オーダーを取り下げる</button>
    </div>
    ${o.checkAt ? `<p class="hint">オーダー確認日：<b>${o.checkAt}</b>。その日に「願いが変わっていないか」を見て、変わっていなければもう一度書きます。</p>` : ''}
    <p class="hint">1回あたり30分程度かかると言われます。途中で日をまたいで途切れたら、責めずに1日目から。</p>`;

  $('m55p1').onclick = () => add55(1);
  $('m55p5').onclick = () => add55(5);
  $('orderClear').onclick = () => {
    S.order = { text: '', startedAt: '', lastDay: '', streak: 0, checkAt: '' };
    save(); renderAll(); toast('オーダーを取り下げました');
  };
}

function add55(n) {
  const d = Store.today();
  const o = S.order;
  d.m55 = Math.min(55, d.m55 + n);
  if (d.m55 >= 55 && o.lastDay !== todayKey()) {
    const cont = o.lastDay && diffDays(o.lastDay, todayKey()) === 1;
    o.streak = cont ? (o.streak || 0) + 1 : 1;
    o.lastDay = todayKey();
    if (!o.startedAt || o.streak === 1) o.startedAt = todayKey();
    if (o.streak >= 5) {
      o.checkAt = dateKey(addDays(new Date(), 30));
      toast('5日間そろいました。あとは1か月後の確認日まで放っておく。');
    } else {
      toast(`${o.streak}日目、55回そろいました。`);
    }
  }
  save();
  renderAll();
}

/* =========================================================
   刷り込む：17秒 / 68秒
   ========================================================= */

let t17Timer = null, t17Sec = 0;

function renderT17() {
  $('t17Num').innerHTML = `${t17Sec}<small>秒</small>`;
  const bar = $('t17Bar');
  [...bar.children].forEach((seg, i) => {
    const from = i * 17;
    const p = Math.max(0, Math.min(1, (t17Sec - from) / 17));
    seg.style.setProperty('--p', p);
    seg.classList.toggle('full', p >= 1);
  });
}

function startT17() {
  if (t17Timer) return;
  t17Timer = setInterval(() => {
    t17Sec++;
    if (t17Sec === 17) toast('17秒。同じ波動の思いが加わりはじめる。');
    if (t17Sec >= 68) {
      clearInterval(t17Timer); t17Timer = null;
      Store.today().sec68++;
      save();
      toast('68秒。エネルギーが十分になった、とされるところ。ここで手を離す。');
      renderAll();
    }
    renderT17();
  }, 1000);
}

function mixT17() {
  clearInterval(t17Timer); t17Timer = null;
  t17Sec = 0;
  renderT17();
  toast('気づけたのが収穫。もう一度、純粋なところから。');
}

/* =========================================================
   刷り込む：ありがとう・口ぐせ
   ========================================================= */

function renderArigatou() {
  const d = Store.today();
  $('arigNum').textContent = d.arigatou;
  $('arigFill').style.width = Math.min(100, d.arigatou / 500 * 100) + '%';
  $('swapList').innerHTML = S.swap.slice(-8).reverse()
    .map(s => `<li>${esc(s.from)}</li>`).join('');
}

/* =========================================================
   手放す
   ========================================================= */

function renderCalm() {
  const rs = S.release.slice(-20);
  $('calmChart').className = 'calm-chart' + (rs.length ? ' has-bars' : '');
  $('calmChart').innerHTML = rs.length
    ? rs.map(r => `<span class="cbar ${r.calm >= 7 ? 'hi' : ''}" style="height:${8 + r.calm * 9}px" title="${r.at}：${r.calm}"></span>`).join('')
    : '<p class="hint">まだ記録がありません。</p>';
}

const openBlocks = new Set();

function renderBlocks() {
  $('blocks').innerHTML = BLOCKS.map(b => {
    const rec = S.blocks[b.key] || {};
    const open = openBlocks.has(b.key);
    return `
      <div class="block ${rec.noticed ? 'noticed' : ''} ${open ? 'open' : ''}">
        <button class="block-head" data-open="${b.key}">
          <span class="block-mark">${rec.noticed ? '◉' : '○'}</span>
          <span class="block-label">${b.label}</span>
          <span class="block-arrow">${open ? '−' : '＋'}</span>
        </button>
        <div class="block-body">
          <p class="block-ask">${b.ask}</p>
          <textarea rows="2" data-blockmemo="${b.key}" placeholder="思いついたことを、直さずに書く">${esc(rec.memo || '')}</textarea>
          <div class="block-foot">
            <button class="btn tiny ${rec.noticed ? 'primary' : 'ghost'}" data-block="${b.key}">${rec.noticed ? '気づいた' : 'これはある'}</button>
            <span class="block-at">${rec.at ? `${rec.at} に気づいた` : '解除しようとしなくていい。気づけばそれでいい。'}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderDeclutter() {
  const d = Store.today();
  $('dcNum').textContent = d.declutter;
  const total = Object.values(S.days).reduce((a, x) => a + (x.declutter || 0), 0);
  $('dcTotal').textContent = `これまでに合計 ${total} 個`;
}

function renderSolo() {
  const last = S.solo[S.solo.length - 1];
  if (last && !$('soloText').value) $('soloText').placeholder = last.text.slice(0, 40) + '…（前回）';
}

/* =========================================================
   動く
   ========================================================= */

function renderPre() {
  $('preGrid').innerHTML = PREACTIONS.map(p => {
    const rec = S.pre[p.key] || {};
    return `<button class="pre ${rec.done ? 'done' : ''}" data-pre="${p.key}">
      <span class="pre-mark">${rec.done ? '✓' : ''}</span>
      <span class="pre-label">${p.label}</span>
      ${rec.at ? `<span class="pre-at">${rec.at}</span>` : ''}
    </button>`;
  }).join('');
}

function renderActs() {
  const keys = Store.recentKeys(14).slice().reverse();
  const rows = [];
  for (const k of keys) {
    const d = S.days[k];
    if (!d || !(d.acted || []).length) continue;
    rows.push(`<li><span class="act-date">${jpShort(parseKey(k))}</span><span>${d.acted.map(esc).join(' / ')}</span></li>`);
  }
  $('actList').innerHTML = rows.length ? rows.join('') : '<li class="empty">まだありません。小さくていいので一歩を。</li>';
}

/* =========================================================
   記録
   ========================================================= */

function renderDiary() {
  $('diaryList').innerHTML = S.diary.slice().reverse().slice(0, 20).map(x => `
    <li><span class="d-at">${x.at}</span><p>${esc(x.text)}</p><button class="x" data-ddel="${x.id}">×</button></li>`).join('')
    || '<li class="empty">まだありません。</li>';
  const t = $('diaryText').value;
  if (t.trim()) {
    const r = Checks.affirmation(t);
    const tense = r.issues.find(i => i.type === 'tense' || i.type === 'wish');
    $('diaryHint').textContent = tense ? tense.msg : '過去形・完了形で書けています。';
  } else {
    $('diaryHint').textContent = '';
  }
}

function renderKouten() {
  const keys = Store.recentKeys(28);
  const hits = keys.filter(k => S.days[k] && S.days[k].kouten);
  const t = Store.today();
  $('koutenText').value = t.kouten || '';
  $('koutenBox').innerHTML = `
    <p class="hint">直近28日で ${hits.length} 日の記録。${hits.length >= 14 ? '<b class="ng">長すぎます。好転反応の枠組みから一度離れてください。</b>' : hits.length >= 5 ? '5日前後が目安と言われる範囲を超えています。様子を見てください。' : ''}</p>
    <ul class="kouten-list">${hits.slice(-6).reverse().map(k => `<li><span>${jpShort(parseKey(k))}</span>${esc(S.days[k].kouten)}</li>`).join('')}</ul>`;
}

function renderHeat() {
  const days = 91;
  const cells = [];
  // 曜日で行がそろうように、先頭を空セルで埋める
  const first = addDays(new Date(), -(days - 1));
  for (let i = 0; i < first.getDay(); i++) cells.push('<i class="hc hc-pad"></i>');
  for (let i = days - 1; i >= 0; i--) {
    const k = dateKey(addDays(new Date(), -i));
    const d = S.days[k];
    let n = 0;
    if (d) {
      const j = d.jiai || {};
      n = (d.mood ? 1 : 0) + (j.love + j.perfect + j.best + j.allow > 0 ? 1 : 0) +
        (d.good.filter(Boolean).length >= 3 ? 1 : 0) + (d.thanks.filter(Boolean).length >= 3 ? 1 : 0) +
        (d.sats ? 1 : 0) + (d.sec68 ? 1 : 0) + (d.m55 >= 55 ? 1 : 0) +
        (d.m369.am >= 3 && d.m369.noon >= 6 && d.m369.pm >= 9 ? 1 : 0) +
        (d.arigatou >= 500 ? 1 : 0) + ((d.acted || []).length ? 1 : 0);
    }
    const lv = n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
    cells.push(`<i class="hc hc${lv}" title="${k}：${n}個"></i>`);
  }
  $('heat').innerHTML = cells.join('');

  const doneDays = Object.keys(S.days).filter(k => Store.didSomething(k)).length;
  const totalArig = Object.values(S.days).reduce((a, x) => a + (x.arigatou || 0), 0);
  const total68 = Object.values(S.days).reduce((a, x) => a + (x.sec68 || 0), 0);
  const satsDays = Object.values(S.days).filter(x => x.sats).length;
  $('miniStats').innerHTML = [
    ['実践した日', doneDays + '日'],
    ['連続', Store.streak() + '日'],
    ['リスト', Store.listCount() + '項目'],
    ['先取り行動', Store.preCount() + '個'],
    ['SATS', satsDays + '晩'],
    ['68秒', total68 + '回'],
    ['ありがとう', totalArig.toLocaleString() + '回'],
    ['未来日記', S.diary.length + '本']
  ].map(([k, v]) => `<div class="ms"><b>${v}</b><span>${k}</span></div>`).join('');
}

/* =========================================================
   流派タブ（静的）
   ========================================================= */

function renderSchoolTab() {
  $('schools').innerHTML = Object.entries(SCHOOLS).map(([k, s]) => `
    <div class="school-card" data-school="${k}">
      <span class="school-mark">${s.short}</span>
      <div><b>${s.name}</b><p>${s.desc}</p></div>
    </div>`).join('');

  $('authors').innerHTML = AUTHORS.map(a => `
    <div class="author"><b>${a.name}</b><span class="author-point">${a.point}</span><p>${a.line}</p></div>`).join('');

  $('glossary').innerHTML = GLOSSARY.map(g => `
    <div class="gl"><b>${g.term}</b><span class="school-tag" data-school="${g.school}">${SCHOOLS[g.school].name}</span><p>${g.desc}</p></div>`).join('');

  $('caveats').innerHTML = CAVEATS.map(c => `<li>${c}</li>`).join('');
}

/* =========================================================
   まとめて描画
   ========================================================= */

function renderAll() {
  renderHeader();
  renderStage();
  renderWarnings();
  renderScale();
  renderJiai();
  renderNight();
  renderTodayCheck();
  renderProfile();
  renderRoad();
  renderList();
  renderAff();
  renderSats();
  render369();
  render55();
  renderT17();
  renderArigatou();
  renderCalm();
  renderBlocks();
  renderDeclutter();
  renderPre();
  renderActs();
  renderDiary();
  renderKouten();
  renderHeat();
}

/* =========================================================
   イベント
   ========================================================= */

function initEvents() {

  /* --- 感情スケール --- */
  $('scale').addEventListener('click', e => {
    const b = e.target.closest('.sc');
    if (!b) return;
    const n = Number(b.dataset.n);
    const d = Store.today();
    d.mood = d.mood === n ? 0 : n;
    save(); renderAll();
  });

  /* --- 自愛 --- */
  $('jiaiRow').addEventListener('click', e => {
    const b = e.target.closest('[data-jiai]');
    if (!b) return;
    Store.today().jiai[b.dataset.jiai]++;
    save(); renderAll();
  });

  $('noticeBtn').addEventListener('click', () => {
    const v = $('noticeInput').value.trim();
    if (!v) return;
    Store.today().notice.push(v);
    $('noticeInput').value = '';
    save(); renderJiai();
    toast('気づいただけでいい。直さなくていい。');
  });
  $('noticeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('noticeBtn').click(); });

  /* --- 夜のノート --- */
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.good !== undefined) { Store.today().good[t.dataset.good] = t.value; save(); renderHeat(); renderTodayCheck(); }
    if (t.dataset.thanks !== undefined) { Store.today().thanks[t.dataset.thanks] = t.value; save(); renderHeat(); renderTodayCheck(); }
    if (t.dataset.blockmemo !== undefined) {
      const k = t.dataset.blockmemo;
      S.blocks[k] = S.blocks[k] || {};
      S.blocks[k].memo = t.value;
      save();
    }
  });

  /* --- 決める：プロフィール --- */
  $('decideBtn').addEventListener('click', () => {
    S.profile.nickname = $('pfName').value.trim() || 'ゆゆ';
    S.profile.weddingDate = $('pfWedding').value;
    S.profile.blitzDays = Number($('pfBlitz').value);
    S.profile.metDate = $('pfMet').value;
    if (!S.profile.weddingDate) { toast('入籍する日を選んでください'); return; }
    S.profile.decidedAt = todayKey();
    save(); renderAll();
    toast('決まりました。ここから先は「そうなる予定の人」として過ごすだけ。');
  });

  $('road').addEventListener('click', e => {
    const b = e.target.closest('[data-road]');
    if (!b) return;
    const k = b.dataset.road;
    const rec = S.road[k] || {};
    S.road[k] = rec.done ? { done: false, at: '' } : { done: true, at: todayKey() };
    save(); renderRoad();
  });

  /* --- 決める：リスト --- */
  $('catTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    curCat = b.dataset.cat;
    renderList();
  });

  $('listAdd').addEventListener('click', () => {
    const v = $('listInput').value.trim();
    if (!v) return;
    const warn = Checks.listItem(v);
    S.list.push({ id: uid(), cat: curCat, text: v, at: todayKey() });
    $('listInput').value = '';
    save(); renderAll();
    if (warn) toast(warn);
    else if (Store.listCount() === 100) toast('100項目。ここまで書くと、潜在意識の本音が表に出やすいとされます。');
  });
  $('listInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('listAdd').click(); });

  $('wishList').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    S.list = S.list.filter(x => x.id !== b.dataset.del);
    save(); renderAll();
  });

  $('promptNext').addEventListener('click', () => { promptIdx++; renderList(); });

  /* --- 決める：アファメーション --- */
  $('affText').addEventListener('input', e => {
    S.affirmation.text = e.target.value;
    S.affirmation.fixedAt = '';
    save(); renderAff(); render369();
  });
  $('affDiscomfort').addEventListener('input', e => {
    S.affirmation.discomfort = Number(e.target.value);
    save(); renderAff(); renderStage(); renderHeader();
  });
  $('softenBox').addEventListener('click', e => {
    const b = e.target.closest('[data-soft]');
    if (!b) return;
    S.affirmation.text = b.dataset.soft;
    $('affText').value = b.dataset.soft;
    save(); renderAff();
    toast('ギャップを埋める段を挟むのは、後退ではなく手順です。');
  });
  $('affFix').addEventListener('click', () => {
    if (!S.affirmation.text.trim()) { toast('先に一文書いてください'); return; }
    S.affirmation.fixedAt = todayKey();
    save(); renderAll();
    toast('確定。あとは毎日これだけを唱えます。');
  });

  /* --- SATS --- */
  $('satsScene').addEventListener('input', e => { S.satsScene = e.target.value; save(); renderSats(); });
  $('satsStart').addEventListener('click', startSats);
  $('satsStop').addEventListener('click', () => { stopSats(); $('satsStage').innerHTML = ''; });
  $('satsDone').addEventListener('change', e => { Store.today().sats = e.target.checked; save(); renderAll(); });

  /* --- 369 --- */
  $('m369').addEventListener('click', e => {
    const b = e.target.closest('[data-m369]');
    if (!b) return;
    const k = b.dataset.m369;
    const need = M369.find(m => m.key === k).need;
    const d = Store.today();
    d.m369[k] = d.m369[k] >= need ? 0 : d.m369[k] + 1;
    save(); renderAll();
  });

  /* --- 55×5 --- */
  $('orderSet').addEventListener('click', () => {
    const v = $('orderInput').value.trim();
    if (!v) return;
    S.order = { text: v, startedAt: '', lastDay: '', streak: 0, checkAt: '' };
    save(); renderAll();
    toast('ワンオーダー制。一度に一つだけ注文します。');
  });

  /* --- 17秒 --- */
  $('t17Start').addEventListener('click', startT17);
  $('t17Mix').addEventListener('click', mixT17);

  /* --- ありがとう --- */
  const arig = n => { Store.today().arigatou += n; save(); renderArigatou(); renderTodayCheck(); renderHeat(); };
  $('arig1').addEventListener('click', () => arig(1));
  $('arig10').addEventListener('click', () => arig(10));
  $('arig50').addEventListener('click', () => arig(50));

  $('swapBtn').addEventListener('click', () => {
    const v = $('swapInput').value.trim();
    if (!v) return;
    S.swap.push({ id: uid(), at: todayKey(), from: v });
    $('swapInput').value = '';
    const r = SWAP_REPLIES[Math.floor(Math.random() * SWAP_REPLIES.length)];
    $('swapReply').textContent = r;
    save(); renderArigatou();
  });
  $('swapInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('swapBtn').click(); });

  /* --- 手放し --- */
  $('calmRange').addEventListener('input', e => { $('calmOut').textContent = e.target.value; });
  $('calmSave').addEventListener('click', () => {
    const v = Number($('calmRange').value);
    S.release = S.release.filter(r => r.at !== todayKey());
    S.release.push({ at: todayKey(), calm: v });
    save(); renderAll();
    toast(v >= 7 ? '穏やかでいられた。執着が外れているサインとされます。' : '低くても悪いことではありません。測っただけで十分。');
  });

  $('blocks').addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) {
      const k = o.dataset.open;
      openBlocks.has(k) ? openBlocks.delete(k) : openBlocks.add(k);
      renderBlocks();
      return;
    }
    const b = e.target.closest('[data-block]');
    if (!b) return;
    const k = b.dataset.block;
    const rec = S.blocks[k] || {};
    rec.noticed = !rec.noticed;
    rec.at = rec.noticed ? todayKey() : '';
    S.blocks[k] = rec;
    save(); renderBlocks();
  });

  $('dcBtn').addEventListener('click', () => {
    Store.today().declutter++;
    save(); renderAll();
  });

  $('soloSave').addEventListener('click', () => {
    const v = $('soloText').value.trim();
    if (!v) return;
    S.solo.push({ id: uid(), at: todayKey(), text: v });
    $('soloText').value = '';
    save();
    toast('書けました。相手を頭から追い出しても残ったものが、本当の願いです。');
  });

  /* --- 動く --- */
  $('preGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-pre]');
    if (!b) return;
    const k = b.dataset.pre;
    const rec = S.pre[k] || {};
    S.pre[k] = rec.done ? { done: false, at: '' } : { done: true, at: todayKey() };
    save(); renderAll();
  });

  $('actAdd').addEventListener('click', () => {
    const v = $('actInput').value.trim();
    if (!v) return;
    Store.today().acted.push(v);
    $('actInput').value = '';
    save(); renderAll();
    toast('イメージだけで止まらなかった。それが一番効くとされる差です。');
  });
  $('actInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('actAdd').click(); });

  /* --- 記録 --- */
  $('diaryText').addEventListener('input', renderDiary);
  $('diaryAdd').addEventListener('click', () => {
    const v = $('diaryText').value.trim();
    if (!v) return;
    S.diary.push({ id: uid(), at: todayKey(), text: v });
    $('diaryText').value = '';
    save(); renderAll();
  });
  $('diaryList').addEventListener('click', e => {
    const b = e.target.closest('[data-ddel]');
    if (!b) return;
    S.diary = S.diary.filter(x => x.id !== b.dataset.ddel);
    save(); renderDiary();
  });

  $('koutenSave').addEventListener('click', () => {
    Store.today().kouten = $('koutenText').value.trim();
    save(); renderAll();
  });

  /* --- 書き出し／読み込み／消去 --- */
  $('exportBtn').addEventListener('click', () => {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hikiyose-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        Store.importJSON(r.result);
        S = Store.state;
        renderAll();
        toast('読み込みました');
      } catch (err) {
        toast('読み込めませんでした');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('すべての記録を消します。よろしいですか？')) return;
    Store.clear();
    S = Store.state;
    renderAll();
    toast('消去しました');
  });
}

/* =========================================================
   起動
   ========================================================= */

function boot() {
  S = Store.load();
  promptIdx = Math.floor(Math.random() * LIST_PROMPTS.length);
  initTabs();
  initEvents();
  renderSchoolTab();
  renderAll();
  renderSolo();

  // 日付が変わったら今日の欄を作り直す
  let lastKey = todayKey();
  setInterval(() => {
    if (todayKey() !== lastKey) { lastKey = todayKey(); renderAll(); }
  }, 60000);
}

boot();
