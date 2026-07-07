/* ===== 30-Day Hyrox Prep — app logic ===== */
(function () {
  "use strict";

  // ---- Config ----
  // Your Gumroad PRODUCT ID (not the permalink). To find it: in Gumroad, edit
  // your product → enable "Generate a unique license key per sale" → Gumroad
  // shows a verification code snippet that contains this ID. It looks like a
  // long token, e.g. "z9fkq-abc123...". Paste it here before you go live.
  const GUMROAD_PRODUCT_ID = "YOUR_GUMROAD_PRODUCT_ID";
  const VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

  const TOTAL = DAYS.length;           // 30
  const LS = {
    unlocked: "hx_unlocked",
    license:  "hx_license",
    done:     "hx_done",
    level:    "hx_level",
    race:     "hx_racedate",
  };

  // ---- State ----
  const store = {
    getDone() { try { return JSON.parse(localStorage.getItem(LS.done)) || []; } catch { return []; } },
    setDone(a) { localStorage.setItem(LS.done, JSON.stringify(a)); },
    getLevel() { return localStorage.getItem(LS.level) || "intermediate"; },
    setLevel(l) { localStorage.setItem(LS.level, l); },
    getRace() { return localStorage.getItem(LS.race) || ""; },
    setRace(d) { localStorage.setItem(LS.race, d); },
    getLicense() { return localStorage.getItem(LS.license) || ""; },
    isUnlocked() { return localStorage.getItem(LS.unlocked) === "1"; },
    unlock(key) { localStorage.setItem(LS.unlocked, "1"); if (key) localStorage.setItem(LS.license, key); },
    lock() { localStorage.removeItem(LS.unlocked); localStorage.removeItem(LS.license); },
  };

  let level = store.getLevel();
  const phaseColor = { 1: "var(--p1)", 2: "var(--p2)", 3: "var(--p3)", 4: "var(--p4)" };

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  // ---- Countdown: which day should the user be on ----
  function daysUntilRace() {
    const r = store.getRace();
    if (!r) return null;
    const race = new Date(r + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((race - today) / 86400000);
  }
  // Day 30 = race day, so current day = 30 - daysUntil. Clamp 1..30.
  function currentDay() {
    const d = daysUntilRace();
    if (d === null) return null;
    return Math.min(TOTAL, Math.max(1, TOTAL - d));
  }

  const doneSet = () => new Set(store.getDone());
  const completedCount = () => store.getDone().filter(d => d >= 1 && d <= TOTAL).length;

  /* =======================================================
     GATE — Gumroad license verification (no backend)
  ======================================================= */

  // Verify a license key against Gumroad. Returns { ok, reason, purchase }.
  // reason: "invalid" (bad key) | "refunded" | "cancelled" | "server" (transient)
  async function verifyLicense(key, increment) {
    const body = new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: key,
      increment_uses_count: increment ? "true" : "false",
    });
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? "server" : "invalid" };
    const data = await res.json().catch(() => ({}));
    if (!data.success) return { ok: false, reason: "invalid" };
    const p = data.purchase || {};
    if (p.refunded || p.chargebacked || p.disputed) return { ok: false, reason: "refunded" };
    if (p.subscription_cancelled_at || p.subscription_ended_at || p.subscription_failed_at)
      return { ok: false, reason: "cancelled" };
    return { ok: true, purchase: p };
  }

  const REASON_MSG = {
    invalid:  "Invalid license key. Copy it exactly from your Gumroad receipt.",
    refunded: "This purchase was refunded or disputed — access is closed.",
    cancelled:"This subscription is no longer active.",
    server:   "License server is busy. Give it a moment and try again.",
  };

  // Pull a license key out of the URL (?key= / ?license= / ?license_key= or the
  // same in the #hash). Lets a redirect or automation hand the key straight to
  // the app. Inert with plain Gumroad, but ready if a key ever rides in.
  function readKeyFromUrl() {
    const grab = (s) => {
      const p = new URLSearchParams(s);
      return p.get("key") || p.get("license") || p.get("license_key") || "";
    };
    const k = grab(location.search) || grab(location.hash.replace(/^#/, ""));
    return k ? k.trim() : "";
  }
  // Remove the key from the address bar / history once we've read it.
  function stripKeyFromUrl() {
    try { history.replaceState(null, "", location.pathname); } catch (_) {}
  }

  function renderGate() {
    const gate = $("#gate");
    gate.classList.remove("hidden");
    const form = $("#gate-form");
    const err = $("#gate-error");
    const input = $("#gate-input");
    const btn = form.querySelector(".btn");
    let busy = false;

    async function attemptUnlock() {
      const key = input.value.trim();
      if (!key || busy) return;
      if (GUMROAD_PRODUCT_ID === "YOUR_GUMROAD_PRODUCT_ID") {
        err.textContent = "Setup needed — add your Gumroad product ID in app.js.";
        return;
      }
      busy = true;
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "Checking…";
      try {
        const r = await verifyLicense(key, true);
        if (r.ok) { store.unlock(key); enterApp(gate); return; }
        err.textContent = REASON_MSG[r.reason] || REASON_MSG.invalid;
        shake(form);
      } catch (_) {
        err.textContent = "Couldn't reach the license server. Check your connection.";
      } finally {
        busy = false;
        btn.disabled = false;
        btn.textContent = "Unlock";
      }
    }

    form.addEventListener("submit", (e) => { e.preventDefault(); attemptUnlock(); });
    // Auto-verify the moment they paste a key in.
    input.addEventListener("paste", () => setTimeout(() => { if (input.value.trim()) attemptUnlock(); }, 30));

    // One-tap "paste my key" — reads the key they copied from the Gumroad
    // receipt and verifies it. Shown only where the clipboard API exists.
    if (navigator.clipboard && navigator.clipboard.readText) {
      const paste = el("button", "btn btn-ghost gate-paste", "Paste my key");
      paste.type = "button";
      paste.addEventListener("click", async () => {
        try {
          const t = (await navigator.clipboard.readText()).trim();
          if (t) { input.value = t; attemptUnlock(); }
          else err.textContent = "Clipboard is empty — copy your key first.";
        } catch (_) { err.textContent = "Couldn't read clipboard — paste your key manually."; }
      });
      form.appendChild(paste);
    }

    // Dev-only preview unlock. Rendered on localhost ONLY — never on your live
    // site — so you can click through the app without a real key while testing.
    if (isDevHost()) {
      const dev = el("button", "gate-dev", "Dev preview (localhost only)");
      dev.type = "button";
      dev.addEventListener("click", () => { store.unlock(); enterApp(gate); });
      form.appendChild(dev);
    }

    // If a key came in on the URL, fill it, clean the URL, and verify.
    const urlKey = readKeyFromUrl();
    if (urlKey) { input.value = urlKey; stripKeyFromUrl(); attemptUnlock(); }
  }

  function enterApp(gate) {
    gate.style.opacity = "0";
    gate.style.transition = "opacity .35s";
    setTimeout(() => { gate.classList.add("hidden"); boot(); }, 350);
  }

  function shake(node) {
    node.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
      { duration: 260 }
    );
  }

  function isDevHost() {
    const h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local") || h === "";
  }

  // Silent re-check on load: catches refunds/disputes without blocking offline
  // (gym) use. Only re-locks on a definitive negative, never a network hiccup.
  async function revalidate() {
    const key = store.getLicense();
    if (!key || GUMROAD_PRODUCT_ID === "YOUR_GUMROAD_PRODUCT_ID" || !navigator.onLine) return;
    try {
      const r = await verifyLicense(key, false);
      if (!r.ok && r.reason !== "server") { store.lock(); location.reload(); }
    } catch (_) { /* offline / transient — keep access */ }
  }

  /* =======================================================
     APP RENDER
  ======================================================= */
  function boot() {
    $("#app").classList.remove("hidden");
    renderHeader();
    renderProgress();
    renderLevelToggle();
    renderGrid();
    maybePromptRaceDate();
  }

  function renderHeader() {
    const host = $("#count-host");
    const cur = currentDay();
    const d = daysUntilRace();
    if (cur === null) {
      host.innerHTML = `<button class="count-edit" id="set-race-cta">Set your race date →</button>`;
      $("#set-race-cta").addEventListener("click", () => openRaceModal());
      return;
    }
    let msg;
    if (d < 0)       msg = `<span class="count-num">Race was <b>${Math.abs(d)}</b></span><span class="count-sub">days ago — restart anytime</span>`;
    else if (d === 0) msg = `<span class="count-num" style="color:var(--p4)">RACE DAY</span><span class="count-sub">— trust the work</span>`;
    else             msg = `<span class="count-num"><b>${d}</b> days out</span><span class="count-sub">· you're on Day ${cur}</span>`;
    host.innerHTML = `<div class="count">${msg} <button class="count-edit" id="edit-race">edit</button></div>`;
    $("#edit-race").addEventListener("click", () => openRaceModal());
  }

  function renderProgress() {
    const done = completedCount();
    const pct = Math.round((done / TOTAL) * 100);
    $("#progress-pct").innerHTML = `${pct}<span>%</span>`;
    $("#progress-count").textContent = `${done} / ${TOTAL} days`;
    requestAnimationFrame(() => { $("#pbar-fill").style.width = pct + "%"; });

    // per-phase mini bars
    const ds = doneSet();
    const cur = currentDay();
    const host = $("#phases");
    host.innerHTML = "";
    PHASES.forEach(p => {
      const [a, b] = p.days;
      const total = b - a + 1;
      let doneInPhase = 0;
      for (let i = a; i <= b; i++) if (ds.has(i)) doneInPhase++;
      const active = cur !== null && cur >= a && cur <= b;
      const pill = el("button", "phase-pill" + (active ? " active" : ""));
      pill.style.setProperty("--pc", phaseColor[p.id]);
      pill.innerHTML = `
        <div class="pp-tag">${p.short}</div>
        <div class="pp-name">${p.name}</div>
        <div class="pp-bar"><i style="width:${(doneInPhase / total) * 100}%"></i></div>`;
      pill.addEventListener("click", () => {
        const cell = $(`#cell-${a}`);
        if (cell) cell.scrollIntoView({ behavior: "smooth", block: "center" });
        openDay(cur && cur >= a && cur <= b ? cur : a);
      });
      host.appendChild(pill);
    });
  }

  function renderLevelToggle() {
    const wrap = $("#level-toggle");
    wrap.innerHTML = "";
    const thumb = el("div", "toggle-thumb");
    const opts = [["beginner", "Beginner"], ["intermediate", "Intermediate"]];
    const btns = [];
    opts.forEach(([val, label]) => {
      const b = el("button", null, label);
      b.dataset.val = val;
      b.addEventListener("click", () => setLevel(val));
      btns.push(b);
      wrap.appendChild(b);
    });
    wrap.appendChild(thumb);
    positionThumb();
    function positionThumb() {
      btns.forEach(b => b.classList.toggle("on", b.dataset.val === level));
      const on = btns.find(b => b.dataset.val === level);
      thumb.style.width = on.offsetWidth + "px";
      thumb.style.transform = `translateX(${on.offsetLeft - 3}px)`;
    }
    wrap._reposition = positionThumb;
  }

  function setLevel(l) {
    if (l === level) return;
    level = l;
    store.setLevel(l);
    if ($("#level-toggle")._reposition) $("#level-toggle")._reposition();
    // if sheet open, re-render its set list
    if (openSheetDay !== null) renderSheet(openSheetDay, true);
  }

  function renderGrid() {
    const grid = $("#grid");
    grid.innerHTML = "";
    const ds = doneSet();
    const cur = currentDay();
    DAYS.forEach(day => {
      const cell = el("button", "cell");
      cell.id = `cell-${day.day}`;
      cell.style.setProperty("--pc", phaseColor[day.phase]);
      if (ds.has(day.day)) cell.classList.add("done");
      if (day.rest) cell.classList.add("rest");
      if (day.raceDay) cell.classList.add("race");
      if (cur === day.day) cell.classList.add("today");
      const tag = day.raceDay ? "RACE" : (day.rest ? "REST" : "P" + day.phase);
      cell.innerHTML = `
        <span class="c-check">✓</span>
        <span class="c-day">${day.raceDay ? "🏁" : day.day}</span>
        <span class="c-tag">${tag}</span>`;
      cell.addEventListener("click", () => openDay(day.day));
      grid.appendChild(cell);
    });
  }

  /* =======================================================
     DAY SHEET
  ======================================================= */
  let openSheetDay = null;

  function openDay(n) {
    openSheetDay = n;
    renderSheet(n);
    $("#sheet-scrim").classList.add("open");
    $("#sheet").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeSheet() {
    openSheetDay = null;
    $("#sheet-scrim").classList.remove("open");
    $("#sheet").classList.remove("open");
    document.body.style.overflow = "";
  }

  function renderSheet(n, keepOpen) {
    const day = DAYS[n - 1];
    const sheet = $("#sheet");
    const ds = doneSet();
    const isDone = ds.has(n);
    const pc = phaseColor[day.phase];
    const phase = PHASES.find(p => p.id === day.phase);
    sheet.style.setProperty("--pc", pc);
    sheet.classList.toggle("race", !!day.raceDay);

    const sets = day.main[level] || day.main.intermediate;
    const setItems = sets.map(s => `<li>${s}</li>`).join("");

    const showLevel = !day.rest && !day.raceDay;

    sheet.innerHTML = `
      <div class="sheet-grip"></div>
      <div class="sheet-tag"><i></i>${phase.short} · ${phase.name}</div>
      <div class="sheet-daynum"><b>${day.raceDay ? "30" : day.day}</b><span class="of">of ${TOTAL}</span></div>
      <h2>${day.session}</h2>

      ${showLevel ? `<div class="sheet-level" id="sheet-level-host"></div>` : ""}

      ${day.warmup && day.warmup !== "—" ? `
        <div class="block">
          <div class="block-label">Warm-up</div>
          <div class="block-body warmup">${day.warmup}</div>
        </div>` : ""}

      <div class="block">
        <div class="block-label">Main set</div>
        <ul class="set-list">${setItems}</ul>
      </div>

      <div class="block note">
        <div class="block-label">Coaching note</div>
        <p>${day.note}</p>
      </div>

      <button class="complete-btn ${isDone ? "done" : ""}" id="complete-btn">
        <span class="chk">${isDone ? "✓" : "○"}</span>
        ${isDone ? "Completed" : "Mark complete"}
      </button>

      <div class="sheet-nav">
        <button id="prev-day" ${n <= 1 ? "disabled" : ""}>← Day ${n - 1}</button>
        <button id="next-day" ${n >= TOTAL ? "disabled" : ""}>Day ${n + 1} →</button>
      </div>`;

    // inline level toggle
    if (showLevel) {
      const host = $("#sheet-level-host");
      const t = el("div", "toggle");
      const thumb = el("div", "toggle-thumb");
      const btns = [];
      [["beginner", "Beginner"], ["intermediate", "Intermediate"]].forEach(([val, label]) => {
        const b = el("button", null, label);
        b.dataset.val = val;
        b.addEventListener("click", () => setLevel(val));
        btns.push(b); t.appendChild(b);
      });
      t.appendChild(thumb);
      host.appendChild(t);
      requestAnimationFrame(() => {
        btns.forEach(b => b.classList.toggle("on", b.dataset.val === level));
        const on = btns.find(b => b.dataset.val === level);
        thumb.style.width = on.offsetWidth + "px";
        thumb.style.transform = `translateX(${on.offsetLeft - 3}px)`;
      });
    }

    $("#complete-btn").addEventListener("click", () => toggleDone(n));
    const prev = $("#prev-day"), next = $("#next-day");
    if (prev) prev.addEventListener("click", () => { if (n > 1) { openSheetDay = n - 1; renderSheet(n - 1); sheet.scrollTop = 0; } });
    if (next) next.addEventListener("click", () => { if (n < TOTAL) { openSheetDay = n + 1; renderSheet(n + 1); sheet.scrollTop = 0; } });
  }

  function toggleDone(n) {
    const arr = store.getDone();
    const i = arr.indexOf(n);
    if (i >= 0) arr.splice(i, 1); else arr.push(n);
    store.setDone(arr);
    renderSheet(n);
    renderGrid();
    renderProgress();
    if (!arr.includes(n)) return;
    // celebrate
    const cell = $(`#cell-${n}`);
    if (cell) cell.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    if (completedCount() === TOTAL) setTimeout(celebrate, 200);
  }

  function celebrate() {
    const c = el("div", null, "");
    c.style.cssText = "position:fixed;inset:0;z-index:200;pointer-events:none;display:flex;align-items:center;justify-content:center;";
    c.innerHTML = `<div style="font-weight:900;font-size:14vw;color:var(--accent);text-transform:uppercase;letter-spacing:-.03em;text-shadow:0 0 40px var(--accent)">DONE</div>`;
    document.body.appendChild(c);
    c.firstChild.animate(
      [{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1.05)", opacity: 1, offset: .3 }, { transform: "scale(1)", opacity: 1, offset: .7 }, { transform: "scale(1.1)", opacity: 0 }],
      { duration: 1600, easing: "ease-out" }
    ).onfinish = () => c.remove();
  }

  /* =======================================================
     RACE DATE MODAL
  ======================================================= */
  function maybePromptRaceDate() {
    if (!store.getRace()) openRaceModal(true);
  }

  function openRaceModal(firstTime) {
    const scrim = $("#modal-scrim");
    scrim.classList.add("open");
    const input = $("#race-input");
    input.value = store.getRace() || "";
    // min = today
    const today = new Date(); today.setHours(0,0,0,0);
    input.min = today.toISOString().slice(0, 10);
    $("#modal-skip").textContent = firstTime ? "I'll set it later" : "Cancel";
  }
  function closeRaceModal() { $("#modal-scrim").classList.remove("open"); }

  function wireRaceModal() {
    $("#race-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#race-input").value;
      if (!v) return;
      store.setRace(v);
      closeRaceModal();
      renderHeader();
      renderProgress();
      renderGrid();
      const cur = currentDay();
      if (cur) setTimeout(() => openDay(cur), 260);
    });
    $("#modal-skip").addEventListener("click", closeRaceModal);
    $("#modal-scrim").addEventListener("click", (e) => { if (e.target === $("#modal-scrim")) closeRaceModal(); });
  }

  /* =======================================================
     WIRING
  ======================================================= */
  function wire() {
    $("#sheet-scrim").addEventListener("click", closeSheet);
    wireRaceModal();
    $("#reset-btn").addEventListener("click", () => {
      if (confirm("Reset all progress? This clears completed days and your race date.")) {
        localStorage.removeItem(LS.done);
        localStorage.removeItem(LS.race);
        renderHeader(); renderProgress(); renderGrid();
      }
    });
    // swipe-down to close sheet
    let sy = 0;
    const sheet = $("#sheet");
    sheet.addEventListener("touchstart", (e) => { if (sheet.scrollTop <= 0) sy = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (sheet.scrollTop <= 0 && sy) {
        const dy = e.touches[0].clientY - sy;
        if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
      }
    }, { passive: true });
    sheet.addEventListener("touchend", (e) => {
      const dy = e.changedTouches[0].clientY - sy;
      sheet.style.transform = "";
      if (dy > 110 && sy) closeSheet();
      sy = 0;
    });
    // reposition top level toggle thumb on resize
    window.addEventListener("resize", () => { if ($("#level-toggle") && $("#level-toggle")._reposition) $("#level-toggle")._reposition(); });
  }

  /* =======================================================
     INIT
  ======================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    wire();
    if (store.isUnlocked()) { $("#gate").classList.add("hidden"); boot(); revalidate(); }
    else renderGate();
  });
})();
