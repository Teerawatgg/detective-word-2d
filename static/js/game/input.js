/* input.js — keyboard, touch controls (D-pad, E, Notebook, case drawer) and page visibility.

   Keys are read by event.code (the physical key), not event.key (the
   character), so WASD works with a Thai or any other keyboard layout.

     WASD / arrows   move          E   talk / inspect     Q   notebook
     M               mute          T   Thai subtitles     Esc close the window

   While the player is typing in a form field (their name, the case list),
   the game never takes the key, so typing "wasd" types "wasd".

   Uses: core.js, modals.js (interact, notebook, closeModal), accusation.js
   (accuse), audio.js (toggleSound, updateAudioScene, stopAudioScene), thai.js (setThai). */
"use strict";

const CODE_TO_DIR = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right"
};

/* Is this element a field the player types into? */
function isTypingTarget(node) {
  if (!node) return false;
  if (node.isContentEditable) return true;
  if (node.tagName === "INPUT") {
    const type = (node.type || "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(type);
  }
  return node.tagName === "TEXTAREA" || node.tagName === "SELECT";
}

/* ---------- keyboard ---------- */
addEventListener("keydown", (event) => {
  if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) {
    if (event.code === "Escape" && state.modal) closeModal();
    return;   // let the browser type the character (never preventDefault here)
  }

  const dir = CODE_TO_DIR[event.code];
  if (dir && gameActive && !state.modal) {
    event.preventDefault();   // stop the arrow keys from scrolling the page
    keys[dir] = true;
  }

  if (event.repeat) return;   // holding a key must not toggle things over and over
  if (event.code === "KeyE" && gameActive) interact();
  if (event.code === "KeyQ" && gameActive && !state.modal) notebook();
  if (event.code === "KeyM" && gameActive) toggleSound();
  if (event.code === "KeyT" && gameActive) setThai(!thaiOn);
  if (event.code === "Escape" && state.modal) closeModal();
});

addEventListener("keyup", (event) => {
  const dir = CODE_TO_DIR[event.code];
  if (dir) keys[dir] = false;
});

// Drop every held key when focus moves to a form field or away from the
// window, so the detective does not keep walking on their own.
document.addEventListener("focusin", (event) => { if (isTypingTarget(event.target)) resetKeys(); });
addEventListener("blur", resetKeys);

/* ---------- touch controls (phones and tablets) ----------
   The D-pad is one surface, not four buttons: the direction comes from where
   the finger is relative to its centre, so sliding the thumb turns without
   lifting it, and the corners between two arrows walk diagonally. */
const DPAD_SECTORS = {   // 45° slices, 0 = right, clockwise (screen y points down)
  "0": ["right"], "1": ["right", "down"], "2": ["down"], "3": ["down", "left"],
  "4": ["left"], "-4": ["left"], "-3": ["left", "up"], "-2": ["up"], "-1": ["up", "right"]
};
const dpad = $(".dpad");
let dpadPointer = null;

function steerDpad(event) {
  const box = dpad.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);
  resetKeys();
  let directions = [];
  if (Math.hypot(dx, dy) > box.width * 0.12) {   // a small dead zone in the middle
    directions = DPAD_SECTORS[String(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)))];
    directions.forEach((direction) => { keys[direction] = true; });
  }
  dpad.dataset.dir = directions.join(" ");   // lights up the arrows in CSS
}
function releaseDpad(event) {
  if (event.pointerId !== dpadPointer) return;
  dpadPointer = null;
  resetKeys();
  dpad.dataset.dir = "";
}
dpad.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dpadPointer = event.pointerId;
  dpad.setPointerCapture(event.pointerId);   // keep steering even if the thumb slides off the pad
  steerDpad(event);
});
dpad.addEventListener("pointermove", (event) => { if (event.pointerId === dpadPointer) steerDpad(event); });
["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => dpad.addEventListener(name, releaseDpad));

$(".touch-interact").onclick = () => { if (gameActive) interact(); };
$(".touch-notebook").onclick = () => dom.notebook.onclick();
dom.prompt.onclick = () => { if (gameActive) interact(); };   // the "E Interact" bubble can be tapped too

/* ---------- case panel drawer (phones) ---------- */
function setPanelOpen(open) {
  document.body.classList.toggle("panel-open", open);
  $("#panel-toggle").setAttribute("aria-expanded", String(open));
}
$("#panel-toggle").onclick = () => setPanelOpen(!document.body.classList.contains("panel-open"));
$(".panel-backdrop").onclick = () => setPanelOpen(false);
// any button in the panel (×, Accuse, Change Case) also closes the drawer
document.querySelectorAll(".case-panel button").forEach((button) => button.addEventListener("click", () => setPanelOpen(false)));

/* ---------- top bar buttons ---------- */
dom.notebook.onclick = () => {
  if (!gameActive) return;
  if (SND) SND.click();
  notebook();
};
dom.accuse.onclick = accuse;

/* ---------- leaving the page ----------
   Switching tabs only PAUSES the sound, and coming back resumes the right
   track; `accusing` is kept, so an open accusation window gets its tension
   music back. Closing or reloading the page stops everything. */
document.addEventListener("visibilitychange", () => {
  if (!SND) return;
  if (document.hidden) { SND.stopMusic(); SND.stopAmbience(); }
  else if (gameActive) updateAudioScene();
});
addEventListener("pagehide", stopAudioScene);
addEventListener("beforeunload", stopAudioScene);
