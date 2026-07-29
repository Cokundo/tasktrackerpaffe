/* =========================================================
   app.js — 画面の組み立てとイベント
   ========================================================= */

const App = {
  today: todayKey(),
  levels: {},

  init() {
    Store.load();
    Assets.load();
    Parfait.init(document.getElementById('parfaitCanvas'));
    Radar.init(document.getElementById('radarCanvas'));
    Matcha.init(document.getElementById('matchaCanvas'));

    document.getElementById('todayLabel').textContent = this.formatDate(this.today);
    document.getElementById('baseXpLabel').textContent = BASE_XP;

    this.buildCheckList();
    this.buildSpecialGrid();
    this.buildStatusGrid();
    this.bindEvents();
    this.render(true);

    // 日付をまたいだら今日の欄を切り替える
    setInterval(() => {
      const k = todayKey();
      if (k !== this.today) {
        this.today = k;
        document.getElementById('todayLabel').textContent = this.formatDate(k);
        this.render();
      }
    }, 60 * 1000);
  },

  formatDate(key) {
    const d = parseKey(key);
    const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日(${w})`;
  },

  /* ---------- 組み立て ---------- */

  buildCheckList() {
    const ul = document.getElementById('checkList');
    ul.innerHTML = '';
    STATS.forEach(s => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'check-item';
      btn.dataset.key = s.key;
      btn.style.setProperty('--tone', s.color);
      btn.style.setProperty('--tint', s.color2 + '55');
      btn.innerHTML = `
        <span class="mark" style="background:${s.color}"></span>
        <span class="txt">
          <span class="nm">${s.name}</span>
          <span class="tr">${s.trait}／${s.example}</span>
        </span>
        <span class="lvtag" data-lv="${s.key}">Lv.0</span>`;
      btn.addEventListener('click', () => this.onToggle(s.key));
      li.appendChild(btn);
      ul.appendChild(li);
    });
  },

  buildSpecialGrid() {
    const grid = document.getElementById('specialGrid');
    grid.innerHTML = '';
    MILESTONES.forEach(m => {
      const tile = document.createElement('button');
      tile.className = 'sp-tile';
      tile.dataset.key = m.key;
      tile.style.setProperty('--tone', m.color);
      tile.style.setProperty('--tint', m.color + '1f');
      tile.innerHTML = `
        <span class="sp-emoji">${m.emoji}</span>
        <span class="sp-body">
          <span class="sp-name">${m.name}</span>
          <span class="sp-detail">${m.detail}</span>
          <span class="sp-topping">🍨 ${m.topping}<br><span style="opacity:.7">${m.note}／${STATS.find(s => s.key === m.stat).name}に +${m.xp} XP</span></span>
          <span class="sp-state" data-state="${m.key}">未達成</span>
        </span>
        <button class="sp-clear" data-clear="${m.key}" title="記録を取り消す" hidden>×</button>`;
      tile.addEventListener('click', e => {
        if (e.target.dataset.clear) return;
        this.onSpecial(m);
      });
      tile.querySelector('.sp-clear').addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`「${m.name}」の記録を取り消しますか？`)) return;
        Store.clearMilestone(m.key);
        this.render();
        this.toast(`${m.name} の記録を取り消しました`);
      });
      grid.appendChild(tile);
    });
  },

  /** スペシャル実績の達成／更新 */
  onSpecial(m) {
    const prev = Store.getMilestone(m.key);

    if (m.repeatable) {
      const input = prompt(
        prev ? `新しいスコアは？（現在のベスト ${prev.score || '—'}）` : '達成したスコアを入力（例：730）',
        prev && prev.score ? String(prev.score) : ''
      );
      if (input === null) return;
      const score = parseInt(input, 10);
      if (isNaN(score) || score < 0) { this.toast('数字で入力してください'); return; }
      const rec = Store.achieve(m.key, { score: Math.max(score, prev ? prev.score || 0 : 0) });
      this.render();
      this.toast(`🌏 ${m.name}！ ${rec.score}点・${rec.count}回目 — 地球儀マカロンに星が増えた`);
      return;
    }

    if (prev) { this.toast(`${m.name} は達成済み（${prev.date}）`); return; }
    Store.achieve(m.key);
    this.render();
    this.toast(`🏆 ${m.name} 達成！ ${m.topping}がパフェに載った`);
  },

  buildStatusGrid() {
    const grid = document.getElementById('statusGrid');
    grid.innerHTML = '';
    STATS.forEach(s => {
      const div = document.createElement('div');
      div.className = 'stat-tile';
      div.style.setProperty('--tone', s.color);
      div.style.setProperty('--tone2', s.color2);
      div.innerHTML = `
        <div class="top">
          <span class="kanji">${s.kanji}</span>
          <span class="nm">${s.name}</span>
          <span class="lv" data-lv="${s.key}">Lv.0</span>
        </div>
        <div class="rank" data-rank="${s.key}"></div>
        <div class="part">🍨 ${s.parfait}<br><span style="opacity:.7">${s.desc}</span></div>
        <div class="bar"><i data-bar="${s.key}" style="width:0%"></i></div>
        <div class="xp-text" data-xp="${s.key}"></div>`;
      grid.appendChild(div);
    });
  },

  bindEvents() {
    const note = document.getElementById('noteInput');
    let timer = null;
    note.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => Store.setNote(this.today, note.value), 350);
    });

    document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
    document.getElementById('importBtn').addEventListener('click', () =>
      document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', e => this.importData(e));
    document.getElementById('resetBtn').addEventListener('click', () => this.resetAll());
    document.getElementById('saveImgBtn').addEventListener('click', () => this.saveImage());
  },

  /* ---------- 操作 ---------- */

  onToggle(statKey) {
    const before = this.levels[statKey] || 0;
    const matchaBefore = this.matcha ? this.matcha.level : MATCHA_MAX;
    const perfectBefore = this.matcha ? this.matcha.todayPerfect : false;
    const on = Store.toggle(this.today, statKey);
    this.render();
    const after = this.levels[statKey] || 0;

    const stat = STATS.find(s => s.key === statKey);
    if (this.matcha.level > matchaBefore) {
      this.toast(`🍵 皆勤2日達成！ 抹茶ラテが1メモリ回復（${this.matcha.level}/${MATCHA_MAX}）`);
      return;
    }
    if (this.matcha.todayPerfect && !perfectBefore) {
      this.toast('🍵 今日は皆勤！ あと1日皆勤で抹茶ラテが1メモリ回復');
      return;
    }
    if (after > before) {
      this.toast(`🎉 ${stat.name} が Lv.${after} に！ ${stat.parfait}が育った`);
    } else if (on) {
      const streak = currentStreak(Store.state.log);
      const gain = BASE_XP + streakBonus(streak);
      this.toast(`${stat.name} 達成 ＋${gain} XP`);
    } else {
      this.toast(`${stat.name} の記録を取り消しました`);
    }
  },

  resetAll() {
    if (!confirm('すべての記録を消去します。よろしいですか？')) return;
    Store.clearAll();
    document.getElementById('noteInput').value = '';
    this.render();
    this.toast('記録を消去しました');
  },

  exportData() {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `parfait-${this.today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast('データを書き出しました');
  },

  importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(String(reader.result));
        this.render();
        this.toast('データを読み込みました');
      } catch (err) {
        this.toast('読み込めませんでした：' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  },

  /** パフェを名前入りの画像として保存 */
  saveImage() {
    const src = document.getElementById('parfaitCanvas');
    const pad = 24;
    const out = document.createElement('canvas');
    const W = src.width + pad * 2;
    const H = src.height + pad * 2 + 96;
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fff7ee');
    g.addColorStop(1, '#f7e6d6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.drawImage(src, pad, pad + 56);

    const scale = src.width / 340;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b8642c';
    ctx.font = `bold ${20 * scale}px "Hiragino Sans", "Yu Gothic", sans-serif`;
    ctx.fillText(document.getElementById('parfaitName').textContent, W / 2, 34 * scale + 8);

    ctx.fillStyle = '#8a7365';
    ctx.font = `${11 * scale}px "Hiragino Sans", "Yu Gothic", sans-serif`;
    const total = STATS.reduce((a, s) => a + (this.levels[s.key] || 0), 0);
    ctx.fillText(`${this.today}　総レベル ${total}　連続 ${currentStreak(Store.state.log)}日`, W / 2, H - 44);
    ctx.fillText(
      STATS.map(s => `${s.name}${this.levels[s.key] || 0}`).join('・'),
      W / 2, H - 22
    );

    let url;
    try {
      url = out.toDataURL('image/png');
    } catch (e) {
      // file:// で開くと素材画像のせいで書き出しが止められる
      this.toast('画像保存はローカルサーバー経由でお使いください（python3 -m http.server）');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `parfait-${this.today}.png`;
    a.click();
    this.toast('画像を保存しました');
  },

  /* ---------- 描画 ---------- */

  render() {
    const log = Store.state.log;
    const milestones = Store.state.milestones;
    const xp = computeXp(log, milestones);
    const levels = computeLevels(xp);
    this.levels = levels;

    Radar.setLevels(levels);
    Parfait.setLevels(levels);
    Parfait.setMilestones(milestones);

    const total = STATS.reduce((a, s) => a + levels[s.key], 0);
    const streak = currentStreak(log);
    document.getElementById('totalLevel').textContent = total;
    document.getElementById('streakNum').textContent = streak;
    document.getElementById('harmonyNum').textContent = harmonyOf(levels);

    // パフェ名と構成
    document.getElementById('parfaitName').textContent = parfaitName(levels, milestones);
    const done = Store.dayList(this.today);
    const crowns = Object.keys(milestones).length;
    document.getElementById('parfaitSub').textContent =
      total === 0 && crowns === 0
        ? '今日の達成をチェックすると、ここに姿が現れます。'
        : `${STATS.filter(s => levels[s.key] > 0).length}種のパーツで構成／今日は ${done.length}/7 項目`
          + (crowns ? `／スペシャル ${crowns}種` : '');

    // スペシャル実績
    document.getElementById('specialCount').textContent = `${crowns} / ${MILESTONES.length}`;
    MILESTONES.forEach(m => {
      const rec = milestones[m.key];
      const tile = document.querySelector(`.sp-tile[data-key="${m.key}"]`);
      tile.classList.toggle('on', !!rec);
      tile.querySelector('.sp-clear').hidden = !rec;
      const state = tile.querySelector(`[data-state="${m.key}"]`);
      if (!rec) state.textContent = '未達成';
      else if (m.repeatable) state.textContent = `ベスト ${rec.score || '—'}点・${rec.count}回更新（${rec.date}）`;
      else state.textContent = `達成 ${rec.date}`;
    });

    const parts = document.getElementById('partsList');
    parts.innerHTML = '';
    STATS.forEach(s => {
      const li = document.createElement('li');
      const on = levels[s.key] > 0;
      li.className = on ? '' : 'off';
      li.style.borderColor = s.color;
      li.style.color = s.color;
      li.textContent = `${s.kanji} ${s.parfait}`;
      parts.appendChild(li);
    });
    MILESTONES.forEach(m => {
      if (!milestones[m.key]) return;
      const li = document.createElement('li');
      li.style.borderColor = m.color;
      li.style.color = '#fff';
      li.style.background = m.color;
      li.textContent = `${m.emoji} ${m.topping}`;
      parts.appendChild(li);
    });

    // チェックリスト
    STATS.forEach(s => {
      const btn = document.querySelector(`.check-item[data-key="${s.key}"]`);
      const isDone = Store.isDone(this.today, s.key);
      btn.classList.toggle('done', isDone);
      btn.querySelector('.mark').textContent = isDone ? '✓' : '';
      btn.querySelector('.mark').style.background = isDone ? s.color : 'rgba(150,120,100,0.22)';
      btn.querySelector('.lvtag').textContent = 'Lv.' + levels[s.key];
    });

    // 今日の獲得
    const perItem = BASE_XP + streakBonus(Math.max(1, streak));
    document.getElementById('todayGain').textContent = `${done.length * perItem} XP`;
    const bonus = streakBonus(Math.max(1, streak));
    document.getElementById('bonusLabel').textContent =
      bonus > 0 ? `連続${streak}日ボーナス +${bonus}/項目` : '連続2日目からボーナス';

    // ステータス
    STATS.forEach(s => {
      const info = levelOf(xp[s.key]);
      document.querySelector(`[data-lv="${s.key}"].lv`).textContent = 'Lv.' + info.level;
      document.querySelector(`[data-rank="${s.key}"]`).textContent =
        `${s.trait}　—　${rankOf(s, info.level)}`;
      document.querySelector(`[data-bar="${s.key}"]`).style.width =
        Math.round(info.ratio * 100) + '%';
      document.querySelector(`[data-xp="${s.key}"]`).textContent =
        info.level >= MAX_LEVEL ? 'MAX（累計 ' + xp[s.key] + ' XP）' : `${info.cur} / ${info.need} XP`;
    });

    // メモ
    const note = document.getElementById('noteInput');
    if (document.activeElement !== note) note.value = Store.getNote(this.today);

    this.renderMatcha(log);
    this.renderHeatmap(log, xp);
  },

  /** 抹茶ラテ（継続のメモリ） */
  renderMatcha(log) {
    const s = matchaState(log);
    this.matcha = s;
    Matcha.set(s);

    const card = document.querySelector('.matcha-card');
    card.classList.toggle('empty', s.level <= 0);
    card.classList.toggle('low', s.level > 0 && s.level <= 2);

    document.getElementById('matchaCount').textContent = `${s.level} / ${MATCHA_MAX}`;
    const hstat = document.querySelector('.matcha-hstat');
    document.getElementById('matchaNum').textContent = s.level;
    hstat.classList.toggle('empty', s.level <= 0);
    hstat.classList.toggle('low', s.level > 0 && s.level <= 2);

    const names = ['空っぽ', '残りひとくち', '残りわずか', '半分', '半分', 'たっぷり', 'たっぷり', 'なみなみ'];
    document.getElementById('matchaState').textContent = names[s.level] || 'なみなみ';

    let msg;
    if (!s.started) {
      msg = 'まだ記録がありません。今日ひとつ達成すれば、この抹茶ラテは減りません。';
    } else if (s.todayCount === 0) {
      msg = s.level > 0
        ? `今日はまだ0項目。このまま日付が変わると −1メモリ（残り ${s.level - 1}）。`
        : '今日はまだ0項目。もう空なので、これ以上は減りません。';
    } else if (s.todayPerfect) {
      if (s.level >= MATCHA_MAX) msg = '今日も皆勤。抹茶ラテは満タンです。';
      else if (s.pending === 1) msg = '今日は皆勤！ あと1日皆勤で +1メモリ。';
      else msg = '皆勤2日ぶんが貯まり、+1メモリ回復しました。';
    } else {
      msg = `今日は ${s.todayCount} 項目。今日の減りは止まりました。皆勤まであと ${PERFECT_NEEDED - s.todayCount} 項目。`;
    }
    document.getElementById('matchaMsg').textContent = msg;

    document.getElementById('matchaLog').textContent =
      `これまで −${s.lost} メモリ／+${s.gained} メモリ回復` +
      (s.pending ? `　皆勤の貯め ${s.pending}/${PERFECT_FOR_HEAL}` : '');
  },

  renderHeatmap(log, xp) {
    const wrap = document.getElementById('heatmap');
    wrap.innerHTML = '';
    const base = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = addDays(base, -i);
      const key = dateKey(d);
      const n = (log[key] || []).length;
      const bucket = n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
      const cell = document.createElement('div');
      cell.className = 'hcell' + (key === this.today ? ' today' : '');
      cell.dataset.n = bucket;
      const names = (log[key] || []).map(k => (STATS.find(s => s.key === k) || {}).name).join('・');
      cell.title = `${key}　${n}項目${names ? '：' + names : ''}${Store.getNote(key) ? '\n' + Store.getNote(key) : ''}`;
      wrap.appendChild(cell);
    }

    const mini = document.getElementById('miniStats');
    const days = Object.keys(log).filter(k => log[k].length > 0).length;
    mini.innerHTML = `
      <div class="mini">記録した日<b>${days} 日</b></div>
      <div class="mini">のべ達成<b>${totalChecks(log)} 回</b></div>
      <div class="mini">最長連続<b>${bestStreak(log)} 日</b></div>
      <div class="mini">総獲得XP<b>${STATS.reduce((a, s) => a + (xp[s.key] || 0), 0)}</b></div>`;
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
