"""Touch test: plays Detective Word 2D on emulated phones and iPads.

Run (the Flask app must already be running in another terminal):
    python app.py
    python tests/touch_test.py

On each device (iPhone 13 portrait + landscape, iPad portrait + landscape) a
real finger is simulated with CDP touch events (touchStart / touchMove /
touchEnd), so the D-pad gets the same pointer events a phone sends. Checks:
holding the pad walks, sliding the thumb turns without lifting, letting go
stops, a corner walks diagonally, E talks, the Notebook button opens the
notebook, and on phones the Case drawer slides in and closes again (on
tablets the Accuse button must be on screen instead).
"""
from playwright.sync_api import sync_playwright
import sys

sys.stdout.reconfigure(encoding="utf-8")
fails = []
def check(name, ok, detail=""):
    print(("[PASS] " if ok else "[FAIL] ") + name + ("" if ok else f" — {detail}"))
    if not ok: fails.append(name)

def start(pg):
    pg.goto("http://127.0.0.1:5000"); pg.wait_for_timeout(600)
    pg.fill("#player-name", "T"); pg.select_option("#case-select", "missing-laptop")
    pg.tap("#start-form button[type=submit]")
    for _ in range(15):
        if "hidden" in (pg.get_attribute("#briefing-screen", "class") or ""): break
        pg.tap("#briefing-next"); pg.wait_for_timeout(60)
    pg.wait_for_selector("#game-screen:not(.hidden)"); pg.wait_for_timeout(1500)

def pos(pg): return pg.evaluate("window.__DETECTIVE_DEBUG__.snapshot().player")
def center(pg, sel):
    b = pg.locator(sel).bounding_box(); return b["x"] + b["width"]/2, b["y"] + b["height"]/2, b

def hold(cdp, pg, points, ms_each=500):
    x, y = points[0]
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    pg.wait_for_timeout(ms_each)
    for (x, y) in points[1:]:
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
        pg.wait_for_timeout(ms_each)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    pg.wait_for_timeout(150)

with sync_playwright() as p:
    b = p.chromium.launch()
    for name in ["iPhone 13", "iPhone 13 landscape", "iPad (gen 7) landscape", "iPad (gen 7)"]:
        d = dict(p.devices[name]); d.pop("default_browser_type", None)
        ctx = b.new_context(**d); pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
        print(f"## {name}")
        start(pg)
        # D-pad: hold on the right arrow, then slide the thumb down without lifting
        cx, cy, box = center(pg, ".dpad"); r = box["width"] * 0.38
        p0 = pos(pg)
        hold(cdp, pg, [(cx + r, cy)], 600)
        p1 = pos(pg)
        check(f"{name}: holding → walks right", p1["x"] > p0["x"] + 20 and abs(p1["y"] - p0["y"]) < 5, f"{p0} → {p1}")
        hold(cdp, pg, [(cx - r, cy), (cx, cy + r)], 500)
        p2 = pos(pg)
        check(f"{name}: slide ← then ↓ without lifting", p2["y"] > p1["y"] + 15, f"{p1} → {p2}")
        check(f"{name}: letting go stops", pg.evaluate("Object.values(keys).every(v => !v)"))
        p3 = pos(pg); hold(cdp, pg, [(cx + r*0.7, cy - r*0.7)], 500); p4 = pos(pg)
        check(f"{name}: corner walks diagonally", p4["x"] > p3["x"] + 10 and p4["y"] < p3["y"] - 10, f"{p3} → {p4}")
        # E button talks to the officer
        pg.evaluate("window.__DETECTIVE_DEBUG__.teleportTo('npc', 'officer')"); pg.wait_for_timeout(200)
        pg.tap(".touch-interact"); pg.wait_for_timeout(300)
        opened = "hidden" not in (pg.get_attribute("#modal-layer", "class") or "")
        check(f"{name}: E button opens the dialogue", opened)
        pg.tap("#modal-close"); pg.wait_for_timeout(200)
        pg.tap(".touch-notebook"); pg.wait_for_timeout(300)
        check(f"{name}: Notebook button opens the notebook", "Notes" in pg.inner_text("#modal-body"))
        pg.tap("#modal-close"); pg.wait_for_timeout(200)
        pg.tap("#audio-settings-game"); pg.wait_for_timeout(200)
        check(f"{name}: audio panel shows the tap hint, not \"Press M\"",
              pg.locator(".audio-panel .touch-only").is_visible() and not pg.locator(".audio-panel .keys-only").is_visible())
        pg.tap("#audio-panel-close"); pg.wait_for_timeout(200)
        if pg.is_visible("#panel-toggle"):
            pg.tap("#panel-toggle"); pg.wait_for_timeout(350)
            bx = pg.locator(".case-panel").bounding_box()
            vw = pg.viewport_size["width"]
            check(f"{name}: Case drawer slides in", bx["x"] + bx["width"] <= vw + 1 and bx["x"] < vw, str(bx))
            check(f"{name}: Case button says the drawer is open", pg.get_attribute("#panel-toggle", "aria-expanded") == "true")
            pg.mouse.click(10, 300); pg.wait_for_timeout(350)   # tap the dimmed map
            # closed = hidden for real (not just off-screen), so Tab and screen readers skip it
            check(f"{name}: tapping outside closes it", not pg.locator(".case-panel").is_visible()
                  and pg.get_attribute("#panel-toggle", "aria-expanded") == "false")
        else:
            check(f"{name}: Accuse button visible on screen", pg.locator("#accuse-open").is_visible() and pg.locator("#accuse-open").bounding_box()["y"] + 20 < pg.viewport_size["height"])
        ctx.close()
    b.close()
print("---")
print("All checks passed." if not fails else f"{len(fails)} check(s) failed: {fails}")
sys.exit(1 if fails else 0)
