/* thai.js — Thai subtitles.

   The game is in English. Under each English text the player reads (dialogue,
   evidence, quiz prompt / choices / explanation / hint, accusation options,
   confession and solution) a small, faded Thai line is shown as a subtitle.
   The ไทย ON/OFF button (or the T key) hides all of them, for players who
   want to test themselves. Every new player starts with them ON.

   The translations are in data/thai-dialogue.js (NPC lines) and
   data/thai-content.js (everything else). A missing translation simply shows
   nothing, so it can never break a window.

   Naming: th* = "Thai text for…", e.g. thClue(id) is the Thai of a clue.
   Uses from core.js: dom, esc, SND, currentCase. */
"use strict";

let thaiOn = true;

/* A subtitle <span> to put under the English; "" when there is no translation. */
function thBlock(text, extraClass) {
  if (!text) return "";
  return `<span class="dw-th ${extraClass || ""}" lang="th">${esc(text)}</span>`;
}

/* Lookups for the current case. All return null when there is no translation. */
function thLine(npcId, index) { return typeof window.DW_LINE_TH === "function" ? window.DW_LINE_TH(currentCase.id, npcId, index) : null; }
function thClue(clueId) { return window.DW_TH ? window.DW_TH.clue(currentCase.id, clueId) : null; }
function thQuestion(questionId) { return window.DW_TH ? window.DW_TH.question(currentCase.id, questionId) : null; }
/* `originalIndex` is the choice's position in the case file, not on screen (choices are shuffled). */
function thChoice(questionId, originalIndex) { return window.DW_TH ? window.DW_TH.choice(currentCase.id, questionId, originalIndex) : null; }
function thConfession() { return window.DW_TH ? window.DW_TH.confession(currentCase.id) : null; }
function thSolution() { return window.DW_TH ? window.DW_TH.solution(currentCase.id) : null; }
function thaiSubtitle(npc, index) { return thBlock(thLine(npc.id, index), "dialogue-th"); }

/* ---------- the ON / OFF switch ---------- */
function applyThaiVisibility() {
  document.body.classList.toggle("th-off", !thaiOn);   // CSS hides every .dw-th
  if (!dom.thaiToggle) return;
  dom.thaiToggle.textContent = thaiOn ? "ไทย ON" : "ไทย OFF";
  dom.thaiToggle.setAttribute("aria-pressed", String(thaiOn));
  dom.thaiToggle.title = thaiOn ? "Hide the Thai subtitles (T)" : "Show the Thai subtitles (T)";
}
function setThai(on) {
  thaiOn = !!on;
  applyThaiVisibility();
}
dom.thaiToggle?.addEventListener("click", () => { if (SND) SND.click(); setThai(!thaiOn); });
applyThaiVisibility();
