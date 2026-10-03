/* Detective Word 2D - chibi pixel sprite renderer.
   Everything is drawn with rectangles on a unit grid so no image files
   are needed. Origin of a sprite is the point between the feet.
   Unit grid (y grows upwards):
     0-3   shoes      3-9  legs      9-17 torso/arms
     17-30 head       30+  hair
*/
"use strict";

(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function mix(hex, target, amount) {
    const n = parseInt(hex.slice(1), 16);
    const t = parseInt(target.slice(1), 16);
    const r = Math.round((((n >> 16) & 255) * (1 - amount)) + (((t >> 16) & 255) * amount));
    const g = Math.round((((n >> 8) & 255) * (1 - amount)) + (((t >> 8) & 255) * amount));
    const b = Math.round(((n & 255) * (1 - amount)) + ((t & 255) * amount));
    return `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`;
  }
  const darker = (hex, amount = 0.28) => mix(hex, "#000000", amount);
  const lighter = (hex, amount = 0.28) => mix(hex, "#ffffff", amount);

  /* Draw one pixel-art rectangle. x is measured from the sprite centre,
     y from the ground upwards. */
  function px(ctx, s, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * s), Math.round(-(y + h) * s), Math.round(w * s), Math.round(h * s));
  }

  const HAIR_STYLES = ["short", "bob", "pony", "long", "bun", "spiky", "curly", "cap", "fedora"];

  function drawHair(ctx, s, look, dir, headTop) {
    const hair = look.hair;
    const hi = lighter(hair, 0.22);
    const lo = darker(hair, 0.3);
    const style = look.hairStyle || "short";
    const top = headTop; // top of the skull

    // Basic skull cap shared by every style.
    px(ctx, s, -8, top - 4, 16, 4, hair);
    px(ctx, s, -7, top, 14, 1.5, hair);
    px(ctx, s, -8, top - 6, 16, 2, hair);
    px(ctx, s, -6, top - 0.5, 12, 1, hi);

    if (dir !== "up") {
      // fringe over the forehead
      px(ctx, s, -8, top - 7.5, 16, 1.5, hair);
      px(ctx, s, -8, top - 9, 5, 1.5, hair);
      px(ctx, s, 3, top - 9, 5, 1.5, hair);
    } else {
      px(ctx, s, -8, top - 12, 16, 6, hair);
    }

    if (style === "bob" || style === "long") {
      const drop = style === "long" ? 13 : 9;
      px(ctx, s, -9, top - drop, 2.5, drop - 2, hair);
      px(ctx, s, 6.5, top - drop, 2.5, drop - 2, hair);
      if (dir === "up") px(ctx, s, -8, top - drop, 16, drop - 2, hair);
    }
    if (style === "pony") {
      const back = dir === "left" ? 6.5 : dir === "right" ? -9.5 : -2;
      const wide = dir === "left" || dir === "right" ? 3 : 4;
      px(ctx, s, back, top - 10, wide, 9, hair);
      px(ctx, s, back + 0.5, top - 11.5, wide - 1, 2, lo);
    }
    if (style === "bun") {
      px(ctx, s, -3.5, top + 1, 7, 4, hair);
      px(ctx, s, -2, top + 2.5, 4, 1.5, hi);
    }
    if (style === "spiky") {
      for (let i = -8; i < 8; i += 4) px(ctx, s, i, top + 0.5, 2.5, 3, hair);
      px(ctx, s, -6, top + 3, 2, 2, hair);
    }
    if (style === "curly") {
      px(ctx, s, -9.5, top - 6, 2.5, 6, hair);
      px(ctx, s, 7, top - 6, 2.5, 6, hair);
      for (let i = -8; i < 8; i += 3.5) px(ctx, s, i, top + 0.5, 3, 2.5, hair);
    }
    if (style === "cap") {
      const cap = look.accent || "#b23a48";
      px(ctx, s, -8.5, top - 3, 17, 5, cap);
      px(ctx, s, -8.5, top + 1.5, 17, 1.5, lighter(cap, 0.2));
      if (dir === "down") px(ctx, s, -8, top - 6, 16, 3, darker(cap, 0.2));
      if (dir === "left") px(ctx, s, -13, top - 4, 6, 2.5, darker(cap, 0.2));
      if (dir === "right") px(ctx, s, 7, top - 4, 6, 2.5, darker(cap, 0.2));
    }
    if (style === "fedora") {
      const felt = look.accent || "#3d3226";
      px(ctx, s, -12, top - 3.5, 24, 2.5, felt);
      px(ctx, s, -8, top - 1, 16, 5, felt);
      px(ctx, s, -8, top - 1.5, 16, 1.5, darker(felt, 0.35));
    }
  }

  function drawFace(ctx, s, look, dir, mouthOpen) {
    if (dir === "up") return;
    const eye = look.eye || "#20232e";
    const white = "#fdfdfd";
    let ex1 = -5.2, ex2 = 2.4;
    if (dir === "left") { ex1 = -6.2; ex2 = -1.4; }
    if (dir === "right") { ex1 = 1.4; ex2 = 6.2; }
    const eyeY = 22.4;
    for (const ex of [ex1, ex2]) {
      px(ctx, s, ex, eyeY, 2.8, 3.2, eye);
      px(ctx, s, ex + 0.4, eyeY + 2, 1.2, 1, white);
    }
    // cheeks
    const blush = look.blush || "#e79a9a";
    if (dir === "down") {
      px(ctx, s, -7, 20.4, 2, 1.2, blush);
      px(ctx, s, 5, 20.4, 2, 1.2, blush);
    }
    // mouth
    const mouthX = dir === "left" ? -3.6 : dir === "right" ? 1.4 : -1.1;
    if (mouthOpen) px(ctx, s, mouthX, 18.6, 2.2, 1.8, "#7b3a3a");
    else px(ctx, s, mouthX, 19.2, 2.2, 0.9, darker(look.skin, 0.42));
  }

  /* look: {skin, hair, hairStyle, top, bottom, shoes, accent, eye}
     opts: {dir, frame, pose, scale, talkOpen} */
  function drawChibi(ctx, x, y, look, opts) {
    const o = opts || {};
    const s = o.scale || 2;
    const dir = o.dir || "down";
    const pose = o.pose || "idle";
    const frame = o.frame || 0;

    const skin = look.skin || "#f2c8a2";
    const skinLo = darker(skin, 0.18);
    const top = look.top || "#17233d";
    const topLo = darker(top, 0.26);
    const topHi = lighter(top, 0.16);
    const bottom = look.bottom || "#0b132b";
    const shoes = look.shoes || "#241d18";

    // walk cycle: frame 1 and 3 are the contact poses
    let swing = 0;
    if (pose === "walk") swing = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const bob = pose === "walk" && (frame === 1 || frame === 3) ? -0.6 : 0;
    const crouch = pose === "collect" ? -3 : 0;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // shadow
    ctx.fillStyle = "rgba(11,19,43,0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, (bob + crouch) * s);

    const sideways = dir === "left" || dir === "right";

    // legs and shoes
    if (sideways) {
      const front = dir === "right" ? 1 : -1;
      px(ctx, s, -2.5 + swing * front * 1.6, 3, 5, 6, bottom);
      px(ctx, s, -2.5 - swing * front * 1.6, 3, 5, 6, darker(bottom, 0.22));
      px(ctx, s, -3 + swing * front * 2.2, 0, 6, 3, shoes);
      px(ctx, s, -3 - swing * front * 2.2, 0, 6, 3, darker(shoes, 0.25));
    } else {
      px(ctx, s, -5, 3, 4.4, 6 + swing * 0.8, bottom);
      px(ctx, s, 0.6, 3, 4.4, 6 - swing * 0.8, bottom);
      px(ctx, s, -5.4, 0, 5, 3, shoes);
      px(ctx, s, 0.4, 0, 5, 3, shoes);
    }

    // torso
    px(ctx, s, -5.5, 9, 11, 8.5, top);
    px(ctx, s, -5.5, 15.5, 11, 2, topHi);
    px(ctx, s, -5.5, 9, 11, 1.4, topLo);
    if (look.badge) px(ctx, s, 2.4, 12.6, 2.4, 2.4, look.accent || "#d4a72c");
    if (dir === "down" && look.collar !== false) {
      px(ctx, s, -1.6, 14.4, 3.2, 3.2, lighter(top, 0.62));
      px(ctx, s, -0.6, 12.6, 1.2, 2, look.accent || "#b23a48");
    }

    // arms
    let armLy = 10.4, armRy = 10.4;
    if (pose === "walk") { armLy += swing * 0.9; armRy -= swing * 0.9; }
    if (pose === "talk") armRy = 12.6;
    if (pose === "collect") { armLy = 8.6; armRy = 8.6; }
    px(ctx, s, -7.6, armLy, 2.4, 6, top);
    px(ctx, s, 5.2, armRy, 2.4, 6, top);
    px(ctx, s, -7.6, armLy - 1.8, 2.4, 2, skin);
    px(ctx, s, 5.2, armRy - 1.8, 2.4, 2, skin);

    // head
    px(ctx, s, -8, 17.5, 16, 12.5, skin);
    px(ctx, s, -8, 17.5, 16, 1.2, skinLo);
    px(ctx, s, 6.8, 17.5, 1.2, 12.5, skinLo);
    // ears
    if (!sideways) {
      px(ctx, s, -9, 21, 1.4, 3, skin);
      px(ctx, s, 7.6, 21, 1.4, 3, skin);
    }

    drawFace(ctx, s, look, dir, pose === "talk" ? !!o.talkOpen : false);
    if (look.glasses && dir !== "up") {
      const frame = look.glassesColor || "#20232e";
      let gx1 = -6.6, gx2 = 1.8;
      if (dir === "left") { gx1 = -7.6; gx2 = -2.6; }
      if (dir === "right") { gx1 = 2.6; gx2 = 7.6; }
      px(ctx, s, gx1, 21.6, 4, 3.6, "rgba(255,255,255,0.14)");
      px(ctx, s, gx2, 21.6, 4, 3.6, "rgba(255,255,255,0.14)");
      ctx.strokeStyle = frame;
      ctx.lineWidth = Math.max(1, s * 0.3);
      ctx.strokeRect(Math.round(gx1 * s), Math.round(-(21.6 + 3.6) * s), Math.round(4 * s), Math.round(3.6 * s));
      ctx.strokeRect(Math.round(gx2 * s), Math.round(-(21.6 + 3.6) * s), Math.round(4 * s), Math.round(3.6 * s));
      ctx.beginPath();
      ctx.moveTo(Math.round((gx1 + 4) * s), Math.round(-23.4 * s));
      ctx.lineTo(Math.round(gx2 * s), Math.round(-23.4 * s));
      ctx.stroke();
    }
    drawHair(ctx, s, look, dir, 30);

    if (pose === "shock") {
      px(ctx, s, -1.2, 33, 2.4, 5, "#b23a48");
      px(ctx, s, -1.2, 31, 2.4, 1.4, "#b23a48");
    }
    ctx.restore();
  }

  /* Large dialogue portrait: head and shoulders inside a box. */
  function drawPortrait(ctx, width, height, look, options) {
    const o = options || {};
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, o.bgTop || "#22314f");
    bg.addColorStop(1, o.bgBottom || "#101a30");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.max(2, Math.floor(Math.min(width / 22, height / 20)));
    ctx.save();
    ctx.translate(width / 2, height + 11 * scale);
    drawChibi(ctx, 0, 0, look, { dir: "down", pose: o.pose || "idle", scale, talkOpen: o.talkOpen });
    ctx.restore();
  }

  function drawWalkFrames(ctx, x, y, look, dir, scale, timeMs) {
    const frame = Math.floor(timeMs / 140) % 4;
    drawChibi(ctx, x, y, look, { dir, frame, pose: "walk", scale });
  }

  window.DW_SPRITES = {
    drawChibi,
    drawPortrait,
    drawWalkFrames,
    HAIR_STYLES,
    darker,
    lighter,
    mix
  };
})();
