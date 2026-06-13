import { neon } from '@neondatabase/serverless';
(async () => {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT id, brand, model, image_url FROM products ORDER BY brand, model`;
  console.log(JSON.stringify(rows, null, 2));
})();
