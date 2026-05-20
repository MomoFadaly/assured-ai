// Pass 3: target replacements for Healthcare, Finance, Higher Ed.
// Strict requirement: LANDSCAPE orientation (width > height), no
// recognizable faces/brands, premium editorial composition.
const QUERIES = [
  // Healthcare — premium modern medical, NOT 1970s hallway
  'modern hospital exterior architecture',
  'medical research laboratory clean',
  'modern healthcare facility building',
  'stethoscope dark moody',
  // Finance — institutional, NO crypto, NO retail trading screens
  'wall street nyse exterior',
  'federal reserve building',
  'financial district aerial dusk',
  'new york stock exchange columns',
  // Higher Ed — landscape orientation, university campus or grand library
  'harvard yale princeton campus',
  'oxford cambridge architecture',
  'university clock tower campus',
  'college quad autumn aerial',
];

const isLandscape = (p) => (p.width > p.height) && (p.width / p.height >= 1.4);

for (const q of QUERIES) {
  console.log(`\n→ "${q}"`);
  try {
    const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=10`;
    const res = await fetch(url, { headers: { 'accept': 'application/json' } });
    const json = await res.json();
    const all = (json.results || []);
    const landscape = all.filter(isLandscape);
    landscape.slice(0, 5).forEach((p, i) => {
      console.log(`  [${i + 1}] ${p.id} (${p.likes} ♥) ${p.width}x${p.height} — ${(p.description || p.alt_description || '').slice(0, 80)}`);
      console.log(`      ${p.urls?.raw}`);
    });
    if (landscape.length === 0) console.log('  (no landscape results)');
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
