(() => {
  'use strict';

  const KEY = 'app-ajfru:pillar';
  const COURSES = 20; // 벽돌 20줄 = 한 줄에 5%
  const COLORS = ['#b4482f', '#a63f28', '#bf5536', '#9c3a25', '#b04a30', '#aa4329'];

  // 예전 데이터는 정리
  localStorage.removeItem('app-ajfru:data');

  // ---------- 데이터 ----------
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.deposits)) return d;
    } catch (e) { /* 무시 */ }
    return { goal: 0, deposits: [] };
  }
  let data = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const saved = () => data.deposits.reduce((s, d) => s + d.amount, 0);
  const rate = () => (data.goal ? saved() / data.goal : 0);

  // ---------- 유틸 ----------
  const $ = (id) => document.getElementById(id);
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const digits = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
  const fmtInput = (el) => { const n = digits(el.value); el.value = n ? n.toLocaleString('ko-KR') : ''; };
  const fmtDate = (ts) => { const d = new Date(ts); return `${d.getFullYear() % 100}.${d.getMonth() + 1}.${d.getDate()}`; };

  let toastTimer, undoFn = null;
  function toast(msg, undo) {
    $('toastMsg').textContent = msg;
    undoFn = undo || null;
    $('undo').hidden = !undo;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').classList.remove('show'); undoFn = null; }, undo ? 4000 : 2000);
  }

  // ---------- 렌더 ----------
  let lastOn = 0;

  function renderPillar(animateAll) {
    const r = rate();
    const on = Math.min(COURSES, Math.floor(r * COURSES + 1e-9));
    const prev = animateAll ? 0 : Math.min(lastOn, on);

    const shaft = $('shaft');
    shaft.innerHTML = '';
    for (let i = 0; i < COURSES; i++) {
      const c = document.createElement('div');
      const odd = i % 2 === 1;
      c.className = 'course' + (odd ? ' odd' : '');
      const n = odd ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const b = document.createElement('div');
        b.className = 'brick';
        if (i < on) b.style.background = COLORS[(i * 2 + k * 3) % COLORS.length];
        c.appendChild(b);
      }
      if (i < on) {
        c.classList.add('on');
        c.style.setProperty('--b0', COLORS[(i * 5 + 1) % COLORS.length]);
        if (i >= prev) {
          c.classList.add('drop');
          c.style.animationDelay = Math.min(1200, (i - prev) * (animateAll ? 50 : 110)) + 'ms';
        }
      }
      shaft.appendChild(c);
    }
    $('pillar').classList.toggle('done', r >= 1);
    lastOn = on;
  }

  function renderInfo() {
    const r = rate();
    const pct = $('pct');
    pct.textContent = !data.goal ? '목표 금액을 정해주세요' : (r >= 1 ? '🏛 완공 ' : '') + Math.floor(r * 100) + '%';
    pct.classList.toggle('small', !data.goal);
    if (document.activeElement !== $('goal')) {
      $('goal').value = data.goal ? data.goal.toLocaleString('ko-KR') : '';
    }
    $('saved').textContent = won(saved());
  }

  function renderList() {
    const ul = $('list');
    ul.innerHTML = '';
    if (!data.deposits.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '아직 쌓은 벽돌이 없어요';
      ul.appendChild(li);
      return;
    }
    [...data.deposits].reverse().forEach((d) => {
      const li = document.createElement('li');
      const dt = document.createElement('span'); dt.className = 'd'; dt.textContent = fmtDate(d.ts);
      const a = document.createElement('span'); a.className = 'a'; a.textContent = won(d.amount);
      const del = document.createElement('button'); del.textContent = '삭제';
      del.addEventListener('click', () => removeDeposit(d.id));
      li.append(dt, a, del);
      ul.appendChild(li);
    });
  }

  function renderAll(animateAll) {
    renderPillar(animateAll);
    renderInfo();
    if (!$('sheet').hidden) renderList();
  }

  // ---------- 동작 ----------
  function addDeposit() {
    const amt = digits($('amount').value);
    if (!amt) { $('amount').focus(); return; }
    const wasDone = rate() >= 1;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    data.deposits.push({ id, amount: amt, ts: Date.now() });
    save();
    $('amount').value = '';
    renderAll(false);

    const undo = () => {
      data.deposits = data.deposits.filter((d) => d.id !== id);
      save(); renderAll(false); toast('되돌렸어요');
    };
    if (!wasDone && rate() >= 1) toast('🎉 기둥 완공!', undo);
    else toast(`🧱 ${won(amt)} 쌓았어요`, undo);
  }

  function removeDeposit(id) {
    const idx = data.deposits.findIndex((d) => d.id === id);
    if (idx < 0) return;
    const [removed] = data.deposits.splice(idx, 1);
    save(); renderAll(false);
    toast(`${won(removed.amount)} 삭제했어요`, () => {
      data.deposits.splice(idx, 0, removed);
      save(); renderAll(false); toast('되돌렸어요');
    });
  }

  // ---------- 이벤트 ----------
  $('undo').addEventListener('click', () => { if (undoFn) undoFn(); });

  const goal = $('goal');
  goal.addEventListener('input', () => {
    fmtInput(goal);
    data.goal = digits(goal.value);
    save(); renderAll(false);
  });
  goal.addEventListener('keydown', (e) => { if (e.key === 'Enter') goal.blur(); });

  const amount = $('amount');
  amount.addEventListener('input', () => fmtInput(amount));
  amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') addDeposit(); });
  $('add').addEventListener('click', addDeposit);

  $('historyBtn').addEventListener('click', () => { $('sheet').hidden = false; renderList(); });
  $('closeSheet').addEventListener('click', () => { $('sheet').hidden = true; });
  $('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') $('sheet').hidden = true; });
  $('reset').addEventListener('click', () => {
    if (!confirm('목표와 기록을 전부 지울까요?')) return;
    data = { goal: 0, deposits: [] };
    save(); $('sheet').hidden = true; renderAll(true);
    toast('처음부터 다시 시작해요');
  });

  renderAll(true);
})();
