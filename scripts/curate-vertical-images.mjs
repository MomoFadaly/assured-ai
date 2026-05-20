// Queries Unsplash's internal search API for each of the 8 verticals
// with carefully chosen keywords designed to surface premium, editorial,
// vertical-specific imagery (NOT cliché stock). Prints the top 5
// candidates per vertical so we can pick the strongest.
//
// Selection criteria (applied manually after this script runs):
//   1. Clearly representative of the vertical (no ambiguity)
//   2. No recognizable faces (per existing rule in SourcesOfTruth.tsx)
//   3. Editorial quality: dramatic lighting, strong composition
//   4. Holds up under the dark overlay + headline typography
//   5. NOT a tired stock cliché (no scales-of-justice, no toy houses)

const VERTICALS = [
  // Healthcare — want a clinical / institutional environment, NOT a
  // patient or generic hospital bed. Modern OR, MRI room, or premium
  // clean hospital architecture.
  { slug: 'healthcare', queries: ['modern hospital corridor architecture', 'operating room overhead', 'clean hospital interior'] },
  // Government — currently a savanna sunset (?!). Want federal
  // architecture iconography: Capitol, federal building columns, dome.
  { slug: 'government', queries: ['us capitol building dome night', 'federal courthouse columns', 'lincoln memorial architecture'] },
  // Pharma — currently clothes on a rack (?!). Want lab / production
  // line / vials / gloved-hand microscope.
  { slug: 'pharma', queries: ['pharmaceutical laboratory vials', 'pharma production line pills', 'scientist gloved hand pipette'] },
  // Insurance — generic skyscraper. Want institutional gravitas:
  // historic financial district architecture or premium corporate.
  { slug: 'insurance', queries: ['lloyd of london building', 'wall street financial district architecture', 'corporate headquarters lobby marble'] },
  // Finance — candlestick chart, retail-trader feel. Want institutional:
  // Bloomberg terminals, trading floor, bank vault.
  { slug: 'finance', queries: ['bloomberg terminal trading desk', 'nyse trading floor', 'bank vault door'] },
  // Legal — Lady Justice cliché. Want premium law library or federal
  // courthouse interior.
  { slug: 'legal', queries: ['law library leather books', 'federal courthouse interior columns', 'supreme court building exterior'] },
  // Real Estate — toy house. Want premium architectural or aerial
  // urban density.
  { slug: 'real-estate', queries: ['aerial suburban neighborhood drone', 'modern luxury home architecture exterior', 'urban skyline residential'] },
  // Higher Ed — broken. Want premium classical university architecture.
  { slug: 'higher-ed', queries: ['ivy league library reading room', 'university gothic architecture campus', 'lecture hall amphitheater'] },
];

const fetchUnsplash = async (q) => {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=8`;
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  const json = await res.json();
  return (json.results || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    description: p.description || p.alt_description || '',
    width: p.width,
    height: p.height,
    likes: p.likes,
    // The CDN URL — strip the query string so we can append our own params
    raw: p.urls?.raw,
    // The pre-sized variant Unsplash defaults to
    regular: p.urls?.regular,
  }));
};

for (const v of VERTICALS) {
  console.log(`\n${'='.repeat(60)}\n${v.slug.toUpperCase()}\n${'='.repeat(60)}`);
  for (const q of v.queries) {
    console.log(`\n→ query: "${q}"`);
    try {
      const results = await fetchUnsplash(q);
      results.slice(0, 5).forEach((p, i) => {
        console.log(`  [${i + 1}] ${p.id} (${p.likes} ♥) — ${p.description?.slice(0, 80) || '(no desc)'}`);
        console.log(`      ${p.raw}`);
      });
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }
}
