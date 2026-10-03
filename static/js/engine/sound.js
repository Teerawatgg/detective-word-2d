/* =====================================================================
   engine/sound.js — all sound, made in code with the Web Audio API.
   Exposes window.DW_SOUND (the game calls it SND).

   Signal path:

     master ─ compressor ─ destination
        ├─ musicGain    (BGM: procedural jazz themes, or a real file)
        │     ├─ music reverb (convolver)
        │     └─ lead echo    (tempo-synced delay)
        ├─ ambienceGain (room tone per location)
        └─ sfxGain ─┬─ dry
                    └─ convolver (generated room reverb)

   Every sound can come from ONE OF TWO sources:
     1. A real audio file, if /static/audio/manifest.json lists it.
        (Drop .ogg/.mp3 files in static/audio/ — see static/audio/README.md)
     2. The built-in synthesiser, used automatically when a file is
        missing. So the game always has full audio, with or without
        downloaded assets.
   ===================================================================== */
"use strict";

(function () {
  const STORE = "detectiveWord2D:v6:audio";

  /* ---------- persisted settings ---------- */
  const settings = { enabled: true, master: 0.8, music: 0.45, sfx: 0.9, ambience: 0.35 };
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) Object.assign(settings, JSON.parse(raw));
    if (localStorage.getItem("detectiveWord2D:v6:sound") === "off") settings.enabled = false;
  } catch (error) { /* private mode */ }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch (error) { /* ignore */ }
  }

  /* ---------- graph ---------- */
  let ctx = null;
  let master, comp, musicGain, sfxGain, sfxDry, sfxWet, ambienceGain, convolver;
  let musicVerbIn, musicDelay, musicDelayIn;
  let ready = false;

  function buildGraph() {
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3.2;
    comp.attack.value = 0.004; comp.release.value = 0.2;

    master = ctx.createGain();
    master.gain.value = settings.enabled ? settings.master : 0;
    master.connect(comp).connect(ctx.destination);

    musicGain = ctx.createGain(); musicGain.gain.value = settings.music; musicGain.connect(master);
    ambienceGain = ctx.createGain(); ambienceGain.gain.value = settings.ambience; ambienceGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = settings.sfx; sfxGain.connect(master);

    convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(1.5, 2.6);
    sfxDry = ctx.createGain(); sfxDry.gain.value = 1.0; sfxDry.connect(sfxGain);
    sfxWet = ctx.createGain(); sfxWet.gain.value = 0.22;
    sfxWet.connect(convolver); convolver.connect(sfxGain);

    /* music has its own hall reverb and a tempo-synced echo (fed by the lead) */
    const musicVerb = ctx.createConvolver();
    musicVerb.buffer = makeImpulse(2.4, 3.2);
    musicVerbIn = ctx.createGain();
    musicVerbIn.connect(musicVerb); musicVerb.connect(musicGain);
    musicDelay = ctx.createDelay(2);
    const echoTone = ctx.createBiquadFilter(); echoTone.type = "lowpass"; echoTone.frequency.value = 2400;
    const echoFeedback = ctx.createGain(); echoFeedback.gain.value = 0.32;
    const echoOut = ctx.createGain(); echoOut.gain.value = 0.35;
    musicDelayIn = ctx.createGain();
    musicDelayIn.connect(musicDelay); musicDelay.connect(echoTone);
    echoTone.connect(echoFeedback); echoFeedback.connect(musicDelay);
    echoTone.connect(echoOut); echoOut.connect(musicGain);
    ready = true;
  }

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      buildGraph();
      loadManifest();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* =====================================================================
     Sample layer — real audio files, optional
     ===================================================================== */
  const samples = Object.create(null);
  let manifest = null;

  async function loadManifest() {
    try {
      const response = await fetch("/static/audio/manifest.json", { cache: "no-store" });
      if (!response.ok) return;
      manifest = await response.json();
      const entries = Object.entries(manifest.sfx || {}).concat(Object.entries(manifest.music || {}));
      await Promise.all(entries.map(async ([name, file]) => {
        try {
          const res = await fetch("/static/audio/" + file);
          if (!res.ok) return;
          samples[name] = await ctx.decodeAudioData(await res.arrayBuffer());
        } catch (error) { /* missing file: synth fallback stays in charge */ }
      }));
      if (musicPlaying && musicSampleFor(currentMusicName)) startMusic(currentMusicName, true);
    } catch (error) { /* no manifest: pure synth mode */ }
  }

  function playSample(name, opts) {
    const buffer = samples[name];
    if (!buffer) return false;
    const o = opts || {};
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = o.rate ?? 1;
    const gain = ctx.createGain();
    gain.gain.value = o.volume ?? 1;
    source.connect(gain);
    gain.connect(sfxDry); gain.connect(sfxWet);
    source.start();
    return true;
  }

  /* =====================================================================
     Synth helpers
     ===================================================================== */
  function now() { return ctx.currentTime; }

  function env(gain, t0, attack, hold, release, peak) {
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, peak), t0 + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  }

  function voice(opts) {
    if (!settings.enabled) return;
    const audio = ensureCtx(); if (!audio) return;
    const o = opts || {};
    const t0 = now() + (o.delay || 0);
    const osc = audio.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glideTo), t0 + (o.glide ?? o.duration ?? 0.2));
    if (o.detune) osc.detune.value = o.detune;

    const gain = audio.createGain();
    const duration = o.duration ?? 0.2;
    env(gain, t0, o.attack ?? 0.008, o.hold ?? duration * 0.3, o.release ?? duration * 0.7, o.volume ?? 0.12);

    let node = osc;
    if (o.filter) {
      const filter = audio.createBiquadFilter();
      filter.type = o.filter; filter.frequency.value = o.cutoff ?? 1200; filter.Q.value = o.q ?? 1;
      node.connect(filter); node = filter;
    }
    node.connect(gain);
    gain.connect(sfxDry);
    if (o.reverb !== false) gain.connect(sfxWet);
    osc.start(t0);
    osc.stop(t0 + duration + (o.release ?? 0.2) + 0.05);
  }

  let noiseBuffer = null;
  function getNoise() {
    if (!noiseBuffer) {
      const length = ctx.sampleRate * 2;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function noise(opts) {
    if (!settings.enabled) return;
    const audio = ensureCtx(); if (!audio) return;
    const o = opts || {};
    const t0 = now() + (o.delay || 0);
    const source = audio.createBufferSource();
    source.buffer = getNoise();
    source.loop = true;
    source.playbackRate.value = o.rate ?? 1;

    const filter = audio.createBiquadFilter();
    filter.type = o.filter || "bandpass";
    filter.frequency.setValueAtTime(o.cutoff ?? 900, t0);
    if (o.cutoffTo) filter.frequency.exponentialRampToValueAtTime(o.cutoffTo, t0 + (o.duration ?? 0.15));
    filter.Q.value = o.q ?? 1.2;

    const gain = audio.createGain();
    const duration = o.duration ?? 0.12;
    env(gain, t0, o.attack ?? 0.004, o.hold ?? 0.01, o.release ?? duration, o.volume ?? 0.08);

    source.connect(filter).connect(gain);
    gain.connect(sfxDry);
    if (o.reverb !== false) gain.connect(sfxWet);
    source.start(t0);
    source.stop(t0 + duration + (o.release ?? 0.2) + 0.05);
  }

  /* =====================================================================
     Background music — a procedural jazz combo
     ---------------------------------------------------------------------
       • one THEME per location + a "deduction" tension cue while the
         player is accusing (a `tension` file in the manifest overrides it);
       • each theme = 8-bar chord progression + a composed 8-bar melody
         ("head"), arranged as head → improvised solo → head → comping
         only, so nothing repeats exactly for ~1.5 minutes and the solo
         chorus is regenerated every time from the chord tones;
       • a walking bass computed from chord tones + a chromatic approach
         note into the next chord (always in key);
       • a sample-accurate lookahead scheduler (bars are placed on a
         running clock, never on "now");
       • small instrument models (FM electric piano, marimba, muted horn,
         sax, bell, pad, upright & synth bass, brush/ride/kick kit) with
         a music reverb and a tempo-synced echo on the lead;
       • `intensity` rises with the clues found — it adds the ride
         cymbal, kick and busier comping as the case heats up.
     ===================================================================== */
  const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  const CHORD = {
    maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], "7": [0, 4, 7, 10],
    "7b9": [0, 4, 7, 10, 13], m7b5: [0, 3, 6, 10], m6: [0, 3, 7, 9], "7sus": [0, 5, 7, 10],
    m: [0, 3, 7]
  };
  /* Chord types where adding the 9th to an improvised line still sounds right. */
  const ADD_NINE = { maj7: true, m7: true, m6: true, "7sus": true };

  /* Chords are [bass root as MIDI, type]. Melody bars are [8th-step, MIDI, length in 8ths]. */
  const THEMES = {
    /* Narin School — bright F-major swing, marimba lead */
    school: {
      bpm: 108, swing: 0.18, lead: "marimba", leadVol: 0.11, comp: "ep", bass: "walk", drums: "light",
      chords: [[41, "maj7"], [38, "m7"], [43, "m7"], [36, "7"], [45, "m7"], [38, "7"], [43, "m7"], [36, "7"]],
      head: [
        [[0, 72, 1], [1, 77, 1], [2, 81, 2], [4, 79, 1], [5, 77, 1], [6, 76, 2]],
        [[0, 74, 2], [2, 77, 1], [3, 81, 1], [4, 84, 3], [7, 81, 1]],
        [[0, 82, 2], [2, 81, 1], [3, 79, 1], [4, 77, 2], [6, 74, 2]],
        [[0, 76, 3], [3, 79, 1], [4, 82, 2], [6, 79, 2]],
        [[0, 81, 1], [1, 84, 1], [2, 88, 2], [4, 86, 1], [5, 84, 1], [6, 81, 2]],
        [[0, 78, 2], [2, 81, 1], [3, 84, 1], [4, 86, 3], [7, 84, 1]],
        [[0, 82, 2], [2, 79, 2], [4, 77, 1], [5, 74, 1], [6, 70, 2]],
        [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 82, 2]]
      ]
    },
    /* Bayview Museum — slow A-minor noir, muted horn lead */
    museum: {
      bpm: 84, swing: 0.3, lead: "horn", leadVol: 0.085, comp: "ep", bass: "walk", drums: "brush",
      chords: [[45, "m9"], [45, "m9"], [38, "m9"], [38, "m9"], [47, "m7b5"], [40, "7b9"], [45, "m9"], [40, "7b9"]],
      head: [
        [[0, 76, 6], [6, 74, 1], [7, 72, 1]],
        [[0, 71, 2], [2, 72, 2], [4, 69, 4]],
        [[0, 77, 6], [6, 76, 1], [7, 74, 1]],
        [[0, 72, 2], [2, 74, 2], [4, 76, 4]],
        [[0, 77, 3], [3, 74, 1], [4, 71, 4]],
        [[0, 68, 2], [2, 71, 2], [4, 74, 2], [6, 77, 2]],
        [[0, 76, 3], [3, 72, 1], [4, 69, 4]],
        [[0, 71, 2], [2, 68, 2], [4, 64, 4]]
      ]
    },
    /* Riverside Station — driving E-minor, near-straight 8ths, sax lead */
    station: {
      bpm: 116, swing: 0.08, lead: "sax", leadVol: 0.1, leadShift: -12, comp: "ep", bass: "drive", drums: "drive",
      chords: [[40, "m7"], [36, "maj7"], [45, "m7"], [47, "7"], [40, "m7"], [36, "maj7"], [42, "m7b5"], [47, "7"]],
      head: [
        [[0, 76, 1], [1, 79, 1], [2, 83, 1], [3, 79, 1], [4, 86, 2], [6, 83, 2]],
        [[0, 84, 3], [3, 83, 1], [4, 79, 2], [6, 76, 2]],
        [[0, 81, 1], [1, 84, 1], [2, 88, 2], [4, 86, 1], [5, 84, 1], [6, 81, 2]],
        [[0, 87, 3], [3, 86, 1], [4, 83, 2], [6, 78, 2]],
        [[0, 79, 1], [1, 83, 1], [2, 86, 1], [3, 88, 1], [4, 91, 2], [6, 88, 2]],
        [[0, 86, 2], [2, 84, 2], [4, 83, 2], [6, 79, 2]],
        [[0, 81, 2], [2, 84, 2], [4, 88, 2], [6, 84, 2]],
        [[0, 83, 2], [2, 81, 2], [4, 78, 2], [6, 75, 2]]
      ]
    },
    /* Coral Bay Aquarium — floating D-major, bell lead over pads */
    aquarium: {
      bpm: 88, swing: 0.1, lead: "bell", leadVol: 0.07, comp: "pad", bass: "two", drums: "soft",
      chords: [[38, "maj7"], [42, "m7"], [43, "maj7"], [43, "m6"], [38, "maj7"], [47, "m7"], [40, "m7"], [45, "7sus"]],
      head: [
        [[0, 81, 4], [4, 85, 2], [6, 88, 2]],
        [[0, 85, 6], [6, 81, 2]],
        [[0, 83, 4], [4, 86, 2], [6, 90, 2]],
        [[0, 88, 6], [6, 82, 2]],
        [[0, 81, 4], [4, 78, 2], [6, 76, 2]],
        [[0, 78, 6], [6, 74, 2]],
        [[0, 79, 4], [4, 83, 2], [6, 86, 2]],
        [[0, 88, 4], [4, 86, 4]]
      ]
    },
    /* Accusation screen — C-minor tension cue, ticking clock, builds over 16 bars */
    deduction: {
      bpm: 124, swing: 0, lead: null, comp: "arp", bass: "pulse", drums: "tension",
      chords: [[36, "m"], [36, "m"], [44, "maj7"], [43, "7b9"], [36, "m"], [36, "m"], [41, "m"], [43, "7b9"]]
    }
  };
  THEMES.explore = THEMES.museum;   // legacy name, kept for the manifest's `explore` key

  /* head → improvised solo → head → rhythm section only */
  const ARRANGEMENT = ["head", "solo", "head", "comp"];
  const SOLO_RHYTHMS = [
    [[0, 2], [2, 1], [3, 1], [4, 2], [6, 2]],
    [[0, 3], [3, 1], [4, 4]],
    [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2]],
    [[0, 4], [4, 2], [6, 2]],
    [[2, 2], [4, 1], [5, 1], [6, 2]],
    [[0, 1], [1, 1], [2, 2], [5, 3]]
  ];
  const COMP_SPARSE = [[[0, 6]], [[0, 3], [5, 3]], [[2, 6]]];
  const COMP_BUSY = [[[0, 2], [3, 2]], [[1, 1], [3, 3]], [[0, 3], [6, 2]], [[2, 2], [5, 3]], [[0, 1], [3, 1], [6, 2]]];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function fold(note, lo, hi) { while (note > hi) note -= 12; while (note < lo) note += 12; return note; }
  const pcOf = (note, root) => ((note - root) % 12 + 12) % 12;

  /* Close-position voicing between MIDI 55 and 66; rootless for 4+ note chords. */
  function voicing(chord) {
    const intervals = CHORD[chord[1]];
    const tones = intervals.length >= 4 ? intervals.slice(1) : intervals;
    return tones.map((interval) => fold(chord[0] + interval, 55, 66)).sort((a, b) => a - b);
  }
  /* Every chord tone (plus a safe 9th) inside [lo, hi] — the pool a solo can draw from. */
  function chordPool(chord, lo, hi) {
    const pcs = new Set(CHORD[chord[1]].map((interval) => interval % 12));
    if (ADD_NINE[chord[1]]) pcs.add(2);
    const pool = [];
    for (let note = lo; note <= hi; note++) if (pcs.has(pcOf(note, chord[0]))) pool.push(note);
    return pool;
  }
  function nearest(pool, target) {
    return pool.reduce((best, note) => (Math.abs(note - target) < Math.abs(best - target) ? note : best), pool[0]);
  }

  /* ---------- small instrument models ---------- */
  function osc(type, freq, t) {
    const node = ctx.createOscillator();
    node.type = type; node.frequency.setValueAtTime(freq, t);
    return node;
  }
  /* attack → decay to `sustain`×peak → hold until `end` → release. Returns the stop time. */
  function shape(gain, t, peak, attack, sustain, decay, end, release) {
    const floor = Math.max(0.0001, peak * sustain);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(floor, t + attack + decay);
    const hold = Math.max(end, t + attack + decay + 0.01);
    gain.gain.setValueAtTime(floor, hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, hold + release);
    return hold + release + 0.02;
  }
  function vibrato(node, t, depthCents) {
    const lfo = osc("sine", 5.2, t);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(depthCents, t + 0.3);
    lfo.connect(depth).connect(node.detune);
    return lfo;
  }
  function run(nodes, t, stopAt) { nodes.forEach((node) => { node.start(t); node.stop(stopAt); }); }

  const INSTRUMENTS = {
    /* FM electric piano (Rhodes-like tine) — the comping instrument */
    ep(dest, midi, t, dur, vel) {
      const f = mtof(midi);
      const carrier = osc("sine", f, t), mod = osc("sine", f, t);
      const index = ctx.createGain();
      index.gain.setValueAtTime(f * 1.4, t);
      index.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.35);
      mod.connect(index).connect(carrier.frequency);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.006, 0.4, 0.45, t + dur, 0.35);
      carrier.connect(amp).connect(dest);
      run([carrier, mod], t, stop);
    },
    marimba(dest, midi, t, dur, vel) {
      const f = mtof(midi);
      const body = osc("sine", f, t), click = osc("sine", f * 4, t);
      const amp = ctx.createGain(), clickAmp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.003, 0.002, 0.55, t, 0.05);
      shape(clickAmp, t, vel * 0.35, 0.002, 0.002, 0.07, t, 0.02);
      body.connect(amp).connect(dest);
      click.connect(clickAmp).connect(dest);
      run([body, click], t, stop);
    },
    horn(dest, midi, t, dur, vel) {
      const tone = osc("sawtooth", mtof(midi), t);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.exponentialRampToValueAtTime(1900, t + 0.07);
      filter.frequency.exponentialRampToValueAtTime(1100, t + 0.3);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.04, 0.7, 0.15, t + dur, 0.22);
      const lfo = vibrato(tone, t, 9);
      tone.connect(filter).connect(amp).connect(dest);
      run([tone, lfo], t, stop);
    },
    sax(dest, midi, t, dur, vel) {
      const f = mtof(midi);
      const a = osc("sawtooth", f, t), b = osc("sawtooth", f, t);
      a.detune.value = 7; b.detune.value = -7;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.Q.value = 1.6;
      filter.frequency.setValueAtTime(700, t);
      filter.frequency.exponentialRampToValueAtTime(2200, t + 0.05);
      filter.frequency.exponentialRampToValueAtTime(1500, t + 0.25);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.025, 0.75, 0.12, t + dur, 0.14);
      const lfo = vibrato(a, t, 10);
      a.connect(filter); b.connect(filter); filter.connect(amp).connect(dest);
      run([a, b, lfo], t, stop);
    },
    bell(dest, midi, t, dur, vel) {
      const f = mtof(midi);
      const carrier = osc("sine", f, t), mod = osc("sine", f * 3.5, t);
      const index = ctx.createGain();
      index.gain.setValueAtTime(f * 2.2, t);
      index.gain.exponentialRampToValueAtTime(f * 0.08, t + 1.2);
      mod.connect(index).connect(carrier.frequency);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.004, 0.002, 2.2, t, 0.1);
      carrier.connect(amp).connect(dest);
      run([carrier, mod], t, stop);
    },
    pad(dest, midi, t, dur, vel) {
      const f = mtof(midi);
      const a = osc("sawtooth", f, t), b = osc("sawtooth", f, t);
      a.detune.value = 9; b.detune.value = -9;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.5;
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.5, 0.8, 0.5, t + dur, 1.1);
      a.connect(filter); b.connect(filter); filter.connect(amp).connect(dest);
      run([a, b], t, stop);
    },
    arp(dest, midi, t, dur, vel) {
      const tone = osc("triangle", mtof(midi), t);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 1800;
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.004, 0.05, 0.2, t, 0.05);
      tone.connect(filter).connect(amp).connect(dest);
      run([tone], t, stop);
    },
    upright(dest, midi, t, dur, vel) {
      const f = mtof(midi);
      const a = osc("triangle", f, t), b = osc("sine", f, t);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 700;
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.008, 0.5, 0.25, t + dur * 0.9, 0.12);
      a.connect(filter); b.connect(filter); filter.connect(amp).connect(dest);
      run([a, b], t, stop);
    },
    synthBass(dest, midi, t, dur, vel) {
      const tone = osc("sawtooth", mtof(midi), t);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.Q.value = 4;
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + 0.15);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.005, 0.5, 0.12, t + dur * 0.8, 0.06);
      tone.connect(filter).connect(amp).connect(dest);
      run([tone], t, stop);
    }
  };

  /* ---------- drum kit ---------- */
  function hit(dest, t, vel, filterType, cutoff, q, decay, attack) {
    const source = ctx.createBufferSource();
    source.buffer = getNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = filterType; filter.frequency.value = cutoff; filter.Q.value = q;
    const amp = ctx.createGain();
    const stop = shape(amp, t, vel, attack || 0.002, 0.002, decay, t, 0.02);
    source.connect(filter).connect(amp).connect(dest);
    source.start(t, Math.random() * 0.5);
    source.stop(stop);
  }
  const DRUM = {
    kick(dest, t, vel) {
      const tone = osc("sine", 120, t);
      tone.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.003, 0.002, 0.3, t, 0.02);
      tone.connect(amp).connect(dest);
      run([tone], t, stop);
    },
    snare(dest, t, vel) {
      hit(dest, t, vel, "bandpass", 1800, 0.8, 0.16);
      const body = osc("triangle", 196, t);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel * 0.6, 0.002, 0.002, 0.08, t, 0.02);
      body.connect(amp).connect(dest);
      run([body], t, stop);
    },
    brush(dest, t, vel, length) { hit(dest, t, vel, "bandpass", 3000, 0.6, length || 0.18, 0.02); },
    rim(dest, t, vel) {
      hit(dest, t, vel, "bandpass", 2500, 2, 0.03);
      const click = osc("triangle", 1700, t);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel * 0.5, 0.001, 0.002, 0.03, t, 0.01);
      click.connect(amp).connect(dest);
      run([click], t, stop);
    },
    ride(dest, t, vel) { hit(dest, t, vel, "highpass", 7000, 0.7, 0.32); },
    hat(dest, t, vel) { hit(dest, t, vel, "highpass", 8500, 0.7, 0.045); },
    crash(dest, t, vel) { hit(dest, t, vel, "highpass", 5000, 0.5, 1.2); },
    tick(dest, t, vel) {
      const tone = osc("sine", 2400, t);
      const amp = ctx.createGain();
      const stop = shape(amp, t, vel, 0.001, 0.002, 0.025, t, 0.01);
      tone.connect(amp).connect(dest);
      run([tone], t, stop);
    }
  };

  /* ---------- per-bar arrangement ---------- */
  function playBass(song, chord, next, at, level) {
    const theme = song.theme, sd = song.stepDur, dest = song.out;
    const intervals = CHORD[chord[1]];
    const root = fold(chord[0], 33, 50);
    const third = root + intervals[1], fifth = root + intervals[2], seventh = root + (intervals[3] ?? 12);
    const approach = fold(next[0], 33, 50) + (Math.random() < 0.5 ? -1 : 1);
    if (theme.bass === "walk" && level >= 0.4) {
      const line = pick([[root, third, fifth, approach], [root, fifth, third, approach], [root, third, fifth, seventh]]);
      line.forEach((note, beat) => INSTRUMENTS.upright(dest, note, at(beat * 2), sd * 2, 0.22));
    } else if (theme.bass === "walk" || theme.bass === "two") {
      INSTRUMENTS.upright(dest, root, at(0), sd * 4, 0.22);
      INSTRUMENTS.upright(dest, theme.bass === "two" ? fifth : approach, at(4), sd * 4, 0.2);
    } else if (theme.bass === "drive") {
      [root, root, root + 12, root, fifth, root, root + 12, approach]
        .forEach((note, step) => INSTRUMENTS.synthBass(dest, note, at(step), sd, step % 2 ? 0.16 : 0.21));
    } else if (theme.bass === "pulse") {
      for (let step = 0; step < 8; step++) INSTRUMENTS.synthBass(dest, step === 7 ? root + 12 : root, at(step), sd, 0.17 + level * 0.07);
    }
  }

  function playComp(song, chord, at, level, section) {
    const theme = song.theme, sd = song.stepDur, dest = song.out;
    const notes = voicing(chord);
    if (theme.comp === "ep") {
      const busy = level > 0.45 || section === "comp";
      const lift = section === "comp" ? 12 : 0;   // without a lead the keys move up and fill the space
      pick(busy ? COMP_BUSY : COMP_SPARSE).forEach(([step, length]) => {
        notes.forEach((note) => INSTRUMENTS.ep(dest, note + lift, at(step), length * sd, 0.045));
      });
    } else if (theme.comp === "pad") {
      notes.forEach((note) => INSTRUMENTS.pad(dest, note, at(0), sd * 8, 0.03));
      if (level > 0.6 || section === "comp") notes.forEach((note) => INSTRUMENTS.ep(dest, note + 12, at(4), sd * 3, 0.03));
    } else if (theme.comp === "arp") {
      const tones = chordPool(chord, 60, 75);
      const cycle = tones.concat(tones.slice(1, -1).reverse());
      for (let step = 0; step < 8; step++) INSTRUMENTS.arp(dest, cycle[step % cycle.length], at(step), sd, 0.05 + level * 0.035);
      notes.forEach((note) => INSTRUMENTS.pad(dest, note, at(0), sd * 8, 0.032));
    }
  }

  function playDrums(song, at, level, lastBar, barInChorus) {
    const kit = song.theme.drums, dest = song.out;
    const swing = [0, 2, 3, 4, 6, 7];   // "spang-a-lang" ride: 1, 2, 2&, 3, 4, 4&
    if (kit === "brush" || kit === "light" || kit === "soft") {
      if (kit === "brush") { DRUM.brush(dest, at(0), 0.025, 0.35); [2, 6].forEach((s) => DRUM.brush(dest, at(s), 0.05)); }
      if (kit === "light") [2, 6].forEach((s) => DRUM.rim(dest, at(s), 0.05));
      if (kit === "soft") { if (barInChorus % 2 === 0) DRUM.brush(dest, at(0), 0.02, 0.6); [0, 4].forEach((s) => DRUM.ride(dest, at(s), 0.014)); }
      else if (level > (kit === "light" ? 0.25 : 0.4)) swing.forEach((s) => DRUM.ride(dest, at(s), s === 2 || s === 6 ? 0.03 : 0.022));
      if (level > 0.5) [2, 6].forEach((s) => DRUM.hat(dest, at(s), 0.02));
      if (level > (kit === "light" ? 0.45 : 0.6)) [0, 4].forEach((s) => DRUM.kick(dest, at(s), kit === "light" ? 0.1 : 0.06));
      if (lastBar && kit !== "soft") [6, 7].forEach((s) => DRUM.snare(dest, at(s), 0.035));
    } else if (kit === "drive") {
      (level > 0.6 ? [0, 3, 4] : [0, 4]).forEach((s) => DRUM.kick(dest, at(s), 0.14));
      [2, 6].forEach((s) => DRUM.snare(dest, at(s), 0.07));
      for (let s = 0; s < 8; s++) DRUM.hat(dest, at(s), s % 2 ? 0.024 : 0.016);
      if (lastBar) [5, 6, 7].forEach((s) => DRUM.snare(dest, at(s), 0.05));
    } else if (kit === "tension") {
      if (barInChorus === 0) DRUM.crash(dest, at(0), 0.05);
      [0, 2, 4, 6].forEach((s) => DRUM.kick(dest, at(s), 0.06 + level * 0.07));
      for (let s = 0; s < 8; s++) DRUM.tick(dest, at(s), s % 2 ? 0.012 : 0.022);
      if (level > 0.6) DRUM.snare(dest, at(6), 0.05);
      if (lastBar) for (let s = 4; s < 8; s += 0.5) DRUM.snare(dest, at(4) + (s - 4) * song.stepDur, 0.02 + (s - 4) * 0.01);
    }
  }

  function leadNote(song, midi, t, duration, volume) {
    INSTRUMENTS[song.theme.lead](song.lead, midi, t, duration, volume);
  }

  function improvise(song, chord, at, lastBar) {
    const theme = song.theme;
    const pool = chordPool(chord, theme.leadLo, theme.leadHi);
    let previous = song.lastLead ?? pool[Math.floor(pool.length / 2)];
    const rhythm = lastBar ? [[0, 2], [2, 6]] : pick(SOLO_RHYTHMS);
    rhythm.forEach(([step, length], index) => {
      let note;
      if (lastBar && index === rhythm.length - 1) {
        note = nearest(pool.filter((n) => pcOf(n, chord[0]) === 0), previous);   // land on the root
      } else {
        const moves = pool.filter((n) => n !== previous && Math.abs(n - previous) <= 5);
        note = moves.length ? pick(moves) : nearest(pool, previous);
      }
      leadNote(song, note, at(step), length * song.stepDur * 0.92, theme.leadVol * 0.85);
      previous = note;
    });
    song.lastLead = previous;
  }

  function scheduleBar(song, t0) {
    const theme = song.theme, sd = song.stepDur, length = theme.chords.length;
    const barInChorus = song.bar % length;
    const chorus = Math.floor(song.bar / length);
    const chord = theme.chords[barInChorus];
    const next = theme.chords[(barInChorus + 1) % length];
    const at = (step) => t0 + step * sd + (step % 2 ? theme.swing * sd : 0);
    /* the tension cue builds by itself over 16 bars; the location themes follow the clue count */
    const level = theme.drums === "tension" ? Math.min(1, 0.35 + song.bar / 16) : intensity;
    const section = theme.head ? ARRANGEMENT[chorus % ARRANGEMENT.length] : "groove";
    const lastBar = barInChorus === length - 1;

    playBass(song, chord, next, at, level);
    playComp(song, chord, at, level, section);
    playDrums(song, at, level, lastBar, barInChorus);
    if (section === "head") {
      theme.head[barInChorus].forEach(([step, midi, steps]) => {
        leadNote(song, midi + (theme.leadShift || 0), at(step), steps * sd * 0.95, theme.leadVol);
      });
      const last = theme.head[barInChorus][theme.head[barInChorus].length - 1];
      song.lastLead = last[1] + (theme.leadShift || 0);
    } else if (section === "solo") {
      improvise(song, chord, at, lastBar);
    }
    song.bar++;
  }

  /* ---------- transport ---------- */
  const LOOKAHEAD = 0.25;   // seconds of music kept queued ahead of the clock
  const TICK_MS = 60;
  let song = null;
  let musicTimer = null;
  let musicPlaying = false;
  let musicWanted = false;   // the game asked for music (survives a mute / unmute)
  let intensity = 0.35;
  let currentMusicName = "museum";
  let musicSource = null;
  let musicSourceGain = null;

  function createSong(name) {
    const theme = THEMES[name] || THEMES.museum;
    if (theme.head && theme.leadLo === undefined) {
      const notes = theme.head.flat().map(([, midi]) => midi + (theme.leadShift || 0));
      theme.leadLo = Math.min(...notes) - 2;
      theme.leadHi = Math.max(...notes) + 2;
    }
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now());
    out.gain.exponentialRampToValueAtTime(1, now() + 0.6);   // fade in
    out.connect(musicGain);
    const send = ctx.createGain(); send.gain.value = 0.3;
    out.connect(send); send.connect(musicVerbIn);
    const lead = ctx.createGain(); lead.connect(out);
    const echo = ctx.createGain(); echo.gain.value = 0.28;
    lead.connect(echo); echo.connect(musicDelayIn);
    const beat = 60 / theme.bpm;
    musicDelay.delayTime.setValueAtTime(beat * 0.75, now());   // dotted-8th echo, in tempo
    return { theme, out, lead, echo, bar: 0, stepDur: beat / 2, nextBarTime: now() + 0.12, lastLead: null };
  }

  function tick() {
    if (!song) return;
    if (song.nextBarTime < now()) song.nextBarTime = now() + 0.05;   // tab was throttled: re-sync instead of bursting
    while (song.nextBarTime < now() + LOOKAHEAD) {
      scheduleBar(song, song.nextBarTime);
      song.nextBarTime += song.stepDur * 8;
    }
    musicTimer = setTimeout(tick, TICK_MS);
  }

  function fadeOut(gainNode, extra) {
    const t = now();
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setTargetAtTime(0, t, 0.12);
    setTimeout(() => { try { gainNode.disconnect(); (extra || []).forEach((node) => node.disconnect()); } catch (error) { /* ignore */ } }, 1500);
  }

  function musicSampleFor(name) {
    if (samples[name]) return samples[name];
    if (name === "deduction") return samples.tension || null;
    return samples.explore || null;
  }

  function stopFileMusic() {
    if (musicSource) {
      try { musicSource.stop(now() + 0.5); } catch (error) { /* ignore */ }
      fadeOut(musicSourceGain);
      musicSource = null; musicSourceGain = null;
    }
  }

  /* Silences the music without forgetting that the game wants it (used by mute). */
  function haltMusic() {
    musicPlaying = false;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    if (song) { fadeOut(song.out, [song.echo]); song = null; }
    stopFileMusic();
  }

  function startMusic(name, force) {
    const audio = ensureCtx(); if (!audio) return;
    name = name || "museum";
    musicWanted = true;
    if (musicPlaying && currentMusicName === name && !force) return;
    haltMusic();
    currentMusicName = name;
    if (!settings.enabled) return;   // remembered: setEnabled(true) resumes it
    musicPlaying = true;
    const file = musicSampleFor(name);
    if (file) {
      musicSourceGain = audio.createGain();
      musicSourceGain.gain.setValueAtTime(0.0001, now());
      musicSourceGain.gain.exponentialRampToValueAtTime(1, now() + 0.6);
      musicSourceGain.connect(musicGain);
      musicSource = audio.createBufferSource();
      musicSource.buffer = file;
      musicSource.loop = true;
      musicSource.connect(musicSourceGain);
      musicSource.start();
      return;
    }
    song = createSong(name);
    tick();
  }

  function stopMusic() {
    musicWanted = false;
    haltMusic();
  }

  /* =====================================================================
     Ambience — per-location room tone
     ===================================================================== */
  let ambienceNodes = null;
  const AMBIENCE = {
    school:   { cutoff: 420, q: 0.6, volume: 0.05,  wobble: 0.12 },
    museum:   { cutoff: 260, q: 0.5, volume: 0.04,  wobble: 0.05 },
    station:  { cutoff: 700, q: 0.4, volume: 0.075, wobble: 0.22 },
    aquarium: { cutoff: 340, q: 0.9, volume: 0.07,  wobble: 0.30 },
    none: null
  };

  function stopAmbience() {
    if (!ambienceNodes) return;
    try { ambienceNodes.source.stop(); ambienceNodes.lfo.stop(); } catch (error) { /* ignore */ }
    ambienceNodes = null;
  }

  function startAmbience(kind) {
    const audio = ensureCtx(); if (!audio) return;
    stopAmbience();
    const preset = AMBIENCE[kind];
    if (!preset) return;
    const source = audio.createBufferSource();
    source.buffer = getNoise(); source.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = preset.cutoff; filter.Q.value = preset.q;
    const gain = audio.createGain(); gain.gain.value = preset.volume;

    const lfo = audio.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = audio.createGain(); lfoGain.gain.value = preset.cutoff * preset.wobble;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    source.connect(filter).connect(gain).connect(ambienceGain);
    source.start();
    ambienceNodes = { source, lfo, gain };
  }

  /* =====================================================================
     Public API
     ===================================================================== */
  let footToggle = 0;
  const Sound = {
    isEnabled: () => settings.enabled,
    setEnabled(value) {
      settings.enabled = !!value; persist();
      if (master) master.gain.setTargetAtTime(settings.enabled ? settings.master : 0, now(), 0.03);
      /* Mute only HALTS the music and remembers what the game asked for
         (musicWanted), so un-muting resumes the right track — and un-muting on
         a menu, where no music is wanted, stays silent. */
      if (settings.enabled) { ensureCtx(); if (musicWanted && !musicPlaying) startMusic(currentMusicName); }
      else haltMusic();
    },
    getSettings: () => ({ ...settings }),
    setVolume(bus, value) {
      const v = Math.max(0, Math.min(1, value));
      settings[bus] = v; persist();
      if (!ready) return;
      const target = { master: master, music: musicGain, sfx: sfxGain, ambience: ambienceGain }[bus];
      if (target) target.gain.setTargetAtTime(bus === "master" && !settings.enabled ? 0 : v, now(), 0.03);
    },
    unlock() { ensureCtx(); },

    music: startMusic,
    stopMusic: stopMusic,
    setIntensity(value) { intensity = Math.max(0, Math.min(1, value)); },
    /* read-only, for tests: which theme is playing and how far it has got */
    musicState: () => ({ playing: musicPlaying, wanted: musicWanted, name: currentMusicName, bar: song ? song.bar : null }),
    ambience: startAmbience,
    stopAmbience: stopAmbience,

    click() {
      if (playSample("click", { volume: 0.6 })) return;
      noise({ filter: "bandpass", cutoff: 2600, q: 3, duration: 0.03, volume: 0.06, reverb: false });
      voice({ freq: 880, type: "square", duration: 0.05, volume: 0.035, reverb: false });
    },
    hover() { voice({ freq: 1320, type: "sine", duration: 0.04, volume: 0.02, reverb: false }); },
    open() {
      if (playSample("open", {})) return;
      voice({ freq: 320, glideTo: 620, glide: 0.16, type: "triangle", duration: 0.2, volume: 0.05 });
      noise({ cutoff: 1200, cutoffTo: 3200, duration: 0.16, volume: 0.03 });
    },
    close() {
      if (playSample("close", {})) return;
      voice({ freq: 520, glideTo: 240, glide: 0.14, type: "triangle", duration: 0.18, volume: 0.045 });
    },

    step() {
      if (playSample("step", { rate: 0.94 + Math.random() * 0.14, volume: 0.5 })) return;
      footToggle ^= 1;
      noise({
        filter: "bandpass",
        cutoff: (footToggle ? 520 : 660) * (0.92 + Math.random() * 0.16),
        q: 1.6, duration: 0.055, attack: 0.002, release: 0.07,
        volume: 0.05 + Math.random() * 0.012
      });
      voice({ freq: footToggle ? 96 : 112, type: "sine", duration: 0.05, volume: 0.022, reverb: false });
    },
    door() { Sound.doorOpen(); },
    doorOpen() {
      if (playSample("door_open", {})) return;
      noise({ filter: "bandpass", cutoff: 380, cutoffTo: 1500, q: 1.1, duration: 0.26, volume: 0.055 });
      voice({ freq: 168, glideTo: 232, glide: 0.24, type: "triangle", duration: 0.26, volume: 0.04, filter: "lowpass", cutoff: 900 });
      voice({ freq: 1450, type: "square", duration: 0.03, volume: 0.02, delay: 0.24, reverb: false });
    },
    doorClose() {
      if (playSample("door_close", {})) return;
      noise({ filter: "bandpass", cutoff: 1400, cutoffTo: 320, q: 1.1, duration: 0.22, volume: 0.05 });
      voice({ freq: 120, type: "sine", duration: 0.09, volume: 0.05, delay: 0.2 });
    },
    clue() {
      if (playSample("clue", {})) return;
      [659.25, 987.77, 1318.51].forEach((freq, index) => {
        voice({ freq: freq, type: "triangle", duration: 0.26, volume: 0.075, delay: index * 0.055, release: 0.3 });
      });
      noise({ filter: "highpass", cutoff: 6000, duration: 0.3, volume: 0.02, delay: 0.06 });
    },
    talk() {
      if (playSample("talk", { rate: 0.9 + Math.random() * 0.2 })) return;
      voice({ freq: 300 + Math.random() * 80, type: "square", filter: "lowpass", cutoff: 1100, duration: 0.045, volume: 0.03, reverb: false });
    },
    type() { voice({ freq: 1100 + Math.random() * 300, type: "square", duration: 0.018, volume: 0.012, reverb: false }); },

    correct() {
      if (playSample("correct", {})) return;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, index) => {
        voice({ freq: freq, type: "triangle", duration: 0.3, volume: 0.075, delay: index * 0.06, release: 0.4 });
      });
    },
    wrong() {
      if (playSample("wrong", {})) return;
      voice({ freq: 233.08, type: "sawtooth", filter: "lowpass", cutoff: 700, duration: 0.34, volume: 0.06 });
      voice({ freq: 220.00, type: "sawtooth", filter: "lowpass", cutoff: 700, duration: 0.34, volume: 0.06, detune: -18 });
    },
    fanfare() {
      if (playSample("fanfare", {})) return;
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, index) => {
        voice({ freq: freq, type: "triangle", duration: 0.34, volume: 0.10, delay: index * 0.13, release: 0.5 });
        voice({ freq: freq / 2, type: "sine", duration: 0.34, volume: 0.05, delay: index * 0.13, release: 0.5 });
      });
      [0, 0.13, 0.26].forEach((delay) => noise({ filter: "highpass", cutoff: 5200, duration: 0.4, volume: 0.02, delay: delay }));
    },
    fail() {
      if (playSample("fail", {})) return;
      [392.00, 349.23, 293.66, 246.94].forEach((freq, index) => {
        voice({ freq: freq, type: "sawtooth", filter: "lowpass", cutoff: 800, duration: 0.32, volume: 0.06, delay: index * 0.15 });
      });
    },
    sting() {
      voice({ freq: 110, type: "sawtooth", filter: "lowpass", cutoff: 500, duration: 0.7, volume: 0.07, release: 0.8 });
      voice({ freq: 164.81, type: "sawtooth", filter: "lowpass", cutoff: 600, duration: 0.7, volume: 0.05, release: 0.8 });
      noise({ filter: "highpass", cutoff: 3000, duration: 0.6, volume: 0.03 });
    }
  };

  window.DW_SOUND = Sound;
})();
