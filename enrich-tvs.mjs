import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';

const DB = 'postgresql://neondb_owner:npg_a1q2mnArLtHv@ep-late-sea-ab5fj0s7-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);

// Map product DB id → RTINGS review slug
const RTINGS_MAP = {
  // Samsung TVs
  '1100f4c2-34fb-4306-ad4b-77e54d2ca462': null, // Galaxy S25 Ultra — phone, skip
  // Samsung TVs (actual)
  'f2f358e7-05e9-4a18-9c51-d7b7532a849c': null, // skip — phone
  // Let's map by model name instead — fetch all TV products missing images
};

// RTINGS slugs by brand/model keyword
const TV_SLUG_MAP = {
  // Samsung
  'S95F': 'samsung/s95f-oled',
  'S95H': 'samsung/s95h-oled',
  'S90F': 'samsung/s90f-oled',
  'S90H': 'samsung/s90h-oled',
  'S85F': 'samsung/s85f-oled',
  'S85H': 'samsung/s85h-oled',
  'QN90D': 'samsung/qn90d-neo-qled',
  'The Frame': 'samsung/the-frame',
  'Crystal UHD': 'samsung/du7200-crystal-uhd',
  'Micro RGB': 'samsung/the-wall',
  // LG
  'OLED C5': 'lg/c5-oled',
  'OLED C6': 'lg/c6-oled',
  'OLED B5': 'lg/b5-oled',
  'OLED B6': 'lg/b6-oled',
  'OLED W6': 'lg/g6-oled',
  'QNED': 'lg/qned80-qned',
  'NanoCell': 'lg/nano80-nanocell',
  'UA7500': 'lg/ur8050-led',
  'Micro RGB Evo': 'lg/a1-oled',
  // Sony
  'Bravia 3': 'sony/bravia-3',
  'Bravia 7': 'sony/bravia-7',
  'Bravia 8 II': 'sony/bravia-8-ii',
  'Bravia 8': 'sony/bravia-8',
  'Bravia 9 II': 'sony/bravia-9-ii',
  'Bravia 9': 'sony/bravia-9',
  // Hisense
  'A85Q': 'hisense/a85q-oled',
  'A6Q': 'hisense/a6q',
  'U7Q PRO': 'hisense/u7n',
  'U8Q': 'hisense/u8q',
  'E7Q': 'hisense/e7q',
  '116UXS': 'hisense/u8n',
  '163MX': 'hisense/u8n',
  'UR9': 'hisense/u8q',
  // TCL
  'C6K': 'tcl/c6k',
  'C7K': 'tcl/c7k',
  'QM8L': 'tcl/qm8',
  'X11L': 'tcl/x11h',
  'RM9L': 'tcl/c935',
  'T6C': 'tcl/s5400af',
  'PF650K': 'tcl/s4-s4-s-class',
  // Philips
  'OLED809': 'philips/oled809-4k-oled',
  'OLED908': 'philips/oled908-4k-oled',
  'OLED910': 'philips/oled910-4k-oled',
  'OLED811': 'philips/oled811-4k-oled',
  'OLED911': 'philips/oled911-4k-oled',
  // Panasonic
  'Z95B': 'panasonic/z95b-oled',
  'Z90B': 'panasonic/z90b-oled',
  'Z80': 'panasonic/z80b-oled',
  'W95B': 'panasonic/w95b',
};

function findSlug(model) {
  for (const [key, slug] of Object.entries(TV_SLUG_MAP)) {
    if (model.includes(key)) return slug;
  }
  return null;
}

function scrapeRTINGS(slug) {
  try {
    const url = `https://www.rtings.com/tv/reviews/${slug}`;
    const html = execSync(
      `curl -sL --max-time 12 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    // Try design-medium first (clean product shot), then in-test-medium
    const designMatch = html.match(/i\.rtings\.com\/assets\/products\/[^"]*design-medium[^""]*/);
    const testMatch = html.match(/i\.rtings\.com\/assets\/products\/[^"]*in-test-medium[^""]*/);
    const match = designMatch || testMatch;
    return match ? `https://${match[0].replace(/\?.*$/, '')}` : null;
  } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const missing = await sql`SELECT id, brand, model FROM products WHERE image_url IS NULL ORDER BY brand, model`;
console.log(`${missing.length} products need images\n`);

let found = 0, skipped = 0, failed = 0;

for (const p of missing) {
  const slug = findSlug(p.model);
  if (!slug) {
    console.log(`SKIP [${p.brand} ${p.model}] — no RTINGS slug`);
    skipped++;
    continue;
  }
  console.log(`Fetching ${p.brand} ${p.model} (${slug})...`);
  const imgUrl = scrapeRTINGS(slug);
  if (imgUrl) {
    await sql`UPDATE products SET image_url = ${imgUrl} WHERE id = ${p.id}`;
    console.log(`  ✅ ${imgUrl}`);
    found++;
  } else {
    console.log(`  ❌ No image found`);
    failed++;
  }
  await sleep(1200);
}

const total = await sql`SELECT COUNT(*) as t, COUNT(image_url) as w FROM products`;
console.log(`\nDONE: found=${found} skipped=${skipped} failed=${failed}`);
console.log(`DB: ${total[0].w}/${total[0].t} products have images`);
