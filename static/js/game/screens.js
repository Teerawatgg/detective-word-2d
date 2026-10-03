/* screens.js — everything before a case starts.

   Four screens, one visible at a time:
     start      name, character, case list (grouped by category) + preview
     how-to     controls and one card per case
     briefing   Chief Rowan's introduction, shown once per player
     game       the case itself (set up in case.js)

   Uses: core.js, audio.js (stopAudioScene), modals.js (closeModal),
   progress.js (bests), dictionary.js (linkify), case.js (launchGameScreen). */
"use strict";

const SCREENS = [dom.start, dom.howToScreen, dom.briefingScreen, dom.gameScreen];
function showScreen(screen) {
  SCREENS.forEach((element) => element.classList.toggle("hidden", element !== screen));
}

/* Everything that must happen whenever the player leaves a case. */
function leaveCase() {
  gameActive = false;   // first, so closing the accusation window does not restart the case music
  closeModal();
  stopAudioScene();
  resetKeys();
}

function showStartScreen() {
  leaveCase();
  showScreen(dom.start);
  renderCasePreview();   // a best score may have changed
}

function showHowToScreen() {
  leaveCase();
  showScreen(dom.howToScreen);
}

/* ======================= start screen ======================= */

function drawMini(canvas, look) {
  const miniCtx = canvas.getContext("2d");
  miniCtx.clearRect(0, 0, canvas.width, canvas.height);
  SPR.drawChibi(miniCtx, canvas.width / 2, canvas.height - 10, look, { dir: "down", pose: "idle", scale: 2.1 });
}

function buildCharacterPicker() {
  dom.picker.replaceChildren();
  CHARACTERS.forEach((character, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-option${index === 0 ? " selected" : ""}`;
    button.innerHTML = `<canvas width="60" height="70"></canvas><strong>${esc(character.name)}</strong><small>Rookie detective</small>`;
    button.addEventListener("click", () => {
      selectedCharacter = character;
      document.querySelectorAll(".character-option").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      if (SND) SND.click();
    });
    dom.picker.appendChild(button);
    drawMini(button.querySelector("canvas"), character);
  });
}

/* The case <select>: one <optgroup> per category, in play order. */
function buildCaseSelect() {
  dom.caseSelect.replaceChildren();
  let group = null;
  CASE_ORDER.forEach((caseItem) => {
    if (!group || group.dataset.category !== caseItem.category) {
      group = document.createElement("optgroup");
      group.label = CATEGORY_LABEL[caseItem.category];
      group.dataset.category = caseItem.category;
      dom.caseSelect.appendChild(group);
    }
    const option = document.createElement("option");
    option.value = caseItem.id;
    option.textContent = caseOptionLabel(caseItem);
    group.appendChild(option);
  });
  dom.caseSelect.addEventListener("change", renderCasePreview);
  renderCasePreview();
}

function caseOptionLabel(caseItem) {
  const best = loadBest(caseItem.id);
  return `${caseItem.title} — ${caseItem.difficulty}${best ? `  ${starText(best.stars)}` : ""}`;
}

/* "Vocabulary ×3, Tense ×1" */
function topicSummary(caseItem) {
  const counts = {};
  caseItem.questions.forEach((q) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
  return Object.entries(counts).map(([topic, n]) => `${TOPIC_LABEL[topic] || topic} ×${n}`).join(", ");
}

/* The box under the case list, plus the stars shown inside each option. */
function renderCasePreview() {
  const caseItem = CASES.find((item) => item.id === dom.caseSelect.value) || CASES[0];
  [...dom.caseSelect.options].forEach((option) => {
    const item = CASES.find((c) => c.id === option.value);
    if (item) option.textContent = caseOptionLabel(item);
  });
  const best = loadBest(caseItem.id);
  const record = best ? `<span class="case-best">Your best: ${starText(best.stars)} · ${best.score} pts</span>` : "";
  dom.casePreview.innerHTML = `
    <strong>${esc(caseItem.difficulty)} · ${caseItem.clues.length} clues · quizzes: ${esc(topicSummary(caseItem))}</strong>${record}
    <span>📍 ${esc(caseItem.location)} — ${esc(caseItem.description)}</span>`;
}

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (SND) SND.unlock();
  if (briefingDone) {
    launchGameScreen();
  } else {
    launchAfterBriefing = true;
    showBriefing(false);
  }
});

/* ======================= How to Play ======================= */

/* One card per case; clicking a card selects that case on the start screen. */
function buildHowToCases() {
  dom.howToCases.replaceChildren();
  CASE_ORDER.forEach((caseItem) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guide-case-card";
    button.dataset.caseId = caseItem.id;
    button.innerHTML = `
      <span class="guide-map-thumb" aria-hidden="true"></span>
      <span>
        <h3>${esc(caseItem.title)}</h3>
        <p>${esc(caseItem.location)} · ${esc(CATEGORY_LABEL[caseItem.category])}</p>
      </span>
      <span class="difficulty-badge">${esc(caseItem.difficulty)}</span>`;
    button.addEventListener("click", () => {
      dom.caseSelect.value = caseItem.id;
      showStartScreen();
      dom.name.focus();
    });
    dom.howToCases.appendChild(button);
  });
}

dom.howToOpen.addEventListener("click", showHowToScreen);
dom.howToBack.addEventListener("click", showStartScreen);
dom.changeCase.addEventListener("click", showStartScreen);

/* ======================= briefing ======================= */

let briefingDone = false;          // shown once per player; a page reload is a new player
let launchAfterBriefing = false;   // true when the briefing was opened by "Start Investigation"
let briefingIndex = 0;             // current page

function showBriefing(fromReplay = false) {
  if (SND) SND.unlock();
  blurActiveField();
  briefingIndex = 0;
  showScreen(dom.briefingScreen);
  dom.briefingSpeaker.textContent = BRIEFING.speaker;
  dom.briefingSkip.textContent = fromReplay ? "Close" : "Skip";
  renderBriefingPage();
}

function renderBriefingPage() {
  const isLastPage = briefingIndex + 1 >= BRIEFING.pages.length;
  SPR.drawPortrait(dom.briefingPortrait.getContext("2d"), dom.briefingPortrait.width, dom.briefingPortrait.height, BRIEFING.look,
    { pose: "talk", talkOpen: briefingIndex % 2 === 0 });
  dom.briefingText.innerHTML = linkify(BRIEFING.pages[briefingIndex]);
  dom.briefingPage.textContent = `${briefingIndex + 1} / ${BRIEFING.pages.length}`;
  dom.briefingNext.innerHTML = isLastPage ? "Begin the case <span>→</span>" : "Continue <span>→</span>";
}

function finishBriefing() {
  briefingDone = true;
  dom.briefingScreen.classList.add("hidden");
  if (launchAfterBriefing) {
    launchAfterBriefing = false;
    launchGameScreen();
  } else {
    showStartScreen();
  }
}

dom.briefingNext.addEventListener("click", () => {
  if (SND) SND.click();
  if (briefingIndex + 1 < BRIEFING.pages.length) {
    briefingIndex += 1;
    renderBriefingPage();
  } else {
    finishBriefing();
  }
});
dom.briefingSkip.addEventListener("click", finishBriefing);
dom.replayBriefing.addEventListener("click", () => showBriefing(true));
