// Downloads each finalist image and saves to /tmp/v-picks for visual review.
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('/tmp/v-picks', { recursive: true });
const PICKS = [
  { label: '01-healthcare', id: 'photo-1584451049700-ec9b394f3805', why: 'Modern hospital hallway, 66 ♥' },
  { label: '02-government', id: 'photo-1597201749396-99a6b0537704', why: 'US Capitol lit at night, 62 ♥' },
  { label: '03-pharma',     id: 'photo-1576671081837-49000212a370', why: 'Chemo drug vials + IV bottle, 545 ♥' },
  { label: '04-insurance',  id: 'photo-1453230806017-56d81464b6c5', why: 'Skyscraper lit windows, 2927 ♥' },
  { label: '05-finance',    id: 'photo-1621264448270-9ef00e88a935', why: 'Multi-screen trading station, 231 ♥' },
  { label: '06-legal',      id: 'photo-1453945619913-79ec89a82c51', why: 'Supreme Court columns, 644 ♥' },
  { label: '07-realestate', id: 'photo-1524813686514-a57563d77965', why: 'Aerial neighborhood at dusk, 747 ♥' },
  { label: '08-higheredu',  id: 'photo-1569878766010-17bff0a1987d', why: 'V&A library reading room, 530 ♥' },
];
for (const p of PICKS) {
  const url = `https://images.unsplash.com/${p.id}?w=1600&q=85&auto=format&fit=crop`;
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(`/tmp/v-picks/${p.label}.jpg`, buf);
  console.log(`✓ ${p.label} ${(buf.length / 1024).toFixed(0)} KB — ${p.why}`);
}
