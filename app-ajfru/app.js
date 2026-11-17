(() => {
  'use strict';

  const KEY = 'app-ajfru:data';
  const BRICKS = 20; // 기둥 하나 = 벽돌 20개 (5%씩)
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
  let undoFn = null;
  function toast(msg, undo) {
    $('toastMsg').textContent = msg;
    undoFn = undo || null;
    $('undoBtn').hidden = !undo;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').classList.remove('show'); undoFn = null; }, undo ? 4000 : 2000);
  }

  // ---------- 렌더 ----------
  const lastOn = {}; // 연도별 직전에 켜진 벽돌 수

  function renderPillars(animateAll) {
    const box = $('pillars');
    box.innerHTML = '';
    years().forEach((y) => {
      const rate = rateOf(y);
      const on = Math.min(BRICKS, Math.floor(rate * BRICKS + 1e-9));
      const prev = animateAll ? 0 : (lastOn[y] ?? on);

      const p = document.createElement('button');
      p.className = 'pillar' + (y === data.selected ? ' sel' : '') + (rate >= 1 ? ' done' : '');
      p.setAttribute('aria-label', `${y}년`);

      const pp = document.createElement('div');
      pp.className = 'pp';
      pp.textContent = peek(y).goal ? Math.floor(rate * 100) + '%' : '';

      const cap = document.createElement('div');
      cap.className = 'cap';

      const shaft = document.createElement('div');
      shaft.className = 'shaft';
      for (let i = 0; i < BRICKS; i++) {
        const b = document.createElement('div');
        b.className = 'brick';
        if (i < on) {
          b.classList.add('on');
          b.style.background = COLORS[(i * 3 + y) % COLORS.length];
          if (i >= prev) {
            b.classList.add('drop');
            b.style.animationDelay = Math.min(900, (i - prev) * (animateAll ? 25 : 80)) + 'ms';
          }
        }
        shaft.appendChild(b);
      }

      const base = document.createElement('div');
      base.className = 'base';

      const yr = document.createElement('div');
      yr.className = 'yr';
      yr.textContent = String(y).slice(2);

      p.append(pp, cap, shaft, base, yr);
      p.addEventListener('click', () => selectYear(y));
      box.appendChild(p);
      lastOn[y] = on;
    });
  }

  function renderPanel() {
    const y = data.selected;
    const goal = peek(y).goal;
    const rate = rateOf(y);
    $('yearLabel').textContent = `${y}년`;
    const pct = $('pctTxt');
    pct.textContent = !goal ? '목표를 정해주세요' : (rate >= 1 ? '🏛 완공 ' : '') + Math.floor(rate * 100) + '%';
    pct.classList.toggle('small', !goal);
    if (document.activeElement !== $('goalInput')) {
      $('goalInput').value = goal ? goal.toLocaleString('ko-KR') : '';
    }
    $('savedTxt').textContent = won(savedOf(y));
  }

  function renderAll(animateAll) {
    renderPillars(animateAll);
    renderPanel();
  }

  // ---------- 동작 ----------
  function selectYear(y) {
    if (y === data.selected) return;
    data.selected = y;
    save();
    renderAll(false);
  }

  function addDeposit() {
    const y = data.selected;
    const amt = digits($('amountInput').value);
    if (!amt) { $('amountInput').focus(); return; }
    if (y > NOW_YEAR) { toast('아직 오지 않은 해예요'); return; }
    const wasDone = rateOf(y) >= 1;
    const ts = y < NOW_YEAR ? new Date(y, 11, 31, 12).getTime() : Date.now();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    yearData(y).deposits.push({ id, amount: amt, ts });
    save();
    $('amountInput').value = '';
    renderAll(false);

    const undo = () => {
      const yd = yearData(y);
      yd.deposits = yd.deposits.filter((d) => d.id !== id);
      save();
      renderAll(false);
      toast('되돌렸어요');
    };
    if (!wasDone && rateOf(y) >= 1) toast(`🎉 ${y}년 기둥 완공!`, undo);
    else toast(`🧱 ${won(amt)} 쌓았어요`, undo);
  }

  // ---------- 이벤트 ----------
  $('undoBtn').addEventListener('click', () => { if (undoFn) undoFn(); });

  const goalInput = $('goalInput');
  goalInput.addEventListener('input', () => {
    fmtInput(goalInput);
    yearData(data.selected).goal = digits(goalInput.value);
    save();
    renderAll(false);
  });
  goalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goalInput.blur(); });

  const amountInput = $('amountInput');
  amountInput.addEventListener('input', () => fmtInput(amountInput));
  amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addDeposit(); });
  $('addBtn').addEventListener('click', addDeposit);

  renderAll(true);
})();
