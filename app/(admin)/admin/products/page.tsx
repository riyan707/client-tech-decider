import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ImportCsvPanel } from "./import-csv-panel";

type SearchParams = {
  q?: string;
  category?: "smartphones" | "tvs" | "all";
  active?: "true" | "false" | "all";
};

async function toggleActiveAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const next = String(formData.get("next")) === "true";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ is_active: next }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const category = sp.category ?? "all";
  const active = sp.active ?? "all";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("products")
    .select("id, category, brand, model, is_active, updated_at")
    .order("updated_at", { ascending: false });

  if (category !== "all") query = query.eq("category", category);
  if (active !== "all") query = query.eq("is_active", active === "true");
  if (q) query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%`);

  const { data: products, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Admin</div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage catalogue items. Import in bulk or edit individually.
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      </div>

      {/* Import */}
      <div className="mt-6">
        <ImportCsvPanel />
      </div>

      {/* Filters */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-4">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search brand or model…"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />

            <select
              name="category"
              defaultValue={category}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All categories</option>
              <option value="smartphones">Smartphones</option>
              <option value="tvs">TVs</option>
            </select>

            <select
              name="active"
              defaultValue={active}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <Button type="submit" className="h-10 rounded-xl">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Results</CardTitle>
            <div className="text-sm text-muted-foreground">{products?.length ?? 0} items</div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(products ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.brand}</TableCell>
                    <TableCell>{p.model}</TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="rounded-full">
                        {p.category}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {p.is_active ? (
                        <Badge className="rounded-full">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline" className="rounded-xl">
                          <Link href={`/admin/products/${p.id}`}>Edit</Link>
                        </Button>

                        <form action={toggleActiveAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="next" value={(!p.is_active).toString()} />
                          <Button size="sm" variant="secondary" className="rounded-xl" type="submit">
                            {p.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {(products?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
