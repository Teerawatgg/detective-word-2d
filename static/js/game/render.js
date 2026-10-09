/* render.js — drawing one frame of the map.

   draw()   everything, back to front:
              floor, room names, walls, doors, furniture   (drawMap)
              gold ring on the current objective           (drawObjectiveMarker)
              clue markers, NPCs, the player, name tags
              arrow toward an objective that is far away   (drawEdgeArrow)
              minimap in the side panel                    (drawMinimap)
              room name banner when entering a room        (drawRoomBanner)

   The ring, the arrow, the minimap and the banner exist so the player always
   knows where to go next; they never change the rules.

   Uses from core.js: ctx, dom, currentMap, currentCase, player, state, keys,
   doorStates, selectedCharacter, gameActive, frameCount, SPR.
   Uses from world.js: doorCollisionRects (a door is drawn as its panels). */
"use strict";

/* ======================= the map ======================= */

function drawMap() {
  ctx.fillStyle = currentMap.background || "#b8af9c";
  ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);

  // rooms: floor colour + name in the top-left corner
  currentMap.zones.forEach((zone) => {
    ctx.fillStyle = zone.floor;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.fillStyle = "#30374477";
    ctx.font = "500 12px 'Prompt', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(zone.label, zone.x + 12, zone.y + 22);
  });

  // faint 32 px floor grid
  ctx.strokeStyle = "#3d414b15";
  for (let x = 0; x < currentMap.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, currentMap.height); ctx.stroke(); }
  for (let y = 0; y < currentMap.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(currentMap.width, y); ctx.stroke(); }

  currentMap.walls.forEach((wall) => {
    ctx.fillStyle = "#283447";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "#3c4b62";   // lighter top edge
    ctx.fillRect(wall.x, wall.y, wall.w, Math.min(5, wall.h));
  });
  currentMap.doors.forEach((door, index) => drawDoor(door, doorStates[index]?.progress ?? 0));
  currentMap.furniture.forEach(drawFurniture);
}

function drawDoor(door, progress) {
  ctx.save();
  ctx.fillStyle = "#1a2435";   // the gap behind the panels
  ctx.fillRect(door.x, door.y, door.w, door.h);
  doorCollisionRects(door, progress).forEach((panel) => {
    if (panel.w <= 0.2 || panel.h <= 0.2) return;
    ctx.fillStyle = "#9b6d3c";
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = "#d9af70";   // handle stripe
    if (door.orientation === "horizontal") {
      ctx.fillRect(panel.x + Math.min(4, panel.w / 4), panel.y + door.h * 0.34, Math.max(1, panel.w - Math.min(8, panel.w / 2)), Math.max(2, door.h * 0.18));
    } else {
      ctx.fillRect(panel.x + door.w * 0.34, panel.y + Math.min(4, panel.h / 4), Math.max(2, door.w * 0.18), Math.max(1, panel.h - Math.min(8, panel.h / 2)));
    }
  });
  // status light: green when open, amber when shut
  ctx.fillStyle = progress > 0.72 ? "#62d98b" : "#e9ad3b";
  if (door.orientation === "horizontal") ctx.fillRect(door.x + door.w / 2 - 2, door.y + 2, 4, 4);
  else ctx.fillRect(door.x + 2, door.y + door.h / 2 - 2, 4, 4);
  ctx.restore();
}

/* Each furniture `kind` used by the case files has its own simple drawing. */
function drawFurniture(object) {
  const { x, y, w, h } = object;
  switch (object.kind) {
    case "desk":
      ctx.fillStyle = "#805a38"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#a77a4d"; ctx.fillRect(x + 4, y + 4, w - 8, h - 10);
      break;
    case "counter":
      ctx.fillStyle = "#6f5138"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#b28557"; ctx.fillRect(x + 3, y + 3, w - 6, 12);
      break;
    case "shelf": {
      const bookColours = ["#a34d4d", "#426d9a", "#d0a146", "#4f8968"];
      ctx.fillStyle = "#60452f"; ctx.fillRect(x, y, w, h);
      for (let sy = y + 8; sy < y + h - 8; sy += 24) {
        ctx.fillStyle = bookColours[Math.floor((sy - y) / 24) % 4];
        ctx.fillRect(x + 5, sy, w - 10, 15);
      }
      break;
    }
    case "bench":
    case "gym_bench": {
      const seat = Math.min(16, h);
      ctx.fillStyle = object.kind === "gym_bench" ? "#496b59" : "#76543a";
      ctx.fillRect(x, y, w, seat);
      ctx.fillRect(x + 10, y + seat, 8, Math.max(4, h - 16));       // legs
      ctx.fillRect(x + w - 18, y + seat, 8, Math.max(4, h - 16));
      break;
    }
    case "locker":
      ctx.fillStyle = "#68798f"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#3f4b5e";
      for (let lx = x + 6; lx < x + w - 10; lx += 30) ctx.strokeRect(lx, y + 5, 24, h - 10);
      break;
    case "crate":
      ctx.fillStyle = "#85603f"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#b88a5a"; ctx.lineWidth = 4; ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
      break;
    case "computer":
      ctx.fillStyle = "#6e7f91"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#253347"; ctx.fillRect(x + 8, y + 7, w - 16, h - 22);    // screen frame
      ctx.fillStyle = "#86b8d0"; ctx.fillRect(x + 12, y + 11, w - 24, h - 30);  // screen
      break;
    case "printer":
      ctx.fillStyle = "#777f89"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#e8ecef"; ctx.fillRect(x + 15, y - 8, w - 30, 16);       // paper
      break;
    case "server":
      ctx.fillStyle = "#3f4a5b"; ctx.fillRect(x, y, w, h);
      for (let sy = y + 10; sy < y + h - 8; sy += 24) {
        ctx.fillStyle = "#172233"; ctx.fillRect(x + 7, sy, w - 14, 16);
        ctx.fillStyle = "#59b678"; ctx.fillRect(x + w - 14, sy + 5, 4, 4);       // status LED
      }
      break;
    default:
      ctx.fillStyle = "#68798f"; ctx.fillRect(x, y, w, h);
  }
}

/* ======================= people and clues ======================= */

/* A pulsing circle; found clues turn green and stop pulsing. */
function drawClue(clue) {
  const found = state.discovered.has(clue.id);
  ctx.save();
  ctx.translate(clue.x, clue.y);
  ctx.fillStyle = found ? "#43886355" : "#e7ad3d59";
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  if (!found) {
    ctx.strokeStyle = "#f3cc6e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 26 + Math.sin(performance.now() / 230) * 3, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.font = "25px 'Segoe UI Emoji', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(clue.icon, 0, 0);
  ctx.restore();
}

function drawNameTag(x, y, name, isPlayer) {
  if (!name) return;
  ctx.font = "500 12px 'Prompt', sans-serif";
  ctx.textAlign = "center";
  const width = ctx.measureText(name).width + 12;
  ctx.fillStyle = isPlayer ? "#b23a48d9" : "#111a2ed9";
  ctx.fillRect(x - width / 2, y - 68, width, 18);
  ctx.fillStyle = "#fff";
  ctx.fillText(name, x, y - 55);
}

/* ======================= guidance ======================= */

/* What the player should head for: the officer first, then the nearest
   unfound clue until there are enough. null once it is time to accuse. */
function currentObjectiveTarget() {
  if (!gameActive || !currentCase) return null;
  if (!state.talkedOfficer) {
    const officer = currentCase.npcs.find((npc) => npc.id === currentCase.officerId);
    return officer ? { x: officer.x, y: officer.y, kind: "officer", label: officer.name } : null;
  }
  if (state.discovered.size < currentCase.minimumClues) {
    let best = null, bestDistance = Infinity;
    currentCase.clues.forEach((clue) => {
      if (state.discovered.has(clue.id)) return;
      const distance = Math.hypot(player.x - clue.x, player.y - clue.y);
      if (distance < bestDistance) { bestDistance = distance; best = clue; }
    });
    return best ? { x: best.x, y: best.y, kind: "clue", label: "Nearest clue" } : null;
  }
  return null;
}

/* Gold ring on the ground + a floating chevron above the target. */
function drawObjectiveMarker(target) {
  if (!target) return;
  const pulse = 1 + Math.sin(performance.now() / 260) * 0.12;
  const bob = Math.sin(performance.now() / 330) * 4;
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.strokeStyle = "#f2c14e"; ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(0, 6, 24 * pulse, 12 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.moveTo(0, -46 + bob); ctx.lineTo(-9, -60 + bob); ctx.lineTo(9, -60 + bob);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* A small arrow next to the player, pointing at a target more than 150 px away. */
function drawEdgeArrow(target) {
  if (!target) return;
  const dx = target.x - player.x, dy = target.y - player.y;
  if (Math.hypot(dx, dy) < 150) return;   // close enough: the ring is in view
  const angle = Math.atan2(dy, dx);
  const radius = 62;
  ctx.save();
  ctx.translate(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-4, 0); ctx.lineTo(-8, 7);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---------- room name banner ---------- */
const ROOM_BANNER_MS = 1900;
let currentRoomLabel = null;   // also highlights the room on the minimap
let roomBannerText = "";
let roomBannerUntil = 0;

function resetRoomBanner() {
  currentRoomLabel = null;
  roomBannerUntil = 0;
}

function roomAt(x, y) {
  return currentMap.zones.find((zone) => x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) || null;
}

function checkRoomChange() {
  const zone = roomAt(player.x, player.y);
  if (zone && zone.label !== currentRoomLabel) {
    currentRoomLabel = zone.label;
    roomBannerText = zone.label;
    roomBannerUntil = performance.now() + ROOM_BANNER_MS;
  }
}

function drawRoomBanner() {
  const remaining = roomBannerUntil - performance.now();
  if (remaining <= 0) return;
  // quick fade in, slow fade out
  const alpha = Math.min(1, remaining / 450) * Math.min(1, (ROOM_BANNER_MS - remaining) / 220 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = "600 22px 'Prompt', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const width = ctx.measureText(roomBannerText).width + 44;
  const x = dom.canvas.width / 2, y = 46;
  ctx.fillStyle = "#0f1725cc";
  ctx.fillRect(x - width / 2, y - 20, width, 40);
  ctx.fillStyle = "#e9ad3b";
  ctx.fillRect(x - width / 2, y + 18, width, 2);
  ctx.fillStyle = "#f5f2ea";
  ctx.fillText(roomBannerText, x, y);
  ctx.restore();
}

/* ---------- minimap ----------
   Drawn on its own <canvas> in the side panel, so it never covers the play area. */
const MINIMAP_PADDING = 6;

function drawMinimap() {
  const surface = dom.minimap;
  if (!surface || !currentMap) return;
  const mctx = surface.getContext("2d");
  const scale = Math.min((surface.width - MINIMAP_PADDING * 2) / currentMap.width,
                         (surface.height - MINIMAP_PADDING * 2) / currentMap.height);
  const ox = (surface.width - currentMap.width * scale) / 2;
  const oy = (surface.height - currentMap.height * scale) / 2;
  const sx = (x) => ox + x * scale;
  const sy = (y) => oy + y * scale;

  mctx.clearRect(0, 0, surface.width, surface.height);
  mctx.fillStyle = "#0d1420";
  mctx.fillRect(0, 0, surface.width, surface.height);

  currentMap.zones.forEach((zone) => {
    const here = zone.label === currentRoomLabel;
    mctx.fillStyle = here ? "#3c4f6b" : "#243247";
    mctx.fillRect(sx(zone.x), sy(zone.y), zone.w * scale, zone.h * scale);
    if (here) { mctx.strokeStyle = "#f2c14e"; mctx.lineWidth = 1; mctx.strokeRect(sx(zone.x), sy(zone.y), zone.w * scale, zone.h * scale); }
  });
  currentMap.doors.forEach((door) => {
    mctx.fillStyle = "#8a6a3a";
    mctx.fillRect(sx(door.x), sy(door.y), Math.max(2, door.w * scale), Math.max(2, door.h * scale));
  });
  currentCase.clues.forEach((clue) => {
    mctx.fillStyle = state.discovered.has(clue.id) ? "#4c8f6b" : "#e7ad3d";
    mctx.beginPath(); mctx.arc(sx(clue.x), sy(clue.y), 3, 0, Math.PI * 2); mctx.fill();
  });
  currentCase.npcs.forEach((npc) => {
    mctx.fillStyle = npc.id === currentCase.officerId ? "#63a8e6" : "#b7bec4";
    mctx.fillRect(sx(npc.x) - 2, sy(npc.y) - 2, 4, 4);
  });
  mctx.fillStyle = "#e2564f";
  mctx.beginPath(); mctx.arc(sx(player.x), sy(player.y), 4, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = "#fff"; mctx.lineWidth = 1.4; mctx.stroke();
}

/* ======================= one frame ======================= */

function draw() {
  if (!gameActive || !currentMap) return;
  checkRoomChange();
  drawMap();
  const objective = currentObjectiveTarget();
  drawObjectiveMarker(objective);
  currentCase.clues.forEach(drawClue);
  currentCase.npcs.forEach((npc) => {
    SPR.drawChibi(ctx, npc.x, npc.y, npc.look, { dir: "down", pose: "idle", scale: 2 });
    drawNameTag(npc.x, npc.y, npc.name);
  });
  const walking = keys.up || keys.down || keys.left || keys.right;
  SPR.drawChibi(ctx, player.x, player.y, selectedCharacter, { dir: player.facing, pose: walking ? "walk" : "idle", frame: Math.floor(player.step) % 4, scale: 2 });
  drawNameTag(player.x, player.y, dom.detectiveName.textContent, true);
  drawEdgeArrow(objective);
  drawMinimap();
  drawRoomBanner();
  frameCount += 1;
}
