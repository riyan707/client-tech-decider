export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import EditProductForm from "./EditProductForm";

function parseJsonField(value: FormDataEntryValue | null, fallback: any) {
  if (value === null) return fallback;

  const s0 = String(value || "").trim();
  if (!s0) return fallback;

  try {
    return JSON.parse(s0);
  } catch {}

  const s1 = s0.replace(/^\uFEFF/, "").replace(/'/g, '"');
  try {
    return JSON.parse(s1);
  } catch {
    throw new Error("must be valid JSON");
  }
}

async function updateProductAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const category = String(formData.get("category"));
  const brand = String(formData.get("brand")).trim();
  const model = String(formData.get("model")).trim();

  const price_hint = String(formData.get("price_hint") || "").trim() || null;
  const image_url = String(formData.get("image_url") || "").trim() || null;
  const warranty_text = String(formData.get("warranty_text") || "").trim() || null;
  const is_active = String(formData.get("is_active")) === "on";

  let affiliate_links: any;
  let specs: any;

  try {
    affiliate_links = parseJsonField(formData.get("affiliate_links"), {});
  } catch {
    throw new Error("affiliate_links must be valid JSON");
  }

  try {
    specs = parseJsonField(formData.get("specs"), {});
  } catch {
    throw new Error("specs must be valid JSON");
  }

  await db
    .update(products)
    .set({
      category,
      brand,
      model,
      price_hint,
      image_url,
      warranty_text,
      affiliate_links,
      specs,
      is_active,
    })
    .where(eq(products.id, id));

  redirect("/admin/products");
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  const product = rows[0];

  if (!product) throw new Error("Product not found");

  return <EditProductForm product={product as any} action={updateProductAction} />;
}
