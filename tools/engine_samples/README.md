# Engine sample banks

How `www/js/engbanks.js` is made from recordings of real cars: the Wikimedia
Commons "X - engine and exhaust sound" series (CC BY 3.0) and a BMW M3 E92
drive recorded by Nate Lee on the Internet Archive (CC BY 4.0).

The game plays engines the way Need for Speed Underground 2 (EA's AEMS) and
most racing games do: a ladder of seamless loops, one every 10% of rpm, each
holding the engine at one steady rpm, for pulling (throttle open) and
coasting. The two loops either side of the engine's rpm play together,
resampled a few percent to land on it and crossfaded by distance; throttle
blends pulling and coasting; a soft spread over the nearest three loops
keeps fast rpm changes gliding. Each loop now and then jumps to another of
its cycles on a short crossfade, so a held rpm (a 2-step, the limiter) never
repeats a pattern. An ignition cut (limiter, 2-step, shift) swaps the pulling
sound for the coasting one for the cut.

The rev limiter bounces on its own. The physics cuts and restores the
ignition many times a frame (a few rpm either side of the limit), far faster
than a real engine bounces, and a frame only ever saw a sample of it - an
irregular, digital-sounding chop. Now the physics only reports how much of
the time it is cutting, and the worklet bounces the way real limiters do:
the revs sag a few percent and the note dies away over ~15 ms as the pipe
stops ringing, then the charge lights again with a bark and the revs climb
back. A stock (fuel-cut) limiter bounces slowly and deeply ("bap-bap-bap",
~7 Hz free revving), an ignition cut (2-step, race exhaust / ECU) fast and
shallow (~13-16 Hz) with real pops; in gear the car holds the revs up, so
the dips are shallower. No two bounces are alike.

An earlier version strung single engine cycles together at run time
(granular, NFSU2 "Ginsu" style). With these recordings - short YouTube revs,
mostly below 4500 rpm - it spliced every 100 ms or so and filled the high
rpm with re-spaced copies of a few cycles, which sounded choppy and buzzy.

## Steps

1. `dl.py` downloads the Commons recordings listed in `sel.json` (use the
   transcoded MP3s; the originals are rate limited for scripts). The M3:
   `https://archive.org/download/2008-bmw-m3-e92-s65-exhaust-sound-recordings/DJI_02_20240428_090953.flac`.
2. `ffmpeg -i X -ac 1 -ar 44100 wav/X.wav` (M3: `wav/BMW_M3_E92.wav`).
3. `trcache.py` tracks the firing frequency of every recording once
   (`track.py`: whitened harmonic-sum salience + Viterbi) into `tr/`.
4. `build_all.py [IDS]` runs `loops.py` for each bank in `sources.json` +
   `sources_extra.json` (K = firing pulses per crank turn: cylinders / 2;
   2 for a twin rotor). For each rpm on the ladder and each layer it:
   - finds the stretches of the recordings within 6% of that rpm (pulling:
     revs rising or loud and steady; coasting: falling), best and longest
     first, preferring the bank's best-covered recording;
   - refines the pitch by matching each engine cycle against the next
     (sample accurate), then time-warps the stretch to exactly that rpm;
   - rejects stretches without a clear pitch, with pops or clicks (highs far
     above the recording's local level), or whose level jumps cycle to cycle;
     takes out each stretch's crescendo (revs climbing get louder; joined
     stretches would otherwise make a sawtooth of level) and splits it around
     any cycle that drops out (a gear change, a limiter cut);
   - builds each loop from one car only (stretches of different cars strung
     together change voice every tenth of a second, which held at one rpm
     sounds like a garbled word), trying the bank's main recording first and
     the next one if the loop comes out unsteady;
   - EQs the stretches to their average and joins them with phase-aligned
     crossfades (amplitude- or power-complementary by how alike the sides
     are), then closes the loop on a whole number of engine cycles (3+);
   - declicks the loop; rpm the recordings never held cleanly are made from
     the nearest real loop, 70% by re-spacing its firing pulses
     (pitch-synchronous overlap-add, so the pulse shape and exhaust
     resonance stay the car's) and 30% by plain resampling - the mix that
     came closest to real high-rpm loops in a held-out test;
   - measures how much each loop's spectral shape wobbles by itself (2-20 Hz,
     level removed; real engines held steady measure about 1.0) and remakes
     the ones far rougher than the engine's others from a steady neighbour;
   - lengthens loops under 0.45 s, and reshuffles every made loop, by
     stringing its own cycles together in a new order (no fast repeat, and
     loops made from one real loop don't comb against each other);
   - EQs every loop's spectral shape onto a smooth trend along the ladder and
     sets it to the same perceived loudness (energy above ~300 Hz), so a fast
     rev up or down glides through one voice; evens cycle-to-cycle level, and
     lines every loop's engine cycle up with its neighbour's, so loops
     crossfading fire in step;
   - writes `lbanks/ID.ogg` (Vorbis, 32 kHz) and `lbanks/ID.json` (per loop:
     offset, length, rpm, layer, real/made, engine cycles, likeness to the
     next loop up, which sets the crossfade law).
5. `mkcfg.py` gates the banks (real loops from near idle to 3200+ rpm) and
   maps each game engine to its bank, writing `banks.json` with credits and
   per-engine options (the V12 plays the inline-six loops doubled half a
   firing apart: a V12 is two sixes firing in between each other).
6. `popfind.py` finds real exhaust pops in the recordings (short transients
   standing well above the engine around them, with both a low thump and a
   crack); the good ones, picked by eye from a sheet of their waveforms
   (`popsel.json` indices), are cut and levelled by `popbank.py` into
   `lbanks/pops.ogg`. They replace the modelled pops and bangs: the 2-step and
   ignition-cut limiter pop with them, and a free-flowing exhaust crackles
   with them on a lift.
7. `build_engbanks.py lbanks banks.json` writes `www/js/engbanks.js` (Vorbis
   quality 7: lower settings fill the 1-4 kHz rasp with codec noise, a
   swirly, digital texture once loops crossfade).

## Checking against the real thing

`resyn.py NAME WAV K RED LBANK - auto 5 OUTDIR` takes a clean real rev from a
recording, drives the player (`wk.js`, the game's worklet run in Node) with
its tracked rpm and throttle, and compares the two: loudness fluctuation at
2-20 Hz (what the ear hears as choppiness), cycle-to-cycle level and
spectral change, clicks, and 1/3-octave timbre, plus spectrograms.
