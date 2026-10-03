/* Detective Word 2D - map builder.
   Rooms are declared as a grid (rows x cols). The builder computes each
   room's pixel rectangle, then automatically creates a wall between every
   pair of neighbouring rooms with a door-sized gap in the middle, and a
   solid, gap-free wall around the outside. This guarantees every room a
   case declares is reachable and that no wall accidentally seals a path,
   which was the main source of "stuck / confusing" bugs in earlier maps.
*/
"use strict";

(function () {
  function gridMap(spec) {
    const margin = spec.margin ?? 24;
    const doorWidth = spec.doorWidth ?? 76; // leaves a 58 px clear lane for the 18 px player
    const cols = spec.cols;
    const rows = spec.rows;
    const width = margin * 2 + cols.reduce((a, b) => a + b, 0);
    const height = margin * 2 + rows.reduce((a, b) => a + b, 0);

    // pixel rect for each grid cell
    const colX = [margin];
    for (const w of cols) colX.push(colX[colX.length - 1] + w);
    const rowY = [margin];
    for (const h of rows) rowY.push(rowY[rowY.length - 1] + h);

    const cellRect = (r, c) => ({
      x: colX[c], y: rowY[r], w: cols[c], h: rows[r]
    });

    const zones = [];
    spec.cells.forEach((rowCells, r) => {
      rowCells.forEach((cell, c) => {
        if (!cell) return;
        const rect = cellRect(r, c);
        zones.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, label: cell.label, floor: cell.floor });
      });
    });

    const walls = [];
    const doors = [];

    // outer boundary (always solid)
    walls.push({ x: 0, y: 0, w: width, h: margin });
    walls.push({ x: 0, y: height - margin, w: width, h: margin });
    walls.push({ x: 0, y: 0, w: margin, h: height });
    walls.push({ x: width - margin, y: 0, w: margin, h: height });

    const has = (r, c) => r >= 0 && r < spec.cells.length && c >= 0 && c < spec.cells[0].length && !!spec.cells[r][c];

    // vertical walls between horizontally adjacent cells
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols.length - 1; c++) {
        const left = has(r, c), right = has(r, c + 1);
        if (!left && !right) continue;
        const x = colX[c + 1];
        const y0 = rowY[r], y1 = rowY[r] + rows[r];
        if (left && right) {
          const midY = (y0 + y1) / 2;
          const gapTop = midY - doorWidth / 2;
          const gapBottom = midY + doorWidth / 2;
          walls.push({ x: x - 2, y: y0, w: 4, h: gapTop - y0 });
          walls.push({ x: x - 2, y: gapBottom, w: 4, h: y1 - gapBottom });
          doors.push({ x: x - 9, y: gapTop, w: 18, h: gapBottom - gapTop, orientation: "vertical" });
        } else {
          walls.push({ x: x - 2, y: y0, w: 4, h: y1 - y0 });
        }
      }
    }
    // horizontal walls between vertically adjacent cells
    for (let r = 0; r < rows.length - 1; r++) {
      for (let c = 0; c < cols.length; c++) {
        const top = has(r, c), bottom = has(r + 1, c);
        if (!top && !bottom) continue;
        const y = rowY[r + 1];
        const x0 = colX[c], x1 = colX[c] + cols[c];
        if (top && bottom) {
          const midX = (x0 + x1) / 2;
          const gapLeft = midX - doorWidth / 2;
          const gapRight = midX + doorWidth / 2;
          walls.push({ x: x0, y: y - 2, w: gapLeft - x0, h: 4 });
          walls.push({ x: gapRight, y: y - 2, w: x1 - gapRight, h: 4 });
          doors.push({ x: gapLeft, y: y - 9, w: gapRight - gapLeft, h: 18, orientation: "horizontal" });
        } else {
          walls.push({ x: x0, y: y - 2, w: x1 - x0, h: 4 });
        }
      }
    }

    return {
      id: spec.id, name: spec.name, thai: spec.thai || spec.name,
      width, height, background: spec.background || "#b8af9c",
      zones, walls, doors, furniture: spec.furniture || [], margin,
      cellRect, colX, rowY
    };
  }

  window.DW_MAPKIT = { gridMap };
})();
