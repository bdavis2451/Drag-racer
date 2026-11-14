# Working on Pixel Drag

A drag racing game (ES5, one global `DR`, `DR.Game` = `G`) shipped to GitHub
Pages from branch `claude/android-drag-racing-game-q2vro7`. A tester plays the
live Pages build on an iPhone: every push reaches him (he is our tester).

## How we build a feature

1. **Research and talk first.** Research the real-world side, then discuss it
   with the owner. No code until they agree on what's in it.
2. **A short written plan, approved before building.** One page: what's in it
   item by item (with prices for parts), where each thing lives in the game
   (which shop section, which screen), what is deliberately left out, and
   what it changes for existing saves and for rivals.
3. **Item-by-item approval.** List the items as multiple-choice questions
   (multi-select where it fits) so the owner ticks what goes in. Big lists:
   the written plan plus questions on the real choices.
4. **Smallest version first.** Ship the core, let it be played, then add.
5. **Push straight to the tester.** Once the owner OKs a plan, build, test
   and push: the tester on GitHub Pages is the preview. Use the preview
   artifact only for huge reworks.
6. **Nothing beyond the plan without asking.** A change the feature turns out
   to need (a balance tweak, a rule, another system) becomes a question, not a
   surprise in the report.
7. **Ask before doing anything the owner hasn't agreed to.** Small bug fixes
   they asked for are fine; anything else, ask.

## Research

- **Never settle for thin research.** If a source can't be reached (a blocked
  site, a tool that fails, a paywall), don't make do with summaries: stop and
  ask the owner what to do (download it another way, they paste it, or skip).
- Pages the web-fetch tool can't reach: download them plainly with `curl`
  (no disguised browser identity; a site that blocks bots stays blocked).

## A file per feature

Every update gets a working file, `docs/features/<name>.md`, started at the
first conversation and kept current as we talk: status, decisions, open
questions, the plan as it stands, research notes with sources, and build
notes (where the code lives, what was tested). It's mainly for Claude to
work from across sessions; update it whenever a decision is made.

## Conventions

- **Show options only where they fit.** A part appears for the engines and
  mods it belongs with (like turbo manifolds only with a turbo), so the shop
  doesn't overwhelm.

- **Parts live where they live on a real car.** An intake part is in the
  intake section; a part that enables others (a multiport manifold enabling
  injectors and an ECU) unlocks them where they already are, not in a new slot.
- Keep the catalog lean: a new option must give the player a real choice.
- Rivals (`inst.ai`) must not change unless the plan says so: the rival
  snapshot must stay identical.
- Plain, short, player-facing wording; say what a thing does, not how it's
  coded.
- When a change trades loading speed against quality, favor quality.

## After every push

- A short "what changed" note for the owner, written for the tester: what to
  try and what to look out for. Add it to `docs/CHANGELOG.md`.
- Keep `docs/BACKLOG.md` current: parked ideas, proposals waiting on a yes or
  no, and decisions made.

## Practical

- Serve locally: `cd www && python3 -m http.server 8123`, open
  `index.html?noframe=1`. Headless Chromium + Playwright are available.
- `DR.SCHED_OFF = true` skips the calendar gates in tests.
- Bundle for the preview: `python3 tools/bundle_web.py <out.html> --fragment`,
  then `npx cap sync`.
