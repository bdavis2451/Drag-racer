# Engine sample banks

How `www/js/engbanks.js` is made from recordings of real cars on Wikimedia
Commons ("X - engine and exhaust sound" series, CC BY 3.0).

1. `dl.py` downloads the recordings listed in `sel.json` (Commons metadata:
   url, licence, artist). Use the transcoded MP3s; the originals are rate
   limited for scripts.
2. `ffmpeg -i X.mp3 -ac 1 -ar 44100 wav/X.wav`
3. `bank.py ID wav/X.wav K REDLINE` for each line of `sources.json`
   (K = firing pulses per crank turn: cylinders / 2, 2 for a twin rotor).
   - `track.py` follows the firing frequency with a whitened harmonic-sum
     salience map and a Viterbi path.
   - It picks moments near a ladder of rpm points (rising revs = "on",
     falling = "off"), flattens the pitch to exactly that rpm by resampling
     along the tracked phase, and cuts a loop of whole firing cycles with a
     crossfaded seam (`extract.py`).
   - Loops must sit on the engine's harmonics (`lq.py`), keep a steady level
     (no dropouts) and stay at one pitch over every quarter, or the next
     candidate is tried.
   - Output: `banks/ID.ogg` (Vorbis, 32 kHz) + `banks/ID.json` + a plot.
4. `mkcfg.py` gates the banks (enough loops, reaching 2800 rpm or more, not
   rejected after looking at the loop spectrograms) and maps each game
   engine to the best bank, writing `banks.json` with credits.
5. `build_engbanks.py banks banks.json` writes `www/js/engbanks.js`.

At run time (`www/js/engsamples.js`) the two loops either side of the rpm
are crossfaded and pitch-shifted, throttle fades between the on and off
sets, and above the highest recorded rpm the physical model
(`enginesim.js`) takes the note back over.
