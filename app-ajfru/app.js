(() => {
  'use strict';

  const KEY = 'app-ajfru:data';
  const ROWS = 10;
  const COLS = 5;               // 한 줄 = 벽돌 5장
  const UNITS = ROWS * COLS;    // 벽돌 1장 = 2%
  const NOW_YEAR = new Date().getFullYear();
  const COLORS = ['#b4482f', '#a63f28', '#bf5536', '#9c3a25', '#b04a30'];

  // ---------- 데이터 ----------
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.years) return d;
    } catch (e) { /* 무시 */ }
    return { startYear: NOW_YEAR, years: {}, selected: NOW_YEAR };
  }
  const data = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));

  function yearData(y) {
    if (!data.years[y]) data.years[y] = { goal: 0, deposits: [], celebrated: false };
    return data.years[y];
  }
  const peekYear = (y) => data.years[y] || { goal: 0, deposits: [], celebrated: false };
  const yearsList = () => Array.from({ length: 10 }, (_, i) => data.startYear + i);
  const savedOf = (y) => peekYear(y).deposits.reduce((s, d) => s + d.amount, 0);
  const rateOf = (y) => { const g = peekYear(y).goal; return g ? savedOf(y) / g : 0; };
  function statusOf(y) {
    const g = peekYear(y).goal;
    if (g > 0 && savedOf(y) >= g) return 'done';
    if (y < NOW_YEAR) return g > 0 ? 'fail' : 'none';
    if (y === NOW_YEAR) return 'progress';
    return 'future';
  }

  if (!yearsList().includes(data.selected)) {
    data.selected = yearsList().includes(NOW_YEAR) ? NOW_YEAR : data.startYear;
  }

  // ---------- 유틸 ----------
  const $ = (id) => document.getElementById(id);
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const digits = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
  const fmtInput = (el) => { const n = digits(el.value); el.value = n ? n.toLocaleString('ko-KR') : ''; };
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------- 작은 집 아이콘 ----------
  function houseSVG(status, rate) {
    const outline = '#cbbfae';
    let body = `
      <polygon points="50,8 92,42 8,42" fill="none" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="16" y="42" width="68" height="48" fill="none" stroke="${outline}" stroke-width="3"/>`;
    if (status === 'done') {
      body = `
        <polygon points="50,6 94,42 6,42" fill="#5a3329" stroke-linejoin="round"/>
        <rect x="16" y="42" width="68" height="48" fill="#b4482f"/>
        <path d="M16 54 H84 M16 66 H84 M16 78 H84 M38 42 V54 M62 42 V54 M27 54 V66 M50 54 V66 M73 54 V66 M38 66 V78 M62 66 V78 M27 78 V90 M73 78 V90" stroke="#e9dccb" stroke-width="1.6"/>
        <rect x="42" y="66" width="16" height="24" fill="#5a3329"/>
        <rect x="23" y="58" width="12" height="10" fill="#ffd970"/>`;
    } else if (status === 'progress' || status === 'fail') {
      const h = Math.round(48 * Math.max(0, Math.min(1, rate)));
      if (h > 0) body += `<rect x="16" y="${90 - h}" width="68" height="${h}" fill="${status === 'fail' ? '#c9a089' : '#b4482f'}"/>`;
    }
    return `<svg viewBox="0 0 100 96" xmlns="http://www.w3.org/2000/svg">${body}<rect x="4" y="90" width="92" height="5" rx="2" fill="#8a9a55"/></svg>`;
  }

  // ---------- 벽 ----------
  let last = { year: null, on: 0 };

  function renderWall(animateAll) {
    const y = data.selected;
    const goal = peekYear(y).goal;
    const rate = rateOf(y);
    const units = Math.min(UNITS, Math.floor(rate * UNITS + 1e-9));
    const prevOn = (!animateAll && last.year === y) ? last.on : 0;

    const wall = $('wall');
    wall.innerHTML = '';
    let idx = 0;           // 아래에서부터 벽돌 순번
    let nextMarked = false;

    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      const filled = Math.max(0, Math.min(COLS, units - r * COLS));
      const odd = r % 2 === 1;
      const pieces = [];
      if (odd) {
        pieces.push({ kind: 'half', end: 0.5 });
        for (let c = 1; c < COLS; c++) pieces.push({ kind: 'full', end: c + 0.5 });
        pieces.push({ kind: 'half', end: COLS });
      } else {
        for (let c = 1; c <= COLS; c++) pieces.push({ kind: 'full', end: c });
      }
      pieces.forEach((p, i) => {
        const b = document.createElement('div');
        b.className = 'brick ' + p.kind;
        if (p.end <= filled + 0.5 && filled > 0) {
          b.classList.add('on');
          b.style.background = COLORS[(r * 3 + i * 2) % COLORS.length];
          if (idx >= prevOn) {
            b.classList.add('drop');
            b.style.animationDelay = Math.min(1200, (idx - prevOn) * (animateAll ? 20 : 90)) + 'ms';
          }
          idx++;
        } else if (!nextMarked && goal) {
          b.classList.add('next');
          nextMarked = true;
        }
        row.appendChild(b);
      });
      wall.appendChild(row);
    }
    last = { year: y, on: idx };

    const pct = $('pctTxt');
    if (!goal) pct.textContent = '목표를 정해주세요';
    else if (rate >= 1) pct.textContent = '🚩 완공! ' + Math.floor(rate * 100) + '%';
    else pct.textContent = Math.floor(rate * 100) + '%';
    pct.classList.toggle('small', !goal);
  }

  function renderStats() {
    const y = data.selected;
    const saved = savedOf(y);
    $('savedTxt').textContent = won(saved);
    $('remainTxt').textContent = won(Math.max(0, peekYear(y).goal - saved));
  }

  function renderHouses() {
    const box = $('houses');
    box.innerHTML = '';
    let count = 0;
    yearsList().forEach((y) => {
      const st = statusOf(y);
      if (st === 'done') count++;
      const btn = document.createElement('button');
      btn.className = 'house ' + st + (y === data.selected ? ' sel' : '');
      btn.innerHTML = `${houseSVG(st, rateOf(y))}<span>${y}</span>`;
      btn.addEventListener('click', () => selectYear(y));
      box.appendChild(btn);
    });
    $('badgeCount').textContent = count;
  }

  function renderHistory() {
    const y = data.selected;
    $('histYear').textContent = y;
    const ul = $('historyList');
    ul.innerHTML = '';
    const deps = [...peekYear(y).deposits].sort((a, b) => b.ts - a.ts);
    $('historyEmpty').style.display = deps.length ? 'none' : 'block';
    deps.forEach((d) => {
      const li = document.createElement('li');
      const dt = new Date(d.ts);
      li.innerHTML = `<span class="h-date"></span><b class="h-amt">+${won(d.amount)}</b><button class="h-del" aria-label="삭제">✕</button>`;
      li.querySelector('.h-date').textContent = `${dt.getMonth() + 1}/${dt.getDate()}` + (d.memo ? ' ' + d.memo : '');
      li.querySelector('.h-del').addEventListener('click', () => removeDeposit(d.id));
      ul.appendChild(li);
    });
  }

  function renderHeader() {
    const y = data.selected;
    const list = yearsList();
    const i = list.indexOf(y);
    $('yearLabel').textContent = y;
    $('yearIndex').textContent = `${i + 1}년차`;
    $('prevYear').disabled = i <= 0;
    $('nextYear').disabled = i >= list.length - 1;
    const g = peekYear(y).goal;
    if (document.activeElement !== $('goalInput')) {
      $('goalInput').value = g ? g.toLocaleString('ko-KR') : '';
    }
  }

  function renderAll(animateAll) {
    renderHeader();
    renderStats();
    renderWall(animateAll);
    renderHouses();
    renderHistory();
  }

  // ---------- 동작 ----------
  function selectYear(y) {
    if (y === data.selected) return;
    data.selected = y;
    save();
    renderAll(true);
  }

  function checkAchievement(y) {
    const yd = yearData(y);
    const done = yd.goal > 0 && savedOf(y) >= yd.goal;
    if (done && !yd.celebrated) {
      yd.celebrated = true;
      save();
      $('modalHouse').innerHTML = houseSVG('done', 1);
      $('modalMsg').textContent = `${y}년 목표 ${won(yd.goal)} 달성 🎉`;
      $('modal').hidden = false;
    } else if (!done && yd.celebrated) {
      yd.celebrated = false;
      save();
    }
  }

  function addDeposit() {
    const y = data.selected;
    const amt = digits($('amountInput').value);
    if (!amt) { toast('금액을 입력해 주세요'); $('amountInput').focus(); return; }
    if (y > NOW_YEAR) { toast('아직 오지 않은 해예요'); return; }
    const yd = yearData(y);
    const ts = y < NOW_YEAR ? new Date(y, 11, 31, 12).getTime() : Date.now();
    yd.deposits.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), amount: amt, memo: '', ts });
    save();
    $('amountInput').value = '';
    renderAll(false);
    toast(yd.goal ? `🧱 ${won(amt)} 쌓았어요!` : '기록했어요! 목표를 정하면 벽돌이 쌓여요');
    checkAchievement(y);
  }

  function removeDeposit(id) {
    if (!confirm('이 기록을 삭제할까요?')) return;
    const yd = yearData(data.selected);
    yd.deposits = yd.deposits.filter((d) => d.id !== id);
    save();
    last = { year: data.selected, on: Infinity };
    renderAll(false);
    checkAchievement(data.selected);
  }

  // ---------- 이벤트 ----------
  $('prevYear').addEventListener('click', () => {
    const l = yearsList(); const i = l.indexOf(data.selected);
    if (i > 0) selectYear(l[i - 1]);
  });
  $('nextYear').addEventListener('click', () => {
    const l = yearsList(); const i = l.indexOf(data.selected);
    if (i < l.length - 1) selectYear(l[i + 1]);
  });

  const goalInput = $('goalInput');
  goalInput.addEventListener('input', () => {
    fmtInput(goalInput);
    yearData(data.selected).goal = digits(goalInput.value);
    save();
    renderStats();
    renderWall(false);
    renderHouses();
  });
  goalInput.addEventListener('change', () => checkAchievement(data.selected));
  goalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goalInput.blur(); });

  const amountInput = $('amountInput');
  amountInput.addEventListener('input', () => fmtInput(amountInput));
  amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addDeposit(); });
  document.querySelectorAll('.quick button').forEach((b) => {
    b.addEventListener('click', () => {
      const q = parseInt(b.dataset.q, 10);
      const n = q ? digits(amountInput.value) + q : 0;
      amountInput.value = n ? n.toLocaleString('ko-KR') : '';
    });
  });
  $('addBtn').addEventListener('click', addDeposit);

  $('modalClose').addEventListener('click', () => { $('modal').hidden = true; });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('modal').hidden = true; });

  const sel = $('startYear');
  const lo = Math.min(NOW_YEAR - 9, data.startYear), hi = Math.max(NOW_YEAR + 1, data.startYear);
  for (let y = lo; y <= hi; y++) {
    const o = document.createElement('option');
    o.value = y; o.textContent = `${y}년 ~ ${y + 9}년`;
    sel.appendChild(o);
  }
  sel.value = data.startYear;
  sel.addEventListener('change', () => {
    data.startYear = parseInt(sel.value, 10);
    const l = yearsList();
    if (!l.includes(data.selected)) data.selected = l.includes(NOW_YEAR) ? NOW_YEAR : l[0];
    save();
    renderAll(true);
  });

  renderAll(true);
})();
