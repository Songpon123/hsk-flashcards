(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const prefs = Object.assign({ level: "all", dir: "zh", pinyin: true, onlyNew: false, shuffle: false }, store.get("hskfc-prefs", {}));
  let known = new Set(store.get("hskfc-known", []));
  let ALL = [], deck = [], idx = 0, flipped = false, rank = new Map(), query = "";

  const card = $("#card"), front = $("#front"), back = $("#back");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s'’·…-]/g, "");
  const savePrefs = () => store.set("hskfc-prefs", prefs);
  const saveKnown = () => store.set("hskfc-known", [...known]);

  /* ---------- speech ---------- */
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  let zhVoice = null;
  function pickVoice() {
    if (!synth) return;
    let vs = [];
    try { vs = synth.getVoices(); } catch (e) { vs = []; }
    zhVoice = vs.find((v) => /zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
    document.documentElement.classList.toggle("can-speak", !!zhVoice);
  }
  if (synth) { pickVoice(); try { synth.addEventListener("voiceschanged", pickVoice); } catch (e) { synth.onvoiceschanged = pickVoice; } }
  function speak(text) {
    if (!synth || !zhVoice) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/…/g, "，"));
      u.lang = "zh-CN"; u.voice = zhVoice; u.rate = 0.82;
      synth.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
  const ICON_SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const speakBtn = (text, label, short) => `<button type="button" class="speak" data-say="${esc(text)}" aria-label="${esc(label)}">${ICON_SPEAK}${short ? "" : "ฟังเสียง"}</button>`;

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------- deck ---------- */
  const rankOf = (w) => { if (!rank.has(w.id)) rank.set(w.id, Math.random()); return rank.get(w.id); };
  function buildDeck(mode) {
    const curId = deck[idx] && deck[idx].id;
    let d = ALL.filter((w) => prefs.level === "all" || w.lv === Number(prefs.level));
    if (prefs.onlyNew) d = d.filter((w) => !known.has(w.id));
    const raw = query.trim();
    if (raw) {
      const q = fold(raw);
      d = d.filter((w) => w.h.includes(raw) || w.t.includes(raw) || (q && fold(w.p).includes(q)));
    }
    if (prefs.shuffle) d = d.slice().sort((a, b) => rankOf(a) - rankOf(b));
    deck = d;
    if (mode === "keepId") { const i = deck.findIndex((w) => w.id === curId); idx = i < 0 ? 0 : i; }
    else if (mode === "keepPos") idx = Math.min(idx, Math.max(0, deck.length - 1));
    else idx = 0;
    resetFlip();
    render();
  }

  function resetFlip() {
    flipped = false;
    card.classList.add("no-anim");
    card.classList.remove("flipped");
    void card.offsetWidth;
    requestAnimationFrame(() => card.classList.remove("no-anim"));
  }

  /* ---------- card markup ---------- */
  function tzg(h) {
    const chars = [...h];
    const n = chars.filter((c) => c !== "…").length || 1;
    const bx = n <= 1 ? "9rem" : n === 2 ? "8rem" : n === 3 ? "6.4rem" : "5.2rem";
    return `<div class="tzg" lang="zh-CN" style="--n:${n};--bx:${bx}">` +
      chars.map((c) => (c === "…" ? '<span class="dots">…</span>' : `<span class="box"><span class="ch">${esc(c)}</span></span>`)).join("") +
      "</div>";
  }
  function highlight(s, h) {
    let html = esc(s);
    h.split("…").filter(Boolean).forEach((p) => { html = html.split(esc(p)).join(`<mark>${esc(p)}</mark>`); });
    return html;
  }
  function topRow(w) {
    return `<div class="face-top"><span class="stamp">HSK ${w.lv}</span>${known.has(w.id) ? '<span class="known-tag">จำได้แล้ว</span>' : ""}</div>`;
  }
  function frontHTML(w) {
    if (prefs.dir === "th") {
      return topRow(w) +
        `<div class="face-main"><p class="th-big">${esc(w.t)}</p></div>` +
        '<div class="face-foot"><span class="hint">นึกคำภาษาจีนให้ได้ แล้วแตะบัตรเพื่อดูเฉลย</span></div>';
    }
    return topRow(w) +
      `<div class="face-main">${tzg(w.h)}${prefs.pinyin ? `<p class="py-big">${esc(w.p)}</p>` : ""}</div>` +
      `<div class="face-foot">${speakBtn(w.h, "ฟังเสียงคำนี้")}<span class="hint">แตะบัตรเพื่อดูความหมาย</span></div>`;
  }
  function backHTML(w) {
    return topRow(w) +
      `<div class="back-word"><span class="hz-mid" lang="zh-CN">${esc(w.h)}</span><span class="py-mid">${esc(w.p)}</span>${speakBtn(w.h, "ฟังเสียงคำนี้", true)}</div>` +
      `<p class="th-mean">${esc(w.t)}</p>` +
      '<div class="ex">' +
      `<div class="ex-label">ประโยคตัวอย่าง ${speakBtn(w.s, "ฟังเสียงประโยคตัวอย่าง", true)}</div>` +
      `<p class="ex-zh" lang="zh-CN">${highlight(w.s, w.h)}</p>` +
      `<p class="ex-py">${esc(w.sp)}</p>` +
      `<p class="ex-th">${esc(w.st)}</p>` +
      "</div>";
  }

  /* ---------- render ---------- */
  function renderLevels() {
    const opts = [["all", "ทั้งหมด"], ["1", "HSK 1"], ["2", "HSK 2"], ["3", "HSK 3"]];
    $("#levels").innerHTML = opts.map(([v, label]) => {
      const words = v === "all" ? ALL : ALL.filter((w) => w.lv === Number(v));
      const k = words.reduce((a, w) => a + (known.has(w.id) ? 1 : 0), 0);
      return `<button type="button" class="seg" data-level="${v}" aria-pressed="${String(prefs.level) === v}">` +
        `<span class="seg-name">${label}</span><span class="seg-meta">จำได้ ${k}/${words.length}</span></button>`;
    }).join("");
  }
  function renderOpts() {
    $("#dirZh").setAttribute("aria-pressed", prefs.dir === "zh");
    $("#dirTh").setAttribute("aria-pressed", prefs.dir === "th");
    $("#optPinyin").setAttribute("aria-pressed", !!prefs.pinyin);
    $("#optPinyin").disabled = prefs.dir === "th";
    $("#optPinyin").style.opacity = prefs.dir === "th" ? ".5" : "";
    $("#optNew").setAttribute("aria-pressed", !!prefs.onlyNew);
    $("#optShuffle").setAttribute("aria-pressed", !!prefs.shuffle);
  }
  function render() {
    renderLevels();
    renderOpts();
    const w = deck[idx];
    $("#count").textContent = deck.length ? `บัตรที่ ${idx + 1} จาก ${deck.length}` : "ไม่มีบัตรในชุดนี้";
    $("#bar").style.width = deck.length ? ((idx + 1) / deck.length) * 100 + "%" : "0%";
    $("#scene").hidden = !w; $("#actions").hidden = !w; $("#empty").hidden = !!w;
    if (!w) { renderEmpty(); return; }
    card.classList.toggle("flipped", flipped);
    front.innerHTML = frontHTML(w);
    back.innerHTML = backHTML(w);
    front.setAttribute("aria-hidden", String(flipped));
    back.setAttribute("aria-hidden", String(!flipped));
    card.setAttribute("aria-label", flipped ? `เฉลย: ${w.h} ${w.p} ${w.t} แตะเพื่อพลิกกลับ` : "บัตรคำ แตะเพื่อดูเฉลย");
    $("#flipBtn").textContent = flipped ? "ดูด้านหน้า" : "ดูเฉลย";
    $("#know").innerHTML = (known.has(w.id) ? "<kbd>2</kbd> จำได้แล้ว ✓" : "<kbd>2</kbd> จำได้แล้ว");
  }
  function renderEmpty() {
    const action = $("#emptyAction");
    action.hidden = true;
    if (query.trim()) {
      $("#emptyBig").textContent = `ไม่พบคำที่ตรงกับ “${query.trim()}”`;
      $("#emptyMsg").textContent = "ลองค้นด้วยตัวจีน พินอินแบบไม่ใส่วรรณยุกต์ (เช่น xuexi) หรือคำไทย";
      action.textContent = "ล้างคำค้นหา"; action.hidden = false; action.dataset.do = "clear";
    } else if (prefs.onlyNew) {
      $("#emptyBig").textContent = "จำได้ครบทุกคำในชุดนี้แล้ว";
      $("#emptyMsg").textContent = "ปิดตัวกรอง “เฉพาะคำที่ยังไม่แม่น” เพื่อทบทวนทุกคำอีกรอบ";
      action.textContent = "แสดงทุกคำ"; action.hidden = false; action.dataset.do = "all";
    } else {
      $("#emptyBig").textContent = "ยังไม่มีคำศัพท์";
      $("#emptyMsg").textContent = "";
    }
  }

  /* ---------- actions ---------- */
  function flip() { if (!deck.length) return; flipped = !flipped; render(); }
  function go(d) {
    if (!deck.length) return;
    const next = idx + d;
    if (next >= deck.length) toast("ครบรอบแล้ว เริ่มใหม่จากบัตรแรก");
    idx = (next + deck.length) % deck.length;
    resetFlip();
    render();
  }
  function mark(isKnown) {
    const w = deck[idx];
    if (!w) return;
    if (isKnown) known.add(w.id); else known.delete(w.id);
    saveKnown();
    if (prefs.onlyNew && isKnown) {
      buildDeck("keepPos");
      if (deck.length) toast(`เหลืออีก ${deck.length} คำ`);
    } else go(1);
  }

  /* ---------- events ---------- */
  let sx = 0, sy = 0, swiped = false;
  card.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; swiped = false; });
  card.addEventListener("pointerup", (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; go(dx < 0 ? 1 : -1); }
  });
  card.addEventListener("click", (e) => {
    const sp = e.target.closest(".speak");
    if (sp) { speak(sp.dataset.say); return; }
    if (swiped) { swiped = false; return; }
    flip();
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.target.closest(".speak")) { e.preventDefault(); flip(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
    if (e.key === " ") { e.preventDefault(); flip(); }
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "1") mark(false);
    else if (e.key === "2") mark(true);
  });

  $("#levels").addEventListener("click", (e) => {
    const b = e.target.closest(".seg");
    if (!b) return;
    prefs.level = b.dataset.level; savePrefs(); buildDeck("reset");
  });
  document.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => {
    prefs.dir = b.dataset.dir; savePrefs(); resetFlip(); render();
  }));
  $("#optPinyin").addEventListener("click", () => { prefs.pinyin = !prefs.pinyin; savePrefs(); render(); });
  $("#optNew").addEventListener("click", () => { prefs.onlyNew = !prefs.onlyNew; savePrefs(); buildDeck("keepId"); });
  $("#optShuffle").addEventListener("click", () => {
    prefs.shuffle = !prefs.shuffle; savePrefs();
    if (prefs.shuffle) { rank = new Map(); buildDeck("reset"); toast("สุ่มลำดับบัตรใหม่แล้ว"); }
    else buildDeck("keepId");
  });
  $("#flipBtn").addEventListener("click", flip);
  $("#prev").addEventListener("click", () => go(-1));
  $("#next").addEventListener("click", () => go(1));
  $("#miss").addEventListener("click", () => mark(false));
  $("#know").addEventListener("click", () => mark(true));

  const qInput = $("#q");
  qInput.addEventListener("input", () => { query = qInput.value; $("#qClear").hidden = !query; buildDeck("reset"); });
  $("#qClear").addEventListener("click", () => { qInput.value = ""; query = ""; $("#qClear").hidden = true; buildDeck("reset"); qInput.focus(); });
  $("#emptyAction").addEventListener("click", (e) => {
    if (e.currentTarget.dataset.do === "clear") $("#qClear").click();
    else { prefs.onlyNew = false; savePrefs(); buildDeck("reset"); }
  });

  let armTimer = 0;
  $("#reset").addEventListener("click", (e) => {
    const b = e.currentTarget;
    const label = prefs.level === "all" ? "ทุกระดับ" : `HSK ${prefs.level}`;
    if (!b.classList.contains("armed")) {
      b.classList.add("armed"); b.textContent = `กดอีกครั้งเพื่อล้างสถานะจำได้ของ ${label}`;
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { b.classList.remove("armed"); b.textContent = "ล้างสถานะจำได้ของระดับที่เลือก"; }, 3500);
      return;
    }
    clearTimeout(armTimer);
    ALL.forEach((w) => { if (prefs.level === "all" || w.lv === Number(prefs.level)) known.delete(w.id); });
    saveKnown();
    b.classList.remove("armed"); b.textContent = "ล้างสถานะจำได้ของระดับที่เลือก";
    toast(`ล้างสถานะจำได้ของ ${label} แล้ว`);
    buildDeck("keepId");
  });

  /* ---------- load ---------- */
  async function loadData() {
    if (Array.isArray(window.HSK_DATA)) return window.HSK_DATA;
    const r = await fetch("words.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  loadData().then((rows) => {
    ALL = rows.map(([lv, h, p, t, s, sp, st]) => ({ id: `${lv}|${h}|${p}`, lv, h, p, t, s, sp, st }));
    const n = (lv) => ALL.filter((w) => w.lv === lv).length;
    $("#lede").textContent = `${ALL.length} คำ (HSK 1: ${n(1)} · HSK 2: ${n(2)} · HSK 3: ${n(3)}) พร้อมพินอิน คำแปลไทย และประโยคตัวอย่าง`;
    buildDeck("reset");
  }).catch(() => {
    $("#count").textContent = "โหลดคำศัพท์ไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง";
  });
})();
