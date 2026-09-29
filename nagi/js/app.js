/* =========================================================
   app.js — 画面の組み立てと操作
   ========================================================= */

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function stateOf(key) {
  return STATES.find(s => s.key === key) || { key, label: key, icon: '・' };
}

const S = () => Store.state;

/* =========================================================
   タブ
   ========================================================= */

function showPanel(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.panel === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('is-on', p.id === 'panel-' + name));
  if (name === 'wave') renderWave();
  if (name === 'box') renderBox();
  if (name === 'morning') renderMorning();
  if (name === 'log') renderLog();
  if (name === 'treasure') renderTreasure();
  if (name === 'guard') renderGuard();
  if (name === 'settings') renderSettings();
}

/* =========================================================
   波
   ========================================================= */

let pickedState = '';
let rideTimer = null;

function showStep(id) {
  for (const s of ['stepIdle', 'stepPick', 'stepRide', 'stepAfter', 'stepDone']) {
    $(s).hidden = s !== id;
  }
}

function renderWave() {
  renderMorningBanner();
  const a = S().active;
  if (a) {
    const left = a.at + WAVE_MINUTES * 60000 - Date.now();
    if (left > 0) return enterRide();
    return enterAfter();
  }
  if ($('stepDone').hidden && $('stepPick').hidden) showStep('stepIdle');
  const todays = S().waves.filter(w => dateKey(new Date(w.at)) === todayKey());
  const crossed = todays.filter(w => !w.rode).length;
  const colors = Object.keys(S().colors).length;
  $('idleCount').textContent = (todays.length
    ? `今日の波 ${todays.length}回・越えた ${crossed}回　`
    : '') + `${S().points}pt・${colors}/${COLORS.length}色`;
}

function renderMorningBanner() {
  const box = $('morningBanner');
  const now = new Date();
  const today = S().mornings[todayKey()];
  let html = '';
  if (today && now.getHours() < 14) {
    const smalls = (today.small || []).filter(Boolean);
    html += `<div class="banner"><b>今朝の予定</b><ul>
      ${today.first ? `<li>まず：${esc(today.first)}</li>` : ''}
      ${today.leaveAt || today.place ? `<li>${esc(today.leaveAt || '')} ${esc(today.place || '')}へ出る</li>` : ''}
      ${smalls.map(s => `<li>${esc(s)}</li>`).join('')}
    </ul></div>`;
  }
  // 翌日が休みになりがちな金・土の夕方以降、明日の朝が未定なら声をかける
  const tomorrowKey = dateKey(addDays(now, 1));
  const dow = now.getDay();
  if ((dow === 5 || dow === 6) && now.getHours() >= 17 && !S().mornings[tomorrowKey]) {
    html += `<div class="banner">明日の朝、まだ決めてへんよ。最初の2時間だけ決めとこ。
      <br><button class="btn small" data-go="morning">朝を決める</button></div>`;
  }
  box.innerHTML = html;
}

function buildStateGrid() {
  $('stateGrid').innerHTML = STATES.map(s => `
    <button class="state-btn" data-state="${s.key}">
      <b>${s.icon} ${esc(s.label)}</b><small>${esc(s.hint)}</small>
    </button>`).join('');
}

function enterPick() {
  pickedState = '';
  $('beforeRange').value = 3;
  $('beforeVal').textContent = '3';
  $('btnStart').disabled = true;
  document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('is-on'));
  showStep('stepPick');
}

function nextEscape(stateKey, current) {
  const list = (S().escapes[stateKey] || []).filter(Boolean);
  if (!list.length) return '深呼吸を10回。スマホを伏せる。';
  const others = list.filter(e => e !== current);
  return others.length ? pick(others) : list[0];
}

function startRide() {
  S().active = {
    at: Date.now(),
    state: pickedState,
    before: Number($('beforeRange').value),
    escape: nextEscape(pickedState, '')
  };
  Store.save();
  enterRide();
}

function enterRide() {
  const a = S().active;
  const st = stateOf(a.state);
  $('rideState').textContent = `${st.icon} ${st.label}・強さ ${a.before}`;
  $('escapeText').textContent = a.escape;
  $('rideBox').hidden = a.state !== 'kakitai';
  $('rideBoxDone').textContent = '';
  showStep('stepRide');
  tickRide();
  clearInterval(rideTimer);
  rideTimer = setInterval(tickRide, 1000);
}

function tickRide() {
  const a = S().active;
  if (!a) return clearInterval(rideTimer);
  const total = WAVE_MINUTES * 60000;
  const left = Math.max(0, a.at + total - Date.now());
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  $('seaTime').textContent = `${m}:${String(s).padStart(2, '0')}`;
  $('seaWater').style.height = (left / total * 100) + '%';
  if (left <= 0) {
    clearInterval(rideTimer);
    enterAfter();
  }
}

function enterAfter() {
  clearInterval(rideTimer);
  const before = S().active ? S().active.before : 3;
  const v = Math.max(1, before - 1);
  $('afterRange').value = v;
  $('afterVal').textContent = v;
  $('afterMemo').value = '';
  showStep('stepAfter');
}

function finishWave(rode) {
  const a = S().active;
  if (!a) return showStep('stepIdle');
  // しのいだら、その場でご褒美。流れても押せた分だけは返す
  let pts = PRESS_POINTS;
  let drawn = null;
  if (!rode) {
    drawn = Store.drawColor();
    pts = crossPoints(a.before) + (drawn.isNew ? 0 : DUP_BONUS);
  }
  Store.addPoints(pts);
  S().waves.push({
    id: uid(),
    at: a.at,
    state: a.state,
    before: a.before,
    after: Number($('afterRange').value),
    rode,
    escape: a.escape,
    memo: $('afterMemo').value.trim(),
    color: drawn ? drawn.color.key : '',
    points: pts
  });
  S().active = null;
  Store.save();
  $('doneReward').innerHTML = drawn ? revealHtml(drawn, pts) : `
    <div class="press-reward reveal"><span class="pill pt">押せた分 +${pts}pt</span></div>`;
  $('doneWords').textContent = pick(rode ? AFTER_WORDS_NG : AFTER_WORDS_OK);
  showStep('stepDone');
}

function revealHtml({ color: c, isNew }, pts) {
  const owned = Object.keys(S().colors).length;
  return `<div class="reveal" style="--glow:${c.hex}88">
    <div class="reveal-swatch" style="background:${c.hex}"></div>
    <p class="reveal-name">${esc(c.name)}</p>
    <p class="reveal-yomi">${esc(c.yomi)}　${c.hex}</p>
    <p class="reveal-words">${esc(c.words)}</p>
    <div class="reveal-tags">
      ${isNew ? '<span class="pill new">はじめての色</span>' : `<span class="pill">重ね塗り +${DUP_BONUS}</span>`}
      ${RARITY_LABEL[c.rarity] ? `<span class="pill ${c.rarity === 3 ? 'rare' : ''}">${RARITY_LABEL[c.rarity]}</span>` : ''}
      <span class="pill pt">+${pts}pt</span>
      <span class="pill">${owned} / ${COLORS.length}色</span>
    </div>
  </div>`;
}

/* =========================================================
   褒美
   ========================================================= */

let pickedColor = '';

function renderTreasure() {
  $('ptNow').textContent = S().points;
  $('ptEarned').textContent = `これまでに貯めた合計 ${S().earned}pt`;

  $('rewardList').innerHTML = S().rewards.map(r => {
    const ok = S().points >= r.cost;
    const pct = Math.min(100, S().points / r.cost * 100);
    return `<div class="item">
      <div class="item-head"><span>${esc(r.name)}</span><span class="quiet">${r.cost}pt</span></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="box-actions">
        <button class="btn small ${ok ? 'primary' : ''}" data-rw-get="${r.id}" ${ok ? '' : 'disabled'}>${ok ? '受け取る' : `あと${r.cost - S().points}pt`}</button>
        <button class="btn small ghost" data-rw-del="${r.id}">消す</button>
      </div></div>`;
  }).join('');

  const owned = S().colors;
  $('colorCount').textContent = `${Object.keys(owned).length} / ${COLORS.length}`;
  const sorted = [...COLORS].sort((a, b) => b.rarity - a.rarity);
  $('colorGrid').innerHTML = sorted.map(c => owned[c.key]
    ? `<button class="swatch rare${c.rarity}" style="background:${c.hex}" data-color="${c.key}" aria-label="${esc(c.name)}"></button>`
    : `<span class="swatch locked ${c.rarity === 3 ? 'rare3' : ''}"></span>`).join('');
  const c = COLORS.find(c => c.key === pickedColor && owned[c.key]);
  $('colorDetail').innerHTML = c ? `<div class="color-detail"><i style="background:${c.hex}"></i>
    <div><b>${esc(c.name)}</b> <span class="quiet">${esc(c.yomi)}・${owned[c.key]}回</span><br>${esc(c.words)}</div></div>` : '';

  const red = [...S().redeemed].reverse().slice(0, 20);
  $('redeemedCard').hidden = !red.length;
  $('redeemedList').innerHTML = red.map(r => {
    const d = new Date(r.at);
    return `<div class="log-row"><span>${esc(r.name)}</span><span class="quiet">${jpDate(d)}</span></div>`;
  }).join('');
}

function sealBox(text) {
  const t = text.trim();
  if (!t) return false;
  S().box.unshift({ id: uid(), at: Date.now(), text: t, done: false });
  Store.save();
  return true;
}

/* =========================================================
   出し切り箱
   ========================================================= */

const openedBox = new Set();

function renderBox() {
  const list = S().box;
  if (!list.length) {
    $('boxList').innerHTML = '<p class="quiet center">まだ何も封じてへん。</p>';
    return;
  }
  $('boxList').innerHTML = list.map(b => {
    const d = new Date(b.at);
    const open = openedBox.has(b.id);
    return `<div class="card box-item ${b.done ? 'is-done' : ''}">
      <div class="box-meta">
        <span>${jpDate(d)} ${jpTime(d)}${b.done ? '・形にした' : ''}</span>
        <button class="box-seal" data-box-open="${b.id}">${open ? '閉じる' : '封を開ける'}</button>
      </div>
      ${open ? `<div class="box-body">${esc(b.text)}</div>
        <div class="box-actions">
          ${b.done ? '' : `<button class="btn small" data-box-done="${b.id}">形にした</button>`}
          <button class="btn small ghost" data-box-del="${b.id}">手放す</button>
        </div>` : ''}
    </div>`;
  }).join('');
}

/* =========================================================
   朝アンカー
   ========================================================= */

let morningKey = '';

function renderMorning() {
  const now = new Date();
  const tKey = todayKey();
  const tmKey = dateKey(addDays(now, 1));
  if (!morningKey) morningKey = now.getHours() >= 14 ? tmKey : tKey;
  $('morningDay').innerHTML = [
    [tKey, `今日 ${jpDate(now)}`],
    [tmKey, `明日 ${jpDate(addDays(now, 1))}`]
  ].map(([k, l]) => `<button data-mday="${k}" class="${k === morningKey ? 'is-on' : ''}">${l}</button>`).join('');
  const m = S().mornings[morningKey] || {};
  $('mFirst').value = m.first || '';
  $('mLeave').value = m.leaveAt || '';
  $('mPlace').value = m.place || '';
  document.querySelectorAll('.mSmall').forEach((el, i) => { el.value = (m.small || [])[i] || ''; });
  $('morningSaved').textContent = '';
}

function saveMorning() {
  S().mornings[morningKey] = {
    first: $('mFirst').value.trim(),
    leaveAt: $('mLeave').value,
    place: $('mPlace').value.trim(),
    small: [...document.querySelectorAll('.mSmall')].map(el => el.value.trim())
  };
  // 古い朝は2週間で掃除
  const limit = dateKey(addDays(new Date(), -14));
  for (const k of Object.keys(S().mornings)) if (k < limit) delete S().mornings[k];
  Store.save();
  $('morningSaved').textContent = '決めた。朝になったら「波」の画面に出しとく。';
}

/* =========================================================
   記録
   ========================================================= */

let logDays = 7;

const SLOTS = [
  { key: 'morning', label: '朝 5–11時',  test: h => h >= 5 && h < 11 },
  { key: 'day',     label: '昼 11–17時', test: h => h >= 11 && h < 17 },
  { key: 'evening', label: '夕 17–22時', test: h => h >= 17 && h < 22 },
  { key: 'night',   label: '夜 22–5時',  test: h => h >= 22 || h < 5 }
];
const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function bars(rows) {
  const max = Math.max(1, ...rows.map(r => r.ok + r.ng));
  return rows.map(r => `<div class="bar">
      <span>${esc(r.label)}</span>
      <span class="bar-track">
        <i class="bar-ok" style="width:${r.ok / max * 100}%"></i>
        <i class="bar-ng" style="width:${r.ng / max * 100}%"></i>
      </span>
      <span class="bar-n">${r.ok + r.ng}</span>
    </div>`).join('') +
    '<div class="legend"><i style="background:var(--ok)"></i>越えた<i style="background:var(--lav-deep)"></i>流れた</div>';
}

function tally(waves, keyFn, keys) {
  const map = new Map(keys.map(k => [k.key, { label: k.label, ok: 0, ng: 0 }]));
  for (const w of waves) {
    const r = map.get(keyFn(w));
    if (r) w.rode ? r.ng++ : r.ok++;
  }
  return [...map.values()];
}

function renderLog() {
  document.querySelectorAll('#logRange button').forEach(b => b.classList.toggle('is-on', Number(b.dataset.days) === logDays));
  const ws = Store.recentWaves(logDays);
  const ok = ws.filter(w => !w.rode).length;
  const drop = ws.length ? ws.reduce((a, w) => a + (w.before - w.after), 0) / ws.length : 0;
  $('logStats').innerHTML = `
    <div class="stat"><b>${ws.length}</b><span>波</span></div>
    <div class="stat"><b>${ok}</b><span>越えた</span></div>
    <div class="stat"><b>${ws.length ? drop.toFixed(1) : '–'}</b><span>平均の下がり幅</span></div>`;

  const byState = tally(ws, w => w.state, STATES.map(s => ({ key: s.key, label: s.label })));
  const bySlot = tally(ws, w => SLOTS.find(s => s.test(new Date(w.at).getHours())).key, SLOTS);
  const byDay = tally(ws, w => String(new Date(w.at).getDay()), DOW.map((d, i) => ({ key: String(i), label: d + '曜' })));
  $('logByState').innerHTML = bars(byState.filter(r => r.ok + r.ng));
  $('logBySlot').innerHTML = bars(bySlot);
  $('logByDay').innerHTML = bars(byDay);

  // 効いた行動：越えたときに出ていた代わりの行動
  const eff = new Map();
  for (const w of ws) {
    if (!w.escape) continue;
    const r = eff.get(w.escape) || { ok: 0, n: 0 };
    r.n++; if (!w.rode) r.ok++;
    eff.set(w.escape, r);
  }
  const effRows = [...eff.entries()].sort((a, b) => b[1].ok - a[1].ok || b[1].n - a[1].n).slice(0, 6);
  $('logEscapes').innerHTML = effRows.length
    ? effRows.map(([t, r]) => `<div class="log-row"><span>${esc(t)}</span><span class="tag-ok">${r.ok}/${r.n}</span></div>`).join('')
    : '<p class="quiet">まだ記録がない。</p>';

  $('logInsights').innerHTML = insights(ws, byState, bySlot, byDay).map(t => `<li>${esc(t)}</li>`).join('');

  const recent = [...ws].sort((a, b) => b.at - a.at).slice(0, 30);
  $('logList').innerHTML = recent.length ? recent.map(w => {
    const d = new Date(w.at);
    const st = stateOf(w.state);
    return `<div class="log-row">
      <span>${jpDate(d)} ${jpTime(d)}　${st.icon}${esc(st.label)} ${w.before}→${w.after}
        ${w.memo ? `<br><small class="quiet">${esc(w.memo)}</small>` : ''}</span>
      <span><span class="${w.rode ? 'tag-ng' : 'tag-ok'}">${w.rode ? '流れた' : '越えた'}</span>
        <button class="x" data-wave-del="${w.id}" aria-label="削除">×</button></span>
    </div>`;
  }).join('') : '<p class="quiet">まだ記録がない。波が来たら「今、来てる」を押すだけでええ。</p>';
}

function busiest(rows) {
  return [...rows].sort((a, b) => (b.ok + b.ng) - (a.ok + a.ng))[0];
}

function insights(ws, byState, bySlot, byDay) {
  if (ws.length < 3) return ['記録が3回たまると、傾向が見えてくる。'];
  const out = [];
  const s = busiest(byState), sl = busiest(bySlot), d = busiest(byDay);
  out.push(`いちばん多いきっかけは「${s.label}」（${s.ok + s.ng}回）。`);
  out.push(`波が来やすいのは ${sl.label}、曜日だと ${d.label}。そこに先回りの予定を置くと効く。`);
  const holidayMorning = ws.filter(w => {
    const t = new Date(w.at);
    return (t.getDay() === 0 || t.getDay() === 6) && t.getHours() < 12;
  }).length;
  if (holidayMorning >= 2) out.push(`土日の午前に ${holidayMorning}回。朝アンカーを前の晩に決めとくのがよさそう。`);
  const hard = byState.filter(r => r.ok + r.ng >= 2).sort((a, b) => b.ng / (b.ok + b.ng) - a.ng / (a.ok + a.ng))[0];
  if (hard && hard.ng > 0) out.push(`「${hard.label}」のときは流れやすい。代わりの行動を体を動かすものに寄せてみて。`);
  const okRate = ws.filter(w => !w.rode).length / ws.length;
  out.push(okRate >= 0.5
    ? `半分以上、越えられてる。波は押せば引くもんやと、体が覚えはじめてる。`
    : `越えた数より、押せた回数を数えて。押せた時点で、もう自動操縦やない。`);
  return out;
}

/* =========================================================
   守る
   ========================================================= */

const HOLD_MS = 24 * 3600000;

function renderGuard() {
  const total = S().guarded.reduce((a, g) => a + (g.amount || 0), 0);
  $('guardTotal').textContent = yen(total);

  const now = Date.now();
  const holds = S().hold.filter(h => !h.decided);
  $('holdList').innerHTML = holds.map(h => {
    const left = h.at + HOLD_MS - now;
    const hrs = Math.ceil(left / 3600000);
    return `<div class="item"><div class="item-head">
        <span>${esc(h.what)} ${h.amount ? yen(h.amount) : ''}</span>
        <span class="quiet">${left > 0 ? `あと${hrs}時間` : '24時間たった'}</span>
      </div>
      <div class="box-actions">
        <button class="btn small primary" data-hold-skip="${h.id}">やめた</button>
        <button class="btn small ghost" data-hold-buy="${h.id}" ${left > 0 ? 'disabled' : ''}>買う</button>
      </div></div>`;
  }).join('');

  $('goalList').innerHTML = S().goals.map(g => {
    const pct = g.amount ? Math.min(100, g.saved / g.amount * 100) : 0;
    return `<div class="item">
      <div class="item-head"><span>${esc(g.name)}</span><span>${yen(g.saved)} / ${yen(g.amount)}</span></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="box-actions">
        <button class="btn small" data-goal-add="${g.id}">取り分けた</button>
        <button class="btn small ghost" data-goal-del="${g.id}">消す</button>
      </div></div>`;
  }).join('');

  $('lockList').innerHTML = LOCKS.map(l => `
    <label class="lock"><input type="checkbox" data-lock="${l.key}" ${S().locks[l.key] ? 'checked' : ''}>
      <span>${esc(l.text)}</span></label>`).join('');
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/* =========================================================
   設定
   ========================================================= */

function renderSettings() {
  $('escapeEditor').innerHTML = STATES.map(s => `
    <label class="field escape-edit"><span>${s.icon} ${esc(s.label)}</span>
      <textarea rows="3" data-escape="${s.key}">${esc((S().escapes[s.key] || []).join('\n'))}</textarea>
    </label>`).join('');
  $('escapeSaved').textContent = '';
}

/* =========================================================
   イベント
   ========================================================= */

function bind() {
  $('tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) showPanel(t.dataset.panel);
  });
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) showPanel(go.dataset.go);
  });

  // 波
  $('btnCome').onclick = enterPick;
  $('stateGrid').addEventListener('click', e => {
    const b = e.target.closest('.state-btn');
    if (!b) return;
    pickedState = b.dataset.state;
    document.querySelectorAll('.state-btn').forEach(x => x.classList.toggle('is-on', x === b));
    $('btnStart').disabled = false;
  });
  $('beforeRange').oninput = e => { $('beforeVal').textContent = e.target.value; };
  $('afterRange').oninput = e => { $('afterVal').textContent = e.target.value; };
  $('btnPickCancel').onclick = () => showStep('stepIdle');
  $('btnStart').onclick = startRide;
  $('btnOtherEscape').onclick = () => {
    const a = S().active;
    a.escape = nextEscape(a.state, a.escape);
    Store.save();
    $('escapeText').textContent = a.escape;
  };
  $('btnRideBoxSeal').onclick = () => {
    if (sealBox($('rideBoxText').value)) {
      $('rideBoxText').value = '';
      $('rideBoxDone').textContent = '封じた。続きは箱の中で待ってる。';
    }
  };
  $('btnEndEarly').onclick = enterAfter;
  $('btnCrossed').onclick = () => finishWave(false);
  $('btnRode').onclick = () => finishWave(true);
  $('btnDoneBack').onclick = () => { showStep('stepIdle'); renderWave(); };

  // 箱
  $('btnBoxSeal').onclick = () => {
    if (sealBox($('boxText').value)) { $('boxText').value = ''; renderBox(); }
  };
  $('boxList').addEventListener('click', e => {
    const o = e.target.closest('[data-box-open]');
    const d = e.target.closest('[data-box-done]');
    const x = e.target.closest('[data-box-del]');
    if (o) { const id = o.dataset.boxOpen; openedBox.has(id) ? openedBox.delete(id) : openedBox.add(id); }
    if (d) { const b = S().box.find(b => b.id === d.dataset.boxDone); if (b) b.done = true; Store.save(); }
    if (x && confirm('手放す？（消えます）')) { S().box = S().box.filter(b => b.id !== x.dataset.boxDel); Store.save(); }
    renderBox();
  });

  // 朝
  $('morningDay').addEventListener('click', e => {
    const b = e.target.closest('[data-mday]');
    if (b) { morningKey = b.dataset.mday; renderMorning(); }
  });
  $('btnMorningSave').onclick = saveMorning;

  // 記録
  $('logRange').addEventListener('click', e => {
    const b = e.target.closest('[data-days]');
    if (b) { logDays = Number(b.dataset.days); renderLog(); }
  });
  $('logList').addEventListener('click', e => {
    const x = e.target.closest('[data-wave-del]');
    if (x && confirm('この記録を消す？')) {
      S().waves = S().waves.filter(w => w.id !== x.dataset.waveDel);
      Store.save(); renderLog();
    }
  });

  // 褒美
  $('rewardList').addEventListener('click', e => {
    const g = e.target.closest('[data-rw-get]');
    const x = e.target.closest('[data-rw-del]');
    if (g) {
      const r = S().rewards.find(r => r.id === g.dataset.rwGet);
      if (r && S().points >= r.cost && confirm(`「${r.name}」を受け取る？（${r.cost}pt）`)) {
        S().points -= r.cost;
        S().redeemed.push({ id: uid(), at: Date.now(), name: r.name, cost: r.cost });
        alert('受け取って。ちゃんと味わうんよ。');
      }
    }
    if (x && confirm('このご褒美を消す？')) S().rewards = S().rewards.filter(r => r.id !== x.dataset.rwDel);
    Store.save(); renderTreasure();
  });
  $('btnRewardAdd').onclick = () => {
    const name = $('rwName').value.trim();
    const cost = num($('rwCost').value);
    if (!name || !cost) return;
    S().rewards.push({ id: uid(), name, cost });
    $('rwName').value = ''; $('rwCost').value = '';
    Store.save(); renderTreasure();
  };
  $('colorGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-color]');
    if (b) { pickedColor = b.dataset.color; renderTreasure(); }
  });

  // 守る
  $('btnGuardAdd').onclick = () => {
    const amount = num($('gAmount').value);
    if (!amount) return;
    S().guarded.push({ id: uid(), at: Date.now(), amount, what: $('gWhat').value.trim() });
    $('gAmount').value = ''; $('gWhat').value = '';
    Store.save(); renderGuard();
  };
  $('btnHoldAdd').onclick = () => {
    const what = $('hWhat').value.trim();
    if (!what) return;
    S().hold.push({ id: uid(), at: Date.now(), what, amount: num($('hAmount').value), decided: '' });
    $('hWhat').value = ''; $('hAmount').value = '';
    Store.save(); renderGuard();
  };
  $('holdList').addEventListener('click', e => {
    const sk = e.target.closest('[data-hold-skip]');
    const bu = e.target.closest('[data-hold-buy]');
    const h = S().hold.find(h => h.id === (sk ? sk.dataset.holdSkip : bu ? bu.dataset.holdBuy : ''));
    if (!h) return;
    if (sk) {
      h.decided = 'skip';
      if (h.amount) S().guarded.push({ id: uid(), at: Date.now(), amount: h.amount, what: h.what });
    } else if (Date.now() >= h.at + HOLD_MS) {
      h.decided = 'buy';
    }
    Store.save(); renderGuard();
  });
  $('btnGoalAdd').onclick = () => {
    const name = $('goalName').value.trim();
    const amount = num($('goalAmount').value);
    if (!name || !amount) return;
    S().goals.push({ id: uid(), name, amount, saved: 0 });
    $('goalName').value = ''; $('goalAmount').value = '';
    Store.save(); renderGuard();
  };
  $('goalList').addEventListener('click', e => {
    const a = e.target.closest('[data-goal-add]');
    const x = e.target.closest('[data-goal-del]');
    if (a) {
      const g = S().goals.find(g => g.id === a.dataset.goalAdd);
      if (g) {
        const v = num(prompt(`「${g.name}」に取り分けた金額`, ''));
        if (v) g.saved += v;
      }
    }
    if (x && confirm('この目標を消す？')) S().goals = S().goals.filter(g => g.id !== x.dataset.goalDel);
    Store.save(); renderGuard();
  });
  $('lockList').addEventListener('change', e => {
    const c = e.target.closest('[data-lock]');
    if (c) { S().locks[c.dataset.lock] = c.checked; Store.save(); }
  });

  // 設定
  $('btnEscapeSave').onclick = () => {
    document.querySelectorAll('[data-escape]').forEach(t => {
      S().escapes[t.dataset.escape] = t.value.split('\n').map(s => s.trim()).filter(Boolean);
    });
    Store.save();
    $('escapeSaved').textContent = '保存した。';
  };
  $('btnExport').onclick = () => {
    const blob = new Blob([Store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nagi-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('fileImport').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      Store.importJson(await f.text());
      alert('読み込んだ。');
      showPanel('wave');
    } catch (err) {
      alert('読み込めへんかった：' + err.message);
    }
    e.target.value = '';
  };
  $('btnReset').onclick = () => {
    if (!confirm('記録をすべて消す？')) return;
    if (!confirm('ほんまに？ 元に戻されへんよ。')) return;
    localStorage.removeItem(NAGI_KEY);
    Store.load();
    showPanel('wave');
  };

  // 別アプリから戻ってきたとき、タイマーと保留時間を追いつかせる
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const on = document.querySelector('.panel.is-on');
    if (on && on.id === 'panel-wave') renderWave();
    if (on && on.id === 'panel-guard') renderGuard();
  });
}

/* =========================================================
   起動
   ========================================================= */

function storageWorks() {
  try {
    localStorage.setItem('nagi-probe', '1');
    localStorage.removeItem('nagi-probe');
    return true;
  } catch (e) {
    return false;
  }
}

function boot() {
  Store.load();
  $('today').textContent = jpDate(new Date());
  buildStateGrid();
  bind();
  renderWave();
  if (!storageWorks()) {
    $('morningBanner').insertAdjacentHTML('beforebegin',
      '<div class="banner">この開き方やと記録が保存されへんみたい。Chromeなど普通のブラウザで開き直してみて。</div>');
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
