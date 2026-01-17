import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EditProductForm from "./EditProductForm";

function parseJsonField(value: FormDataEntryValue | null, fallback: any) {
  if (value === null) return fallback;

  // If JsonKeyValueEditor sends a JSON string, it arrives here as string
  const s0 = String(value || "").trim();
  if (!s0) return fallback;

  // 1) strict JSON
  try {
    return JSON.parse(s0);
  } catch {}

  // 2) python-dict-ish fallback (single quotes)
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

  // ✅ new
  const image_url = String(formData.get("image_url") || "").trim() || null;

  const warranty_text =
    String(formData.get("warranty_text") || "").trim() || null;

  // Checkbox in your form submits "on" when checked
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      category,
      brand,
      model,
      price_hint,
      image_url, // ✅ new
      warranty_text,
      affiliate_links,
      specs,
      is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  redirect("/admin/products");
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  if (!product) throw new Error("Product not found");

  return <EditProductForm product={product} action={updateProductAction} />;
}
