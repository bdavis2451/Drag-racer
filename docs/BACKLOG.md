# Backlog

What's parked, what's waiting on a decision, and what was decided. Newest at
the top of each section.

## In progress

- Nothing right now.

## Waiting on a yes or no

- **Contract line on the timeslip.** After a sponsor or street win: "Counted
  for [sponsor]: street races 1/2", or why it didn't count (already counted,
  another class's race, not a street race).
- **This Week keeps contract races.** A race already won that would still
  count for the contract stays on This Week. Built, saved in git stash
  "this-week contract reruns (awaiting OK)". Fits the ladder/calendar talk.
- **Split race shifter and manual valve body** into two parts (today one
  part does both: quicker shifts on a manual, you-shift on an automatic).
- **In-app browser tip.** A one-time note to open the game in Chrome/Safari
  when it's running inside Facebook's browser (no sound there).
- **iPhone sound default** back to Full, now the cause (the in-app browser)
  is known.

## Parked ideas

- **Time-specific tunes for brackets.** The tuner tunes to a target ET
  ("8.50 prepped", "9.10 street"), saved as setups. Expensive. See
  `docs/features/street-tune.md`.

- **Career ladder and the calendar.** How the ladder and the week's race
  days fit together. Talk it through (reminder set).
- **Engine Simulator audio.** Real or simulated engine recordings, for when
  the game is sold. Open question: how to give access to the tools.
- **Free-to-use engine recordings.** Researched, nothing integrated.
- **Race-day scoring.** Win/dominate targets and reward picks are built but
  switched off (`DR.RD_SCORING = false`).
- **Ray's tab.** When you can't pay Ray on the 1st, his share goes on a tab
  that grows with no limit and no consequence; it's paid in full on any 1st
  you can cover it. Maybe: Ray takes a cut of race winnings once the tab gets
  big, or a gentle nudge text at some amount.

## Loose ends

- **Sound check line in Settings** (from the audio fix) shows "undefined"
  without an audio device. Check what the tester's phone shows, then remove
  it once sound is settled.
- **Hilborn on methanol** runs lean with the stock fuel pump: realistic, but
  may surprise players. Revisit with the carb redo.

## Decided

- Street tunes (Strip/Street/Both 1.7x, saved setups, pick pop-up, hint,
  tuner text) and the tube chassis move: shipped.

- Bracket racing: hired drivers drive the stripe (lift/brake to win close
  without breaking out), pick their own dial (editable); rivals do it from
  class 3, dialing honest.
- Manual valve body on an automatic: you shift it (Auto-shift still works).
- Lock tags name the race when a rival ends more than one in a class.
- Art changes go to the preview first, live only after approval.
