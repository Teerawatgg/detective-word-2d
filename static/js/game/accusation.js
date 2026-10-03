/* accusation.js — "Catch the lie", the end of every case.

   The player picks three things:
     1. the suspect who lied,
     2. which of that suspect's statements is false,
     3. a clue they have FOUND that proves it.
   A case accepts the answer when the suspect is `culpritId` and
   `contradictions[statementIndex]` lists the chosen clue (see the case files).

   A wrong accusation costs one of MAX_CHANCES and explains why it failed,
   without giving the answer away. Losing every chance closes the case.

   Uses: core.js, modals.js, thai.js, dictionary.js, progress.js (stars),
   case.js (shuffled lists, configureCase), audio.js (caseScene),
   wordreport.js (noteWords, wordReportSection). */
"use strict";

function hearts(count) { return "♥".repeat(count) + "♡".repeat(MAX_CHANCES - count); }

/* ---------- the form ---------- */
function accuse() {
  if (state.discovered.size < currentCase.minimumClues) { toast(`You need at least ${currentCase.minimumClues} clues first.`); return; }
  // once the case is over there is nothing left to accuse: show how it ended
  if (state.solved) { renderSolved(); return; }
  if (state.chances <= 0) { outOfChances(); return; }

  const suspects = shuffledSuspects.length ? shuffledSuspects : currentCase.npcs.filter((n) => n.role === "Suspect");
  const foundClues = (shuffledProofs.length ? shuffledProofs : currentCase.clues).filter((clue) => state.discovered.has(clue.id));
  if (!accusing) {
    accusing = true;
    if (SND) SND.music("deduction");
  }

  const suspectOption = (npc) =>
    `<label class="radio"><input type="radio" name="suspect" value="${esc(npc.id)}"><span><strong>${esc(npc.name)}</strong></span></label>`;
  const clueOption = (clue) =>
    `<label class="radio"><input type="radio" name="proof" value="${esc(clue.id)}"><span><strong>${clue.icon} ${esc(clue.name)}</strong><br>${linkify(clue.text)}${thBlock(thClue(clue.id))}</span></label>`;

  modal(`
    <p class="eyebrow dark">FINAL DEDUCTION</p>
    <h2>Catch the lie</h2>
    <p class="accuse-intro">Choose the suspect, the statement that is <strong>false</strong>, and the evidence that proves it.
      <span class="chance-line">Chances left: <b>${hearts(state.chances)}</b> — a wrong accusation costs one.</span></p>
    <form id="accuse-form">
      <fieldset class="option-box" id="accuse-suspects">
        <legend>1 · Who is lying?</legend>${suspects.map(suspectOption).join("")}
      </fieldset>
      <fieldset class="option-box" id="accuse-statements">
        <legend>2 · Which statement is false?</legend><p class="muted">Choose a suspect first.</p>
      </fieldset>
      <fieldset class="option-box" id="accuse-evidence">
        <legend>3 · Which evidence proves it? <small>(${foundClues.length} of ${currentCase.clues.length} clues found)</small></legend>${foundClues.map(clueOption).join("")}
      </fieldset>
      <button class="primary-button" type="submit">Confirm Accusation</button>
    </form>`);

  // step 2 lists the statements of whichever suspect is picked in step 1
  const statements = $("#accuse-statements");
  document.querySelectorAll("#accuse-suspects input[name=suspect]").forEach((input) => input.addEventListener("change", () => {
    const npc = currentCase.npcs.find((n) => n.id === input.value);
    noteWords(...npc.lines);
    statements.innerHTML = `<legend>2 · Which of ${esc(npc.name)}'s statements is false?</legend>` +
      npc.lines.map((line, i) => `<label class="radio"><input type="radio" name="lie" value="${i}"><span>“${linkify(line)}”${thBlock(thLine(npc.id, i))}</span></label>`).join("");
  }));

  $("#accuse-form").onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const choice = { suspect: data.get("suspect"), lie: data.get("lie"), proof: data.get("proof") };
    if (!choice.suspect || choice.lie === null || !choice.proof) {
      toast("Choose a suspect, one of their statements, and a piece of evidence.");
      return;
    }
    const verdict = judge(choice);
    if (verdict.ok) {
      state.score += SCORE.caseSolved;
      state.solved = true;
      if (SND) SND.fanfare();
    } else {
      state.chances -= 1;
      state.score = Math.max(0, state.score + SCORE.wrongAccusation);
      state.wrong += 1;
      if (SND) SND.fail();
    }
    updateHud();
    if (verdict.ok) showSolved();
    else showWrongAccusation(verdict);
  };
}

/* Checks the three answers in order; each step only counts if the one before was right. */
function judge({ suspect, lie, proof }) {
  const disproved = currentCase.contradictions[lie];   // clue ids that prove this statement false
  const suspectOk = suspect === currentCase.culpritId;
  const lieOk = suspectOk && Array.isArray(disproved);
  const proofOk = lieOk && disproved.includes(proof);
  return { suspect, suspectOk, lieOk, ok: proofOk };
}

/* ---------- result windows ---------- */
/* `stats`: the live state, or the snapshot in state.result for a solved case. */
function statsBlock(stats = state) {
  return `<div class="result-stats">
    <div><span>SCORE</span><strong>${stats.score}</strong></div>
    <div><span>WRONG</span><strong>${stats.wrong}</strong></div>
    <div><span>HINTS</span><strong>${stats.hints}</strong></div>
  </div>`;
}

/* Says WHY it failed, without naming the answer. */
function showWrongAccusation(verdict) {
  if (state.chances <= 0) { outOfChances(); return; }
  const name = esc((currentCase.npcs.find((n) => n.id === verdict.suspect) || {}).name || "That suspect");
  let reason;
  if (!verdict.suspectOk) reason = `The evidence does not show that ${name} lied. Look for a statement that clashes with a time or a place in your clues.`;
  else if (!verdict.lieOk) reason = `${name} is hiding something — but that statement is not the lie. Read their other statement again.`;
  else reason = "That statement is false, but this evidence does not prove it. Which clue shows a different time or place?";
  modal(`<div class="result">
    <div class="seal fail">TRY<br>AGAIN</div>
    <p class="eyebrow dark">DEDUCTION FAILED</p>
    <h2>Not quite right yet.</h2>
    <p>${reason}</p>
    <p class="chance-line">Chances left: <b>${hearts(state.chances)}</b></p>
    ${statsBlock()}
    <div class="modal-actions"><button id="result-button" class="primary-button small">Keep investigating</button></div>
  </div>`);
  $("#result-button").onclick = closeModal;
}

/* The result is a snapshot of the moment the case was solved, kept in
   state.result: the stars, the best score, the stats and the quiz answers.
   Quizzes can still be answered after that, but the window drawn again from
   the notebook shows the same numbers, so the stars always match them. */
function showSolved() {
  accusing = false;
  if (SND) SND.music(caseScene());
  if (!state.result) {
    const criteria = starCriteria();
    const stars = criteria.filter((item) => item.met).length;
    state.result = {
      criteria, stars, newBest: recordBest(stars, state.score),
      score: state.score, wrong: state.wrong, hints: state.hints,
      answered: { ...state.answered }
    };
    noteWords(currentCase.confession, currentCase.solution);
  }
  renderSolved();
}

/* The result on the left, the words of the case on the right (wordreport.js). */
function renderSolved() {
  const { criteria, stars, newBest, answered } = state.result;
  const culprit = currentCase.npcs.find((n) => n.id === currentCase.culpritId);
  const index = CASE_ORDER.findIndex((c) => c.id === currentCase.id);
  const nextCase = CASE_ORDER[index + 1];   // undefined after the last case

  modal(`<div class="end-layout"><div class="result">
    <div class="seal">CASE<br>SOLVED</div>
    <p class="eyebrow dark">MISSION COMPLETE</p>
    <div class="result-stars" aria-label="${stars} of 3 stars">${starText(stars)}</div>
    ${newBest ? `<p class="new-best">New personal best!</p>` : ""}
    <div class="confession">
      <canvas id="culprit-face" width="64" height="76"></canvas>
      <div><strong>${esc(culprit.name)}</strong><p>“${linkify(currentCase.confession)}”${thBlock(thConfession())}</p></div>
    </div>
    <p>${esc(currentCase.solution)}${thBlock(thSolution())}</p>
    <ul class="star-list">${criteria.map((item) => `<li class="${item.met ? "met" : ""}">${item.met ? "★" : "☆"} ${esc(item.label)}</li>`).join("")}</ul>
    ${statsBlock(state.result)}
    <div class="modal-actions">
      ${stars < 3 ? `<button id="replay-case" class="light-button">Replay for ★★★</button>` : ""}
      ${nextCase ? `<button id="next-case" class="light-button">Next case — new location</button>` : ""}
      <button id="result-button" class="primary-button small">Back to case select</button>
    </div>
  </div>${wordReportSection(answered)}</div>`, { wide: true });
  drawFace($("#culprit-face"), culprit.look);

  $("#result-button").onclick = () => dom.changeCase.click();
  if (stars < 3) $("#replay-case").onclick = () => { closeModal(); configureCase(); toast("Case restarted — go for ★★★"); };
  if (nextCase) {
    $("#next-case").onclick = () => {
      dom.caseSelect.value = nextCase.id;
      closeModal();
      configureCase();
      toast(`New location: ${currentCase.location}`);
    };
  }
}

function outOfChances() {
  modal(`<div class="end-layout"><div class="result">
    <div class="seal fail">CASE<br>CLOSED</div>
    <p class="eyebrow dark">OUT OF CHANCES</p>
    <h2>Chief Rowan has taken you off the case.</h2>
    <p>Three wrong accusations — the culprit got away this time. Start again, and compare every statement with your evidence before you accuse.</p>
    <div class="modal-actions">
      <button id="restart-case" class="primary-button small">Restart this case</button>
      <button id="result-button" class="light-button">Back to case select</button>
    </div>
  </div>${wordReportSection()}</div>`, { wide: true });
  $("#restart-case").onclick = () => { closeModal(); configureCase(); toast(`Case restarted at ${currentCase.location}`); };
  $("#result-button").onclick = () => dom.changeCase.click();
}
