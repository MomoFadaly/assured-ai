# Bespoke Hero Video — 7-Scene Loop

**Purpose.** Replace the placeholder Mixkit clip at `public/videos/hero-loop.mp4` with a bespoke composition that visualizes the AssuredAI promise: catching the bad sentence before it ships, then proving you caught it.

**Output spec.** 1920×1080, 30fps, H.264 high profile, CRF 22, no audio, MP4 with `+faststart`. Target ≤ 2.5 MB, 9.6–10.0s loop, seamless cross-dissolve from scene 7 back to scene 1 so the loop boundary is invisible.

**Palette.** Carries over from the hero: deep navy `#07091a`, white text, cool accents (`#7C3AED` violet, `#2563EB` blue), single amber warning `#F59E0B` reserved for the "bad sentence" moment.

**Recurring motif.** A faint hash-chain glyph orbiting the lower-right — same icon as `HashChainCanvas` later on the page. The viewer's eye sees it before they read the section heading 1200px down.

---

## Scene-by-scene (1.4s each = 9.8s total)

| # | Title                | What you see                                                                                                                       | What it means                            |
|---|----------------------|------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| 1 | Empty doc            | Blinking caret on a dark page; one line of text writes in (`monospace` style for the "draft" feel).                                | Content is being produced.               |
| 2 | Bad sentence flagged | The line completes; one phrase highlights in amber with a `⚠ unverified claim` pill above it.                                      | The stakes — one bad sentence.           |
| 3 | Verifier scan        | Horizontal scan line sweeps the paragraph top-to-bottom, leaving green `✓` on safe lines and an amber `⚠` on the flagged one.       | The pipeline does the work.              |
| 4 | Before / After       | Left half: bad sentence with red strike-through. Right half: revised + disclaimer-injected version writes in.                       | The fix, made visible.                   |
| 5 | Hash chain forming   | Three blocks chain together left-to-right; `audit_log_id: 19421` appears under them.                                                | Proof exists.                            |
| 6 | Public proof URL     | Browser-chrome facade with `assuredai.online/v/19421` in the address bar; tiny lock icon glows.                                     | Proof is public.                         |
| 7 | Brand resolve        | The AssuredAI mark appears with the line `The content safety layer for regulated brands.` set in the same weight as the hero H1.    | The headline echoes itself.              |

Scene 7 cross-dissolves into scene 1 (caret returns to empty doc) using the same navy → navy palette, so the loop wraps without a visible cut.

---

## Build approach

**Tool: Remotion.** Mo already has a Remotion stack for the Studio agent; reusing it gets the deterministic frame-perfect render, version control on the timeline, and one-line re-export when copy changes. The project lives in a sibling repo (`remotion-studio-ads` or a new `remotion-assured-hero`).

**Sequence file.** A single `Hero.tsx` Composition with seven `<Sequence>` blocks staggered by 42 frames (1.4s @ 30fps). Each scene is its own component with its own springs / interpolations. Cross-dissolve via opacity ramps in the boundary frames.

**Type rendering.** Use the same Inter weight as the live hero (`font-semibold`, `tracking-[-0.035em]`). Type animates in via `interpolate` on `translateY` + `opacity` — matches the `reveal-up` keyframe in the live site.

**Hash-chain block.** Trace the existing `HashChainCanvas` rendering logic to lift the glyph; or recreate as a small SVG since the scene only needs the visual icon, not the live data flow.

**Render command.**
```bash
npx remotion render src/Hero.tsx Hero out/hero-loop.mp4 \
  --codec h264 --crf 22 --pixel-format yuv420p \
  --width 1920 --height 1080 --fps 30
```

**Post.** Strip audio, add `+faststart`, generate a fresh poster:
```bash
ffmpeg -y -i out/hero-loop.mp4 -c:v copy -movflags +faststart -an \
  /Users/mo/assured-ai/public/videos/hero-loop.mp4
ffmpeg -y -ss 1.4 -i /Users/mo/assured-ai/public/videos/hero-loop.mp4 \
  -frames:v 1 -q:v 2 \
  /Users/mo/assured-ai/public/videos/hero-poster.jpg
```

Hero `<video>` is already wired to `/videos/hero-loop.mp4` + `/videos/hero-poster.jpg` — no code change needed when the file is swapped.

---

## Acceptance gates

1. **Loop seam invisible.** Play in a 30-second loop in the actual hero; the moment of wrap-around cannot be identified by eye.
2. **First frame is recognizable.** The poster (`hero-poster.jpg`) must read as the brand even with no motion. Scene 1's empty doc + caret works; pulled at t=1.4s to land on scene 2's flagged-sentence frame may be even stronger — A/B in browser.
3. **Mobile sanity.** At 375×667 the video's center is what's visible (object-fit cover). Compose with the brand mark + flagged sentence near the middle 60% so nothing critical clips on phones.
4. **Weight budget.** Final mp4 ≤ 2.5 MB. If over, drop to 720p source render and let CSS scale.
5. **Reduced-motion fallback.** The hero already hides the video on `prefers-reduced-motion: reduce`. The fallback gradient + headline must still feel intentional — verified.

---

## Reference: the placeholder being replaced

- Source: Mixkit clip 43288 ("Aerial shot of an avenue in a city at night")
- Why it works for now: dark navy palette, slow continuous motion, no faces or text — doesn't compete with the headline
- Why it doesn't ship: generic stock; doesn't tell the AssuredAI story; doesn't reinforce the "content safety / hash-chain proof" beats that the rest of the page leans on
