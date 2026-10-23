# Engine sample banks

How `www/js/engbanks.js` is made from recordings of real cars on Wikimedia
Commons ("X - engine and exhaust sound" series, CC BY 3.0).

The game plays engines granularly, the way Need for Speed Underground 2's
"Ginsu" layer, Codemasters and the REV engine do: a recording is cut into
whole engine cycles (720 degrees of crank) tagged with their rpm, and the
cycles recorded at the current rpm are strung together at run time.

1. `dl.py` downloads the recordings listed in `sel.json` (Commons metadata:
   url, licence, artist). Use the transcoded MP3s; the originals are rate
   limited for scripts.
2. `ffmpeg -i X.mp3 -ac 1 -ar 44100 wav/X.wav`
3. `grains.py ID wav/X.wav K REDLINE` for each line of `sources.json`
   (K = firing pulses per crank turn: cylinders / 2, 2 for a twin rotor).
   - `track.py` follows the firing frequency with a whitened harmonic-sum
     salience map and a Viterbi path.
   - The tracked phase marks every engine cycle; each gets its rpm, whether
     the engine was pulling (rpm rising) or coasting (falling), how much it
     resembles the next cycle (engines repeat, wind and crowds don't) and its
     peak-to-rms ratio (one-off pops and clicks are left out).
   - Long runs of clean consecutive cycles are kept, best first, each cut
     only where its 150 rpm band already holds `CAP` cycles, so a recorded
     rev sweep stays one continuous stretch that playback can follow. Each
     run is level matched (smoothed over ~7 cycles, keeping the natural
     cycle-to-cycle variation) and EQ matched to the bank's average
     spectrum, with a few ms of real recording kept either side so the cut
     edges never play.
   - Bands the recording never held cleanly are filled by re-spacing the
     engine's own combustion pulses from the nearest recorded band
     (pitch-synchronous overlap-add), so the pulse shape and exhaust
     resonance stay the car's.
   - Output: `gbanks/ID.ogg` (Vorbis, 32 kHz) + `gbanks/ID.json` (one row
     per cycle: offset, length, rpm, on/off, end-of-run).
   - `SIM`, `CONT`, `MINRUN`, `CREST` environment variables loosen or
     tighten the cycle selection for difficult recordings.
4. `mkcfg.py` gates the banks (enough recorded cycles from near idle to
   3000+ rpm, not rejected after checking rendered passes) and maps each
   game engine to the best bank, writing `banks.json` with credits.
5. `build_engbanks.py gbanks banks.json` writes `www/js/engbanks.js`.

At run time (`www/js/engsamples.js`) an AudioWorklet strings cycles end to
end. It follows the recording while it stays within 15% of the game's rpm
(skipping or repeating a cycle of the same stretch to keep pace); otherwise
it splices to the cycle and start offset, among those recorded near the
target rpm, whose opening best matches the waveform that would have
followed, with a crossfade of about a third of a cycle. Each cycle is
resampled (4-point cubic) to land on the exact rpm, and throttle blends the
pulling and coasting layers. The physical model only adds what a
recording can't: the rev limiter, pops and bangs, and the blower.
