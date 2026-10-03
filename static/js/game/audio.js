/* audio.js — the game's side of sound (the synthesiser itself is engine/sound.js).

   - the mute buttons and the volume panel,
   - the "audio scene": each case's music theme + room tone, the tension cue
     during an accusation, and music that grows as the player finds clues,
   - stopAudioScene(), called on EVERY way out of a case so music never keeps
     playing over a menu.

   Uses from core.js: SND, dom, $, currentCase, state, accusing. */
"use strict";

const AUDIO_BUSES = ["master", "music", "sfx", "ambience"];
const audioPanel = $("#audio-panel");

/* ---------- mute buttons (start screen + top bar) ---------- */
function syncSoundButtons() {
  const label = SND && SND.isEnabled() ? "🔊" : "🔇";
  if (dom.soundToggle) dom.soundToggle.textContent = label;
  if (dom.soundToggleGame) dom.soundToggleGame.textContent = label;
}
function toggleSound() {
  if (!SND) return;
  SND.setEnabled(!SND.isEnabled());
  SND.unlock();
  syncSoundButtons();
}
dom.soundToggle?.addEventListener("click", toggleSound);
dom.soundToggleGame?.addEventListener("click", toggleSound);
syncSoundButtons();

/* ---------- volume panel: one slider per bus ---------- */
function syncAudioPanel() {
  if (!SND || !audioPanel || !SND.getSettings) return;
  const values = SND.getSettings();
  AUDIO_BUSES.forEach((bus) => {
    const slider = $(`#vol-${bus}`);
    if (slider) slider.value = Math.round((values[bus] ?? 0.5) * 100);
  });
}
function toggleAudioPanel() {
  if (!audioPanel) return;
  if (SND) SND.unlock();
  syncAudioPanel();
  audioPanel.classList.toggle("hidden");
}
$("#audio-settings")?.addEventListener("click", toggleAudioPanel);
$("#audio-settings-game")?.addEventListener("click", toggleAudioPanel);
$("#audio-panel-close")?.addEventListener("click", () => audioPanel.classList.add("hidden"));
AUDIO_BUSES.forEach((bus) => {
  const slider = $(`#vol-${bus}`);
  if (!slider) return;
  slider.addEventListener("input", () => { if (SND) SND.setVolume(bus, slider.value / 100); });
});

/* ---------- the audio scene of the current case ---------- */

/* Theme name in engine/sound.js (school, museum, station, aquarium), set per case. */
function caseScene() { return currentCase.scene || "school"; }

function updateAudioScene() {
  if (!SND) return;
  SND.unlock();
  SND.ambience(caseScene());
  SND.music(accusing ? "deduction" : caseScene());
  refreshMusicIntensity();
}

/* Music gets busier as the player gets closer to having enough clues. */
function refreshMusicIntensity() {
  if (!SND) return;
  const progress = currentCase.minimumClues ? state.discovered.size / currentCase.minimumClues : 0;
  SND.setIntensity(state.solved ? 0.25 : Math.min(0.95, 0.3 + progress * 0.6));
}

/* Stops music AND room tone. Leaving a case must always go through here. */
function stopAudioScene() {
  accusing = false;
  if (!SND) return;
  SND.stopMusic();
  SND.stopAmbience();
  SND.setIntensity(0.3);
}
