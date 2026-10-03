/* modals.js — the windows that open over the map.

   modal(html) / closeModal()   one window at a time, drawn into #modal-body
   toast(message)               short message at the bottom of the screen
   interact()                   E key: talk to the nearest NPC or inspect the nearest clue
   dialogue(npc)                an NPC's lines, one at a time
   evidence(clue)               a clue; first time = +points and added to the notebook
   quiz(question)               the English question attached to a clue
   notebook()                   found clues + answered questions; the way to accuse
                                (and, once the case is over, back to the result + words)

   The accusation and result windows are in accusation.js, the word report in wordreport.js.
   Uses: core.js, dictionary.js (linkify), thai.js (th*), audio.js (caseScene),
   case.js (quizView, updateHud). */
"use strict";

/* ---------- window plumbing ---------- */
/* `wide: true` for a window with a lot to lay out (the end of a case + its words). */
function modal(html, { wide = false } = {}) {
  resetKeys();
  dom.modalBody.innerHTML = html;
  dom.modalWindow.classList.toggle("wide", wide);
  dom.modalWindow.scrollTop = 0;   // a new page starts at its top, not where the last one was scrolled to
  dom.modalLayer.classList.remove("hidden");
  state.modal = true;   // pauses movement
  hideWordPopup();
}

function closeModal() {
  dom.modalLayer.classList.add("hidden");
  dom.modalWindow.classList.remove("wide");
  dom.modalBody.innerHTML = "";
  state.modal = false;
  resetKeys();
  hideWordPopup();
  // leaving the accusation window: swap the tension cue back to the case theme
  if (accusing) {
    accusing = false;
    if (gameActive && SND) SND.music(caseScene());
  }
}
dom.modalClose.addEventListener("click", closeModal);
dom.modalLayer.addEventListener("click", (event) => { if (event.target === dom.modalLayer) closeModal(); });

function toast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => dom.toast.classList.add("hidden"), 2800);
}

/* Draws a character's face into a small <canvas> inside a window. */
function drawFace(canvas, look) {
  SPR.drawChibi(canvas.getContext("2d"), canvas.width / 2, canvas.height - 8, look, { dir: "down", pose: "talk", scale: 2.1, talkOpen: true });
}

/* ---------- E key ---------- */
function interact() {
  if (state.modal || !state.nearest) return;
  if (SND) SND.talk();
  if (state.nearest.type === "npc") dialogue(state.nearest.data);
  else evidence(state.nearest.data);
}

/* ---------- talking ---------- */
function dialogue(npc, index = 0) {
  if (npc.id === currentCase.officerId && !state.talkedOfficer) {
    state.talkedOfficer = true;
    if (SND) SND.talk();
    updateHud();
  }
  const isLast = index + 1 >= npc.lines.length;
  noteWords(npc.lines[index]);
  modal(`
    <p class="eyebrow dark">${esc(npc.role)}</p>
    <div class="dialogue-head">
      <canvas id="npc-face" width="64" height="76"></canvas>
      <div><h2>${esc(npc.name)}</h2><small>Line ${index + 1} of ${npc.lines.length}</small></div>
    </div>
    <div class="dialogue-box">“${linkify(npc.lines[index])}”${thaiSubtitle(npc, index)}</div>
    <div class="modal-actions">
      <button id="next-line" class="primary-button small">${isLast ? "End conversation" : "Next line →"}</button>
    </div>`);
  drawFace($("#npc-face"), npc.look);
  $("#next-line").onclick = () => {
    if (SND) SND.talk();
    if (isLast) closeModal();
    else dialogue(npc, index + 1);
  };
}

/* ---------- a clue ---------- */
function evidence(clue) {
  if (!state.discovered.has(clue.id)) {
    state.discovered.add(clue.id);
    state.score += SCORE.clueFound;
    if (SND) SND.clue();
    toast(`New clue found: +${SCORE.clueFound} points`);
    updateHud();
  }
  const button = clue.question
    ? `<button id="ev-quiz" class="primary-button small">${state.answered[clue.question] ? "Review answer →" : "Answer English question →"}</button>`
    : `<button id="ev-close" class="primary-button small">Add to notebook</button>`;
  noteWords(clue.text);
  modal(`
    <p class="eyebrow dark">EVIDENCE</p>
    <h2>${clue.icon} ${esc(clue.name)}</h2>
    <div class="evidence-box">${linkify(clue.text)}${thBlock(thClue(clue.id))}</div>
    <div class="modal-actions">${button}</div>`);
  if (clue.question) $("#ev-quiz").onclick = () => quiz(currentCase.questions.find((q) => q.id === clue.question));
  else $("#ev-close").onclick = closeModal;
}

/* ---------- an English question ----------
   Before answering: four shuffled choices, a hint button and "answer later".
   After answering: the same window again, showing right / wrong and the explanation. */
function quiz(question) {
  const answer = state.answered[question.id];      // undefined until answered
  const view = quizView(question);                 // the shuffled choices
  const th = thQuestion(question.id) || {};
  const actions = answer
    ? `<button id="quiz-close" class="primary-button small">Back to the case</button>`
    : `<button id="hint" class="light-button">Use a hint (${SCORE.hint})</button><button id="quiz-later" class="light-button">Answer later</button>`;
  noteWords(question.prompt, answer ? question.explain : "");
  modal(`
    <p class="eyebrow dark">ENGLISH CHALLENGE <span class="topic-tag">${esc(TOPIC_LABEL[question.topic] || "")}</span></p>
    <h2 class="quiz-prompt">${linkify(question.prompt, question.term)}</h2>${thBlock(th.prompt, "prompt-th")}
    <div class="quiz-list">${view.choices.map((choice, index) => quizChoiceButton(question, view, answer, choice, index)).join("")}</div>
    ${answer ? `<div class="explain-box">${linkify(question.explain)}${thBlock(th.explain)}</div>` : ""}
    <div class="modal-actions">${actions}</div>`);

  if (answer) { $("#quiz-close").onclick = closeModal; return; }
  document.querySelectorAll(".quiz-choice").forEach((button) => {
    button.onclick = () => answerQuiz(question, +button.dataset.i, view);
  });
  $("#hint").onclick = () => {
    state.score = Math.max(0, state.score + SCORE.hint);
    state.hints += 1;
    state.streak = 0;
    updateHud();
    toast(th.hint && thaiOn ? `${question.hint}  |  ${th.hint}` : question.hint);
    $("#hint").disabled = true;
  };
  $("#quiz-later").onclick = closeModal;
}

function quizChoiceButton(question, view, answer, choice, index) {
  const classes = ["quiz-choice"];
  if (answer && index === view.correct) classes.push("correct");
  if (answer && !answer.ok && index === answer.selected) classes.push("wrong");
  const authoredIndex = view.order ? view.order[index] : index;   // the Thai is stored by authored position
  const letter = String.fromCharCode(65 + index);                  // A, B, C, D
  return `<button class="${classes.join(" ")}" data-i="${index}" ${answer ? "disabled" : ""}>${letter}. ${esc(choice)}${thBlock(thChoice(question.id, authoredIndex), "choice-th")}</button>`;
}

function answerQuiz(question, selected, view) {
  const ok = selected === view.correct;
  state.answered[question.id] = { selected, ok };
  if (ok) {
    // answers in a row pay more: +5 for the 2nd, +10 for the 3rd, +15 from the 4th on
    state.streak += 1;
    const bonus = Math.min(state.streak - 1, SCORE.streakMax) * SCORE.streakStep;
    state.score += SCORE.quizRight + bonus;
    if (SND) SND.correct();
    toast(bonus ? `Correct! +${SCORE.quizRight + bonus} points · 🔥 ${state.streak} in a row` : `Correct! +${SCORE.quizRight} points`);
  } else {
    state.streak = 0;
    state.score = Math.max(0, state.score + SCORE.quizWrong);
    state.wrong += 1;
    if (SND) SND.wrong();
    toast("Not quite — read the explanation below");
  }
  updateHud();
  quiz(question);   // redraw, now showing the result
}

/* ---------- the notebook (Q) ---------- */
function notebook(tab = "clues") {
  const found = state.discovered.size;
  const answered = Object.keys(state.answered).length;
  const list = tab === "clues"
    ? currentCase.clues.map(notebookClue).join("")
    : currentCase.questions.map(notebookQuestion).join("");
  modal(`
    <p class="eyebrow dark">CASE NOTEBOOK</p>
    <h2>Detective's Notes</h2>
    <p class="muted">📍 ${esc(currentCase.location)}</p>
    <div class="note-tabs">
      <button class="note-tab ${tab === "clues" ? "active" : ""}" data-tab="clues">Evidence ${found}/${currentCase.clues.length}</button>
      <button class="note-tab ${tab === "quiz" ? "active" : ""}" data-tab="quiz">English ${answered}/${currentCase.questions.length}</button>
    </div>
    <div class="note-list">${list}</div>
    <div class="modal-actions">
      ${caseOver() ? `<button id="note-result" class="light-button">📖 Case result &amp; words</button>` : ""}
      <button id="note-accuse" class="danger-button" ${found < currentCase.minimumClues ? "disabled" : ""}>🚨 Accuse a Suspect</button>
    </div>`);
  document.querySelectorAll(".note-tab").forEach((button) => { button.onclick = () => notebook(button.dataset.tab); });
  $("#note-accuse").onclick = accuse;
  if (caseOver()) $("#note-result").onclick = () => (state.solved ? renderSolved() : outOfChances());
}

function notebookClue(clue) {
  if (!state.discovered.has(clue.id)) {
    return `<div class="note-item locked"><strong>🔒 Unknown Evidence</strong><div>Explore the location to find this clue.</div></div>`;
  }
  return `<div class="note-item"><strong>${clue.icon} ${esc(clue.name)}</strong><div>${linkify(clue.text)}${thBlock(thClue(clue.id))}</div></div>`;
}

function notebookQuestion(question, index) {
  const answer = state.answered[question.id];
  const body = answer
    ? (answer.ok ? "✅ Correct — " : "❌ Incorrect — ") + esc(question.explain) + thBlock((thQuestion(question.id) || {}).explain)
    : "Not answered yet.";
  return `<div class="note-item ${answer ? "" : "locked"}"><strong>Question ${index + 1}: ${esc(question.prompt)}</strong><div>${body}</div></div>`;
}
