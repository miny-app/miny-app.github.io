(() => {
  'use strict';

  const KEY = 'app-ajfru:data';
  const ROWS = 10;
  const COLS = 5;
  const UNITS = ROWS * COLS;
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

  const yearData = (y) => (data.years[y] ||= { goal: 0, deposits: [] });
  const peek = (y) => data.years[y] || { goal: 0, deposits: [] };
  const years = () => Array.from({ length: 10 }, (_, i) => data.startYear + i);
  const savedOf = (y) => peek(y).deposits.reduce((s, d) => s + d.amount, 0);
  const rateOf = (y) => { const g = peek(y).goal; return g ? savedOf(y) / g : 0; };

  if (!years().includes(data.selected)) data.selected = data.startYear;

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
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ---------- 렌더 ----------
  let last = { year: null, on: 0 };

  function renderWall(animateAll) {
    const y = data.selected;
    const goal = peek(y).goal;
    const rate = rateOf(y);
    const units = Math.min(UNITS, Math.floor(rate * UNITS + 1e-9));
    const prevOn = (!animateAll && last.year === y) ? last.on : 0;

    const wall = $('wall');
    wall.innerHTML = '';
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'row' + (r % 2 ? ' odd' : '');
      for (let c = 0; c < COLS; c++) {
        const b = document.createElement('div');
        b.className = 'brick';
        if (r * COLS + c < units) {
          b.classList.add('on');
          b.style.background = COLORS[(r * 3 + c * 2) % COLORS.length];
          if (idx >= prevOn) {
            b.classList.add('drop');
            b.style.animationDelay = Math.min(1000, (idx - prevOn) * (animateAll ? 20 : 90)) + 'ms';
          }
          idx++;
        }
        row.appendChild(b);
      }
      wall.appendChild(row);
    }
    last = { year: y, on: idx };

    const pct = $('pctTxt');
    pct.textContent = !goal ? '목표를 정해주세요' : (rate >= 1 ? '🏠 완공! ' : '') + Math.floor(rate * 100) + '%';
    pct.classList.toggle('small', !goal);
  }

  function renderHouses() {
    const box = $('houses');
    box.innerHTML = '';
    years().forEach((y) => {
      const rate = Math.min(1, rateOf(y));
      const btn = document.createElement('button');
      btn.className = 'house' + (y === data.selected ? ' sel' : '') + (rate >= 1 ? ' done' : '');
      btn.innerHTML = `<i><s style="height:${rate * 100}%"></s></i>${String(y).slice(2)}`;
      btn.addEventListener('click', () => selectYear(y));
      box.appendChild(btn);
    });
  }

  function renderHistory() {
    const ul = $('historyList');
    ul.innerHTML = '';
    const deps = [...peek(data.selected).deposits].sort((a, b) => b.ts - a.ts);
    if (!deps.length) {
      ul.innerHTML = '<li class="empty">아직 기록이 없어요</li>';
      return;
    }
    deps.forEach((d) => {
      const dt = new Date(d.ts);
      const li = document.createElement('li');
      li.innerHTML = `<span>${dt.getMonth() + 1}/${dt.getDate()}</span><b>+${won(d.amount)}</b><button aria-label="삭제">✕</button>`;
      li.querySelector('button').addEventListener('click', () => removeDeposit(d.id));
      ul.appendChild(li);
    });
  }

  function renderAll(animateAll) {
    const y = data.selected;
    const i = years().indexOf(y);
    $('yearLabel').textContent = `${y}년`;
    $('prevYear').disabled = i <= 0;
    $('nextYear').disabled = i >= 9;
    if (document.activeElement !== $('goalInput')) {
      const g = peek(y).goal;
      $('goalInput').value = g ? g.toLocaleString('ko-KR') : '';
    }
    $('savedTxt').textContent = won(savedOf(y));
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

  function addDeposit() {
    const y = data.selected;
    const amt = digits($('amountInput').value);
    if (!amt) { $('amountInput').focus(); return; }
    if (y > NOW_YEAR) { toast('아직 오지 않은 해예요'); return; }
    const wasDone = rateOf(y) >= 1;
    const ts = y < NOW_YEAR ? new Date(y, 11, 31, 12).getTime() : Date.now();
    yearData(y).deposits.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), amount: amt, ts });
    save();
    $('amountInput').value = '';
    renderAll(false);
    if (!wasDone && rateOf(y) >= 1) toast(`🎉 ${y}년 벽돌집 완공!`);
    else toast(`🧱 ${won(amt)} 쌓았어요`);
  }

  function removeDeposit(id) {
    if (!confirm('이 기록을 삭제할까요?')) return;
    const yd = yearData(data.selected);
    yd.deposits = yd.deposits.filter((d) => d.id !== id);
    save();
    last = { year: data.selected, on: Infinity };
    renderAll(false);
  }

  // ---------- 이벤트 ----------
  $('prevYear').addEventListener('click', () => { const l = years(); selectYear(l[Math.max(0, l.indexOf(data.selected) - 1)]); });
  $('nextYear').addEventListener('click', () => { const l = years(); selectYear(l[Math.min(9, l.indexOf(data.selected) + 1)]); });

  const goalInput = $('goalInput');
  goalInput.addEventListener('input', () => {
    fmtInput(goalInput);
    yearData(data.selected).goal = digits(goalInput.value);
    save();
    renderWall(false);
    renderHouses();
  });
  goalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goalInput.blur(); });

  const amountInput = $('amountInput');
  amountInput.addEventListener('input', () => fmtInput(amountInput));
  amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addDeposit(); });
  $('addBtn').addEventListener('click', addDeposit);

  renderAll(true);
})();
