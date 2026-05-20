#!/usr/bin/env node
/**
 * Generate iceberg imagery for §01 Problem ("The fine is just the floor").
 *
 * Metaphorical, not case-specific: tip = the regulatory letter / fine,
 * underwater mass = all the downstream brand damage that never makes
 * the headline (PR crisis, litigation, remediation, trust erosion).
 *
 * Model: fal-ai/flux-pro/v1.1-ultra — photorealistic, 16:9, ~$0.06/img
 * Budget cap: $1 across the whole brief. 4 images max.
 *
 * Usage:
 *   FAL_KEY=... node scripts/generate-iceberg.mjs <slot>
 *
 * Slots:
 *   hero       — main cinematic split-view above/below the waterline
 *   tip        — close-up of the small visible peak
 *   underwater — looking up at the massive submerged mass
 *   illustration — minimal pen-and-ink cross-section (alt register)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public', 'iceberg');

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY not set. `source ~/.zshrc` or export it inline.');
  process.exit(1);
}

const SLOT = process.argv[2];
if (!SLOT) {
  console.error('Usage: node scripts/generate-iceberg.mjs <hero|tip|underwater|illustration>');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────
// PROMPTS — each slot tuned for one specific facet of the metaphor.
// Photoreal where the medium serves the metaphor (the actual iceberg).
// All explicitly forbid text, people, boats, branding — anything that
// would distract from the metaphor or compete with overlay annotations.
// ─────────────────────────────────────────────────────────────────────────
const PROMPTS = {
  hero: `Cinematic split-view photograph of a massive iceberg in cold Arctic ocean, shown from a side angle so that both the above-water peak and the enormous below-water mass are visible simultaneously through the waterline. The tip above water is small and sharply pointed, perhaps 10% of the total bulk, brilliant white with cool blue shadow. The underwater portion is vast, ethereally glowing in deep teal and emerald, extending downward like a cathedral. A sharp horizontal waterline cleanly divides the frame. Dramatic side-lighting from the upper left casts long shadows. Cool muted palette of steel-blue, deep teal, off-white, and pale gold rim-light. Subtle volumetric god-rays piercing the water below. Misty atmospheric depth, faint Arctic horizon. Editorial National Geographic photography style. Hyper-realistic. Shot on Hasselblad H6D-100c, 50mm lens, f/8, ISO 200, polarising filter. No people, no boats, no birds, no text, no letters, no logos, no UI elements, no annotations. 16:9 aspect ratio.`,

  tip: `Macro photograph of just the small tip of a massive iceberg breaking the cold ocean surface, stark and minimal. A single sharp white peak rises against a moody slate-grey overcast sky, framed by dark indigo water lapping at its base. Vast empty negative space around it. Editorial photography. Cinematic isolation. Cold lonely Arctic mood. Subtle wind-blown spray catching the light at the waterline. Hyper-realistic. Hasselblad photographic style. No people, no boats, no text, no letters, no logos, no annotations, no birds.`,

  underwater: `Photograph taken from deep beneath the ocean surface, looking upward at the colossal underside of an iceberg. The iceberg's submerged bulk fills the upper two-thirds of the frame as a luminous ethereal blue-green cathedral of ice, irregular and cavernous. Above the iceberg the waterline glows with diffused sunlight breaking through, like backlit stained glass. Long god-rays pierce downward into the indigo depths below. Eerie cold reverent atmosphere. Cinematic. Hyper-realistic. National Geographic underwater photography style. No divers, no fish, no submarines, no text, no letters, no logos, no annotations. 3:2 aspect ratio.`,

  illustration: `Minimal editorial cross-section illustration of an iceberg in side-profile, showing the small visible peak above a clean horizontal waterline and the enormous submerged mass extending downward below it. Hand-drawn pen-and-ink technical drawing aesthetic, single warm sepia ink on aged off-white textured paper, like a plate from a 1960s oceanography textbook or an Edward Tufte information-design diagram. Fine cross-hatching for shading. Clean, restrained, scholarly. A single thin horizontal line marks the waterline. No text, no labels, no annotations, no numbers, no scale bar, no compass. Just the iceberg form. Centered composition with generous margin.`,
};

const prompt = PROMPTS[SLOT];
if (!prompt) {
  console.error(`Unknown slot "${SLOT}". Choose: ${Object.keys(PROMPTS).join(', ')}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────
// API call — single shot, no retries (fal.ai bills on submission, not
// success). The sync endpoint blocks until the image is ready.
// ─────────────────────────────────────────────────────────────────────────
const MODEL = 'fal-ai/flux-pro/v1.1-ultra';
const url = `https://fal.run/${MODEL}`;

console.log(`[generate-iceberg] slot=${SLOT}`);
console.log(`[generate-iceberg] model=${MODEL}`);
console.log(`[generate-iceberg] prompt length=${prompt.length} chars`);
console.log(`[generate-iceberg] estimated cost: $0.06`);
console.log(`[generate-iceberg] calling fal.ai (sync, no retries)…`);

const startedAt = Date.now();

const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Key ${FAL_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt,
    aspect_ratio: SLOT === 'underwater' ? '3:2' : '16:9',
    num_images: 1,
    enable_safety_checker: true,
    output_format: 'jpeg',
    raw: false,
    safety_tolerance: '2',
  }),
});

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

if (!response.ok) {
  const errBody = await response.text().catch(() => '<no body>');
  console.error(`[generate-iceberg] HTTP ${response.status} after ${elapsed}s`);
  console.error(errBody.slice(0, 800));
  process.exit(2);
}

const result = await response.json();

if (!result?.images?.[0]?.url) {
  console.error(`[generate-iceberg] unexpected response shape after ${elapsed}s:`);
  console.error(JSON.stringify(result, null, 2).slice(0, 800));
  process.exit(3);
}

const imageUrl = result.images[0].url;
const seed = result.seed;
console.log(`[generate-iceberg] generated in ${elapsed}s, seed=${seed}`);
console.log(`[generate-iceberg] downloading → ${imageUrl.slice(0, 80)}…`);

const imageResponse = await fetch(imageUrl);
if (!imageResponse.ok) {
  console.error(`[generate-iceberg] download failed: HTTP ${imageResponse.status}`);
  process.exit(4);
}

const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
const outPath = path.join(PUBLIC_DIR, `${SLOT}.jpg`);

fs.writeFileSync(outPath, imageBuffer);

// Save metadata alongside for traceability
const metaPath = path.join(PUBLIC_DIR, `${SLOT}.meta.json`);
fs.writeFileSync(
  metaPath,
  JSON.stringify(
    {
      slot: SLOT,
      model: MODEL,
      prompt,
      seed,
      generatedAt: new Date().toISOString(),
      elapsedSeconds: Number(elapsed),
      bytes: imageBuffer.length,
    },
    null,
    2,
  ),
);

console.log(`[generate-iceberg] wrote ${outPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
console.log(`[generate-iceberg] metadata → ${metaPath}`);
