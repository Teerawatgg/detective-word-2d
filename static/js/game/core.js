/* core.js — shared by every other file in game/.

   The game/ scripts are plain <script> tags (no build step), so their
   top-level names are shared: anything declared here can be used by the
   files loaded after it. This file holds:
     - the content loaded by data/*.js and the engine objects,
     - tuning constants,
     - DOM handles,
     - the mutable game state (current case, player, progress),
     - two tiny helpers ($ and esc). */
"use strict";

/* ---------- content and engine (see data/ and engine/) ---------- */
const CHARACTERS = window.DW_CHARACTERS || [];
const CASES = window.DW_CASES || [];
const VOCAB = window.DW_VOCAB || {};
const IRREGULAR = window.DW_IRREGULAR || {};
const BRIEFING = window.DW_BRIEFING;
const SPR = window.DW_SPRITES;
const SND = window.DW_SOUND;   // may be missing (no Web Audio): always check before use

/* ---------- tuning ---------- */
const PLAYER_RADIUS = 9;
const PLAYER_SPEED = 188;          // px per second
const INTERACT_DISTANCE = 66;      // how close you must stand to talk / inspect
const MAX_CHANCES = 3;             // wrong accusations allowed per case

// Points. A streak of right answers adds STREAK_STEP per answer in a row, up to STREAK_MAX steps.
const SCORE = {
  clueFound: 5,
  quizRight: 20, quizWrong: -5, hint: -3,
  streakStep: 5, streakMax: 3,
  caseSolved: 50, wrongAccusation: -10
};

// Doors open early and close late, so the player never waits at a doorway.
const DOOR_OPEN_DISTANCE = 118;
const DOOR_CLOSE_DISTANCE = 168;
const DOOR_ANIMATION_SPEED = 7.5;  // progress units per second (0 = shut, 1 = open)
const DOOR_PASSABLE_AT = 0.55;     // once this open, the door panels stop blocking
const DOOR_FUNNEL_RANGE = 96;      // within this distance, steer the player into the gap
const DOOR_FUNNEL_STRENGTH = 4.2;  // how hard that steering pulls
const CORNER_SLIDE_PX = 14;        // max sideways nudge to slip past a corner

// Furniture collides with a slightly smaller box than it is drawn with,
// so brushing past the edge of a desk does not stop the player.
const FURNITURE_COLLISION_INSET = {
  desk: 5, counter: 5, shelf: 4, bench: 6, gym_bench: 6,
  locker: 5, trophy_case: 5, crate: 5, computer: 7,
  printer: 7, server: 6
};

/* ---------- categories and quiz topics ---------- */
const CATEGORY_LABEL = { detective: "🕵️ Detective English", it: "💻 IT English", work: "💼 Workplace English" };
const TOPIC_LABEL = { vocab: "Vocabulary", it: "IT", work: "Workplace", tense: "Tense" };

// Play order = dropdown order: cases grouped by category, categories in the
// order they first appear. "Next case" walks this list.
const CASE_ORDER = [...new Set(CASES.map((c) => c.category))]
  .flatMap((category) => CASES.filter((c) => c.category === category));

/* ---------- DOM ---------- */
const $ = (selector) => document.querySelector(selector);

const dom = {
  // screens
  start: $("#start-screen"), howToScreen: $("#how-to-screen"),
  briefingScreen: $("#briefing-screen"), gameScreen: $("#game-screen"),
  // start screen + How to Play
  form: $("#start-form"), name: $("#player-name"), picker: $("#character-picker"),
  caseSelect: $("#case-select"), casePreview: $("#case-preview"),
  howToOpen: $("#how-to-open"), howToBack: $("#how-to-back"), howToCases: $("#how-to-cases"),
  replayBriefing: $("#replay-briefing"),
  // briefing
  briefingPortrait: $("#briefing-portrait"), briefingText: $("#briefing-text"), briefingSpeaker: $("#briefing-speaker"),
  briefingPage: $("#briefing-page"), briefingNext: $("#briefing-next"), briefingSkip: $("#briefing-skip"),
  // game screen
  canvas: $("#game"), minimap: $("#minimap"),
  clueCount: $("#clue-count"), quizCount: $("#quiz-count"), score: $("#score"), chances: $("#chances"),
  prompt: $("#interact-prompt"), promptLabel: $("#interact-label"), objectiveTip: $("#objective-tip"),
  headerTitle: $("#header-case-title"), panelTitle: $("#panel-case-title"),
  difficulty: $("#difficulty-badge"), locationName: $("#location-name"), description: $("#panel-description"),
  portrait: $("#portrait"), detectiveName: $("#detective-name"),
  accuse: $("#accuse-open"), notebook: $("#notebook-open"), changeCase: $("#change-case"),
  thaiToggle: $("#thai-toggle"), soundToggle: $("#sound-toggle"), soundToggleGame: $("#sound-toggle-game"),
  // overlays
  modalLayer: $("#modal-layer"), modalWindow: $("#modal-layer .modal"), modalBody: $("#modal-body"), modalClose: $("#modal-close"),
  wordPopup: $("#word-popup"), toast: $("#toast")
};
const ctx = dom.canvas.getContext("2d");

/* ---------- game state ---------- */
let selectedCharacter = CHARACTERS[0];
let currentCase = CASES[0];
let currentMap = currentCase?.map;
let player = newPlayer({ x: 0, y: 0 });
let state = freshState();
let keys = { up: false, down: false, left: false, right: false };

let gameActive = false;          // a case is on screen and the loop should run
let accusing = false;            // the accusation window (and its tension music) is open
let doorStates = [];             // per door: { progress 0..1, target 0|1 }
let lastFrame = performance.now();
let frameCount = 0;              // read by tests
let fatalError = null;           // read by tests

/* Progress inside one case. A new object is made every time a case starts. */
function freshState() {
  return {
    score: 0,
    discovered: new Set(),   // clue ids
    answered: {},            // question id -> { selected, ok }
    wrong: 0, hints: 0, streak: 0,
    chances: MAX_CHANCES,
    talkedOfficer: false,
    solved: false,
    result: null,            // the CASE SOLVED numbers, worked out once (accusation.js)
    wordsMet: new Map(),     // dictionary key -> the word as first read ("logged"), see wordreport.js
    wordsLooked: new Set(),  // dictionary keys the player clicked
    nearest: null,           // NPC or clue the player can interact with right now
    modal: false             // a window is open, so movement is paused
  };
}
function newPlayer(start) {
  return { x: start.x, y: start.y, r: PLAYER_RADIUS, speed: PLAYER_SPEED, facing: "down", step: 0 };
}
function resetKeys() { keys = { up: false, down: false, left: false, right: false }; }

/* Escapes text before it is put into innerHTML. Use it for every string. */
const esc = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
