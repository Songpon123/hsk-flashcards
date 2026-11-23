(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const prefs = Object.assign(
    { level: "all", dir: "zh", lang: "th", pinyin: true, onlyNew: false, shuffle: false, originOpen: true },
    store.get("hskfc-prefs", {})
  );
  if (prefs.dir === "th") prefs.dir = "mean"; // older saved setting
  if (prefs.lang !== "en") prefs.lang = "th";
  let known = new Set(store.get("hskfc-known", []));
  let ALL = [], CHARS = {}, deck = [], idx = 0, flipped = false, rank = new Map(), query = "";

  const card = $("#card"), cardTop = $("#cardTop"), cardBody = $("#cardBody");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s'’·…-]/g, "");
  const hz = (html) => html.replace(/[⺀-⿟㐀-鿿豈-﫿]|[\ud840-\ud87f][\udc00-\udfff]/g, '<span class="hz" lang="zh-CN">$&</span>');
  const savePrefs = () => store.set("hskfc-prefs", prefs);
  const saveKnown = () => store.set("hskfc-known", [...known]);

  /* ---------- interface text ---------- */
  const STR = {
    th: {
      title: "บัตรคำศัพท์ HSK 1–3",
      lede: "{n} คำ · HSK 1: {a} · HSK 2: {b} · HSK 3: {c} · พร้อมพินอิน คำแปลไทยและอังกฤษ ประโยคตัวอย่าง และที่มาของตัวอักษร",
      ledeLoading: "คำศัพท์ภาษาจีนพร้อมพินอิน คำแปล ประโยคตัวอย่าง และที่มาของตัวอักษร",
      levels: "เลือกระดับ", all: "ทั้งหมด", knownOf: "จำได้ {k}/{n}",
      dirGroup: "ด้านหน้าบัตร", dirZh: "จีน → ไทย", dirMean: "ไทย → จีน",
      pinyinFront: "พินอินด้านหน้า", onlyNew: "เฉพาะคำที่ยังไม่แม่น", shuffle: "สุ่มลำดับ",
      search: "ค้นหาด้วยตัวจีน พินอิน คำไทย หรือคำอังกฤษ", clear: "ล้าง",
      loading: "กำลังโหลดคำศัพท์…", loadFail: "โหลดคำศัพท์ไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง",
      count: "บัตรที่ {i} จาก {n}", noCards: "ไม่มีบัตรในชุดนี้",
      keys: "<kbd>Space</kbd> ดูเฉลย · <kbd>←</kbd> <kbd>→</kbd> เปลี่ยนบัตร",
      hintZh: "คำนี้แปลว่าอะไร?", hintMean: "ภาษาจีนพูดว่าอย่างไร?", answer: "เฉลย",
      example: "ประโยคตัวอย่าง", seqHidden: "แตะบัตรเพื่อดูเฉลย", seqShown: "จำคำนี้ได้ไหม? เลือกปุ่มด้านล่าง",
      listen: "ฟังเสียงภาษาจีน", listenWord: "ฟังเสียงคำนี้", listenSentence: "ฟังเสียงประโยคตัวอย่าง",
      reveal: "ดูเฉลย", hide: "ซ่อนเฉลย", prev: "← ก่อนหน้า", next: "ถัดไป →",
      miss: "ยังไม่แม่น", know: "จำได้แล้ว", knownTag: "จำได้แล้ว",
      origin: "ที่มาและความหมาย", literal: "ความหมายตามตัว", byChar: "แยกทีละตัวอักษร",
      kindP: "ส่วนความหมาย + ส่วนเสียง", kindI: "อักษรรวมความหมาย", kindG: "อักษรภาพ", kindN: "ส่วนประกอบ",
      meaningPart: "ความหมาย", soundPart: "เสียง", noOrigin: "ไม่มีข้อมูลที่มาของตัวอักษรนี้ในพจนานุกรม",
      credit: "โครงสร้างตัวอักษรจาก Make Me a Hanzi",
      emptySearch: "ไม่พบคำที่ตรงกับ “{q}”", emptySearchHelp: "ลองค้นด้วยตัวจีน พินอินแบบไม่ใส่วรรณยุกต์ (เช่น xuexi) คำไทย หรือคำอังกฤษ",
      clearSearch: "ล้างคำค้นหา", allKnown: "จำได้ครบทุกคำในชุดนี้แล้ว",
      allKnownHelp: "ปิดตัวกรอง “เฉพาะคำที่ยังไม่แม่น” เพื่อทบทวนทุกคำอีกรอบ", showAll: "แสดงทุกคำ", noWords: "ยังไม่มีคำศัพท์",
      lap: "ครบรอบแล้ว เริ่มใหม่จากบัตรแรก", left: "เหลืออีก {n} คำ", shuffled: "สุ่มลำดับบัตรใหม่แล้ว",
      levelAll: "ทุกระดับ", reset: "ล้างสถานะจำได้ของระดับที่เลือก", resetArm: "กดอีกครั้งเพื่อล้างสถานะจำได้ของ {l}",
      resetDone: "ล้างสถานะจำได้ของ {l} แล้ว",
      foot1: "อ้างอิงรายการคำศัพท์ HSK มาตรฐานเดิม (HSK 2.0) ระดับ 1–3 ประโยคตัวอย่าง คำแปล และความหมายตามตัวเรียบเรียงขึ้นสำหรับชุดนี้ ปุ่มฟังเสียงจะแสดงเมื่อเครื่องของคุณมีเสียงอ่านภาษาจีน",
      foot2: "สถานะ “จำได้แล้ว” บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น",
      foot3: "ที่มาของตัวอักษรใช้ข้อมูลจาก Make Me a Hanzi dictionary.txt (© Shaunak Kishore และผู้ร่วมพัฒนา) ภายใต้สัญญาอนุญาต LGPL-3.0 ส่วนคำแปลไทยเรียบเรียงเพิ่มสำหรับชุดนี้ <a href=\"https://github.com/Songpon123/hsk-flashcards/blob/main/DATA_LICENSE.md\" target=\"_blank\" rel=\"noreferrer\">รายละเอียดสัญญาอนุญาต ↗</a>",
    },
    en: {
      title: "HSK 1–3 Flashcards",
      lede: "{n} words · HSK 1: {a} · HSK 2: {b} · HSK 3: {c} · with pinyin, English and Thai meanings, example sentences and character origins",
      ledeLoading: "Chinese words with pinyin, meanings, example sentences and character origins",
      levels: "Choose a level", all: "All", knownOf: "Known {k}/{n}",
      dirGroup: "Card front", dirZh: "Chinese → English", dirMean: "English → Chinese",
      pinyinFront: "Pinyin on front", onlyNew: "Only words I'm still learning", shuffle: "Shuffle",
      search: "Search by characters, pinyin, English or Thai", clear: "Clear",
      loading: "Loading words…", loadFail: "Couldn't load the words. Try reloading this page.",
      count: "Card {i} of {n}", noCards: "No cards in this set",
      keys: "<kbd>Space</kbd> reveal · <kbd>←</kbd> <kbd>→</kbd> change card",
      hintZh: "What does this word mean?", hintMean: "How do you say it in Chinese?", answer: "Answer",
      example: "Example sentence", seqHidden: "Tap the card to reveal the answer", seqShown: "Did you remember it? Choose below.",
      listen: "Listen in Mandarin", listenWord: "Listen to this word", listenSentence: "Listen to the example sentence",
      reveal: "Reveal answer", hide: "Hide answer", prev: "← Previous", next: "Next →",
      miss: "Still learning", know: "I know it", knownTag: "Known",
      origin: "Origin & meaning", literal: "Literally", byChar: "Character by character",
      kindP: "Meaning part + sound part", kindI: "Combined meanings", kindG: "Pictograph", kindN: "Parts",
      meaningPart: "meaning", soundPart: "sound", noOrigin: "No origin data for this character in the dictionary",
      credit: "Character structure from Make Me a Hanzi",
      emptySearch: "No words match “{q}”", emptySearchHelp: "Try characters, pinyin without tone marks (for example xuexi), English or Thai",
      clearSearch: "Clear search", allKnown: "You know every word in this set",
      allKnownHelp: "Turn off “Only words I'm still learning” to review them all again", showAll: "Show all words", noWords: "No words yet",
      lap: "That's the whole set. Starting again from the first card.", left: "{n} words left", shuffled: "Cards shuffled",
      levelAll: "all levels", reset: "Clear “known” marks for the selected level", resetArm: "Click again to clear “known” marks for {l}",
      resetDone: "Cleared “known” marks for {l}",
      foot1: "Word list follows the original HSK 2.0 levels 1–3. Example sentences, translations and literal meanings were written for this set. Listen buttons appear when your device has a Chinese voice.",
      foot2: "Your “known” marks are saved in this browser only.",
      foot3: "Character origins use Make Me a Hanzi dictionary.txt (© Shaunak Kishore and contributors) under LGPL-3.0; Thai glosses were added for this set. <a href=\"https://github.com/Songpon123/hsk-flashcards/blob/main/DATA_LICENSE.md\" target=\"_blank\" rel=\"noreferrer\">License details ↗</a>",
    },
  };
  let L = STR[prefs.lang];
  const tr = (key, vars) => (L[key] || "").replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : ""));

  function applyLang() {
    L = STR[prefs.lang];
    document.documentElement.lang = prefs.lang;
    document.title = L.title;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = tr(el.dataset.i18nHtml); });
    $("#q").placeholder = L.search;
    $("#q").setAttribute("aria-label", L.search);
    $("#levels").setAttribute("aria-label", L.levels);
    $("#dirGroup").setAttribute("aria-label", L.dirGroup);
    $("#speak").setAttribute("aria-label", L.listen);
    $("#prev").setAttribute("aria-label", L.prev.replace(/[←→]/g, "").trim());
    $("#next").setAttribute("aria-label", L.next.replace(/[←→]/g, "").trim());
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === prefs.lang)));
    updateLede();
  }
  function updateLede() {
    if (!ALL.length) { $("#lede").textContent = L.ledeLoading; return; }
    const n = (lv) => ALL.filter((w) => w.lv === lv).length;
    $("#lede").textContent = tr("lede", { n: ALL.length, a: n(1), b: n(2), c: n(3) });
  }

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
  const speakBtn = (text, label) => `<button type="button" class="speak" data-say="${esc(text)}" aria-label="${esc(label)}">${ICON_SPEAK}</button>`;

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
      const q = fold(raw), low = raw.toLowerCase();
      d = d.filter((w) => w.h.includes(raw) || w.t.includes(raw) || w.en.toLowerCase().includes(low) || (q && fold(w.p).includes(q)));
    }
    if (prefs.shuffle) d = d.slice().sort((a, b) => rankOf(a) - rankOf(b));
    deck = d;
    if (mode === "keepId") { const i = deck.findIndex((w) => w.id === curId); idx = i < 0 ? 0 : i; }
    else if (mode === "keepPos") idx = Math.min(idx, Math.max(0, deck.length - 1));
    else idx = 0;
    flipped = false;
    render();
  }

  /* ---------- card markup ---------- */
  const meaning = (w) => (prefs.lang === "th" ? w.t : w.en);
  const otherMeaning = (w) => (prefs.lang === "th" ? w.en : w.t);
  const translation = (w) => (prefs.lang === "th" ? w.st : w.sen);
  const literal = (w) => (prefs.lang === "th" ? w.litTh : w.litEn);

  function tzg(h, small) {
    const chars = [...h];
    const n = chars.filter((c) => c !== "…").length || 1;
    const bx = small
      ? (n <= 2 ? "5.4rem" : n === 3 ? "4.6rem" : "4rem")
      : (n <= 1 ? "9rem" : n === 2 ? "8rem" : n === 3 ? "6.4rem" : "5.2rem");
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
    return `<span class="stamp">HSK ${w.lv}</span>${known.has(w.id) ? `<span class="known-tag">${L.knownTag}</span>` : ""}`;
  }
  function example(w) {
    return '<div class="ex">' +
      `<div class="ex-label">${L.example} ${speakBtn(w.s, L.listenSentence)}</div>` +
      `<p class="ex-zh" lang="zh-CN">${highlight(w.s, w.h)}</p>` +
      `<p class="ex-py">${esc(w.sp)}</p>` +
      `<p class="ex-tr">${esc(translation(w))}</p>` +
      "</div>";
  }
  function charTile(c) {
    const d = CHARS[c];
    if (!d) return "";
    const th = prefs.lang === "th";
    let kind, body;
    if (d.k === "P") {
      kind = L.kindP;
      const bits = [];
      if (d.sem) bits.push(`<b lang="zh-CN">${esc(d.sem)}</b> ${esc(th ? d.semTh : d.semEn)} <small>(${L.meaningPart})</small>`);
      if (d.pho) bits.push(`<b lang="zh-CN">${esc(d.pho)}</b>${d.phoPy ? ` ${esc(d.phoPy)}` : ""} <small>(${L.soundPart})</small>`);
      body = bits.join(" + ");
    } else if (d.k === "I" || d.k === "G") {
      kind = d.k === "I" ? L.kindI : L.kindG;
      body = hz(esc(th ? d.noteTh : d.noteEn));
    } else {
      kind = L.kindN;
      body = d.parts && d.parts.length
        ? d.parts.map((p) => `<b lang="zh-CN">${esc(p)}</b>${CHARS[p] ? ` ${esc(th ? CHARS[p].th : CHARS[p].en)}` : ""}`).join(" + ")
        : L.noOrigin;
    }
    return `<article class="ch-tile"><div class="ch-head"><span class="ch-big" lang="zh-CN">${esc(c)}</span><span class="ch-py">${esc(d.py)}</span></div>` +
      `<p class="ch-mean">${esc(th ? d.th : d.en)}</p><p class="ch-kind">${kind}</p><p class="ch-struct">${body}</p></article>`;
  }
  function originHTML(w) {
    const uniq = [...new Set([...w.h].filter((c) => c !== "…"))];
    const lit = literal(w);
    return `<details class="origin"${prefs.originOpen ? " open" : ""}><summary>${L.origin}</summary>` +
      (lit ? `<p class="lit"><span class="lit-label">${L.literal}</span><span>${hz(esc(lit))}</span></p>` : "") +
      (uniq.length > 1 ? `<p class="by-char">${L.byChar}</p>` : "") +
      `<div class="ch-grid">${uniq.map(charTile).join("")}</div>` +
      `<p class="origin-credit">${L.credit}</p></details>`;
  }
  // The question stays where it is; the answer is added underneath it.
  function bodyHTML(w) {
    const meanBlock = `<p class="th-mean">${esc(meaning(w))}</p><p class="other-mean">${esc(otherMeaning(w))}</p>`;
    if (prefs.dir === "mean") {
      return `<div class="card-hint">${flipped ? L.answer : L.hintMean}</div>` +
        `<p class="th-big">${esc(meaning(w))}</p>` +
        (flipped ? `<div class="answer"><div class="answer-rule"></div>${tzg(w.h, true)}<p class="py-big">${esc(w.p)}</p><p class="other-mean">${esc(otherMeaning(w))}</p>${example(w)}${originHTML(w)}</div>` : "");
    }
    return `<div class="card-hint">${flipped ? L.answer : L.hintZh}</div>` +
      tzg(w.h) +
      (prefs.pinyin || flipped ? `<p class="py-big${prefs.pinyin ? "" : " appear"}">${esc(w.p)}</p>` : "") +
      (flipped ? `<div class="answer"><div class="answer-rule"></div>${meanBlock}${example(w)}${originHTML(w)}</div>` : "");
  }

  /* ---------- render ---------- */
  function renderLevels() {
    const opts = [["all", L.all], ["1", "HSK 1"], ["2", "HSK 2"], ["3", "HSK 3"]];
    $("#levels").innerHTML = opts.map(([v, label]) => {
      const words = v === "all" ? ALL : ALL.filter((w) => w.lv === Number(v));
      const k = words.reduce((a, w) => a + (known.has(w.id) ? 1 : 0), 0);
      return `<button type="button" class="seg" data-level="${v}" aria-pressed="${String(prefs.level) === v}">` +
        `<span class="seg-name">${label}</span><span class="seg-meta">${tr("knownOf", { k, n: words.length })}</span></button>`;
    }).join("");
  }
  function renderOpts() {
    $("#dirZh").textContent = L.dirZh;
    $("#dirMean").textContent = L.dirMean;
    $("#dirZh").setAttribute("aria-pressed", prefs.dir === "zh");
    $("#dirMean").setAttribute("aria-pressed", prefs.dir === "mean");
    $("#optPinyin").setAttribute("aria-pressed", !!prefs.pinyin);
    $("#optPinyin").disabled = prefs.dir === "mean";
    $("#optPinyin").style.opacity = prefs.dir === "mean" ? ".5" : "";
    $("#optNew").setAttribute("aria-pressed", !!prefs.onlyNew);
    $("#optShuffle").setAttribute("aria-pressed", !!prefs.shuffle);
  }
  function render() {
    renderLevels();
    renderOpts();
    if (!ALL.length) return;
    const w = deck[idx];
    $("#count").textContent = deck.length ? tr("count", { i: idx + 1, n: deck.length }) : L.noCards;
    $("#bar").style.width = deck.length ? ((idx + 1) / deck.length) * 100 + "%" : "0%";
    card.hidden = !w; $("#actions").hidden = !w; $("#empty").hidden = !!w;
    if (!w) { renderEmpty(); return; }
    cardTop.innerHTML = topRow(w);
    cardBody.innerHTML = bodyHTML(w);
    const det = cardBody.querySelector(".origin");
    if (det) det.addEventListener("toggle", () => { prefs.originOpen = det.open; savePrefs(); });
    $("#cardSeq").textContent = flipped ? L.seqShown : L.seqHidden;
    const sp = $("#speak");
    sp.dataset.say = w.h;
    sp.disabled = prefs.dir === "mean" && !flipped;
    $("#flipBtn").innerHTML = `${flipped ? L.hide : L.reveal} <kbd>Space</kbd>`;
    $("#miss").innerHTML = `<kbd>1</kbd> ${L.miss}`;
    $("#know").innerHTML = `<kbd>2</kbd> ${L.know}${known.has(w.id) ? " ✓" : ""}`;
  }
  function renderEmpty() {
    const action = $("#emptyAction");
    action.hidden = true;
    if (query.trim()) {
      $("#emptyBig").textContent = tr("emptySearch", { q: query.trim() });
      $("#emptyMsg").textContent = L.emptySearchHelp;
      action.textContent = L.clearSearch; action.hidden = false; action.dataset.do = "clear";
    } else if (prefs.onlyNew) {
      $("#emptyBig").textContent = L.allKnown;
      $("#emptyMsg").textContent = L.allKnownHelp;
      action.textContent = L.showAll; action.hidden = false; action.dataset.do = "all";
    } else {
      $("#emptyBig").textContent = L.noWords;
      $("#emptyMsg").textContent = "";
    }
  }

  /* ---------- actions ---------- */
  function flip() { if (!deck.length) return; flipped = !flipped; render(); }
  function go(d) {
    if (!deck.length) return;
    const next = idx + d;
    if (next >= deck.length) toast(L.lap);
    idx = (next + deck.length) % deck.length;
    flipped = false;
    render();
  }
  function mark(isKnown) {
    const w = deck[idx];
    if (!w) return;
    if (isKnown) known.add(w.id); else known.delete(w.id);
    saveKnown();
    if (prefs.onlyNew && isKnown) {
      buildDeck("keepPos");
      if (deck.length) toast(tr("left", { n: deck.length }));
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
    if (e.target.closest("button, a, .card-bottom, details")) return;
    if (swiped) { swiped = false; return; }
    flip();
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("button, summary") && (e.key === " " || e.key === "Enter")) return;
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
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => {
    prefs.lang = b.dataset.lang; savePrefs(); applyLang(); render();
  }));
  document.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => {
    prefs.dir = b.dataset.dir; savePrefs(); flipped = false; render();
  }));
  $("#optPinyin").addEventListener("click", () => { prefs.pinyin = !prefs.pinyin; savePrefs(); render(); });
  $("#optNew").addEventListener("click", () => { prefs.onlyNew = !prefs.onlyNew; savePrefs(); buildDeck("keepId"); });
  $("#optShuffle").addEventListener("click", () => {
    prefs.shuffle = !prefs.shuffle; savePrefs();
    if (prefs.shuffle) { rank = new Map(); buildDeck("reset"); toast(L.shuffled); }
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
    const label = prefs.level === "all" ? L.levelAll : `HSK ${prefs.level}`;
    if (!b.classList.contains("armed")) {
      b.classList.add("armed"); b.textContent = tr("resetArm", { l: label });
      clearTimeout(armTimer);
      armTimer = setTimeout(() => { b.classList.remove("armed"); b.textContent = L.reset; }, 3500);
      return;
    }
    clearTimeout(armTimer);
    ALL.forEach((w) => { if (prefs.level === "all" || w.lv === Number(prefs.level)) known.delete(w.id); });
    saveKnown();
    b.classList.remove("armed"); b.textContent = L.reset;
    toast(tr("resetDone", { l: label }));
    buildDeck("keepId");
  });

  /* ---------- load ---------- */
  async function getJSON(inline, file) {
    if (inline) return inline;
    const r = await fetch(file);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  applyLang();
  $("#count").textContent = L.loading;
  Promise.all([getJSON(window.HSK_DATA, "words.json"), getJSON(window.HSK_CHARS, "chars.json")]).then(([rows, chars]) => {
    CHARS = chars;
    ALL = rows.map(([lv, h, p, t, s, sp, st, en, sen, litTh, litEn]) => ({ id: `${lv}|${h}|${p}`, lv, h, p, t, s, sp, st, en, sen, litTh, litEn }));
    updateLede();
    buildDeck("reset");
  }).catch(() => {
    $("#count").textContent = L.loadFail;
  });
})();
