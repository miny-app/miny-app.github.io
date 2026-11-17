(() => {
  const KEY = "app-vmmrx:";
  const MEALS = ["아침", "점심", "저녁"];
  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

  const load = (k, def) => {
    try {
      const v = localStorage.getItem(KEY + k);
      return v ? JSON.parse(v) : def;
    } catch { return def; }
  };
  const save = (k, v) => localStorage.setItem(KEY + k, JSON.stringify(v));

  const state = {
    fridge: load("fridge", []),          // [{name, urgent}]
    myRecipes: load("myRecipes", []),    // [{n, i, m}]
    settings: load("settings", { days: 7, meals: MEALS.slice(), onlyHave: false }),
    plan: load("plan", null)             // {days, meals, start, slots:{key:{n, locked}}}
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function norm(name) {
    const s = String(name).trim().replace(/\s+/g, "");
    return window.ALIASES[s] || s;
  }

  function allRecipes() {
    return window.BASE_RECIPES.concat(state.myRecipes.map((r) => ({ ...r, custom: true })));
  }
  function findRecipe(name) {
    return allRecipes().find((r) => r.n === name);
  }

  function fridgeSet() { return new Set(state.fridge.map((f) => f.name)); }
  function urgentSet() { return new Set(state.fridge.filter((f) => f.urgent).map((f) => f.name)); }

  /* ---------- 냉장고 ---------- */
  function addIngredients(text) {
    const names = text.split(/[,，、\n]/).map(norm).filter(Boolean);
    const have = fridgeSet();
    names.forEach((n) => {
      if (!have.has(n)) { state.fridge.push({ name: n, urgent: false }); have.add(n); }
    });
    save("fridge", state.fridge);
    renderFridge();
    renderPlan();
  }

  function renderFridge() {
    const box = $("#fridge");
    if (!state.fridge.length) {
      box.innerHTML = '<span class="empty">냉장고가 텅 비었어요. 위에 입력하거나 아래 야채칸에서 골라 넣어 주세요.</span>';
    } else {
      box.innerHTML = state.fridge.map((f, idx) => `
        <span class="chip ${f.urgent ? "urgent" : ""}" data-idx="${idx}" title="눌러서 '빨리 써야 함' 표시">
          ${f.urgent ? "⭐ " : ""}${esc(f.name)}
          <button class="x" data-del="${idx}" aria-label="삭제">×</button>
        </span>`).join("");
    }
    const have = fridgeSet();
    $("#quick").innerHTML = window.QUICK.filter((q) => !have.has(q))
      .map((q) => `<button class="chip add" data-q="${esc(q)}">+ ${esc(q)}</button>`).join("");
  }

  $("#ingForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#ingInput").value;
    if (v.trim()) addIngredients(v);
    $("#ingInput").value = "";
    $("#ingInput").focus();
  });

  $("#fridge").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      state.fridge.splice(+del.dataset.del, 1);
    } else {
      const chip = e.target.closest("[data-idx]");
      if (!chip) return;
      const f = state.fridge[+chip.dataset.idx];
      f.urgent = !f.urgent;
    }
    save("fridge", state.fridge);
    renderFridge();
    renderPlan();
  });

  $("#quick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (b) addIngredients(b.dataset.q);
  });

  $("#clearFridge").addEventListener("click", () => {
    if (!state.fridge.length || !confirm("냉장고 재료를 모두 지울까요?")) return;
    state.fridge = [];
    save("fridge", state.fridge);
    renderFridge();
    renderPlan();
  });

  /* ---------- 설정 ---------- */
  function readSettings() {
    state.settings = {
      days: +$("#days").value,
      meals: [...document.querySelectorAll('input[name="meal"]:checked')].map((c) => c.value),
      onlyHave: $("#onlyHave").checked
    };
    save("settings", state.settings);
  }
  function applySettings() {
    $("#days").value = String(state.settings.days);
    document.querySelectorAll('input[name="meal"]').forEach((c) => { c.checked = state.settings.meals.includes(c.value); });
    $("#onlyHave").checked = !!state.settings.onlyHave;
  }
  $("#days").addEventListener("change", readSettings);
  $("#onlyHave").addEventListener("change", readSettings);
  document.querySelectorAll('input[name="meal"]').forEach((c) => c.addEventListener("change", readSettings));

  /* ---------- 식단 생성 ---------- */
  const slotKey = (d, meal) => `${d}-${meal}`;

  function scoreRecipe(r, meal, ctx) {
    if (r.m && r.m.length && !r.m.includes(meal)) return null;
    const ings = r.i;
    const haveList = ings.filter((x) => ctx.have.has(x));
    if (!haveList.length) return null;
    const ratio = haveList.length / ings.length;
    if (ctx.onlyHave && ratio < 1) return null;
    if (ctx.exclude && ctx.exclude === r.n) return null;

    const used = ctx.usage[r.n] || 0;
    const sameDay = ctx.dayRecipes.has(r.n);
    if (sameDay) return null;

    let score = ratio * 10;
    score += haveList.filter((x) => ctx.urgent.has(x)).length * 3;
    score += haveList.filter((x) => !ctx.usedIngs.has(x)).length * 0.8; // 아직 안 쓴 재료 활용
    score -= used * 6;                                                    // 반복 메뉴 줄이기
    score += Math.random() * 3;
    return score;
  }

  function pick(meal, ctx) {
    let best = null, bestScore = -Infinity;
    for (const r of allRecipes()) {
      const s = scoreRecipe(r, meal, ctx);
      if (s !== null && s > bestScore) { best = r; bestScore = s; }
    }
    return best;
  }

  function buildCtx(slots, skipKey, day) {
    const usage = {}, usedIngs = new Set(), dayRecipes = new Set();
    for (const [k, v] of Object.entries(slots)) {
      if (k === skipKey || !v) continue;
      usage[v.n] = (usage[v.n] || 0) + 1;
      const r = findRecipe(v.n);
      if (r) r.i.forEach((x) => usedIngs.add(x));
      if (day !== undefined && k.startsWith(day + "-")) dayRecipes.add(v.n);
    }
    return {
      have: fridgeSet(), urgent: urgentSet(), onlyHave: state.settings.onlyHave,
      usage, usedIngs, dayRecipes
    };
  }

  function generate() {
    readSettings();
    const { days, meals } = state.settings;
    if (!state.fridge.length) { alert("먼저 냉장고 재료를 입력해 주세요."); return; }
    if (!meals.length) { alert("끼니를 하나 이상 선택해 주세요."); return; }

    const old = state.plan && state.plan.slots ? state.plan.slots : {};
    const slots = {};
    // 고정된 칸 먼저 유지
    for (let d = 0; d < days; d++) {
      for (const meal of meals) {
        const k = slotKey(d, meal);
        if (old[k] && old[k].locked) slots[k] = old[k];
      }
    }
    for (let d = 0; d < days; d++) {
      for (const meal of meals) {
        const k = slotKey(d, meal);
        if (slots[k]) continue;
        const ctx = buildCtx(slots, null, d);
        const r = pick(meal, ctx);
        slots[k] = r ? { n: r.n, locked: false } : null;
      }
    }
    state.plan = { days, meals: meals.slice(), start: todayStr(), slots };
    save("plan", state.plan);
    renderPlan();
    $("#planCard").scrollIntoView({ behavior: "smooth" });
  }

  function reroll(key) {
    const p = state.plan;
    const cur = p.slots[key];
    const [d, meal] = key.split("-");
    const ctx = buildCtx(p.slots, key, +d);
    ctx.exclude = cur ? cur.n : null;
    const r = pick(meal, ctx);
    if (!r) { alert("바꿀 수 있는 다른 메뉴가 없어요. 재료를 더 추가해 보세요."); return; }
    p.slots[key] = { n: r.n, locked: false };
    save("plan", p);
    renderPlan();
  }

  function todayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
  }
  function dayLabel(start, offset) {
    const [y, m, d] = start.split("-").map(Number);
    const dt = new Date(y, m - 1, d + offset);
    return `${dt.getMonth() + 1}/${dt.getDate()} (${DAY_NAMES[dt.getDay()]})`;
  }

  $("#generate").addEventListener("click", generate);

  /* ---------- 식단표 렌더 ---------- */
  function renderPlan() {
    const p = state.plan;
    const card = $("#planCard");
    if (!p) { card.hidden = true; return; }
    card.hidden = false;
    const have = fridgeSet();
    const missing = {};

    let html = "";
    for (let d = 0; d < p.days; d++) {
      html += `<div class="day"><div class="day-h">${d + 1}일차 · ${dayLabel(p.start, d)}</div>`;
      for (const meal of p.meals) {
        const k = slotKey(d, meal);
        const s = p.slots[k];
        const r = s && findRecipe(s.n);
        if (!r) {
          html += `<div class="slot empty-slot"><div class="meal">${meal}</div>
            <div class="menu">추천할 메뉴가 없어요</div>
            <div class="acts"><button data-reroll="${k}" title="다시 뽑기">🔄</button></div></div>`;
          continue;
        }
        const tags = r.i.map((x) => {
          const ok = have.has(x);
          if (!ok) missing[x] = (missing[x] || []).concat(r.n);
          return `<span class="tag ${ok ? "ok" : "miss"}">${esc(x)}</span>`;
        }).join("");
        html += `<div class="slot ${s.locked ? "locked" : ""}">
          <div class="meal">${meal}</div>
          <div class="menu">${esc(r.n)}${r.custom ? ' <small class="mine">내 레시피</small>' : ""}</div>
          <div class="tags">${tags}</div>
          <div class="acts">
            <button data-reroll="${k}" title="다시 뽑기" ${s.locked ? "disabled" : ""}>🔄</button>
            <button data-lock="${k}" title="고정">${s.locked ? "🔒" : "🔓"}</button>
          </div>
        </div>`;
      }
      html += "</div>";
    }
    $("#plan").innerHTML = html;

    const items = Object.entries(missing).sort((a, b) => b[1].length - a[1].length);
    $("#shopping").innerHTML = items.length
      ? items.map(([x, list]) => `<button class="chip buy" data-buy="${esc(x)}" title="${esc([...new Set(list)].join(", "))}">${esc(x)} <small>${list.length}회</small> ✓</button>`).join("")
        + '<div class="hint full">항목을 누르면 \'샀음\'으로 냉장고에 추가돼요.</div>'
      : '<span class="empty">부족한 재료가 없어요! 👍</span>';
  }

  $("#plan").addEventListener("click", (e) => {
    const rr = e.target.closest("[data-reroll]");
    const lk = e.target.closest("[data-lock]");
    if (rr) reroll(rr.dataset.reroll);
    if (lk) {
      const s = state.plan.slots[lk.dataset.lock];
      if (s) { s.locked = !s.locked; save("plan", state.plan); renderPlan(); }
    }
  });

  $("#shopping").addEventListener("click", (e) => {
    const b = e.target.closest("[data-buy]");
    if (b) addIngredients(b.dataset.buy);
  });

  $("#printBtn").addEventListener("click", () => window.print());

  /* ---------- 내 레시피 ---------- */
  function renderMyRecipes() {
    const box = $("#myRecipes");
    box.innerHTML = state.myRecipes.length
      ? state.myRecipes.map((r, idx) => `<div class="my-item">
          <div><b>${esc(r.n)}</b> <small>${esc(r.m.join("·") || "모든 끼니")}</small><br><span class="muted">${esc(r.i.join(", "))}</span></div>
          <button class="ghost" data-rdel="${idx}">삭제</button></div>`).join("")
      : '<span class="empty">추가한 레시피가 없어요.</span>';
  }

  $("#recipeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#rName").value.trim();
    const i = [...new Set($("#rIngs").value.split(/[,，、]/).map(norm).filter(Boolean))];
    const m = [...document.querySelectorAll('input[name="rMeal"]:checked')].map((c) => c.value);
    if (!n || !i.length) return;
    if (findRecipe(n)) { alert("같은 이름의 메뉴가 이미 있어요."); return; }
    state.myRecipes.push({ n, i, m });
    save("myRecipes", state.myRecipes);
    e.target.reset();
    renderMyRecipes();
  });

  $("#myRecipes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rdel]");
    if (!b) return;
    state.myRecipes.splice(+b.dataset.rdel, 1);
    save("myRecipes", state.myRecipes);
    renderMyRecipes();
    renderPlan();
  });

  /* ---------- 시작 ---------- */
  applySettings();
  renderFridge();
  renderMyRecipes();
  renderPlan();
})();
