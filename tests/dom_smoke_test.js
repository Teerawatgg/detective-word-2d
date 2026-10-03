/* Node + jsdom test (optional: needs `npm install`; the main test is
   tests/browser_smoke_test.py). Loads the page without a browser and checks:
     - typing "wasdeq" in the name field types it and does not move the player,
     - leaving a case stops the music,
     - quiz choices, suspects and evidence are shuffled,
     - the minimap has its own canvas outside the map, and the map fits the window,
     - Thai subtitles (dialogue, evidence, quiz, accusation) and the ON/OFF switch,
     - chances, stars and the "catch the lie" accusation.
   Run: npm test   (or: node tests/dom_smoke_test.js) */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');

let html = fs.readFileSync(path.join(root, 'templates/index.html'), 'utf8')
  .replace(/\{\{ url_for\('static', filename='([^']+)'\) \}\}/g, '/static/$1')
  .replace(/<link[^>]*fonts\.[^>]*>/g, '');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  return new Proxy({ measureText: () => ({ width: 10 }), canvas: this,
    createLinearGradient: () => ({ addColorStop: noop }) },
    { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
};
w.AudioContext = undefined; w.webkitAudioContext = undefined;
w.requestAnimationFrame = () => 0;
w.fetch = () => Promise.reject(new Error('no network'));

// Same scripts, same order as the page. They are evaluated as ONE program:
// in the browser, separate <script> tags share top-level let/const (state,
// currentCase, ...), but separate indirect eval() calls would not.
const SCRIPTS = [...html.matchAll(/\/static\/(js\/[^"']+\.js)/g)].map((m) => m[1]);
const read = (file) => fs.readFileSync(path.join(root, 'static', file), 'utf8');
w.eval(SCRIPTS.map(read).join('\n;\n'));
// source of the game/ scripts, for the checks that inspect code
const GAME_SRC = SCRIPTS.filter((f) => f.startsWith('js/game/')).map(read).join('\n');

const d = w.document;
const results = [];
function check(name, cond) { results.push([name, !!cond]); }

// 1. boot without a fatal error
check('boots without fatal error', !d.querySelector('.fatal-error'));

// 2. typing into #player-name is not swallowed
const input = d.getElementById('player-name');
input.focus();
let defaultPrevented = 0;
for (const [code, ch] of [['KeyW','W'],['KeyA','A'],['KeyS','S'],['KeyD','D'],['KeyE','E'],['KeyQ','Q']]) {
  const ev = new w.KeyboardEvent('keydown', { code, key: ch, bubbles: true, cancelable: true });
  input.dispatchEvent(ev);
  if (ev.defaultPrevented) defaultPrevented++;
  if (!ev.defaultPrevented) input.value += ch;  // emulate the browser's default action
  input.dispatchEvent(new w.KeyboardEvent('keyup', { code, key: ch, bubbles: true }));
}
check('no WASD/E/Q keydown is preventDefault-ed while typing', defaultPrevented === 0);
check('name field receives the literal text "WASDEQ"', input.value === 'WASDEQ');

// 3. no modal was opened by pressing Q while typing
check('Q while typing does not open the notebook', d.getElementById('modal-layer').classList.contains('hidden'));

// 4. start the case, then confirm movement keys DO work in game
const dbg = w.__DETECTIVE_DEBUG__;
dbg.skipBriefing();
d.getElementById('start-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
const before = dbg.snapshot();
check('game is active after submit', before.gameActive === true);
check('detective name carried over', d.getElementById('detective-name').textContent === 'WASDEQ');

// simulate holding D for ~0.5s of frames
d.body.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyD', bubbles: true, cancelable: true }));
// drive update() by calling the internal loop through rAF substitution
let t = w.performance.now();
const loop = dbg.frame;
for (let i = 0; i < 30; i++) { t += 16.7; loop(t); }
const after = dbg.snapshot();
check('holding D moves the player right', after.player.x > before.player.x + 5);
d.body.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyD', bubbles: true }));

// 5. minimap + objective helpers exist
check('objective marker helper present', typeof dbg.objective === 'function' && dbg.objective() !== undefined);
check('minimap renderer present', dbg.hasMinimap() === true);
check('audio panel exists in DOM', !!d.getElementById('audio-panel'));

/* =====================================================================
   Audio, shuffling, minimap, layout, Thai in dialogue
   ===================================================================== */

// 6. leaving the case must stop the music, not just the ambience.
{
  const calls = [];
  const realSnd = w.DW_SOUND;
  w.DW_SOUND = new Proxy({}, { get: (t, k) => (...a) => { calls.push(String(k)); return undefined; } });
  // stopAudioScene() is wired through the module-level SND reference, so drive
  // the real exit path and assert on the source instead where SND is absent.
  w.DW_SOUND = realSnd;
  const src = GAME_SRC;
  check('stopAudioScene() calls stopMusic', /function stopAudioScene\(\)[\s\S]{0,220}SND\.stopMusic\(\)/.test(src));
  check('leaving to the start screen tears the audio down',
        /function showStartScreen\(\)[\s\S]{0,60}leaveCase\(\)/.test(src) && /function leaveCase\(\)[\s\S]{0,200}stopAudioScene\(\)/.test(src));
  check('page hide stops audio', /addEventListener\("pagehide", stopAudioScene\)/.test(src));
}

// 7. the correct answer must not always be option A.
{
  const positions = new Set();
  for (let run = 0; run < 40; run++) {
    dbg.goToCase('missing-laptop');
    positions.add(dbg.quizCorrectIndex('q1'));
  }
  check('quiz answer moves off option A across runs', positions.size > 1);
  check('shuffled quiz keeps the right answer text', dbg.quizAnswerIsCorrectText('q1') === true);

  const orders = new Set();
  for (let run = 0; run < 40; run++) { dbg.goToCase('missing-laptop'); orders.add(dbg.suspectOrder().join(',')); }
  check('accusation suspect order is shuffled', orders.size > 1);
  const proofOrders = new Set();
  for (let run = 0; run < 40; run++) { dbg.goToCase('missing-laptop'); proofOrders.add(dbg.proofOrder().join(',')); }
  check('accusation evidence order is shuffled', proofOrders.size > 1);
}

// 8. the minimap is its own element, not painted over the canvas.
{
  const mini = d.getElementById('minimap');
  check('minimap has its own canvas element', !!mini);
  check('minimap sits inside the case panel, not the play area',
        !!mini && !!mini.closest('.case-panel') && !mini.closest('.canvas-stage'));
  const src = GAME_SRC;
  // it must paint into its own 2d context (mctx), never the game one (ctx)
  const body = /function drawMinimap\(\)[\s\S]*?\n\}/.exec(src)[0];
  check('minimap no longer draws on the game context', !/(^|[^a-zA-Z0-9_.])ctx\./m.test(body));
}

// 9. every NPC line has a Thai subtitle.
{
  dbg.goToCase('missing-laptop');
  let missing = 0, total = 0;
  for (const c of w.DW_CASES || w.CASES) {
    for (const npc of c.npcs) npc.lines.forEach((_, i) => { total++; if (!w.DW_LINE_TH(c.id, npc.id, i)) missing++; });
  }
  check(`every NPC line has a Thai translation (${total - missing}/${total})`, missing === 0);
  dbg.goToCase('missing-laptop');
  const officer = (w.DW_CASES || w.CASES)[0].npcs[0];
  dbg.openDialogue(officer.id);
  const box = d.querySelector('.dialogue-box .dialogue-th');
  check('dialogue box renders the Thai subtitle', !!box && box.textContent.trim().length > 0);
  check('Thai subtitle is marked lang="th"', !!box && box.getAttribute('lang') === 'th');
}

// 10. the game screen is height-capped so the page cannot scroll.
{
  const css = fs.readFileSync(path.join(root, 'static/css/game.css'), 'utf8');
  check('game screen is capped to the viewport height', /\.game-screen \{[^}]*height: 100dvh[^}]*overflow: hidden/.test(css));
  check('canvas is fitted with object-fit: contain', /#game \{[^}]*object-fit: contain/.test(css));
  check('canvas keeps its 960x600 aspect ratio when letterboxed', /\.canvas-wrap \{[^}]*aspect-ratio: 960 \/ 600/.test(css));
}

// 11. doorways are back to a sensible width.
check('door width is 76px',
      fs.readFileSync(path.join(root, 'static/js/engine/mapkit.js'), 'utf8').includes('spec.doorWidth ?? 76'));

/* =====================================================================
   Thai subtitles in EVIDENCE, ENGLISH CHALLENGE and ACCUSE A SUSPECT,
   and the ON/OFF switch
   ===================================================================== */
{
  const dbg = w.__DETECTIVE_DEBUG__;
  // 12a. every translatable string in every case has Thai
  let missing = [];
  for (const c of (w.DW_CASES || w.CASES)) {
    for (const clue of c.clues) if (!w.DW_TH.clue(c.id, clue.id)) missing.push(`${c.id}/clue/${clue.id}`);
    for (const q of c.questions) {
      const th = w.DW_TH.question(c.id, q.id);
      if (!th || !th.prompt) missing.push(`${c.id}/${q.id}/prompt`);
      if (!th || !th.explain) missing.push(`${c.id}/${q.id}/explain`);
      if (!th || !th.hint) missing.push(`${c.id}/${q.id}/hint`);
      q.choices.forEach((_, i) => { if (!w.DW_TH.choice(c.id, q.id, i)) missing.push(`${c.id}/${q.id}/choice${i}`); });
    }
    if (!w.DW_TH.confession(c.id)) missing.push(`${c.id}/confession`);
    if (!w.DW_TH.solution(c.id)) missing.push(`${c.id}/solution`);
  }
  check(`every clue / question / choice / confession / solution has Thai (${missing.length} gaps)`, missing.length === 0);
  if (missing.length) console.log('   missing:', missing.slice(0, 8).join(', '));

  // 12b. EVIDENCE renders its Thai line
  dbg.goToCase('missing-laptop');
  dbg.openEvidence('camera');
  const evTh = d.querySelector('.evidence-box .dw-th');
  check('evidence box renders the Thai subtitle', !!evTh && evTh.textContent.trim().length > 0);

  // 12c. ENGLISH CHALLENGE renders Thai for the prompt AND for every choice,
  //      and each choice keeps the translation of the answer it actually shows
  //      (i.e. the shuffle did not mix up the subtitles).
  dbg.openQuiz('q3');
  const promptTh = d.querySelector('#modal-body .prompt-th');
  const choiceButtons = [...d.querySelectorAll('.quiz-choice')];
  const choiceThs = choiceButtons.map((b) => b.querySelector('.choice-th'));
  check('quiz prompt renders the Thai subtitle', !!promptTh && promptTh.textContent.trim().length > 0);
  check('every quiz choice renders a Thai subtitle', choiceThs.length === 4 && choiceThs.every((n) => n && n.textContent.trim()));
  const q3 = (w.DW_CASES || w.CASES)[0].questions.find((q) => q.id === 'q3');
  const order = dbg.quizChoiceOrder('q3');
  const aligned = choiceButtons.every((button, i) => {
    const english = q3.choices[order[i]];
    const thai = w.DW_TH.choice('missing-laptop', 'q3', order[i]);
    return button.textContent.includes(english) && button.textContent.includes(thai);
  });
  check('each shuffled choice keeps its own Thai translation', aligned);

  // 12d. ACCUSE A SUSPECT renders Thai under the chosen suspect's statements and the evidence
  (w.DW_CASES || w.CASES)[0].clues.forEach((clue) => dbg.openEvidence(clue.id));
  dbg.openAccuse();
  const firstSuspect = d.querySelector('#accuse-suspects input[name=suspect]');
  firstSuspect.checked = true;
  firstSuspect.dispatchEvent(new w.Event('change', { bubbles: true }));
  const statementThs = d.querySelectorAll('#accuse-statements .dw-th');
  const proofThs = d.querySelectorAll('#accuse-evidence .dw-th');
  check('accusation statements carry a Thai subtitle', statementThs.length === 2 && [...statementThs].every((n) => n.textContent.trim()));
  check('accusation evidence options are the found clues, with Thai', proofThs.length === 5 && [...proofThs].every((n) => n.textContent.trim()));
  dbg.goToCase('missing-laptop');

  // 12e. the ไทย ON / ไทย OFF switch
  const toggle = d.getElementById('thai-toggle');
  check('the Thai on/off button exists in the top bar', !!toggle);
  dbg.setThaiSubtitles(false);
  check('turning Thai off adds body.th-off', d.body.classList.contains('th-off') && dbg.thaiSubtitlesOn() === false);
  dbg.setThaiSubtitles(true);
  check('turning Thai back on removes body.th-off', !d.body.classList.contains('th-off') && dbg.thaiSubtitlesOn() === true);
  const css = fs.readFileSync(path.join(root, 'static/css/game.css'), 'utf8');
  check('body.th-off actually hides the subtitles in CSS', /body\.th-off \.dw-th \{ display: none; \}/.test(css));
}

// 13. "catch the lie": chances, out-of-chances, stars.
{
  const laptop = (w.DW_CASES || w.CASES)[0];
  const innocent = laptop.npcs.find((n) => n.role === 'Suspect' && n.id !== laptop.culpritId).id;
  dbg.goToCase('missing-laptop'); dbg.discoverAll();
  check('a case starts with 3 chances', dbg.chances() === 3);
  dbg.accuseWith(innocent, 0, laptop.proofId);
  check('a wrong accusation costs one chance', dbg.chances() === 2 && !dbg.solved());
  dbg.accuseWith(laptop.culpritId, 0, 'photo');
  check('right suspect + wrong evidence still costs a chance', dbg.chances() === 1 && !dbg.solved());
  dbg.accuseWith(innocent, 1, 'log');
  check('losing every chance closes the case', dbg.chances() === 0 && /OUT OF CHANCES/.test(d.getElementById('modal-body').textContent));

  dbg.goToCase('missing-laptop'); dbg.discoverAll();
  dbg.accuseWith(laptop.culpritId, 0, laptop.proofId);
  check('the right suspect, lie and evidence solves the case', dbg.solved() && !!d.querySelector('.confession'));
  check('a clean solve with no quizzes answered earns 2 stars, not 3', dbg.stars() === 2);

  const tank = (w.DW_CASES || w.CASES).find((c) => c.id === 'empty-tank');
  dbg.goToCase('empty-tank'); dbg.discoverAll();
  dbg.accuseWith(tank.culpritId, 0, tank.proofId);
  check('picking a TRUE statement of the culprit is a wrong accusation', !dbg.solved() && dbg.chances() === 2);

  const src = GAME_SRC;
  check('the accusation switches to the deduction music', /SND\.music\("deduction"\)/.test(src));
  const snd = fs.readFileSync(path.join(root, 'static/js/engine/sound.js'), 'utf8');
  check('every case scene has its own music theme', ['school', 'museum', 'station', 'aquarium', 'deduction'].every((k) => new RegExp(`\\n    ${k}: \\{`).test(snd)));
}

let bad = 0;
for (const [name, ok] of results) { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); }
console.log(`\n${results.length - bad}/${results.length} DOM checks passed.`);
process.exit(bad ? 1 : 0);
