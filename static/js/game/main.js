/* main.js — loaded last: checks the data, builds the start screen and starts
   the frame loop.

   If anything is wrong (a broken case file, a missing element), the error is
   shown on screen instead of leaving a silent, half-working game. */
"use strict";

function validateGameData() {
  if (!dom.canvas || !ctx) throw new Error("Canvas element not found.");
  if (!Array.isArray(CHARACTERS) || CHARACTERS.length === 0) throw new Error("No playable characters were found.");
  if (!Array.isArray(CASES) || CASES.length === 0) throw new Error("No cases were found.");
  const caseIds = new Set();
  const mapIds = new Set();
  for (const item of CASES) {
    if (!item.id || caseIds.has(item.id)) throw new Error(`Duplicate or missing case id: ${item.id}`);
    caseIds.add(item.id);
    if (!CATEGORY_LABEL[item.category]) throw new Error(`Case ${item.id} has an unknown category: ${item.category}`);
    if (!item.map?.id || mapIds.has(item.map.id)) throw new Error(`Duplicate or missing map id for case: ${item.id}`);
    mapIds.add(item.map.id);
    for (const field of ["zones", "walls", "doors", "furniture"]) {
      if (!Array.isArray(item.map[field])) throw new Error(`Map ${item.map.id} is missing '${field}'`);
    }
    if (!Array.isArray(item.npcs) || !Array.isArray(item.clues) || !Array.isArray(item.questions)) {
      throw new Error(`Case ${item.id} is missing npcs, clues, or questions.`);
    }
  }
  // (the full content check, with maps, Thai and vocabulary, is tools/validate_data.py)
}

function showFatal(error) {
  fatalError = error;
  console.error(error);
  gameActive = false;
  document.querySelector(".fatal-error")?.remove();
  const box = document.createElement("div");
  box.className = "fatal-error";
  box.innerHTML = `<div><h2>Something went wrong</h2><p>${esc(error.message)}</p><p>Please refresh the page. If it happens again, tell your teacher this message.</p></div>`;
  document.querySelector(".canvas-wrap").appendChild(box);
}

/* One frame: move, find what is in reach, draw. dt is capped at 50 ms so a
   slow frame (or a tab coming back) cannot teleport the player through a wall. */
function gameLoop(timestamp) {
  try {
    const deltaSeconds = Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;
    if (gameActive) {
      update(deltaSeconds);
      findNearest();
      draw();
    }
  } catch (error) {
    showFatal(error);
  }
  requestAnimationFrame(gameLoop);
}

try {
  validateGameData();
  buildCharacterPicker();
  buildCaseSelect();
  buildHowToCases();
  requestAnimationFrame(gameLoop);
} catch (error) {
  showFatal(error);
}
