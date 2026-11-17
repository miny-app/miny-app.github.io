(() => {
  'use strict';

  const KEY = 'app-ajfru:data';
  const ROWS = 20;            // 기둥 높이(줄 수)
  const UNITS = ROWS * 2;     // 한 줄 = 벽돌 2장 분량
  const NOW_YEAR = new Date().getFullYear();

  const BRICK_COLORS = [
    '#9b3f2a', '#a5472f', '#8e3a27', '#b05236', '#963c2b',
    '#a84a33', '#874030', '#b35a3c', '#9a4630', '#7f3424',
    '#a1503a', '#92382a'
  ];

  // ---------- 데이터 ----------
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.years) return d;
    } catch (e) { /* 무시 */ }
    return { startYear: NOW_YEAR, years: {}, selected: NOW_YEAR };
  }
  const data = load();
  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }

  function yearData(y) {
    if (!data.years[y]) data.years[y] = { goal: 0, deposits: [], celebrated: false };
    return data.years[y];
  }
  function peekYear(y) { return data.years[y] || { goal: 0, deposits: [], celebrated: false }; }
  const yearsList = () => Array.from({ length: 10 }, (_, i) => data.startYear + i);
  const savedOf = (y) => peekYear(y).deposits.reduce((s, d) => s + d.amount, 0);

  function rateOf(y) {
    const g = peekYear(y).goal;
    if (!g) return 0;
    return savedOf(y) / g;
  }
  function statusOf(y) {
    const g = peekYear(y).goal;
    const s = savedOf(y);
    if (g > 0 && s >= g) return 'done';
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
  const fmtInput = (el) => {
    const n = digits(el.value);
    el.value = n ? n.toLocaleString('ko-KR') : '';
  };
  function hash(a, b, c) {
    let h = 2166136261 ^ a;
    h = Math.imul(h ^ b, 16777619);
    h = Math.imul(h ^ c, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------- 집 뱃지 SVG ----------
  const GHOST = `
    <polygon points="50,6 94,42 6,42" fill="none" stroke="#bfae99" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round"/>
    <rect x="14" y="42" width="72" height="50" fill="none" stroke="#bfae99" stroke-width="2" stroke-dasharray="4 3"/>`;
  const GROUND = `<rect x="2" y="92" width="96" height="5" rx="2" fill="#7c8a4a"/><rect x="2" y="92" width="96" height="1.5" fill="#97a75e"/>`;

  function houseSVG(status, rate) {
    let body = '';
    if (status === 'done') {
      body = `
        <rect x="66" y="10" width="11" height="22" fill="url(#brickPat)" stroke="#5e2618" stroke-width="1"/>
        <rect x="64.5" y="8" width="14" height="4" fill="#6b625a"/>
        <polygon points="50,5 95,42 5,42" fill="url(#roofPat)" stroke="#2e1a15" stroke-width="2" stroke-linejoin="round"/>
        <rect x="14" y="41" width="72" height="51" fill="url(#brickPat)"/>
        <rect x="14" y="41" width="72" height="51" fill="none" stroke="#5e2618" stroke-width="1.5"/>
        <rect x="14" y="41" width="72" height="4" fill="#000" opacity=".18"/>
        <rect x="21" y="53" width="18" height="15" fill="#ffe39a" stroke="#efe8dc" stroke-width="2.5"/>
        <path d="M30 53 V68 M21 60.5 H39" stroke="#efe8dc" stroke-width="2"/>
        <rect x="19" y="68" width="22" height="3" fill="#d9d0c2"/>
        <rect x="54" y="59" width="19" height="33" rx="1.5" fill="#5a3420" stroke="#efe8dc" stroke-width="2"/>
        <path d="M58 64 h11 v10 h-11z M58 78 h11 v10 h-11z" fill="none" stroke="#3f2316" stroke-width="1.2"/>
        <circle cx="69" cy="76" r="1.5" fill="#e0a526"/>
        ${GROUND}`;
    } else if (status === 'fail' || status === 'progress') {
      const r = Math.max(0, Math.min(1, rate || 0));
      const shown = status === 'fail' ? Math.max(0.22, Math.min(0.85, r)) : r;
      const h = Math.round(50 * shown / 5) * 5; // 벽돌 줄 단위로
      let wall = '';
      if (h > 0) {
        const y = 92 - h;
        wall = `
          <rect x="14" y="${y}" width="72" height="${h}" fill="url(#brickPat)"/>
          <rect x="14" y="${y}" width="72" height="${h}" fill="none" stroke="#5e2618" stroke-width="1.2"/>
          <rect x="19.6" y="${y - 4.4}" width="8.8" height="3.8" fill="#a3432c"/>
          <rect x="39.6" y="${y - 4.4}" width="8.8" height="3.8" fill="#8c3825"/>
          <rect x="29.6" y="${y - 4.4}" width="8.8" height="3.8" fill="#b14f34"/>`;
      }
      let extra = '';
      if (status === 'fail') {
        extra = `
          <g stroke="#8d8f93" stroke-width="2.2" stroke-linecap="round">
            <path d="M8 92 V30 M92 92 V30"/>
          </g>
          <g stroke="#b88a4a" stroke-width="3">
            <path d="M5 50 H95 M5 70 H95"/>
          </g>
          <path d="M8 50 L92 70 M92 50 L8 70" stroke="#8d8f93" stroke-width="1" opacity=".7"/>
          <g>
            <rect x="34" y="72" width="2.5" height="20" fill="#555"/>
            <rect x="63.5" y="72" width="2.5" height="20" fill="#555"/>
            <rect x="20" y="56" width="60" height="22" rx="2" fill="url(#stripe)" stroke="#1d1d1d" stroke-width="1"/>
            <rect x="24" y="59.5" width="52" height="15" rx="1.5" fill="#fff4c2"/>
            <text x="50" y="71" text-anchor="middle" font-size="12" font-weight="900" fill="#c0220f" font-family="sans-serif">공사중</text>
          </g>
          <path d="M80 92 L84 80 L88 92 Z" fill="#f26b1d"/><rect x="81.6" y="85" width="4.8" height="2" fill="#fff"/>`;
      } else {
        extra = `<text x="50" y="30" text-anchor="middle" font-size="13" font-weight="900" fill="#9e432d" font-family="sans-serif">${Math.floor(r * 100)}%</text>`;
      }
      body = `${GHOST}${wall}${extra}${GROUND}`;
    } else {
      body = `${GHOST}${GROUND}`;
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }

  // ---------- 렌더 ----------
  let lastPillar = { year: null, units: 0 };

  function renderPillar(animateAll) {
    const y = data.selected;
    const rate = rateOf(y);
    const units = Math.min(UNITS, Math.floor(rate * UNITS + 1e-9));
    const prevUnits = (!animateAll && lastPillar.year === y) ? lastPillar.units : 0;
    const animate = animateAll || (lastPillar.year === y && units > prevUnits);

    const pillar = $('pillar');
    pillar.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      const odd = r % 2 === 1;
      const rowUnits = Math.max(0, Math.min(2, units - r * 2));
      const pieces = odd ? ['half', 'full', 'half'] : ['full', 'full'];
      const onCount = odd ? [0, 2, 3][rowUnits] : rowUnits;
      if (rowUnits > 0) row.classList.add('has');

      pieces.forEach((kind, i) => {
        const b = document.createElement('div');
        b.className = 'brick ' + kind;
        if (i < onCount) {
          const u = odd ? r * 2 + (i < 2 ? 0 : 1) : r * 2 + i;
          const rnd = (k) => hash(y, r * 10 + i, k);
          b.classList.add('on');
          b.style.setProperty('--c', BRICK_COLORS[Math.floor(rnd(1) * BRICK_COLORS.length)]);
          b.style.setProperty('--sx', Math.floor(rnd(2) * 100) + '%');
          b.style.setProperty('--sy', Math.floor(rnd(3) * 100) + '%');
          b.style.setProperty('--hx', Math.floor(rnd(4) * 100) + '%');
          b.style.setProperty('--nx', Math.floor(rnd(5) * 90) + 'px');
          b.style.setProperty('--ny', Math.floor(rnd(6) * 90) + 'px');
          if (animate && u >= prevUnits) {
            b.classList.add('drop');
            const step = animateAll ? 18 : 70;
            b.style.animationDelay = Math.min(1500, (u - prevUnits) * step) + 'ms';
          }
        }
        row.appendChild(b);
      });
      pillar.appendChild(row);
    }
    lastPillar = { year: y, units };

    const top = $('pillarTop');
    const g = peekYear(y).goal;
    if (!g) top.innerHTML = '<span class="pct">목표를 정해요</span>';
    else if (rate >= 1) top.innerHTML = '<div><div class="flag">🚩</div>완공!</div>';
    else top.innerHTML = `<span class="pct">${Math.floor(rate * 100)}%</span>`;
  }

  function renderBadges() {
    const list = yearsList();
    const left = $('badgesLeft'), right = $('badgesRight');
    left.innerHTML = ''; right.innerHTML = '';
    let count = 0;
    list.forEach((y, idx) => {
      const st = statusOf(y);
      if (st === 'done') count++;
      const btn = document.createElement('button');
      btn.className = 'badge ' + st + (y === data.selected ? ' sel' : '');
      btn.title = `${y}년`;
      const label = {
        done: '완공 🏅', fail: '공사중', progress: `진행중`,
        future: `${idx + 1}년차`, none: '미설정'
      }[st];
      btn.innerHTML = `${houseSVG(st, rateOf(y))}<span class="by">${y}</span><span class="bs">${label}</span>`;
      btn.addEventListener('click', () => selectYear(y));
      (idx < 5 ? left : right).appendChild(btn);
    });
    $('badgeCount').textContent = count;
  }

  function renderStats() {
    const y = data.selected;
    const yd = peekYear(y);
    const saved = savedOf(y);
    const g = yd.goal;
    $('savedTxt').textContent = won(saved);
    $('remainTxt').textContent = won(Math.max(0, g - saved));
    const pct = g ? (saved / g) * 100 : 0;
    $('rateTxt').textContent = (pct >= 100 ? Math.floor(pct) : Math.floor(pct * 10) / 10) + '%';
    $('barFill').style.width = Math.min(100, pct) + '%';
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
      const dateStr = `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
      li.innerHTML = `
        <span class="h-ico"></span>
        <div class="h-main">
          <div class="h-amt">+${won(d.amount)}</div>
          <div class="h-meta"></div>
        </div>
        <button class="h-del" aria-label="삭제">✕</button>`;
      li.querySelector('.h-meta').textContent = dateStr + (d.memo ? ' · ' + d.memo : '');
      li.querySelector('.h-del').addEventListener('click', () => removeDeposit(d.id));
      ul.appendChild(li);
    });
  }

  function renderHeader() {
    const y = data.selected;
    const list = yearsList();
    const idx = list.indexOf(y);
    $('yearLabel').textContent = y;
    $('yearIndex').textContent = `${idx + 1}년차`;
    $('prevYear').disabled = idx <= 0;
    $('nextYear').disabled = idx >= list.length - 1;
    const g = peekYear(y).goal;
    if (document.activeElement !== $('goalInput')) {
      $('goalInput').value = g ? g.toLocaleString('ko-KR') : '';
    }
  }

  function renderAll(animateAll) {
    renderHeader();
    renderStats();
    renderPillar(animateAll);
    renderBadges();
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
      showModal(y);
    } else if (!done && yd.celebrated) {
      yd.celebrated = false;
      save();
    }
  }

  function showModal(y) {
    $('modalHouse').innerHTML = houseSVG('done', 1);
    $('modalTitle').textContent = '빨간 벽돌집 뱃지 획득!';
    $('modalMsg').textContent = `${y}년 목표 ${won(peekYear(y).goal)}을 달성했어요 🎉`;
    $('modal').hidden = false;
  }

  function addDeposit() {
    const y = data.selected;
    const amt = digits($('amountInput').value);
    if (!amt) { toast('저금한 금액을 입력해 주세요'); $('amountInput').focus(); return; }
    if (y > NOW_YEAR) { toast('아직 오지 않은 해에는 저금할 수 없어요'); return; }
    const yd = yearData(y);
    let ts = Date.now();
    if (y < NOW_YEAR) ts = new Date(y, 11, 31, 12).getTime();
    yd.deposits.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), amount: amt, memo: $('memoInput').value.trim(), ts });
    save();
    $('amountInput').value = '';
    $('memoInput').value = '';
    renderAll(false);
    if (!yd.goal) toast('🧱 기록했어요! 목표금액을 정하면 기둥이 쌓여요');
    else toast(`🧱 ${won(amt)} 벽돌을 쌓았어요!`);
    checkAchievement(y);
  }

  function removeDeposit(id) {
    if (!confirm('이 저금 기록을 삭제할까요?')) return;
    const yd = yearData(data.selected);
    yd.deposits = yd.deposits.filter((d) => d.id !== id);
    save();
    lastPillar.units = 0;
    lastPillar.year = null;
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
    renderPillar(false);
    renderBadges();
  });
  goalInput.addEventListener('change', () => checkAchievement(data.selected));
  goalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goalInput.blur(); });

  const amountInput = $('amountInput');
  amountInput.addEventListener('input', () => fmtInput(amountInput));
  amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addDeposit(); });
  $('memoInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addDeposit(); });
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
  for (let y = NOW_YEAR - 9; y <= NOW_YEAR + 1; y++) {
    const o = document.createElement('option');
    o.value = y; o.textContent = `${y}년 ~ ${y + 9}년`;
    sel.appendChild(o);
  }
  if (data.startYear < NOW_YEAR - 9 || data.startYear > NOW_YEAR + 1) {
    const o = document.createElement('option');
    o.value = data.startYear; o.textContent = `${data.startYear}년 ~ ${data.startYear + 9}년`;
    sel.prepend(o);
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
