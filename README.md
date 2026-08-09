# KITEBAAZ — scroll-driven site

Vanilla HTML/CSS/JS, zero dependencies, zero build step.

## Run

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Dropping in real content

- **Founder portrait** — save the photo as `assets/founder/portrait.jpg`. The
  placeholder swaps out automatically.
- **Ambient audio** — copy `.mp3` files into `assets/audio/`, then rename
  `tracks.json.example` to `tracks.json` and list your files in it. The audio
  button in the bottom nav appears only when `tracks.json` exists. Audio never
  autoplays; playback always requires a click.
- **Story videos** — in `index.html`, fill each story card's `data-yt-id=""`
  with a YouTube video id. Clicking a filled card swaps in a
  youtube-nocookie.com embed on demand.
- **Newsletter endpoint** — set `data-endpoint` on the form in `#rooftop`
  (Buttondown / Formspree / ConvertKit all work). While it is empty, submitting
  opens a mail draft to kitebaaz.in@gmail.com instead.

## Engine notes

- One `requestAnimationFrame` loop drives all three canvas sequences
  (`js/scroll.js`). Frame index = dwell-remapped scroll progress, LERP 0.085.
- `CUT_FRAME = 66` (of 120): the exact frame where the manjha severs in the
  hero video. `वो काटा!` fires there.
- Dwell parameters: `DWELL_WIDTH 0.045`, `DWELL_PEAK 3.2` (`js/dwell.js`).
  If a beat feels sticky lower the peak toward 2.5; raise toward 4.0 if
  copy scrolls past too fast.
- Frame payload (`assets/frames/manifest.json`): desktop ~8.5 MB, mobile
  ~3.6 MB. Only HERO loads up front; HISTORY and ORIGIN lazy-load on approach.
- Reduced motion, save-data / 2g, and no-JS all degrade to a static, fully
  readable page.

### Dev-only URL hooks (used for screenshot verification)

- `?pv=<hero|history|origin>:<0..1>` — pins that canvas section and drives its
  progress directly.
- `?sec=<section-id>:<offset>` — transforms the page so a section is in view,
  with reveal states forced on.
- `?menu` — opens the menu overlay. `?marks` — writes section offsets into the
  document title.

These do nothing without their query params and can be deleted from the bottom
of `js/scroll.js` (`devPreview`) for production.
