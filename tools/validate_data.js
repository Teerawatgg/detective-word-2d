"use strict";
/* Validates the game data without a browser (Node version).
   Run: node tools/validate_data.js
   v7.0: the checks live in tools/validate_core.js and are shared with
   tools/validate_data.py, which needs no Node (it runs them in Chromium and
   also catches duplicated keys in the source text). Prefer the Python one. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);

// the content scripts (data/ + the map builder they call), in page order
const html = fs.readFileSync(path.join(root, "templates/index.html"), "utf8");
const scripts = [...html.matchAll(/filename='js\/([^']+)'/g)].map((m) => m[1])
  .filter((name) => name.startsWith("data/") || name === "engine/mapkit.js");
for (const name of scripts) {
  vm.runInContext(fs.readFileSync(path.join(root, "static/js", name), "utf8"), sandbox, { filename: name });
}
vm.runInContext(fs.readFileSync(path.join(__dirname, "validate_core.js"), "utf8"), sandbox, { filename: "validate_core.js" });

const { errors, info } = sandbox.DW_VALIDATE(sandbox);
info.forEach((line) => console.log("ok   " + line));
errors.forEach((msg) => console.error("FAIL: " + msg));
if (errors.length > 0) {
  console.error(`\n${errors.length} validation error(s) found.`);
  process.exit(1);
}
console.log(`\nAll data validation checks passed (${scripts.length} data scripts).`);
