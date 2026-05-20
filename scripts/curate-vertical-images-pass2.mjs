// Second-pass refined searches for specific verticals where pass-1
// candidates were weak.
const QUERIES = [
  // Insurance — need premium institutional, not generic corporate
  'manhattan skyline night aerial',
  'london financial district city',
  'lloyds of london building',
  'modern skyscraper night lit windows',
  // Pharma — try alternative iconic angles
  'pharmaceutical manufacturing factory',
  'pill bottle macro photography',
  // Healthcare — more dramatic options
  'modern hospital architecture night',
  'mri scanner machine room',
  // Higher Ed — more distinctive options
  'oxford library architecture interior',
  'university campus aerial autumn',
];
for (const q of QUERIES) {
  console.log(`\n→ "${q}"`);
  try {
    const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=5`;
    const res = await fetch(url, { headers: { 'accept': 'application/json' } });
    const json = await res.json();
    (json.results || []).slice(0, 5).forEach((p, i) => {
      console.log(`  [${i + 1}] ${p.id} (${p.likes} ♥) — ${(p.description || p.alt_description || '').slice(0, 80)}`);
      console.log(`      ${p.urls?.raw}`);
    });
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
