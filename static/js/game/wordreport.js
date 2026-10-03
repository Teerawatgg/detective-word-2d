/* wordreport.js — the Word Report: the English words of one case, in Thai.

   While a case is played, every English text the player reads (an NPC line,
   a clue, a quiz, a suspect's statement, the confession) is scanned for
   dictionary words, and every underlined word the player clicks is marked
   as "looked up". When the case is over, the report lists them as cards —
   word, part of speech, Thai meaning, the form it was read in — together
   with how the English questions went.

   noteWords(...texts)    remember the dictionary words in texts now on screen
   noteLookup(wordEl)     remember a clicked word (dictionary.js)
   wordReportSection()    the report as HTML, shown straight away beside the
                          result in the CASE SOLVED / CASE CLOSED window
   caseOver()             true once the case is solved or out of chances

   Kept in memory only, in state (core.js), so a new case or a replay starts
   an empty list.

   Uses: core.js, dictionary.js (vocabIn, vocabLookup), thai.js (thBlock, thQuestion). */
"use strict";

function caseOver() { return state.solved || state.chances <= 0; }

function noteWords(...texts) {
  if (!gameActive) return;   // e.g. the briefing, read before any case
  texts.filter(Boolean).forEach((text) => {
    vocabIn(text).forEach(({ key, word }) => {
      if (!state.wordsMet.has(key)) state.wordsMet.set(key, word);
    });
  });
}

/* Clicks in the end-of-case window are not counted: that is where the player
   reviews, and "looked up" means "needed help while investigating". */
function noteLookup(wordEl) {
  if (!gameActive || wordEl.closest(".end-layout")) return;
  const hit = vocabLookup(wordEl.dataset.word);
  if (!hit) return;
  state.wordsLooked.add(hit.key);
  if (!state.wordsMet.has(hit.key)) state.wordsMet.set(hit.key, wordEl.dataset.word);
}

/* ---------- the report ---------- */

/* The right-hand side of the CASE SOLVED / CASE CLOSED window (accusation.js). */
function wordReportSection() {
  const words = reportWords();
  const looked = words.filter((item) => item.looked).length;
  const right = currentCase.questions.filter((q) => state.answered[q.id]?.ok).length;

  return `<section class="word-report">
    <p class="eyebrow dark">CASE DEBRIEF</p>
    <h2>Words from this case</h2>
    <p class="report-intro">The English words you read in this case and what they mean.
      <span lang="th">คำศัพท์ภาษาอังกฤษที่คุณเจอในคดีนี้ พร้อมคำแปล — คลิกคำเพื่อดูประโยคตัวอย่าง</span></p>

    <div class="report-chips">
      <div><strong>${words.length}</strong><span>words met</span><small lang="th">คำที่เจอ</small></div>
      <div class="gold"><strong>${looked}</strong><span>looked up</span><small lang="th">กดดูความหมาย</small></div>
      <div class="green"><strong>${right}/${currentCase.questions.length}</strong><span>questions right</span><small lang="th">ตอบคำถามถูก</small></div>
    </div>

    <h3 class="report-heading">Words you met <small lang="th">คำศัพท์ที่เจอ${looked ? " · 🔍 = คำที่คุณกดดู" : ""}</small></h3>
    ${words.length
      ? `<div class="word-grid">${words.map(wordCard).join("")}</div>`
      : `<p class="muted">No dictionary words were read in this case.</p>`}

    <h3 class="report-heading">English questions <small lang="th">คำถามภาษาอังกฤษ</small></h3>
    <div class="report-quiz">${currentCase.questions.map(reportQuestion).join("")}</div>
  </section>`;
}

/* Looked-up words first, then A–Z. */
function reportWords() {
  return [...state.wordsMet].map(([key, word]) => ({ key, word, entry: VOCAB[key], looked: state.wordsLooked.has(key) }))
    .filter((item) => item.entry)
    .sort((a, b) => (b.looked - a.looked) || a.key.localeCompare(b.key));
}

function wordCard({ key, word, entry, looked }) {
  const [pos, thai] = entry;
  const asRead = word.toLowerCase().replace(/-/g, " ");
  return `<div class="word-card${looked ? " looked" : ""}">
    <div class="wc-top">
      <span class="dw-word wc-word" data-word="${esc(key)}">${esc(key)}</span>
      <span class="wc-pos">${esc(pos)}</span>
      ${looked ? `<span class="wc-badge" title="You looked this word up">🔍</span>` : ""}
    </div>
    <div class="wc-th" lang="th">${esc(thai)}</div>
    ${asRead !== key ? `<div class="wc-seen">read as “${esc(word)}”</div>` : ""}
  </div>`;
}

/* One question: right / wrong / not answered. An unanswered question keeps
   its explanation hidden, so a restart can still be played fair. */
function reportQuestion(question) {
  const answer = state.answered[question.id];
  const status = !answer ? "skip" : answer.ok ? "ok" : "bad";
  const label = { ok: "✓", bad: "✗", skip: "–" }[status];
  const body = answer
    ? `${esc(question.explain)}${thBlock((thQuestion(question.id) || {}).explain)}`
    : `<span class="muted">Not answered.</span>`;
  return `<div class="rq ${status}">
    <span class="rq-mark" aria-label="${status === "ok" ? "correct" : status === "bad" ? "incorrect" : "not answered"}">${label}</span>
    <div><strong>${esc(question.term)}</strong> <span class="topic-tag">${esc(TOPIC_LABEL[question.topic] || "")}</span>
      <p>${body}</p></div>
  </div>`;
}
