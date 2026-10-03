/* progress.js — stars and personal bests.

   The game runs on shared classroom machines, one player after another, so a
   page refresh means a NEW player: nothing about a player is saved to disk.
   Bests live in memory until the page reloads. Only the machine's audio
   settings (volume, mute — kept by engine/sound.js) survive a reload.

   Uses from core.js: state, currentCase, MAX_CHANCES. */
"use strict";

/* Older versions saved player data under "detectiveWord2D:v6:*". Delete it,
   so an old record cannot reappear, but keep the two audio-setting keys. */
const KEPT_STORAGE_KEYS = ["detectiveWord2D:v6:audio", "detectiveWord2D:v6:sound"];
try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("detectiveWord2D:v6:") && !KEPT_STORAGE_KEYS.includes(key))
    .forEach((key) => localStorage.removeItem(key));
} catch (error) { /* storage is blocked: nothing to clean */ }

/* The three stars of a case. */
function starCriteria() {
  return [
    { label: "Case solved", met: state.solved },
    { label: "No wrong accusations", met: state.chances === MAX_CHANCES },
    { label: "Every English question right, no hints", met: state.hints === 0 && currentCase.questions.every((q) => state.answered[q.id]?.ok) }
  ];
}
function starText(count) { return "★".repeat(count) + "☆".repeat(3 - count); }

const bestByCase = new Map();   // case id -> { stars, score }
function loadBest(caseId) { return bestByCase.get(caseId) || null; }

/* Keeps the result if it beats the best so far (more stars, then more points). Returns true if it did. */
function recordBest(stars, score) {
  const previous = loadBest(currentCase.id);
  const better = !previous || stars > previous.stars || (stars === previous.stars && score > previous.score);
  if (better) bestByCase.set(currentCase.id, { stars, score });
  return better;
}
