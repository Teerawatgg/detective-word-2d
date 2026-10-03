/* Detective Word 2D — data validator core (v7.0).
   Pure checks over the game's data, with no Node or browser APIs, so the same
   rules run from either:
     python tools/validate_data.py   (Playwright / Chromium — no Node needed)
     node tools/validate_data.js     (Node, if installed)
   Usage: DW_VALIDATE(window) -> { errors: [...], info: [...] }
   The data files (mapkit, vocab, *_th, briefing, cases*) must already be loaded
   into `win`.
*/
(function (root) {
  "use strict";

  const PLAYER_R = 9;            // game/core.js PLAYER_RADIUS
  const INTERACT = 66;           // game/core.js INTERACT_DISTANCE
  const NAV_STEP = 4;            // walkability grid, px
  const FURNITURE_INSET = {      // game/core.js FURNITURE_COLLISION_INSET
    desk: 5, counter: 5, shelf: 4, bench: 6, gym_bench: 6,
    locker: 5, trophy_case: 5, crate: 5, computer: 7, printer: 7, server: 6
  };
  const CATEGORIES = ["detective", "it", "work"];
  const TOPICS = ["vocab", "it", "work", "tense"];
  const SCENES = ["school", "museum", "station", "aquarium"];

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function circleHitsRect(x, y, r, o) {
    const nx = Math.max(o.x, Math.min(x, o.x + o.w));
    const ny = Math.max(o.y, Math.min(y, o.y + o.h));
    return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
  }
  function pointInsideAnyRoom(map, x, y, pad) {
    return map.zones.some((z) => x - pad >= z.x && x + pad <= z.x + z.w && y - pad >= z.y && y + pad <= z.y + z.h);
  }
  const hitsWall = (map, x, y, r) => map.walls.some((w) => circleHitsRect(x, y, r, w));
  const hitsFurniture = (map, x, y, r) => map.furniture.some((f) => circleHitsRect(x, y, r, f));
  function furnitureCollisionRect(f) {   // same shrink as game/world.js
    const inset = Math.min(FURNITURE_INSET[f.kind] ?? 4, f.w / 3, f.h / 3);
    return { x: f.x + inset, y: f.y + inset, w: Math.max(1, f.w - inset * 2), h: Math.max(1, f.h - inset * 2) };
  }

  // Room graph through doors (every room connected).
  function roomsReachable(map) {
    const rooms = map.zones;
    if (rooms.length === 0) return true;
    const adj = rooms.map(() => new Set());
    map.doors.forEach((door) => {
      const dcx = door.x + door.w / 2, dcy = door.y + door.h / 2;
      const touching = [];
      rooms.forEach((room, i) => {
        if (dcx >= room.x - 6 && dcx <= room.x + room.w + 6 && dcy >= room.y - 6 && dcy <= room.y + room.h + 6) touching.push(i);
      });
      for (let i = 0; i < touching.length; i++) {
        for (let j = i + 1; j < touching.length; j++) { adj[touching[i]].add(touching[j]); adj[touching[j]].add(touching[i]); }
      }
    });
    const seen = new Set([0]); const queue = [0];
    while (queue.length) { const cur = queue.pop(); adj[cur].forEach((n) => { if (!seen.has(n)) { seen.add(n); queue.push(n); } }); }
    return seen.size === rooms.length;
  }

  /* v7.0: walk-reachability. The room graph above ignores furniture, so a desk
     dropped across a doorway lane, or a clue boxed in by shelves, used to pass.
     Flood-fill the player's circle (doors open) from playerStart and require
     every NPC / clue to have a reachable spot within talking distance. */
  function walkableGrid(map) {
    const solids = [...map.walls, ...map.furniture.map(furnitureCollisionRect)];
    const cols = Math.floor(map.width / NAV_STEP), rows = Math.floor(map.height / NAV_STEP);
    const free = new Uint8Array(cols * rows);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = gx * NAV_STEP + NAV_STEP / 2, y = gy * NAV_STEP + NAV_STEP / 2;
        free[gy * cols + gx] = solids.some((s) => circleHitsRect(x, y, PLAYER_R, s)) ? 0 : 1;
      }
    }
    return { cols, rows, free };
  }
  function reachableFrom(map, grid, start) {
    const { cols, rows, free } = grid;
    const seen = new Uint8Array(cols * rows);
    const sx = Math.floor(start.x / NAV_STEP), sy = Math.floor(start.y / NAV_STEP);
    const queue = [];
    if (sx >= 0 && sy >= 0 && sx < cols && sy < rows && free[sy * cols + sx]) { seen[sy * cols + sx] = 1; queue.push(sy * cols + sx); }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], gx = i % cols, gy = (i - gx) / cols;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx;
        if (free[j] && !seen[j]) { seen[j] = 1; queue.push(j); }
      }
    }
    return seen;
  }
  function canReach(grid, seen, target, radius) {
    const { cols, rows } = grid;
    const r = Math.ceil(radius / NAV_STEP);
    const tx = Math.floor(target.x / NAV_STEP), ty = Math.floor(target.y / NAV_STEP);
    for (let gy = Math.max(0, ty - r); gy <= Math.min(rows - 1, ty + r); gy++) {
      for (let gx = Math.max(0, tx - r); gx <= Math.min(cols - 1, tx + r); gx++) {
        if (!seen[gy * cols + gx]) continue;
        const x = gx * NAV_STEP + NAV_STEP / 2, y = gy * NAV_STEP + NAV_STEP / 2;
        if (Math.hypot(x - target.x, y - target.y) <= radius) return true;
      }
    }
    return false;
  }

  /* Mirrors game/dictionary.js vocabLookup(): exact, regular inflections, irregular forms,
     and multi-word phrases whose first word is inflected. */
  function pastForms(irregular) {   // "went" -> "go"; a form equal to its base is skipped
    const forms = {};
    Object.entries(irregular).forEach(([base, list]) => (list || []).forEach((form) => { if (form !== base) forms[form] = base; }));
    return forms;
  }
  function makeLookup(vocab, irregular) {
    const forms = pastForms(irregular);
    function variants(word) {
      const base = word.toLowerCase(), out = [base];
      if (forms[base]) out.push(forms[base]);
      const undouble = (stem) => { if (stem.length >= 3 && stem.at(-1) === stem.at(-2) && !"aeiou".includes(stem.at(-1))) out.push(stem.slice(0, -1)); };
      if (base.endsWith("ies") || base.endsWith("ied")) out.push(base.slice(0, -3) + "y");
      if (base.endsWith("es")) out.push(base.slice(0, -2));
      if (base.endsWith("s")) out.push(base.slice(0, -1));
      if (base.endsWith("ed")) { out.push(base.slice(0, -2)); out.push(base.slice(0, -1)); undouble(base.slice(0, -2)); }
      if (base.endsWith("ing")) { out.push(base.slice(0, -3)); out.push(base.slice(0, -3) + "e"); undouble(base.slice(0, -3)); }
      return out;
    }
    return function lookup(text) {
      const parts = text.toLowerCase().replace(/-/g, " ").split(/\s+/).filter(Boolean);
      if (!parts.length) return null;
      const rest = parts.slice(1).join(" ");
      for (const head of variants(parts[0])) {
        const key = rest ? `${head} ${rest}` : head;
        if (vocab[key]) return key;
      }
      return null;
    };
  }

  function validate(win) {
    const errors = [], info = [];
    const fail = (msg) => errors.push(msg);
    const CASES = win.DW_CASES, CHARACTERS = win.DW_CHARACTERS;
    const VOCAB = win.DW_VOCAB || {}, IRREGULAR = win.DW_IRREGULAR || {};
    const TH = win.DW_TH, LINE_TH = win.DW_LINE_TH;
    const lookup = makeLookup(VOCAB, IRREGULAR);

    if (!Array.isArray(CASES) || CASES.length === 0) { fail("DW_CASES is empty"); return { errors, info }; }
    if (!Array.isArray(CHARACTERS) || CHARACTERS.length < 2) fail("DW_CHARACTERS needs at least 2 entries");
    if (!TH || typeof LINE_TH !== "function") fail("Thai content (data/thai-content.js / data/thai-dialogue.js) is not loaded");

    const seenCaseIds = new Set(), seenMapIds = new Set();
    const nameOwner = new Map();   // NPC display name -> case id
    const lookOwner = new Map();   // non-officer appearance -> "case/npc"

    CASES.forEach((c) => {
      const tag = `case "${c.id}"`;
      if (seenCaseIds.has(c.id)) fail(`${tag}: duplicate case id`);
      seenCaseIds.add(c.id);
      if (!c.map) { fail(`${tag}: missing map`); return; }
      if (seenMapIds.has(c.map.id)) fail(`${tag}: duplicate map id ${c.map.id}`);
      seenMapIds.add(c.map.id);
      if (!CATEGORIES.includes(c.category)) fail(`${tag}: category '${c.category}' must be one of ${CATEGORIES.join(", ")}`);
      if (!SCENES.includes(c.scene)) fail(`${tag}: scene '${c.scene}' must be one of ${SCENES.join(", ")}`);

      ["zones", "walls", "doors", "furniture"].forEach((f) => { if (!Array.isArray(c.map[f])) fail(`${tag}: map missing array '${f}'`); });
      if (!Array.isArray(c.npcs) || c.npcs.length === 0) fail(`${tag}: no npcs`);
      if (!Array.isArray(c.clues) || c.clues.length < c.minimumClues) fail(`${tag}: fewer clues than minimumClues`);
      if (!Array.isArray(c.questions) || c.questions.length === 0) fail(`${tag}: no questions`);
      if (!roomsReachable(c.map)) fail(`${tag}: not every room is reachable through a door`);

      const ps = c.playerStart;
      if (!ps) fail(`${tag}: missing playerStart`);
      else {
        if (!pointInsideAnyRoom(c.map, ps.x, ps.y, 12)) fail(`${tag}: playerStart (${ps.x},${ps.y}) is not inside any room`);
        if (hitsWall(c.map, ps.x, ps.y, 11)) fail(`${tag}: playerStart overlaps a wall`);
        if (hitsFurniture(c.map, ps.x, ps.y, 11)) fail(`${tag}: playerStart overlaps furniture`);
      }

      // furniture must not overlap other furniture or sit on a doorway
      c.map.furniture.forEach((f, i) => {
        c.map.furniture.forEach((g, j) => { if (j > i && rectsOverlap(f, g)) fail(`${tag}: furniture #${i} overlaps furniture #${j}`); });
        c.map.doors.forEach((d) => { if (rectsOverlap(f, d)) fail(`${tag}: furniture #${i} (${f.kind}) blocks a doorway`); });
      });

      const grid = walkableGrid(c.map);
      const seen = ps ? reachableFrom(c.map, grid, ps) : null;

      const placed = (kind, item) => {
        if (!pointInsideAnyRoom(c.map, item.x, item.y, 12)) fail(`${tag}: ${kind} ${item.id} is not inside any room`);
        if (hitsWall(c.map, item.x, item.y, 11)) fail(`${tag}: ${kind} ${item.id} overlaps a wall`);
        if (hitsFurniture(c.map, item.x, item.y, 11)) fail(`${tag}: ${kind} ${item.id} overlaps furniture`);
        if (seen && !canReach(grid, seen, item, INTERACT - 14)) fail(`${tag}: ${kind} ${item.id} cannot be walked to from playerStart`);
      };

      const npcIds = new Set();
      c.npcs.forEach((n) => {
        if (npcIds.has(n.id)) fail(`${tag}: duplicate npc id ${n.id}`);
        npcIds.add(n.id);
        if (!n.look) fail(`${tag}: npc ${n.id} missing look`);
        if (!Array.isArray(n.lines) || n.lines.length === 0) fail(`${tag}: npc ${n.id} has no dialogue lines`);
        placed("npc", n);
        // v7.0: names and faces must not repeat across cases (two "Priya"s confused players)
        if (nameOwner.has(n.name) && nameOwner.get(n.name) !== c.id) fail(`${tag}: npc name "${n.name}" is already used in case "${nameOwner.get(n.name)}"`);
        nameOwner.set(n.name, c.id);
        if (n.id !== c.officerId && n.look) {
          const key = JSON.stringify(n.look);
          if (lookOwner.has(key)) fail(`${tag}: npc ${n.id} has the same appearance as ${lookOwner.get(key)}`);
          lookOwner.set(key, `${c.id}/${n.id}`);
        }
        (n.lines || []).forEach((line, i) => { if (TH && LINE_TH && !LINE_TH(c.id, n.id, i)) fail(`${tag}: npc ${n.id} line ${i} has no Thai subtitle`); });
      });
      if (!npcIds.has(c.officerId)) fail(`${tag}: officerId '${c.officerId}' does not match any npc`);
      if (!npcIds.has(c.culpritId)) fail(`${tag}: culpritId '${c.culpritId}' does not match any npc`);
      const suspectCount = c.npcs.filter((n) => n.role === "Suspect").length;
      if (suspectCount < 2) fail(`${tag}: needs at least 2 suspects, has ${suspectCount}`);
      if (!c.npcs.some((n) => n.id === c.culpritId && n.role === "Suspect")) fail(`${tag}: culprit must have role 'Suspect'`);

      const clueIds = new Set();
      const questionIds = new Set(c.questions.map((q) => q.id));
      const questionUse = new Map();
      c.clues.forEach((cl) => {
        if (clueIds.has(cl.id)) fail(`${tag}: duplicate clue id ${cl.id}`);
        clueIds.add(cl.id);
        placed("clue", cl);
        if (cl.question) {
          if (!questionIds.has(cl.question)) fail(`${tag}: clue ${cl.id} references missing question ${cl.question}`);
          if (questionUse.has(cl.question)) fail(`${tag}: question ${cl.question} is attached to both ${questionUse.get(cl.question)} and ${cl.id}`);
          questionUse.set(cl.question, cl.id);
        }
        if (typeof cl.text !== "string" || cl.text.split(" ").length < 4) fail(`${tag}: clue ${cl.id} text looks too short`);
        if (TH && !TH.clue(c.id, cl.id)) fail(`${tag}: clue ${cl.id} has no Thai`);
      });
      if (!clueIds.has(c.proofId)) fail(`${tag}: proofId '${c.proofId}' does not match any clue`);
      // a quiz nobody can open would make ★★★ impossible
      c.questions.forEach((q) => { if (!questionUse.has(q.id)) fail(`${tag}: question ${q.id} is not attached to any clue (★★★ would be impossible)`); });

      c.questions.forEach((q) => {
        if (!Array.isArray(q.choices) || q.choices.length < 3) fail(`${tag}: question ${q.id} needs >=3 choices`);
        else if (new Set(q.choices).size !== q.choices.length) fail(`${tag}: question ${q.id} has duplicate choices`);
        if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= (q.choices || []).length) fail(`${tag}: question ${q.id} has bad correct index`);
        if (!q.hint) fail(`${tag}: question ${q.id} missing hint`);
        if (!q.explain) fail(`${tag}: question ${q.id} missing explain`);
        if (!TOPICS.includes(q.topic)) fail(`${tag}: question ${q.id} topic '${q.topic}' must be one of ${TOPICS.join(", ")}`);
        // v7.0: the quizzed term is never a click-to-translate link inside the quiz
        if (typeof q.term !== "string" || !q.term.trim()) fail(`${tag}: question ${q.id} needs a 'term' (the word or form being tested)`);
        else if (!q.prompt.toLowerCase().includes(q.term.toLowerCase())) fail(`${tag}: question ${q.id} term "${q.term}" does not appear in its prompt`);
        const th = TH && TH.question(c.id, q.id);
        if (TH && !th) fail(`${tag}: question ${q.id} has no Thai`);
        else if (th) {
          ["prompt", "explain", "hint"].forEach((f) => { if (!th[f]) fail(`${tag}: question ${q.id} Thai is missing '${f}'`); });
          if (!Array.isArray(th.choices) || th.choices.length !== q.choices.length) fail(`${tag}: question ${q.id} Thai choices must match the ${q.choices.length} English choices`);
        }
      });

      // "catch the lie": contradictions = { culpritLineIndex: [clue ids that disprove it] }
      const culprit = c.npcs.find((n) => n.id === c.culpritId);
      const lies = Object.entries(c.contradictions || {});
      if (lies.length === 0) fail(`${tag}: needs at least one entry in contradictions`);
      lies.forEach(([line, ids]) => {
        if (!culprit || !culprit.lines[Number(line)]) fail(`${tag}: contradiction line ${line} does not exist for ${c.culpritId}`);
        if (!Array.isArray(ids) || ids.length === 0) fail(`${tag}: contradiction line ${line} lists no clues`);
        else ids.forEach((id) => { if (!clueIds.has(id)) fail(`${tag}: contradiction clue '${id}' does not exist`); });
      });
      if (!lies.some(([, ids]) => Array.isArray(ids) && ids.includes(c.proofId))) fail(`${tag}: proofId '${c.proofId}' disproves none of the culprit's lines`);
      if (typeof c.confession !== "string" || c.confession.split(" ").length < 6) fail(`${tag}: missing or too-short confession`);
      if (TH && !TH.confession(c.id)) fail(`${tag}: confession has no Thai`);
      if (TH && !TH.solution(c.id)) fail(`${tag}: solution has no Thai`);

      [...c.map.walls, ...c.map.furniture].forEach((r, i) => {
        if (r.x < 0 || r.y < 0 || r.x + r.w > c.map.width || r.y + r.h > c.map.height) fail(`${tag}: rect #${i} out of map bounds (${JSON.stringify(r)})`);
      });

      const topics = c.questions.map((q) => q.topic).join("/");
      info.push(`${tag} [${c.category}]: ${c.map.zones.length} rooms, ${c.npcs.length} npcs, ${c.clues.length} clues, ${c.questions.length} questions (${topics})`);
    });

    // vocabulary
    Object.entries(VOCAB).forEach(([word, entry]) => {
      if (word !== word.toLowerCase() || word !== word.trim()) fail(`vocab "${word}": keys must be lower-case and trimmed`);
      if (!Array.isArray(entry) || entry.length !== 3 || entry.some((s) => typeof s !== "string" || !s.trim())) fail(`vocab "${word}": entry must be [pos, thai, example]`);
    });
    // a verb entry that is only a regular form of another entry ("signed" next to "sign") is a duplicate
    Object.entries(VOCAB).forEach(([word, entry]) => {
      if (!/^v\b/.test(entry[0]) || word.includes(" ")) return;
      const others = { ...VOCAB }; delete others[word];
      const hit = makeLookup(others, {})(word);
      if (hit) fail(`vocab "${word}" is a regular form of "${hit}" — remove it, the engine already links it`);
    });
    Object.entries(IRREGULAR).forEach(([base, list]) => {
      if (!VOCAB[base]) fail(`irregular "${base}": base verb is not in DW_VOCAB, so its past forms would not be clickable`);
      // "rang" must not open the noun "ring" (แหวน) as if it were its meaning
      else if (!/(^|[^a-z])v\./.test(VOCAB[base][0])) fail(`irregular "${base}": the DW_VOCAB entry is "${VOCAB[base][0]}", not a verb, so "past of ${base}" would show the wrong meaning`);
      if (!Array.isArray(list) || list.length !== 2 || list.some((f) => typeof f !== "string" || f !== f.toLowerCase() || !f)) fail(`irregular "${base}": must be [past simple, past participle] in lower case`);
    });
    Object.entries(pastForms(IRREGULAR)).forEach(([form, base]) => {
      // a VERB entry for the past form hides the "past of …" note; an adjective (lost, stolen) is a deliberate separate sense
      if (VOCAB[form] && /^v\b/.test(VOCAB[form][0])) fail(`vocab "${form}" duplicates the irregular past form of "${base}" — remove it from DW_VOCAB`);
    });

    // informational: how many words a player can click in each case
    const wordRe = /[A-Za-z][A-Za-z'-]*/g;
    CASES.forEach((c) => {
      const texts = [c.description, c.confession, ...c.npcs.flatMap((n) => n.lines), ...c.clues.map((cl) => cl.text), ...c.questions.map((q) => q.prompt)];
      const hits = new Set();
      texts.join(" ").replace(wordRe, (w) => { const key = lookup(w.replace(/['-]+$/, "")); if (key) hits.add(key); return w; });
      info.push(`case "${c.id}": ${hits.size} distinct clickable words`);
    });
    info.push(`vocab: ${Object.keys(VOCAB).length} entries, ${Object.keys(IRREGULAR).length} irregular verbs`);

    return { errors, info };
  }

  root.DW_VALIDATE = validate;
})(typeof window !== "undefined" ? window : globalThis);
