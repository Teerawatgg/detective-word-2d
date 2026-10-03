# static/audio — real sound files (optional)

The game **already has full audio without any files here**: `sound.js` synthesises
every effect plus a procedural jazz soundtrack (one theme per location and a
tension cue for the accusation) with the Web Audio API.

Dropping real files in this folder simply upgrades the quality. The engine
reads `manifest.json` on boot, loads whatever it finds, and silently falls back
to the synthesiser for anything missing. You can add one file at a time.

## How to add files

1. Put `.ogg` (preferred) or `.mp3` files in this folder.
2. Add the filename to `manifest.json` under the matching key, e.g.

   ```json
   { "music": { "explore": "noir_loop.ogg" },
     "sfx":   { "step": "footstep_wood.ogg", "clue": "discovery.ogg" } }
   ```

3. Hard-refresh the page (`Ctrl` + `F5`).

## Keys the engine looks for

| Key | Bus | When it plays | Suggested length |
|---|---|---|---|
| `school` / `museum` / `station` / `aquarium` | music | that location's theme | 60-120 s, seamless loop |
| `explore` | music | fallback for any location without its own file | 60-120 s, seamless loop |
| `tension` | music | the accusation window ("deduction" cue) | 60-120 s loop |
| `click` | sfx | any UI button | < 0.1 s |
| `step` | sfx | each footstep (pitch-randomised automatically) | < 0.2 s |
| `door_open` | sfx | door starts opening | 0.2-0.5 s |
| `door_close` | sfx | door starts closing | 0.2-0.5 s |
| `clue` | sfx | new evidence collected | 0.5-1.2 s |
| `talk` | sfx | dialogue line advances | < 0.15 s |
| `correct` | sfx | quiz answered correctly | 0.8-1.5 s |
| `wrong` | sfx | quiz answered incorrectly | 0.8-1.5 s |
| `fanfare` | sfx | case solved | 2-4 s |
| `fail` | sfx | wrong accusation | 1-2 s |
| `open` / `close` | sfx | modal opens / closes | < 0.3 s |

## Where to get files that are safe to ship

Check the licence on the page before downloading:

- **Kenney Game Assets** (kenney.nl) - CC0 UI, impact and footstep packs.
- **freesound.org** - filter by "Creative Commons 0".
- **OpenGameArt.org** - filter licence to CC0.
- **Incompetech** (Kevin MacLeod) - CC-BY music, good noir/jazz beds.

Record every non-CC0 file's author and licence in a `CREDITS.md` next to this
README before you ship or submit the project.

## Volume

Normalise files to about **-16 LUFS** so they sit at a similar level to the
synthesised fallbacks. The in-game panel (the cog next to the speaker icon)
exposes master / music / sfx / ambience sliders and persists them to
`localStorage`.
