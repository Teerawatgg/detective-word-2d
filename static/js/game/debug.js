/* debug.js — hooks for the automated tests (tests/browser_smoke_test.py,
   tests/dom_smoke_test.js). Not used by the game itself.

   Each hook either reads state (snapshot, chances, stars…) or drives the real
   UI path (openQuiz, accuseWith…), so the tests check what a player would see. */
"use strict";

window.__DETECTIVE_DEBUG__ = {
  snapshot: () => ({
    gameActive, caseId: currentCase?.id, mapId: currentMap?.id, frameCount, fatalError: fatalError?.message || null,
    player: { x: player.x, y: player.y, r: player.r }, npcCount: currentCase?.npcs?.length || 0, clueCount: currentCase?.clues?.length || 0,
    discovered: state.discovered.size, score: state.score, doors: doorStates.map((item) => ({ progress: item.progress, target: item.target }))
  }),
  teleportTo: (type, id) => {
    const source = type === "npc" ? currentCase.npcs : currentCase.clues;
    const target = source.find((item) => item.id === id);
    if (!target) throw new Error("Target not found");
    player.x = target.x; player.y = target.y;
    resetKeys(); findNearest();
  },
  forceInteract: () => interact(),
  frame: (timestamp) => gameLoop(timestamp),
  objective: () => currentObjectiveTarget(),
  hasMinimap: () => typeof drawMinimap === "function",
  isTypingTarget: (node) => isTypingTarget(node),
  thaiSubtitlesOn: () => thaiOn,
  setThaiSubtitles: (value) => setThai(value),
  hasContentTh: () => !!window.DW_TH,
  goToCase: (id) => { dom.caseSelect.value = id; configureCase(); },
  skipBriefing: () => { briefingDone = true; },
  quizCorrectIndex: (id) => (shuffledQuestions[id] || {}).correct,
  quizAnswerIsCorrectText: (id) => {
    const question = currentCase.questions.find((q) => q.id === id);
    const view = quizView(question);
    return view.choices[view.correct] === question.choices[question.correct];
  },
  suspectOrder: () => shuffledSuspects.map((npc) => npc.id),
  proofOrder: () => shuffledProofs.map((proof) => proof.id),
  openDialogue: (id) => dialogue(currentCase.npcs.find((npc) => npc.id === id)),
  openEvidence: (id) => evidence(currentCase.clues.find((clue) => clue.id === id)),
  openQuiz: (id) => quiz(currentCase.questions.find((question) => question.id === id)),
  openAccuse: () => accuse(),
  quizChoiceOrder: (id) => (shuffledQuestions[id] || {}).order,
  audioSceneStopper: () => typeof stopAudioScene === "function",
  chances: () => state.chances,
  solved: () => state.solved,
  stars: () => starCriteria().filter((item) => item.met).length,
  accusing: () => accusing,
  discoverAll: () => { currentCase.clues.forEach((clue) => state.discovered.add(clue.id)); updateHud(); },
  lookup: (text) => { const hit = vocabLookup(text); return hit && { key: hit.key, form: hit.form }; },
  linkify: (text, skipTerm) => linkify(text, skipTerm),
  caseOrder: () => CASE_ORDER.map((c) => c.id),
  /* renders the word popup for any word; returns its text and the highlighted verb-form cells */
  wordPopup: (word) => {
    showWordPopup(document.body, word);
    return { text: dom.wordPopup.textContent.replace(/\s+/g, " "), cells: [...dom.wordPopup.querySelectorAll(".wp-forms td")].map((td) => [td.textContent, td.classList.contains("on")]) };
  },
  /* drives the real accusation form; returns false if an option is not on screen */
  accuseWith: (suspect, line, proof) => {
    accuse();
    const form = $("#accuse-form");
    if (!form) return false;
    const radio = form.querySelector(`input[name=suspect][value="${suspect}"]`);
    if (!radio) return false;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    const lie = form.querySelector(`input[name=lie][value="${line}"]`);
    const evidenceRadio = form.querySelector(`input[name=proof][value="${proof}"]`);
    if (!lie || !evidenceRadio) return false;
    lie.checked = true; evidenceRadio.checked = true;
    form.onsubmit({ preventDefault() {}, target: form });
    return true;
  }
};
