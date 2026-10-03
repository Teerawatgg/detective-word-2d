"""Browser test: plays Detective Word 2D in a real Chromium, start to finish.

Run (the Flask app must already be running in another terminal):
    python app.py
    python tests/browser_smoke_test.py

The steps run in order on ONE page, like a player would: start screen ->
briefing -> walking -> solving every case -> quizzes -> Thai subtitles ->
layout -> notebook and a wrong accusation -> dictionary popups -> sound.
Each step continues from where the previous one left off.

Most steps use window.__DETECTIVE_DEBUG__ (static/js/game/debug.js) to jump
around quickly, but the hooks drive the real UI, so what is checked is what a
player would see.
"""
import sys

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5000"
FAILS = []


# ---------------------------------------------------------------- helpers

def check(name, condition, detail=""):
    print(f"[{'PASS' if condition else 'FAIL'}] {name}" + (f" — {detail}" if detail and not condition else ""))
    if not condition:
        FAILS.append(name)


def debug(page, js, *args):
    """Calls window.__DETECTIVE_DEBUG__.<js>, e.g. debug(page, "goToCase('empty-tank')")."""
    if args:
        return page.evaluate(f"(a) => window.__DETECTIVE_DEBUG__.{js}(a)", *args)
    return page.evaluate(f"window.__DETECTIVE_DEBUG__.{js}")


def wait_for_window(page):
    page.wait_for_selector("#modal-layer:not(.hidden)", timeout=2000)


def close_window(page, button="#modal-close"):
    page.click(button)
    page.wait_for_selector("#modal-layer.hidden", state="attached", timeout=2000)


def interact_with(page, kind, item_id):
    """Teleports next to an NPC or a clue and presses E."""
    debug(page, f"teleportTo('{kind}', '{item_id}')")
    page.wait_for_timeout(80)
    debug(page, "forceInteract()")
    wait_for_window(page)


def hold_keys(page, codes, ms):
    for code in codes:
        page.keyboard.down(code)
    page.wait_for_timeout(ms)
    for code in codes:
        page.keyboard.up(code)


def page_errors(page):
    """Collects console errors and uncaught exceptions for the final check."""
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    return errors


# ---------------------------------------------------------------- steps

def start_screen(page):
    check("Page loads", page.title() == "Detective Word 2D", page.title())
    body = page.inner_text("body")
    thai = [c for c in body if "฀" <= c <= "๿"]
    check("Start screen text is Thai-free before any window opens", len(thai) == 0, f"{len(thai)} Thai characters")
    check("Two characters available", len(page.query_selector_all(".character-option")) == 2)

    groups = page.evaluate("() => [...document.querySelectorAll('#case-select optgroup')].map(g => [g.label, g.children.length])")
    check("Case list is grouped into 3 categories, 10 cases", len(groups) == 3 and sum(n for _, n in groups) == 10, str(groups))
    options = page.evaluate("() => [...document.querySelectorAll('#case-select option')].map(o => o.value)")
    check("Case list order = play order (Next case follows it)", options == debug(page, "caseOrder()"))


def how_to_play(page):
    page.click("#how-to-open")
    page.wait_for_selector("#how-to-screen:not(.hidden)")
    cards = len(page.query_selector_all(".guide-case-card"))
    cases = page.evaluate("window.DW_CASES.length")
    check("How to Play shows one card per case (10)", cards == cases == 10, f"{cards} cards, {cases} cases")
    page.click("#how-to-back")
    page.wait_for_selector("#start-screen:not(.hidden)")


def briefing(page):
    page.fill("#player-name", "Riley")
    page.select_option("#case-select", "missing-laptop")
    page.click("#start-form button[type=submit]")
    try:
        page.wait_for_selector("#briefing-screen:not(.hidden)", timeout=3000)
        check("Briefing appears before the first case", True)
        pages_seen = 0
        for _ in range(12):
            if "hidden" in (page.get_attribute("#briefing-screen", "class") or ""):
                break
            page.click("#briefing-next")
            pages_seen += 1
            page.wait_for_timeout(120)
        check("Briefing has several pages", pages_seen >= 5, str(pages_seen))
    except PlaywrightTimeout:
        check("Briefing appears before the first case", False)
    page.wait_for_selector("#game-screen:not(.hidden)", timeout=4000)
    check("Game screen is shown after the briefing", True)


def movement(page):
    # Keys are read by their physical position (event.code), so this works
    # with a Thai keyboard layout too.
    before = debug(page, "snapshot().player")
    hold_keys(page, ["KeyD"], 700)
    after = debug(page, "snapshot().player")
    check("D moves the player right (any keyboard layout)", after["x"] > before["x"] + 15, f"{before} -> {after}")
    hold_keys(page, ["KeyS"], 500)
    after_down = debug(page, "snapshot().player")
    check("S moves the player down", after_down["y"] > after["y"] + 5, f"{after} -> {after_down}")


def first_conversation(page):
    debug(page, "teleportTo('npc','officer')")
    page.wait_for_timeout(150)
    page.keyboard.press("KeyE")
    wait_for_window(page)
    check("E next to the officer opens a conversation", True)

    word = page.query_selector("#modal-body .dw-word")
    check("Dialogue has at least one clickable word", word is not None)
    if word:
        word.click()
        page.wait_for_selector("#word-popup:not(.hidden)", timeout=1500)
        popup = page.inner_text("#word-popup")
        check("Word popup shows a Thai translation", any("฀" <= c <= "๿" for c in popup), popup)

    for _ in range(6):   # "Next line" until the conversation ends
        button = page.query_selector("#next-line")
        if not button:
            break
        button.click()
        page.wait_for_timeout(80)
    page.wait_for_selector("#modal-layer.hidden", state="attached", timeout=2000)


def solve_every_case(page):
    order = debug(page, "caseOrder()")
    for case_id in order:
        solve_case(page, case_id, has_next=order.index(case_id) < len(order) - 1)


def solve_case(page, case_id, has_next):
    debug(page, f"goToCase('{case_id}')")
    page.wait_for_timeout(100)
    case = page.evaluate(
        "(id) => { const c = window.DW_CASES.find(x => x.id === id); return {"
        " clues: c.clues.map(cl => cl.id), officer: c.officerId, culprit: c.culpritId, proof: c.proofId,"
        " line: Object.keys(c.contradictions).find(k => c.contradictions[k].includes(c.proofId)) }; }", case_id)

    interact_with(page, "npc", case["officer"])
    close_window(page)
    for clue_id in case["clues"]:
        interact_with(page, "clue", clue_id)
        if page.query_selector("#ev-quiz"):   # open the quiz too, but leave it unanswered
            page.click("#ev-quiz")
            page.wait_for_timeout(100)
        close_window(page, "#ev-close" if page.query_selector("#ev-close") else "#modal-close")
    found = debug(page, "snapshot().discovered")
    check(f"[{case_id}] every clue found", found == len(case["clues"]), str(found))

    page.click("#accuse-open")
    wait_for_window(page)
    page.check(f"input[name=suspect][value='{case['culprit']}']")
    page.check(f"input[name=lie][value='{case['line']}']")
    page.check(f"input[name=proof][value='{case['proof']}']")
    page.click("#accuse-form button")
    page.wait_for_timeout(150)
    result = page.inner_text("#modal-body")
    check(f"[{case_id}] the right accusation solves the case", "CASE" in result and "SOLVED" in result, result[:120])
    check(f"[{case_id}] the result shows stars and the confession",
          page.query_selector(".result-stars") is not None and page.query_selector(".confession") is not None)
    check(f"[{case_id}] 'Next case' only when a case follows", (page.query_selector("#next-case") is not None) == has_next)
    close_window(page)


def quizzes(page):
    # Starting a case resets its progress, so collect the clues of case 1 again.
    debug(page, "goToCase('missing-laptop')")
    page.wait_for_timeout(100)
    clue_ids = page.evaluate("() => window.DW_CASES.find(x => x.id === 'missing-laptop').clues.map(c => c.id)")
    for clue_id in clue_ids:
        interact_with(page, "clue", clue_id)
        close_window(page)
    check("Case 1 clues collected again for the next checks", debug(page, "snapshot().discovered") == len(clue_ids))

    # a right answer (the choices are shuffled, so ask where the right one landed)
    interact_with(page, "clue", "note")
    page.click("#ev-quiz")
    page.wait_for_timeout(100)
    right = debug(page, "quizCorrectIndex('q1')")
    check("Quiz knows where the right answer is after shuffling", isinstance(right, int), str(right))
    page.click(f".quiz-choice[data-i='{right}']")
    page.wait_for_timeout(150)
    check("A right answer turns green", "correct" in page.get_attribute(f".quiz-choice[data-i='{right}']", "class"))
    close_window(page, "#quiz-close")

    # a hint, then a wrong answer
    interact_with(page, "clue", "log")
    page.click("#ev-quiz")
    page.wait_for_timeout(100)
    score_before = int(page.inner_text("#score"))
    page.click("#hint")
    page.wait_for_timeout(100)
    score_after = int(page.inner_text("#score"))
    check("A hint costs 3 points", score_after == score_before - 3, f"{score_before} -> {score_after}")
    wrong = page.evaluate("() => window.__DETECTIVE_DEBUG__.quizCorrectIndex('q2') === 0 ? 1 : 0")
    page.click(f".quiz-choice[data-i='{wrong}']")
    page.wait_for_timeout(150)
    check("A wrong answer turns red", "wrong" in page.get_attribute(f".quiz-choice[data-i='{wrong}']", "class"))
    close_window(page, "#quiz-close")


def thai_subtitles(page):
    interact_with(page, "npc", "teacher")
    subtitle = page.query_selector(".dialogue-box .dialogue-th")
    check("NPC dialogue shows a Thai subtitle", subtitle is not None and subtitle.inner_text().strip() != "")
    close_window(page)


def layout(page):
    overlaps = page.evaluate(
        "() => { const m = document.getElementById('minimap').getBoundingClientRect();"
        " const c = document.getElementById('game').getBoundingClientRect();"
        " return !(m.right <= c.left || m.left >= c.right || m.bottom <= c.top || m.top >= c.bottom); }")
    check("Minimap does not cover the map", overlaps is False)
    check("Game screen fits the window without scrolling",
          page.evaluate("() => document.documentElement.scrollHeight <= window.innerHeight + 2") is True)


def leaving_a_case_stops_music(page):
    page.evaluate("window.__DW_MUSIC_STOPS__ = 0; const s = window.DW_SOUND; const real = s.stopMusic;"
                  " s.stopMusic = function () { window.__DW_MUSIC_STOPS__++; return real.apply(s, arguments); };")
    page.click("#change-case")
    page.wait_for_timeout(200)
    stops = page.evaluate("() => window.__DW_MUSIC_STOPS__")
    check("Leaving a case stops the music", bool(stops), str(stops))
    page.click("#start-form button[type=submit]")   # back into a fresh case 1
    page.wait_for_timeout(200)


def notebook_and_wrong_accusation(page):
    page.keyboard.press("KeyQ")
    wait_for_window(page)
    check("Q opens the notebook", "CASE NOTEBOOK" in page.inner_text("#modal-body"))
    close_window(page)

    debug(page, "discoverAll()")   # the fresh case has no clues yet: unlock the accusation
    page.click("#accuse-open")
    wait_for_window(page)

    # switching tabs during the accusation must keep its tension music
    page.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }")
    page.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }")
    page.wait_for_timeout(100)
    cue = page.evaluate("window.DW_SOUND.musicState().name")
    check("A tab switch during the accusation keeps the tension music", cue == "deduction", cue)

    innocent = page.evaluate("() => { const c = window.DW_CASES.find(x => x.id === 'missing-laptop');"
                             " return c.npcs.find(n => n.role === 'Suspect' && n.id !== c.culpritId).id; }")
    page.check(f"input[name=suspect][value='{innocent}']")
    page.check("input[name=lie][value='0']")
    page.check("#accuse-evidence input[name=proof]")
    page.click("#accuse-form button")
    page.wait_for_timeout(150)
    result = page.inner_text("#modal-body")
    check("A wrong accusation shows TRY AGAIN", "TRY" in result and "CASE\nSOLVED" not in result, result[:100])
    check("A wrong accusation costs a chance", page.inner_text("#chances") == "♥♥♡", page.inner_text("#chances"))
    close_window(page)


def dictionary_rules(page):
    def lookup(word):
        return debug(page, "lookup", word)

    def linkify(text):
        return page.evaluate("(t) => window.__DETECTIVE_DEBUG__.linkify(t)", text)

    check("Irregular past form: went -> go", lookup("went") == {"key": "go", "form": "went"}, str(lookup("went")))
    check("Doubled consonant: logged -> log, dripping -> drip",
          (lookup("logged") or {}).get("key") == "log" and (lookup("dripping") or {}).get("key") == "drip")
    check("-ied: copied -> copy", (lookup("copied") or {}).get("key") == "copy", str(lookup("copied")))

    html = linkify("She logged in, then checked in at the front desk & left.")
    check("Phrases link as one word (logged in / checked in / front desk)",
          'data-word="logged in"' in html and 'data-word="checked in"' in html and 'data-word="front desk"' in html and "&amp;" in html, html)
    oclock = linkify("at nine o'clock in the morning")
    check("\"o'clock in\" is not the phrase \"clock in\"", 'data-word="clock in"' not in oclock, oclock)
    quoted = linkify("Jake's leave request: 'On leave Friday afternoon.'")
    check("A phrase after an opening quote still links ('On leave)", 'data-word="On leave"' in quoted, quoted)

    debug(page, "goToCase('leaked-password')")
    debug(page, "openQuiz('q2')")
    wait_for_window(page)
    linked = page.evaluate("() => [...document.querySelectorAll('#modal-body h2 .dw-word')].map(e => e.dataset.word)")
    check("The quizzed term is not clickable in its own quiz (log in)", not any("log" in w for w in linked), str(linked))
    check("The quiz shows its topic tag", page.inner_text("#modal-body .topic-tag") == "IT", page.inner_text("#modal-body .topic-tag"))
    close_window(page)


POPUP_CELLS = "() => [...document.querySelectorAll('#word-popup .wp-forms td')].map(td => [td.textContent, td.classList.contains('on')])"


def click_word(page, selector):
    page.click(selector)
    page.wait_for_selector("#word-popup:not(.hidden)", timeout=1500)
    return page.inner_text("#word-popup"), page.evaluate(POPUP_CELLS)


def word_popups(page):
    # a phrase, inside a conversation
    debug(page, "openDialogue('oscar')")
    wait_for_window(page)
    page.click("#next-line")   # line 2: "I never logged in to any computer after lunch."
    page.wait_for_timeout(80)
    text, _ = click_word(page, "#modal-body .dw-word[data-word='logged in']")
    check("Phrase popup shows the Thai meaning", "ล็อกอิน" in text, text)
    close_window(page)

    # an irregular past form
    debug(page, "goToCase('missing-laptop')")
    debug(page, "openDialogue('mike')")
    wait_for_window(page)
    text, cells = click_word(page, "#modal-body .dw-word[data-word='went']")
    check("went: forms table with ช่อง 2 highlighted",
          cells == [["go", False], ["went", True], ["gone", False]] and "ช่อง 2" in text and "past participle" in text, str(cells))
    check("went: explains what the form is", "went = กริยาช่อง 2 (past simple) ของ go" in text, text)
    close_window(page)

    # words in a clue
    debug(page, "goToCase('leaked-password')")

    def clue_word(clue_id, word):
        debug(page, f"openEvidence('{clue_id}')")
        wait_for_window(page)
        return click_word(page, f"#modal-body .evidence-box .dw-word[data-word='{word}']")

    text, cells = clue_word("sticky", "written")
    check("written: ช่อง 3 highlighted and explained",
          cells == [["write", False], ["wrote", False], ["written", True]] and "written = กริยาช่อง 3 (past participle) ของ write" in text, f"{cells} {text}")
    close_window(page)
    text, cells = clue_word("mug", "sits")
    check("sits: ช่อง 1 highlighted and explained as he / she / it",
          cells == [["sit", True], ["sat", False], ["sat", False]] and "sits = sit + -s" in text and "he / she / it" in text, f"{cells} {text}")
    check("The popup never blocks clicks (pointer-events: none)",
          page.evaluate("getComputedStyle(document.getElementById('word-popup')).pointerEvents") == "none")
    close_window(page)

    # any word, without a window
    def popup(word):
        return debug(page, "wordPopup", word)

    come = popup("come")
    check("come: ช่อง 1 and ช่อง 3 (same spelling) both highlighted and explained",
          come["cells"] == [["come", True], ["came", False], ["come", True]] and "ช่อง 1 และช่อง 3" in come["text"], str(come))
    check("Real -s endings: witness + -es, copy + -ies, clue + -s",
          "witness + -es" in popup("witnesses")["text"] and "copy + -ies" in popup("copies")["text"] and "clue + -s" in popup("clues")["text"])
    check("Real -ed endings: copy + -ied, arrive + -d, confirm + -ed",
          "copy + -ied" in popup("copied")["text"] and "arrive + -d" in popup("arrived")["text"] and "confirm + -ed" in popup("confirmed")["text"])
    left = popup("left")
    check("left (ช่อง 2 = ช่อง 3): both highlighted and named",
          left["cells"] == [["leave", False], ["left", True], ["left", True]] and "ช่อง 2 และช่อง 3" in left["text"], str(left))
    page.evaluate("document.getElementById('word-popup').classList.add('hidden')")

    text, cells = clue_word("sticky", "keyboard")
    check("A plain noun has no forms table and no explanation", cells == [] and "=" not in text, text)
    close_window(page)


def sound_toggle(page):
    before = page.inner_text("#sound-toggle-game")
    page.click("#sound-toggle-game")
    page.wait_for_timeout(80)
    after = page.inner_text("#sound-toggle-game")
    check("The sound button changes its icon", before != after, f"{before} -> {after}")
    page.click("#sound-toggle-game")   # back on


def save_screenshots(page):
    page.screenshot(path="tests/screenshots/03_game_play.png")
    page.goto(BASE, wait_until="networkidle")
    page.screenshot(path="tests/screenshots/00_start.png")
    page.click("#how-to-open")
    page.wait_for_timeout(150)
    page.screenshot(path="tests/screenshots/02_how_to_play.png")


STEPS = [
    start_screen, how_to_play, briefing, movement, first_conversation,
    solve_every_case, quizzes, thai_subtitles, layout, leaving_a_case_stops_music,
    notebook_and_wrong_accusation, dictionary_rules, word_popups, sound_toggle,
]


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = page_errors(page)
        page.goto(BASE, wait_until="networkidle")
        for step in STEPS:
            print(f"\n## {step.__name__.replace('_', ' ')}")
            step(page)
        # A blocked network (no Google Fonts) is not a game bug: the CSS has fallback fonts.
        real_errors = [e for e in errors if "Failed to load resource" not in e]
        check("No console errors during the whole run", not real_errors, str(real_errors[:5]))
        save_screenshots(page)
        browser.close()


if __name__ == "__main__":
    run()
    print("\n---")
    if FAILS:
        print(f"{len(FAILS)} check(s) FAILED:")
        for name in FAILS:
            print(" -", name)
        sys.exit(1)
    print("All checks passed.")
