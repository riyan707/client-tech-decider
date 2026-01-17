import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const useCase = searchParams.get("useCase");

  if (!category || !useCase) {
    return NextResponse.json(
      { error: "Missing category/useCase" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("get_featured_products", {
    p_category: category,
    p_use_case_key: useCase,
    p_limit: 6,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
