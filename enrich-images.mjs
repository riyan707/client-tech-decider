import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';

const DB = process.env.DATABASE_URL;
const sql = neon(DB);

const SLUG_MAP = {
  'eebb9309-e641-4993-961c-e741da5e4d9e': 'apple_iphone_16-13317.php',
  '68805461-3d58-4d0a-b252-fb79b25ffbbd': 'apple_iphone_16_plus-13316.php',
  'e9af37f9-c9b3-4892-9b07-a1bcdbb02e16': 'apple_iphone_16_pro-13315.php',
  '92ae492e-769a-445d-a6e4-f7e54837605b': 'apple_iphone_16_pro_max-13123.php',
  '70ecf203-acaf-46fd-9590-731c6f61440b': 'apple_iphone_16e-13395.php',
  '713a4983-46d2-4057-9ebd-009689bbf43f': 'apple_iphone_17_pro-14049.php',
  '15f3b63a-9967-44e3-b424-b77b955b90c7': 'apple_iphone_17_pro_max-13964.php',
  '05885901-69d3-4aa3-bf6a-a076fc8b4d4d': 'apple_iphone_17_air-13502.php',
  'cb7f30ed-bd90-43b6-a07e-ac69393f2909': 'google_pixel_10_pro-13987.php',
  '942d02e4-ce3d-4729-a2de-bff920e91206': 'google_pixel_10_pro_xl_5g-13988.php',
  'a1d257a4-0a46-4f57-960a-6310848baa6d': 'google_pixel_10-13979.php',
  'f2f358e7-05e9-4a18-9c51-d7b7532a849c': 'google_pixel_8a-12937.php',
  '39065826-d614-468e-8927-e44e48f61fd3': 'google_pixel_9-13219.php',
  '394d74ce-e888-49f5-b663-883cb43f81b1': 'google_pixel_9_pro-13218.php',
  'afff6bf6-3eb9-4f9b-ac3f-d1f663ad23cc': 'google_pixel_9_pro_fold-13220.php',
  '62140e64-b631-41c3-8cce-34dbde7edcad': 'google_pixel_9_pro_xl-13217.php',
  '84a57abf-661c-468b-b972-13952b719748': 'samsung_galaxy_z_flip6-13192.php',
  'e054b3fd-f2b2-4772-9ef9-2fb541011a16': 'samsung_galaxy_a56-13603.php',
  'aed8586e-6e43-4226-a622-30d4090d5d96': 'samsung_galaxy_a36-13497.php',
  'a39cc1be-f73c-4358-84c0-b1fdca573946': 'samsung_galaxy_z_fold6-13147.php',
  '47abb755-d979-4e81-b625-9487a7a3543a': 'samsung_galaxy_s25-13610.php',
  '1100f4c2-34fb-4306-ad4b-77e54d2ca462': 'samsung_galaxy_s25_ultra-13322.php',
  '7603a700-652c-4671-a4ba-604a1ffe752a': 'samsung_galaxy_s25_plus-13323.php',
  '3b002098-3744-411b-bb23-80d47c13860d': 'samsung_galaxy_s25_edge-13506.php',
  '0759ca57-e7d4-4dea-836f-de97c5040a1f': 'samsung_galaxy_s25_fe_5g-14042.php',
  '2e7835db-86ee-48df-a1b3-dcb084c59a67': 'samsung_galaxy_s24-12773.php',
  '10f3c912-fffd-474e-b270-d2811f64bce1': 'samsung_galaxy_a35_5g-12903.php',
  '8f1bd155-2b80-475c-901b-81c1f7c6b73b': 'honor_400_pro_5g-13798.php',
  'e587ff3a-5424-422e-854d-02db0ed8a269': 'honor_400_smart-13922.php',
  '162015e5-b651-43fa-b729-bbe84879b1c3': 'honor_x5c_plus-13745.php',
  '1483fa6e-ebab-46f8-bc92-9e4223fc99d7': 'honor_magic7_pro-13090.php',
  'b6e337fa-a0b5-4899-8b4e-751a72d1ab35': 'motorola_edge_60_pro-13815.php',
  '7a00e5a2-0c4f-4286-ad02-010633377765': 'motorola_edge_50_fusion-13094.php',
  '20b4564e-1535-4353-ad42-df17edb9760f': 'motorola_razr_plus_2025-13816.php',
  'f58bb161-74dd-46b5-8b15-71962ca8b39f': 'motorola_edge_50_pro-12961.php',
  'baf3303c-1930-40a5-990f-8002f57adb78': 'motorola_edge_50_ultra-13002.php',
  '0f94309d-5a91-4503-8809-840125fcb91f': 'oneplus_13-13101.php',
  'c3ce1d66-0d21-4d32-9e30-580061364110': 'oneplus_13r-13291.php',
  '782c5cc3-4675-488c-bb8d-1a1219c98b8e': 'oneplus_nord_5-13903.php',
  '91321850-772f-4d2f-9af8-c14f52927c1d': 'oneplus_13t-13668.php',
  'e91211cc-2c68-426f-830e-9cedd52e834f': 'xiaomi_14t-13062.php',
  '08679323-51a3-4455-8d7a-3b5cefbbb52f': 'xiaomi_14_ultra-12681.php',
  '357a8372-1c04-4af5-ad14-e31794390b01': 'xiaomi_15_ultra-13312.php',
  'ca9405ae-d74f-4fb2-8c62-fc50d54cf691': 'xiaomi_redmi_note_14_pro_plus-13110.php',
  '3122d8be-eccc-470f-af08-43394b8be8ef': 'xiaomi_15-13100.php',
};

function scrapeGSMArena(slug) {
  try {
    const url = `https://www.gsmarena.com/${slug}`;
    const html = execSync(
      `curl -sL --max-time 10 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const match = html.match(/https:\/\/fdn2\.gsmarena\.com\/vv\/bigpic\/[^"]+\.jpg/);
    return match ? match[0] : null;
  } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const products = await sql`SELECT id, brand, model FROM products WHERE image_url IS NULL LIMIT 10`;
console.log(`Processing ${products.length} products...\n`);

let found = 0, skipped = 0, failed = 0;

for (const p of products) {
  const slug = SLUG_MAP[p.id];
  if (!slug) {
    console.log(`SKIP [${p.brand} ${p.model}] — no slug`);
    skipped++;
    continue;
  }
  const imgUrl = scrapeGSMArena(slug);
  if (imgUrl) {
    await sql`UPDATE products SET image_url = ${imgUrl} WHERE id = ${p.id}`;
    console.log(`OK ${p.brand} ${p.model} => ${imgUrl}`);
    found++;
  } else {
    console.log(`FAIL ${p.brand} ${p.model}`);
    failed++;
  }
  await sleep(1200);
}

console.log(`\nDONE: updated=${found} skipped=${skipped} failed=${failed}`);
