/* case.js — starting a case and keeping its HUD up to date.

   launchGameScreen()   from the start screen / briefing into the selected case
   configureCase()      (re)starts the case chosen in the case list
   updateHud()          top bar, objectives, accuse button, objective tip

   Shuffling: in the case files every quiz lists its right answer first
   (correct: 0). Each time a case starts, the choices, the suspects and the
   evidence list are shuffled, so the answer is not always "A" and a replay
   does not repeat the same answer key.

   Uses: core.js, audio.js (updateAudioScene, refreshMusicIntensity),
   screens.js (drawMini, showScreen), modals.js (toast), render.js (draw). */
"use strict";

let shuffledQuestions = {};   // question id -> { order, choices, correct }
let shuffledSuspects = [];
let shuffledProofs = [];      // the clues, for the accusation form

function shuffled(list) {   // Fisher–Yates
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffleCase(caseItem) {
  shuffledQuestions = {};
  caseItem.questions.forEach((question) => {
    const order = shuffled(question.choices.map((choice, index) => index));   // order[screenPosition] = authored index
    shuffledQuestions[question.id] = {
      order,
      choices: order.map((index) => question.choices[index]),
      correct: order.indexOf(question.correct)
    };
  });
  shuffledSuspects = shuffled(caseItem.npcs.filter((npc) => npc.role === "Suspect"));
  shuffledProofs = shuffled(caseItem.clues);
}

/* The choices of a question as shown on screen (authored order if it was never shuffled). */
function quizView(question) {
  return shuffledQuestions[question.id] || { choices: question.choices, correct: question.correct };
}

/* ---------- starting a case ---------- */

function launchGameScreen() {
  blurActiveField();
  configureCase();
  showScreen(dom.gameScreen);
  toast(`Case started at ${currentCase.location}`);
}

function configureCase() {
  currentCase = CASES.find((item) => item.id === dom.caseSelect.value) || CASES[0];
  currentMap = currentCase.map;
  state = freshState();
  shuffleCase(currentCase);
  player = newPlayer(currentCase.playerStart);
  doorStates = currentMap.doors.map(() => ({ progress: 0, target: 0 }));   // every door starts shut
  resetKeys();
  lastFrame = performance.now();
  gameActive = true;

  dom.headerTitle.textContent = currentCase.title;
  dom.panelTitle.textContent = currentCase.title;
  dom.difficulty.textContent = currentCase.difficulty;
  dom.locationName.textContent = `📍 ${currentCase.location}`;
  dom.description.textContent = currentCase.description;
  dom.description.title = currentCase.description;   // the panel cuts it to a few lines; the tooltip has it all
  $("#obj-clues").textContent = `Find at least ${currentCase.minimumClues} clues`;
  dom.detectiveName.textContent = dom.name.value.trim() || "Detective";
  drawMini(dom.portrait, selectedCharacter);
  resetRoomBanner();
  updateHud();
  updateAudioScene();
  draw();
}

/* Moves keyboard focus from the name / case fields to the game, otherwise
   the "don't steal keys while typing" rule in input.js would block WASD. */
function blurActiveField() {
  const active = document.activeElement;
  if (active && typeof active.blur === "function" && active !== document.body) active.blur();
  if (dom.canvas && typeof dom.canvas.focus === "function") dom.canvas.focus();
}

/* ---------- HUD ---------- */

function updateHud() {
  const canAccuse = state.discovered.size >= currentCase.minimumClues;
  dom.clueCount.textContent = `${state.discovered.size}/${currentCase.clues.length}`;
  dom.quizCount.textContent = `${Object.keys(state.answered).length}/${currentCase.questions.length}`;
  dom.score.textContent = state.score;
  if (dom.chances) dom.chances.textContent = hearts(state.chances);
  $("#obj-officer").classList.toggle("done", state.talkedOfficer);
  $("#obj-clues").classList.toggle("done", canAccuse);
  $("#obj-accuse").classList.toggle("done", state.solved);
  if (canAccuse && dom.accuse.disabled && SND) SND.sting();   // the moment the accuse button unlocks
  dom.accuse.disabled = !canAccuse;
  updateObjectiveTip();
  refreshMusicIntensity();
}

/* The yellow tip above the map: always the next concrete step. */
function updateObjectiveTip() {
  if (!dom.objectiveTip) return;
  const found = state.discovered.size, needed = currentCase.minimumClues;
  let tip;
  // the end of the case first: it can come before the officer was ever talked to
  if (state.solved) tip = "Case solved! Open Notebook to see the result and the words of this case.";
  else if (state.chances <= 0) tip = "Out of chances. Open Notebook to see the result and the words, or restart the case.";
  else if (!state.talkedOfficer) tip = "Find the police officer and press E to talk.";
  else if (found < needed) tip = `Explore the rooms and collect clues (${found}/${needed} found).`;
  else tip = `Enough evidence! Compare each suspect's statements with your clues, then accuse — ${state.chances} chance${state.chances === 1 ? "" : "s"} left.`;
  dom.objectiveTip.textContent = tip;
}
