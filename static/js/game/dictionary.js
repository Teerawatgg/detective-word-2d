/* dictionary.js — click-to-translate.

   linkify(text)         turns every word or phrase found in data/vocab.js into
                         an underlined <span class="dw-word"> (HTML-escaped)
   showWordPopup(el, w)  the popup: Thai meaning, verb forms, example sentence
   vocabLookup(text)     finds the dictionary entry for a word as written,
                         e.g. "logged" -> "log", "went" -> "go", "checked in" -> "check in"

   Uses from core.js: VOCAB, IRREGULAR, SND, dom, esc. */
"use strict";

const PHRASE_MAX_WORDS = 3;   // longest phrase in the dictionary: "out of office"

/* "went" -> "go", "gone" -> "go"… (a form spelled like its base, e.g. "come", is skipped) */
const PAST_FORMS = {};
Object.entries(IRREGULAR).forEach(([base, forms]) => {
  forms.forEach((form) => { if (form !== base) PAST_FORMS[form] = base; });
});

/* ======================= 1. Matching a written word ======================= */

/* Every dictionary key a written word could come from, most likely first.
   `how` names the rule, so the popup can explain the form:
   base | irregular (went) | s (sits, copies) | ed (logged, copied) | ing (sitting) */
function wordVariants(word) {
  const base = word.toLowerCase();
  const out = [{ word: base, how: "base" }];
  const add = (candidate, how) => out.push({ word: candidate, how });

  if (PAST_FORMS[base]) add(PAST_FORMS[base], "irregular");
  if (base.endsWith("ies")) add(base.slice(0, -3) + "y", "s");     // copies -> copy
  if (base.endsWith("ied")) add(base.slice(0, -3) + "y", "ed");    // copied -> copy
  if (base.endsWith("es")) add(base.slice(0, -2), "s");            // witnesses -> witness
  if (base.endsWith("s")) add(base.slice(0, -1), "s");             // clues -> clue
  if (base.endsWith("ed")) {
    add(base.slice(0, -2), "ed");                                  // confirmed -> confirm
    add(base.slice(0, -1), "ed");                                  // arrived -> arrive
    addUndoubled(add, base.slice(0, -2), "ed");                    // logged -> log
  }
  if (base.endsWith("ing")) {
    add(base.slice(0, -3), "ing");                                 // checking -> check
    add(base.slice(0, -3) + "e", "ing");                           // leaving -> leave
    addUndoubled(add, base.slice(0, -3), "ing");                   // dripping -> drip
  }
  return out;
}

/* logg -> log, dripp -> drip (a doubled final consonant before -ed / -ing) */
function addUndoubled(add, stem, how) {
  const last = stem.at(-1);
  if (stem.length >= 3 && last === stem.at(-2) && !"aeiou".includes(last)) add(stem.slice(0, -1), how);
}

/* -> { key, entry, surface, how, form } or null.
   `text` may be a phrase ("followed up", "sign-in"): only its first word is
   inflected, the rest must match exactly. A hyphen counts as a space.
     key      the dictionary key ("follow up")
     entry    [part of speech, Thai, example]
     surface  the first word as written ("followed")
     how      which wordVariants() rule matched
     form     the written word, only when it is an irregular past form */
function vocabLookup(text) {
  const parts = String(text).toLowerCase().replace(/-/g, " ").split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const rest = parts.slice(1).join(" ");
  for (const { word: head, how } of wordVariants(parts[0])) {
    const key = rest ? `${head} ${rest}` : head;
    if (VOCAB[key]) {
      return { key, entry: VOCAB[key], surface: parts[0], how, form: how === "irregular" ? parts[0] : null };
    }
  }
  return null;
}

/* ======================= 2. Underlining words in a text ======================= */

/* Returns HTML. The raw text is split into words and gaps, and every piece is
   escaped on its own, so a link can never cut through an HTML entity.

   skipTerm: the word or phrase a quiz is testing. It is never a link inside
   that quiz, because its popup would give away the answer that the hint
   button charges points for. */
function linkify(text, skipTerm) {
  const skip = skippedKeys(skipTerm);
  const parts = String(text).split(/([A-Za-z][A-Za-z-]*)/);   // even index = gap, odd index = word
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { html += esc(parts[i]); continue; }
    const match = longestMatchAt(parts, i);
    const original = parts.slice(i, match.last + 1).join("");
    html += match.hit && !skip.has(match.hit.key)
      ? `<span class="dw-word" data-word="${esc(match.text)}">${esc(original)}</span>`
      : esc(original);
    i = match.last;
  }
  return html;
}

/* The dictionary keys behind a quiz term: "last seen" -> {"see", …} */
function skippedKeys(term) {
  const keys = new Set();
  if (!term) return keys;
  const whole = vocabLookup(term);
  if (whole) keys.add(whole.key);
  term.split(/[\s-]+/).forEach((word) => {
    const hit = vocabLookup(word);
    if (hit) keys.add(hit.key);
  });
  return keys;
}

/* Tries a 3-word phrase starting at parts[i], then 2 words, then 1.
   -> { hit, text, last } where `last` is the index of the final word used. */
function longestMatchAt(parts, i) {
  for (let words = PHRASE_MAX_WORDS; words >= 1; words--) {
    const last = i + 2 * (words - 1);
    if (last >= parts.length) continue;
    if (words > 1 && startsInsideWord(parts, i)) continue;
    if (words > 1 && !joinedBySingleSpaces(parts, i, last)) continue;
    const text = parts.slice(i, last + 1).join("").replace(/-+$/, "");
    if (words === 1 && text.length < 3) continue;   // too short to be worth a link
    const hit = vocabLookup(text);
    if (hit) return { hit, text, last };
  }
  return { hit: null, text: "", last: i };
}

/* "o'clock in": "clock" follows an apostrophe inside a word, so it must not
   start the phrase "clock in". An opening quote ('On leave…) still may. */
function startsInsideWord(parts, i) {
  return i >= 3 && /^['’]$/.test(parts[i - 1]);
}
function joinedBySingleSpaces(parts, first, last) {
  for (let gap = first + 1; gap < last; gap += 2) if (parts[gap] !== " ") return false;
  return true;
}

/* ======================= 3. The popup ======================= */

const isVerbPos = (pos) => /(^|[^a-z])v\./.test(pos);   // "v.", "n./v.", "phr. v." (not "adv.")
const isNounPos = (pos) => /(^|[^a-z])n\./.test(pos);

function showWordPopup(target, word) {
  const hit = vocabLookup(word);
  if (!hit) return;
  const [pos, thai, example] = hit.entry;
  const note = formExplanation(hit);
  dom.wordPopup.innerHTML = `
    <span class="wp-word">${esc(word.toLowerCase())}</span><span class="wp-pos">${esc(pos)}</span>
    <div class="wp-th">${esc(thai)}</div>
    ${verbFormsTable(hit)}
    ${note ? `<div class="wp-note">${note}</div>` : ""}
    <div class="wp-ex">“${esc(example)}”</div>`;
  dom.wordPopup.classList.remove("hidden");
  positionPopup(target);
}
function hideWordPopup() { dom.wordPopup.classList.add("hidden"); }

/* Centred above the word; below it if there is no room above. The height is
   only known after layout, hence the hidden first frame. */
function positionPopup(target) {
  const rect = target.getBoundingClientRect();
  const popupWidth = 264;
  const left = Math.max(10, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 10));
  dom.wordPopup.style.left = `${left}px`;
  dom.wordPopup.style.top = "0px";
  dom.wordPopup.style.visibility = "hidden";
  requestAnimationFrame(() => {
    const above = rect.top - 10 - dom.wordPopup.offsetHeight;
    dom.wordPopup.style.top = `${above < 8 ? rect.bottom + 10 : above}px`;
    dom.wordPopup.style.visibility = "visible";
  });
}

/* Irregular verbs only: ช่อง 1 / ช่อง 2 / ช่อง 3 with the clicked form highlighted. */
function verbFormsTable(hit) {
  const forms = IRREGULAR[hit.key];
  if (!forms) return "";
  const cells = [hit.key, ...forms];
  const active = activeColumns(hit);
  const heads = [["ช่อง 1", "base"], ["ช่อง 2", "past simple"], ["ช่อง 3", "past participle"]];
  const on = (index) => (active[index] ? "on" : "");
  return `<table class="wp-forms">
    <thead><tr>${heads.map(([thai, english], i) => `<th class="${on(i)}">${thai}<small>${english}</small></th>`).join("")}</tr></thead>
    <tbody><tr>${cells.map((form, i) => `<td class="${on(i)}">${esc(form)}</td>`).join("")}</tr></tbody>
  </table>`;
}

/* Which of the three columns the clicked word fills.
   "come" fills ช่อง 1 AND ช่อง 3 (come → came → come); "sits" is built on ช่อง 1. */
function activeColumns(hit) {
  const cells = [hit.key, ...IRREGULAR[hit.key]];
  if (hit.how === "irregular") return cells.map((form, index) => index > 0 && form === hit.form);
  if (hit.how === "base") return cells.map((form) => form === hit.key);
  return cells.map((form, index) => index === 0);
}

/* One Thai line saying what the clicked word is and when it is used, e.g.
   "<b>sits</b> = sit + -s · กริยาช่อง 1 ที่ใช้กับ he / she / it (present simple)".
   Returns "" for a plain base word that needs no explanation. */
function formExplanation(hit) {
  const word = `<b>${esc(hit.surface)}</b>`;
  const key = esc(hit.key.split(" ")[0]);
  const forms = IRREGULAR[hit.key];

  if (forms && (hit.how === "irregular" || hit.how === "base")) {
    // built from activeColumns(), so the sentence always matches the table
    const columns = activeColumns(hit).map((on, index) => (on ? index + 1 : 0)).filter(Boolean);
    if (columns.length > 1) {
      const list = columns.map((n) => `ช่อง ${n}`).join(" และ");
      const hint = columns.includes(3) ? " · ถ้าอยู่หลัง have / has / had คือช่อง 3" : "";
      return `${word} = กริยา${list} ของ ${key} (สะกดเหมือนกัน)${hint}`;
    }
    if (columns[0] === 2) return `${word} = กริยาช่อง 2 (past simple) ของ ${key} · ใช้เล่าเหตุการณ์ที่จบแล้วในอดีต`;
    if (columns[0] === 3) return `${word} = กริยาช่อง 3 (past participle) ของ ${key} · ใช้หลัง have / has / had หรือประโยค passive (is / was + ช่อง 3)`;
    return `${word} = กริยาช่อง 1 (รูปพื้นฐาน) · กริยาตัวนี้ผันไม่ปกติ ดูช่อง 2 / ช่อง 3 ในตาราง`;
  }

  const pos = hit.entry[0];
  const verb = isVerbPos(pos), noun = isNounPos(pos);
  const plus = `${key} + ${suffixOf(hit)}`;
  if (hit.how === "s" && verb && noun) return `${word} = ${plus} · คำนามพหูพจน์ หรือกริยาที่ใช้กับ he / she / it`;
  if (hit.how === "s" && verb) return `${word} = ${plus} · กริยาช่อง 1 ที่ใช้กับ he / she / it (present simple)`;
  if (hit.how === "s" && noun) return `${word} = ${plus} · คำนามพหูพจน์ (มากกว่าหนึ่ง)`;
  if (hit.how === "ing" && verb) return `${word} = ${plus} · ใช้กับ is / are / was / were เมื่อกำลังทำอยู่ (continuous)`;
  if (hit.how === "ed" && verb) return `${word} = ${plus} · กริยาช่อง 2 และช่อง 3 ของกริยาปกติ`;
  return "";
}

/* The ending that was really added: witness + -es, copy + -ies, arrive + -d */
function suffixOf(hit) {
  const surface = hit.surface, key = hit.key.split(" ")[0];
  if (hit.how === "ing") return "-ing";
  if (hit.how === "ed") {
    if (surface.endsWith("ied") && key.endsWith("y")) return "-ied";
    return surface === `${key}d` ? "-d" : "-ed";
  }
  if (surface.endsWith("ies") && key.endsWith("y")) return "-ies";
  return surface.endsWith("es") && !key.endsWith("e") ? "-es" : "-s";
}

/* A click on an underlined word opens its popup; any other click closes it.
   (The popup itself has pointer-events: none, so it never swallows a click.) */
document.addEventListener("click", (event) => {
  const wordEl = event.target.closest(".dw-word");
  if (!wordEl) { hideWordPopup(); return; }
  if (SND) SND.click();
  showWordPopup(wordEl, wordEl.dataset.word);
  event.stopPropagation();
});
