/* world.js — moving around the map.

   update(dt)       one frame: open/close doors, then move the player from the held keys
   findNearest()    the NPC or clue close enough to interact with (shows the "E" prompt)

   How walking stays smooth:
     - doors open while the player is still well away, and stop blocking once
       they are DOOR_PASSABLE_AT open;
     - when walking toward a doorway, a small sideways pull ("funnel") lines
       the player up with the gap;
     - each frame is split into small sub-steps, so fast movement never skips
       through a wall;
     - if a step is blocked, try each axis alone, then a small sideways nudge
       (CORNER_SLIDE_PX), so the player slides around corners instead of stopping.

   Uses from core.js: currentMap, currentCase, player, keys, state, doorStates,
   gameActive, SND, dom and the door / furniture constants. */
"use strict";

/* ======================= collision ======================= */

/* Does a circle at (x, y) overlap the rectangle? */
function rectHit(x, y, radius, rect) {
  if (!rect || rect.w <= 0 || rect.h <= 0) return false;
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 < radius ** 2;
}

/* The box furniture blocks with: a few px smaller than the drawn box. */
function furnitureCollisionRect(object) {
  const inset = Math.min(FURNITURE_COLLISION_INSET[object.kind] ?? 4, object.w / 3, object.h / 3);
  return { x: object.x + inset, y: object.y + inset, w: Math.max(1, object.w - inset * 2), h: Math.max(1, object.h - inset * 2) };
}

/* A door is two sliding panels. Returns the parts that still block at this
   progress (0 = shut, 1 = open); nothing once it is DOOR_PASSABLE_AT open.
   render.js draws the same rectangles. */
function doorCollisionRects(door, progress) {
  if (progress >= DOOR_PASSABLE_AT) return [];
  const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress / DOOR_PASSABLE_AT)), 3);
  if (door.orientation === "horizontal") {
    const panelWidth = Math.max(0, (door.w / 2) * (1 - eased));
    return [
      { x: door.x, y: door.y, w: panelWidth, h: door.h },
      { x: door.x + door.w - panelWidth, y: door.y, w: panelWidth, h: door.h }
    ];
  }
  const panelHeight = Math.max(0, (door.h / 2) * (1 - eased));
  return [
    { x: door.x, y: door.y, w: door.w, h: panelHeight },
    { x: door.x, y: door.y + door.h - panelHeight, w: door.w, h: panelHeight }
  ];
}

/* Walls, the map edge and furniture. */
function canMoveStatic(x, y) {
  if (!currentMap) return false;
  const edge = (currentMap.margin ?? 24) - 2;
  const r = player.r;
  if (x - r < edge || x + r > currentMap.width - edge || y - r < edge || y + r > currentMap.height - edge) return false;
  if (currentMap.walls.some((wall) => rectHit(x, y, r, wall))) return false;
  return !currentMap.furniture.some((object) => rectHit(x, y, r, furnitureCollisionRect(object)));
}

/* Everything above, plus door panels. */
function canMove(x, y) {
  if (!canMoveStatic(x, y)) return false;
  return !currentMap.doors.some((door, index) =>
    doorCollisionRects(door, doorStates[index]?.progress ?? 0).some((panel) => rectHit(x, y, player.r, panel)));
}

/* ======================= doors ======================= */

function updateDoors(deltaSeconds) {
  currentMap.doors.forEach((door, index) => {
    const doorState = doorStates[index];
    const distance = Math.hypot(player.x - (door.x + door.w / 2), player.y - (door.y + door.h / 2));
    const wasClosed = doorState.target === 0;
    // open early, close late: a wider radius applies while the door is open
    const threshold = wasClosed ? DOOR_OPEN_DISTANCE : DOOR_CLOSE_DISTANCE;
    // and never close on a player standing in the frame
    const insideFrame = rectHit(player.x, player.y, player.r + 10, { x: door.x - 8, y: door.y - 8, w: door.w + 16, h: door.h + 16 });
    doorState.target = (distance <= threshold || insideFrame) ? 1 : 0;

    if (SND && wasClosed && doorState.target === 1) SND.doorOpen();
    if (SND && !wasClosed && doorState.target === 0) SND.doorClose();

    const change = DOOR_ANIMATION_SPEED * deltaSeconds;
    if (doorState.progress < doorState.target) doorState.progress = Math.min(doorState.target, doorState.progress + change);
    else if (doorState.progress > doorState.target) doorState.progress = Math.max(doorState.target, doorState.progress - change);
  });
}

/* ======================= moving the player ======================= */

let stepSoundTimer = 0;

function update(deltaSeconds) {
  if (!gameActive || state.modal) return;
  updateDoors(deltaSeconds);

  let dx = Number(keys.right) - Number(keys.left);
  let dy = Number(keys.down) - Number(keys.up);
  if (!dx && !dy) return;
  const length = Math.hypot(dx, dy);
  dx /= length; dy /= length;
  player.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");

  // doorway funnel: blend in a little sideways motion toward the middle of the gap
  const funnel = nearestDoorFunnel(dx, dy);
  if (funnel) {
    const pull = (offset) => (Math.abs(offset) > 1.5 ? Math.max(-1, Math.min(1, offset / DOOR_FUNNEL_STRENGTH / 10)) : 0);
    if (funnel.door.orientation === "vertical") dy += pull(funnel.cy - player.y);
    else dx += pull(funnel.cx - player.x);
    const renorm = Math.hypot(dx, dy) || 1;
    dx /= renorm; dy /= renorm;
  }

  if (moveWithSliding(dx, dy, player.speed * deltaSeconds)) {
    player.step += deltaSeconds * 10;   // walk animation
    stepSoundTimer += deltaSeconds;
    if (stepSoundTimer > 0.30) { stepSoundTimer = 0; if (SND) SND.step(); }
  }
}

/* The closest doorway the player is walking toward, within DOOR_FUNNEL_RANGE. */
function nearestDoorFunnel(dx, dy) {
  if (!currentMap?.doors?.length) return null;
  let best = null, bestDistance = DOOR_FUNNEL_RANGE;
  currentMap.doors.forEach((door) => {
    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    const distance = Math.hypot(player.x - cx, player.y - cy);
    if (distance > bestDistance) return;
    const heading = door.orientation === "vertical" ? dx : dy;
    const towards = door.orientation === "vertical" ? Math.sign(cx - player.x) : Math.sign(cy - player.y);
    if (!heading || Math.sign(heading) !== towards) return;   // walking away or alongside: no help
    bestDistance = distance;
    best = { door, cx, cy };
  });
  return best;
}

/* Moves up to `distance` px along (dx, dy). Returns true if the player moved at all. */
function moveWithSliding(dx, dy, distance) {
  const startX = player.x, startY = player.y;
  const steps = Math.max(1, Math.ceil(distance / (player.r * 0.6)));
  const stepX = (dx * distance) / steps;
  const stepY = (dy * distance) / steps;

  for (let i = 0; i < steps; i++) {
    const targetX = player.x + stepX;
    const targetY = player.y + stepY;
    if (canMove(targetX, targetY)) { player.x = targetX; player.y = targetY; continue; }

    // blocked diagonally: keep whichever axis is still free
    let advanced = false;
    if (stepX && canMove(targetX, player.y)) { player.x = targetX; advanced = true; }
    if (stepY && canMove(player.x, targetY)) { player.y = targetY; advanced = true; }
    if (advanced) continue;

    // blocked on both axes (a door frame or desk corner): try a small sideways nudge
    if (!nudgePastCorner(stepX, stepY)) break;
  }
  return player.x !== startX || player.y !== startY;
}

function nudgePastCorner(stepX, stepY) {
  const sideways = Math.abs(stepX) >= Math.abs(stepY) ? "y" : "x";
  for (let nudge = 2; nudge <= CORNER_SLIDE_PX; nudge += 2) {
    for (const sign of [1, -1]) {
      const nx = sideways === "x" ? player.x + nudge * sign : player.x + stepX;
      const ny = sideways === "y" ? player.y + nudge * sign : player.y + stepY;
      if (canMove(nx, ny)) { player.x = nx; player.y = ny; return true; }
    }
  }
  return false;
}

/* ======================= what can I interact with? ======================= */

function findNearest() {
  if (!gameActive) { dom.prompt.classList.add("hidden"); return; }
  const targets = [
    ...currentCase.npcs.map((n) => ({ type: "npc", data: n, x: n.x, y: n.y, label: `Talk to ${n.name}` })),
    ...currentCase.clues.map((c) => ({ type: "clue", data: c, x: c.x, y: c.y, label: `Inspect ${c.name}` }))
  ];
  let best = null, bestDistance = Infinity;
  targets.forEach((item) => {
    const distance = Math.hypot(player.x - item.x, player.y - item.y);
    if (distance < INTERACT_DISTANCE && distance < bestDistance) { best = item; bestDistance = distance; }
  });
  state.nearest = best;
  dom.prompt.classList.toggle("hidden", !best);
  if (best) dom.promptLabel.textContent = best.label;
}
