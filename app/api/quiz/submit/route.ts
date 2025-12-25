import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/utils/supabase/server";
import type { QuizCategory, Product } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const category = body.category as QuizCategory;
    const answers = body.answers as Record<string, string>;

    if (category !== "smartphones" && category !== "tvs") {
      return new NextResponse("Invalid category", { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return new NextResponse("Invalid answers", { status: 400 });
    }

    // Deterministic MVP ranking for now: first 3 active products in the category.
    // (Step 5 replaces this with your real scoring engine.)
    const { data: products, error: prodErr } = await supabaseServer
      .from("products")
      .select("id, brand, model, price_hint, affiliate_links, warranty_text, specs, category")
      .eq("category", category)
      .eq("is_active", true)
      .order("brand", { ascending: true })
      .order("model", { ascending: true })
      .limit(3);

    if (prodErr) throw new Error(prodErr.message);

    const top3 = (products ?? []).map((p: any) => ({
      product_id: p.id,
      brand: p.brand,
      model: p.model,
      price_hint: p.price_hint,
      affiliate_links: p.affiliate_links,
      warranty_text: p.warranty_text,
      specs: p.specs,
      // placeholder until scoring exists
      score: null,
      percent: null,
      reasons: ["Placeholder ranking (Step 5 adds scoring)."],
    }));

    const { data: submission, error: subErr } = await supabaseServer
      .from("quiz_submissions")
      .insert({
        category,
        answers,
        top_3: top3,
        score_percent: null,
        utm: null,
        email: null,
        first_name: null,
      })
      .select("id")
      .single();

    if (subErr) throw new Error(subErr.message);

    return NextResponse.json({ submissionId: submission.id });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
