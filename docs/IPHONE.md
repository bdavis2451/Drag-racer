# Pixel Drag on iPhone

## For a beta tester (no App Store needed)

1. Open the link in **Safari**: https://bdavis2451.github.io/Drag-racer/
2. Tap **Share** (the square with the arrow), then **Add to Home Screen**.
3. Open Pixel Drag from the home screen and turn the phone sideways. It runs
   full-screen like an app, and updates arrive by themselves.

- No sound? Flip the silent switch off, then tap the screen once.
- Play from the home-screen icon, not a Safari tab: Safari can clear a site's
  data when it hasn't been opened for a while, the home-screen app keeps it.
- Found a bug? **Settings → Back up save → Copy**, then paste the text into a
  message with what happened. **Restore save** puts a save back.

## The native app (later)

`ios/` is the Xcode project (Capacitor, Swift Package Manager). The
"Build iOS (check)" workflow compiles it unsigned on GitHub's Mac runners.
Installing it on an iPhone needs signing: an Apple Developer account
($99/year) for TestFlight, or Xcode on a Mac for your own phone (7 days).
