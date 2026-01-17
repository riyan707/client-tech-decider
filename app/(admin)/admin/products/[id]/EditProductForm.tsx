"use client";

import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { JsonKeyValueEditor } from "@/components/admin/JsonKeyValueEditor";

type Product = {
  id: string;
  category: "smartphones" | "tvs";
  brand: string;
  model: string;
  price_hint: string | null;
  image_url: string | null; // ✅ added
  warranty_text: string | null;
  affiliate_links: any;
  specs: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function EditProductForm({
  product,
  action,
}: {
  product: Product;
  action: (formData: FormData) => void;
}) {
  const createdAt = useMemo(
    () =>
      product.created_at ? new Date(product.created_at).toLocaleString() : "—",
    [product.created_at]
  );

  const updatedAt = useMemo(
    () =>
      product.updated_at ? new Date(product.updated_at).toLocaleString() : "—",
    [product.updated_at]
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit product
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Update details, image, links and specs. Everything here is editable
              — iterate safely.
            </p>
          </div>

          <Button variant="secondary" className="rounded-xl" asChild>
            <a href="/admin/products">Back</a>
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-3 py-1">
            <span className="font-medium text-foreground">Created:</span>{" "}
            {createdAt}
          </span>
          <span className="rounded-full border px-3 py-1">
            <span className="font-medium text-foreground">Updated:</span>{" "}
            {updatedAt}
          </span>
          <span className="rounded-full border px-3 py-1 font-mono">
            id: {product.id}
          </span>
        </div>
      </div>

      <form action={action} className="space-y-6">
        <input type="hidden" name="id" value={product.id} />

        {/* Core details */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Core details</CardTitle>
            <CardDescription>
              These fields control indexing, filtering, and public display.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Category</Label>

                {/* Hidden input so server action receives value */}
                <input
                  type="hidden"
                  name="category"
                  defaultValue={product.category}
                />

                <Select
                  defaultValue={product.category}
                  onValueChange={(v) => {
                    const el =
                      document.querySelector<HTMLInputElement>(
                        'input[name="category"]'
                      );
                    if (el) el.value = v;
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smartphones">Smartphones</SelectItem>
                    <SelectItem value="tvs">TVs</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Must be smartphones or tvs.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  name="brand"
                  required
                  defaultValue={product.brand}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  name="model"
                  required
                  defaultValue={product.model}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price_hint">Price hint</Label>
                <Input
                  id="price_hint"
                  name="price_hint"
                  defaultValue={product.price_hint ?? ""}
                  className="rounded-xl"
                  placeholder="e.g. From £799"
                />
                <p className="text-xs text-muted-foreground">
                  Display-only. Use “From Amazon UK”, “From £899”, etc.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disable to hide from public pages.
                  </p>
                </div>

                <label className="flex items-center gap-2">
                  <Checkbox name="is_active" defaultChecked={!!product.is_active} />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>
            </div>

            {/* ✅ Image URL + preview */}
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                name="image_url"
                defaultValue={product.image_url ?? ""}
                className="rounded-xl"
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Paste a direct image URL (CDN / Supabase public URL / your site).
                Recommended: square or 4:3, 1000px+ wide.
              </p>

              {product.image_url ? (
                <div className="mt-3 overflow-hidden rounded-xl border bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image_url}
                    alt={`${product.brand} ${product.model}`}
                    className="h-48 w-full object-contain p-4"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No image set yet — add a URL to show a preview here.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_text">Warranty text</Label>
              <Textarea
                id="warranty_text"
                name="warranty_text"
                rows={3}
                defaultValue={product.warranty_text ?? ""}
                className="rounded-xl"
                placeholder="Optional"
              />
            </div>
          </CardContent>
        </Card>

        {/* Links & specs */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Links & specs</CardTitle>
            <CardDescription>
              No JSON editing. Add fields like a normal admin panel.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <JsonKeyValueEditor
              label="Affiliate links"
              help="Add retailer links (amazon, currys, official, etc)."
              name="affiliate_links"
              initialObject={product.affiliate_links}
              placeholderKey="e.g. amazon"
              placeholderValue="e.g. https://amzn.to/xxxx"
            />

            <JsonKeyValueEditor
              label="Specs"
              help="Add specs (screen_size, panel, refresh_rate_hz, storage, battery_mah, etc)."
              name="specs"
              initialObject={product.specs}
              placeholderKey="e.g. refresh_rate_hz"
              placeholderValue="e.g. 120"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" className="rounded-xl" asChild>
            <a href="/admin/products">Cancel</a>
          </Button>

          <Button type="submit" className="rounded-xl">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
