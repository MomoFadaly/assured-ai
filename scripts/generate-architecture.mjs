#!/usr/bin/env node
/**
 * Generate the §04 Product hero — AssuredAI rendered as a precision
 * engineering instrument, photographed top-down for the brief.
 *
 * Model: fal-ai/flux-pro/v1.1-ultra — photorealistic, editorial
 * register, ~$0.06/image. Budget cap: $0.24 (up to 4 attempts).
 *
 * Usage:
 *   FAL_KEY=... node scripts/generate-architecture.mjs [variant]
 * Variants:
 *   instrument-a  primary — top-down precision instrument w/ 5 bands
 *   instrument-b  alt — watch-movement-style overhead
 *   instrument-c  alt — chronograph caseback aesthetic
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public', 'architecture');

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY not set. `source ~/.zshrc` or export it inline.');
  process.exit(1);
}

const SLOT = process.argv[2] || 'instrument-a';

// ─────────────────────────────────────────────────────────────────────────
// Prompts. The instrument is rendered as a top-down editorial product
// photograph in the register of high-end industrial-design press
// (Monocle, Wallpaper*, A24 prop styling). Each variant pushes a
// slightly different metaphor; all keep the same 5-band architectural
// reading and the same material palette (brass, walnut, emerald glass,
// ruby pivots).
// ─────────────────────────────────────────────────────────────────────────
const PROMPTS = {
  'instrument-a': `Macro photograph of a luxury precision engineering specimen on dark walnut wood, shot from a high three-quarter angle that reveals subtle depth and beveled edges. The specimen is a long horizontal rectangular block of polished brass with a sculptural, museum-piece quality. Five clearly visible horizontal sections stacked from top to bottom, each section a distinct relief level on the brass face, separated by deep beveled grooves.

Section 1 at top — thin strip — four small circular brass receptacles evenly spaced.
Section 2 just below — thin strip — three small circular crystal lenses evenly spaced.
Section 3 in the centre — the largest band, twice as tall as the others, slightly raised and more elaborate, with hand-applied guilloché texture around its border — nine small rectangular glass windows in a single horizontal row glowing with deep emerald-green inner light, each window framed by a slim brass surround, all evenly spaced. EXACTLY NINE WINDOWS.
Section 4 below — thin strip — four small square brass insets with tiny brass rivets.
Section 5 bottom — thicker plinth, slightly sunken — four parallel horizontal grooves machined into the brass like the registers of a chronograph caseback.

Material palette: hand-rubbed polished brass with subtle aged patina, dark walnut hardwood substrate, deep emerald-tinted crystal glass with faint inner glow, sapphire crystal lenses, ruby accents. The whole specimen looks like a Patek Philippe movement crossed with an Apple Pro Display, photographed for Wallpaper magazine.

Lighting: editorial studio lighting, key light from upper-left at 45 degrees, fill from upper-right, gentle rim light, deep shadows in the bevels. Slight vignette.

Composition: specimen fills 75 percent of the frame, centred, walnut surface visible top and bottom. 3:2 aspect ratio. Editorial muted palette of brass-gold, walnut-brown, emerald-green.

Hyper-realistic, Hasselblad H6D-100c, 80mm tilt-shift macro at f/8, ISO 100, studio strobes through silk diffuser.

Critical rule: every brass surface is completely smooth and unmarked. Absolutely no text, no engravings of letters or numbers, no writing, no logos, no symbols, no markings whatsoever. No human figures, no hands. No buttons, no screens, no digital displays.`,

  'instrument-b': `Vintage technical illustration in the style of an antique scientific-instrument plate from a 19th-century engineering compendium. Cross-section drawing of a precision verification apparatus, shown from a top-down view as if illustrated for an old encyclopedia. Pen-and-ink line drawing with selective wash colour applied delicately. Cream aged-paper background with faint paper texture.

The apparatus is a long horizontal cross-section drawn with fine technical-illustration linework, showing five clearly drawn horizontal sections stacked vertically:

Top section: four small circular brass-coloured discs evenly spaced along a thin band, drawn with delicate hatching.
Second section: a thin channel with three small drawn crystal lenses.
Centre section, the largest and most ornately drawn: NINE small rectangular emerald-tinted chambers in a horizontal row, each rendered with fine cross-hatching, each glowing soft emerald-green, separated by thin pen-drawn brass dividers.
Fourth section: four small brass cartridges drawn as squared cells.
Bottom section: a sunken baseplate with four parallel horizontal grooves drawn in technical-illustration style.

Style: aged cream paper, fine pen-and-ink linework, selective subtle wash colour — brass-gold on the metalwork, faint walnut-brown around the edges, emerald-green tint in the centre chambers, ruby accents on the pivots. Like a vintage Brockhaus encyclopedia plate or an antique scientific drawing.

3:2 aspect ratio. Composition: apparatus fills 75 percent of the frame, centred horizontally, paper visible at top and bottom.

Critical: NO TEXT of any kind. No letters, no numerals, no labels, no inscriptions, no figure references, no captions, no engraved markings. Smooth unmarked metal surfaces only. No human figures, no hands.`,

  'instrument-c': `Editorial top-down cinematic macro photograph of a fictional luxury verification apparatus, rendered as if it were a vintage Swiss-engineered scientific instrument. Long rectangular horizontal apparatus on dark walnut, photographed straight down so the entire face is visible.

Five clear bands stacked top to bottom on the face of the instrument:
1. Top: a row of four small brass receptacles
2. Just below: a thin channel with three glass lenses
3. Centre band (the most prominent): nine small windowed cells in a single horizontal row, each cell holding a tiny mechanism, each separated by a brass divider
4. A row of four small inset slots
5. Bottom: a deeper engraved chronograph register with four parallel grooves

Brass and walnut, emerald-glass detail accents, ruby pivots. Editorial product photography, ISO 100, 80mm macro, f/8, soft fill from upper left. 3:2 aspect ratio. Hyper-realistic.

NO text anywhere. No labels. No numbers. No logos. No human figures.`,
};

const prompt = PROMPTS[SLOT];
if (!prompt) {
  console.error(`Unknown slot "${SLOT}". Choose: ${Object.keys(PROMPTS).join(', ')}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────
// API call — single shot, no retries.
// ─────────────────────────────────────────────────────────────────────────
const MODEL = 'fal-ai/flux-pro/v1.1-ultra';
const url = `https://fal.run/${MODEL}`;

console.log(`[generate-architecture] slot=${SLOT}`);
console.log(`[generate-architecture] model=${MODEL}`);
console.log(`[generate-architecture] prompt length=${prompt.length} chars`);
console.log(`[generate-architecture] estimated cost: $0.06`);
console.log(`[generate-architecture] calling fal.ai…`);

const startedAt = Date.now();

const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Key ${FAL_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt,
    aspect_ratio: '3:2',
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
  console.error(`[generate-architecture] HTTP ${response.status} after ${elapsed}s`);
  console.error(errBody.slice(0, 800));
  process.exit(2);
}

const result = await response.json();

if (!result?.images?.[0]?.url) {
  console.error(`[generate-architecture] unexpected response shape after ${elapsed}s:`);
  console.error(JSON.stringify(result, null, 2).slice(0, 800));
  process.exit(3);
}

const imageUrl = result.images[0].url;
const seed = result.seed;
console.log(`[generate-architecture] generated in ${elapsed}s, seed=${seed}`);
console.log(`[generate-architecture] downloading → ${imageUrl.slice(0, 80)}…`);

const imageResponse = await fetch(imageUrl);
if (!imageResponse.ok) {
  console.error(`[generate-architecture] download failed: HTTP ${imageResponse.status}`);
  process.exit(4);
}

const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
const outPath = path.join(PUBLIC_DIR, `${SLOT}.jpg`);
fs.writeFileSync(outPath, imageBuffer);

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

console.log(`[generate-architecture] wrote ${outPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
console.log(`[generate-architecture] metadata → ${metaPath}`);
