/* input.js — keyboard, touch buttons and page visibility.

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

/* ---------- touch buttons (small screens) ---------- */
document.querySelectorAll("[data-dir]").forEach((button) => {
  const direction = button.dataset.dir;
  button.onpointerdown = (event) => { event.preventDefault(); keys[direction] = true; };
  ["onpointerup", "onpointercancel", "onpointerleave"].forEach((name) => { button[name] = () => { keys[direction] = false; }; });
});
$("[data-action=interact]").onclick = interact;

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
