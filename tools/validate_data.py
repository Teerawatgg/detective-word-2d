"""Detective Word 2D — data validator (v7.0), no Node.js needed.

Run:  python tools/validate_data.py
Needs: pip install -r requirements-dev.txt && playwright install chromium
       (the Flask app does NOT need to be running)

1. Source-level checks that cannot be done at runtime: a duplicated key in an
   object literal (e.g. "match" written twice in vocab.js) is silently
   collapsed by JavaScript, so it is only visible in the source text.
2. Loads the game's data scripts, in the same order as templates/index.html,
   into headless Chromium and runs tools/validate_core.js over them.
"""
import re
import sys
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "static" / "js"


def is_data_script(path):
    """The content files, plus the map builder they call while loading."""
    return path.startswith("data/") or path == "engine/mapkit.js"

errors = []


def fail(msg):
    errors.append(msg)


def duplicate_keys(source, pattern, label):
    keys = re.findall(pattern, source, re.M)
    for key, count in Counter(keys).items():
        if count > 1:
            fail(f"{label}: key \"{key}\" is written {count} times (JavaScript keeps only the last one)")
    return len(keys)


def source_checks():
    vocab = (JS / "data/vocab.js").read_text(encoding="utf-8")
    vocab_part, _, irregular_part = vocab.partition("window.DW_IRREGULAR")
    entry = r'^\s*"([^"]+)"\s*:'
    n_vocab = duplicate_keys(vocab_part, entry, "vocab.js DW_VOCAB")
    duplicate_keys(irregular_part, entry, "vocab.js DW_IRREGULAR")
    # case blocks in the Thai files are keyed by case id at 4-space indent
    for name in ("data/thai-content.js", "data/thai-dialogue.js"):
        src = (JS / name).read_text(encoding="utf-8")
        duplicate_keys(src, r'^    "([a-z0-9-]+)"\s*:\s*\{', name)
    return n_vocab


def data_scripts():
    html = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    names = re.findall(r"filename='js/([^']+)'", html)
    return [JS / n for n in names if is_data_script(n)]


def main():
    n_vocab = source_checks()
    scripts = data_scripts()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page_errors = []
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        page.set_content("<!doctype html><html><body></body></html>")
        for path in scripts + [ROOT / "tools" / "validate_core.js"]:
            page.add_script_tag(path=str(path))
        for err in page_errors:
            fail(f"script error while loading data: {err}")
        result = page.evaluate("() => window.DW_VALIDATE ? DW_VALIDATE(window) : { errors: ['validate_core.js did not load'], info: [] }")
        browser.close()

    for line in result["info"]:
        print("ok   " + line)
    print(f"ok   vocab.js source: {n_vocab} DW_VOCAB keys written")
    for msg in errors + result["errors"]:
        print("FAIL: " + msg)
    total = len(errors) + len(result["errors"])
    if total:
        print(f"\n{total} validation error(s) found.")
        return 1
    print(f"\nAll data validation checks passed ({len(scripts)} data scripts).")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
