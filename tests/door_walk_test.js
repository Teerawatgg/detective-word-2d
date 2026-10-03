/* Door test (Node, optional — run: node tests/door_walk_test.js).
   Copies the movement rules of static/js/game/world.js (doorway funnel,
   sub-steps, corner slide) and walks the player through every doorway of
   every case from 9 deliberately misaligned starting points. A pass means a
   doorway can never make the player "stick". Keep the constants below in
   step with static/js/game/core.js. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const sandbox = { console, performance: { now: () => 0 } };
sandbox.window = sandbox; vm.createContext(sandbox);
for (const f of ["static/js/engine/mapkit.js", "static/js/data/characters.js", "static/js/data/cases-detective.js", "static/js/data/cases-it.js", "static/js/data/cases-work.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, f);
}

const R = 9, SPEED = 188, DT = 1 / 60;
const DOOR_PASSABLE_AT = 0.55, DOOR_OPEN_DISTANCE = 118, DOOR_CLOSE_DISTANCE = 168;
const DOOR_ANIM = 7.5, FUNNEL_RANGE = 96, FUNNEL_STRENGTH = 4.2, CORNER_SLIDE_PX = 14;
const INSET = { desk: 5, counter: 5, shelf: 4, bench: 6, gym_bench: 6, locker: 5, trophy_case: 5, crate: 5, computer: 7, printer: 7, server: 6 };

const rectHit = (x, y, r, o) => {
  if (!o || o.w <= 0 || o.h <= 0) return false;
  const nx = Math.max(o.x, Math.min(x, o.x + o.w)), ny = Math.max(o.y, Math.min(y, o.y + o.h));
  return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
};
const doorRects = (d, p) => {
  if (p >= DOOR_PASSABLE_AT) return [];
  const e = 1 - Math.pow(1 - Math.max(0, Math.min(1, p / DOOR_PASSABLE_AT)), 3);
  if (d.orientation === "horizontal") {
    const w = Math.max(0, (d.w / 2) * (1 - e));
    return [{ x: d.x, y: d.y, w, h: d.h }, { x: d.x + d.w - w, y: d.y, w, h: d.h }];
  }
  const h = Math.max(0, (d.h / 2) * (1 - e));
  return [{ x: d.x, y: d.y, w: d.w, h }, { x: d.x, y: d.y + d.h - h, w: d.w, h }];
};

function makeWorld(map) {
  const doorStates = map.doors.map(() => ({ progress: 0, target: 0 }));
  const edge = (map.margin ?? 24) - 2;
  const staticOk = (x, y) => {
    if (x - R < edge || x + R > map.width - edge || y - R < edge || y + R > map.height - edge) return false;
    if (map.walls.some((w) => rectHit(x, y, R, w))) return false;
    return !map.furniture.some((o) => {
      const i = Math.min(INSET[o.kind] ?? 4, o.w / 3, o.h / 3);
      return rectHit(x, y, R, { x: o.x + i, y: o.y + i, w: Math.max(1, o.w - 2 * i), h: Math.max(1, o.h - 2 * i) });
    });
  };
  const canMove = (x, y) => staticOk(x, y) &&
    !map.doors.some((d, i) => doorRects(d, doorStates[i].progress).some((p) => rectHit(x, y, R, p)));
  return { doorStates, canMove };
}

function simulate(map, player, world, dirX, dirY, frames) {
  for (let f = 0; f < frames; f++) {
    // doors
    map.doors.forEach((d, i) => {
      const st = world.doorStates[i];
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      const dist = Math.hypot(player.x - cx, player.y - cy);
      const threshold = st.target > 0 ? DOOR_CLOSE_DISTANCE : DOOR_OPEN_DISTANCE;
      const inside = rectHit(player.x, player.y, R + 10, { x: d.x - 8, y: d.y - 8, w: d.w + 16, h: d.h + 16 });
      st.target = (dist <= threshold || inside) ? 1 : 0;
      const ch = DOOR_ANIM * DT;
      st.progress = st.progress < st.target ? Math.min(st.target, st.progress + ch) : Math.max(st.target, st.progress - ch);
    });
    // movement
    let dx = dirX, dy = dirY;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    let best = null, bestD = FUNNEL_RANGE;
    map.doors.forEach((d) => {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      const dist = Math.hypot(player.x - cx, player.y - cy);
      if (dist > bestD) return;
      const heading = d.orientation === "vertical" ? dx : dy;
      const towards = d.orientation === "vertical" ? Math.sign(cx - player.x) : Math.sign(cy - player.y);
      if (!heading || Math.sign(heading) !== towards) return;
      bestD = dist; best = { d, cx, cy };
    });
    if (best) {
      if (best.d.orientation === "vertical") {
        const off = best.cy - player.y;
        if (Math.abs(off) > 1.5) dy += Math.max(-1, Math.min(1, off / FUNNEL_STRENGTH / 10));
      } else {
        const off = best.cx - player.x;
        if (Math.abs(off) > 1.5) dx += Math.max(-1, Math.min(1, off / FUNNEL_STRENGTH / 10));
      }
      const rn = Math.hypot(dx, dy) || 1; dx /= rn; dy /= rn;
    }
    const distance = SPEED * DT;
    const steps = Math.max(1, Math.ceil(distance / (R * 0.6)));
    const sx = (dx * distance) / steps, sy = (dy * distance) / steps;
    for (let i = 0; i < steps; i++) {
      const tx = player.x + sx, ty = player.y + sy;
      if (world.canMove(tx, ty)) { player.x = tx; player.y = ty; continue; }
      let advanced = false;
      if (sx && world.canMove(tx, player.y)) { player.x = tx; advanced = true; }
      if (sy && world.canMove(player.x, ty)) { player.y = ty; advanced = true; }
      if (advanced) continue;
      const perp = Math.abs(sx) >= Math.abs(sy) ? "y" : "x";
      let escaped = false;
      for (let n = 2; n <= CORNER_SLIDE_PX && !escaped; n += 2) {
        for (const sign of [1, -1]) {
          const nx = perp === "x" ? player.x + n * sign : player.x + sx;
          const ny = perp === "y" ? player.y + n * sign : player.y + sy;
          if (world.canMove(nx, ny)) { player.x = nx; player.y = ny; escaped = true; break; }
        }
      }
      if (!escaped) break;
    }
  }
}

let total = 0, failed = 0;
const OFFSETS = [-30, -22, -14, -7, 0, 7, 14, 22, 30];
for (const c of sandbox.window.DW_CASES) {
  const map = c.map;
  const caseFails = [];
  map.doors.forEach((door, index) => {
    const vertical = door.orientation === "vertical";
    const cx = door.x + door.w / 2, cy = door.y + door.h / 2;
    for (const sign of [-1, 1]) {
      for (const offset of OFFSETS) {
        const world = makeWorld(map);
        const player = vertical
          ? { x: cx - sign * 90, y: cy + offset }
          : { x: cx + offset, y: cy - sign * 90 };
        if (!world.canMove(player.x, player.y)) continue; // invalid start (furniture), skip
        total++;
        simulate(map, player, world, vertical ? sign : 0, vertical ? 0 : sign, 120);
        const crossed = vertical
          ? Math.sign(player.x - cx) === sign && Math.abs(player.x - cx) > 25
          : Math.sign(player.y - cy) === sign && Math.abs(player.y - cy) > 25;
        if (!crossed) { failed++; caseFails.push(`door#${index} ${vertical ? "V" : "H"} sign=${sign} offset=${offset}`); }
      }
    }
  });
  console.log(`${caseFails.length ? "FAIL" : "ok  "} ${c.id}: ${caseFails.length ? JSON.stringify(caseFails) : "all doorway approaches passable"}`);
}
console.log(`\n${total - failed}/${total} doorway approach simulations passed.`);
process.exit(failed ? 1 : 0);
