"use client";

import { useState } from "react";
import Papa from "papaparse";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = Record<string, string>;

export function ImportCsvPanel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function onPickFile(file: File | null) {
    setResult(null);
    setErrorMsg(null);

    if (!file) {
      setFileName(null);
      setRows([]);
      return;
    }

    setFileName(file.name);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = (res.data ?? []).filter((r) => Object.keys(r).length > 0);
        setRows(data);
      },
      error: (err) => setErrorMsg(err.message),
    });
  }

  function downloadTemplate() {
    const csv =
      "category,brand,model,price_hint,image_url,is_active,affiliate_links,warranty_text,specs\n" +
      'tvs,LG,C3,"From £999",https://example.com/c3.jpg,true,"{""amazon"":""https://amzn.to/xxxx""}","2 year warranty","{""screen_size"":""55"",""panel"":""OLED"",""refresh_rate_hz"":120}"\n' +
      'smartphones,Apple,iPhone 15 Pro,"From £899",,true,"{}","","{""storage"":""256GB"",""color"":""black""}"\n';

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tech-decider-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importNow() {
    if (!rows.length) {
      setErrorMsg("No rows to import.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 45000); // 45s hard stop

    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
        signal: controller.signal,
      });

      clearTimeout(t);

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoading(false);
            
        const debug =
          (json?.error ? `${json.error}\n` : "Import failed.\n") +
          (json?.firstRowKeys ? `firstRowKeys: ${JSON.stringify(json.firstRowKeys)}\n` : "") +
          (json?.errors?.length ? `errors(sample): ${JSON.stringify(json.errors.slice(0, 5), null, 2)}` : "");
            
        setErrorMsg(debug || "Import failed.");
        return;
      }


      setLoading(false);
      setResult(json);
    } catch (e: any) {
      clearTimeout(t);
      setLoading(false);
      setErrorMsg(e?.name === "AbortError" ? "Import timed out (45s)." : (e?.message || "Import failed."));
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base">Bulk import</CardTitle>
        <p className="text-sm text-muted-foreground">
          Download the template, upload your file, preview, then import.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Upload a CSV</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Your first row must be column names (headers).
              </p>
            </div>

            <Button type="button" variant="secondary" className="rounded-xl" onClick={downloadTemplate}>
              Download template
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40">
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>

            <div className="text-sm text-muted-foreground">
              {fileName ? (
                <>
                  Selected: <span className="text-foreground font-medium">{fileName}</span>
                  <span className="ml-2 text-xs">({rows.length ? `${rows.length} rows parsed` : "parsing..."})</span>
                </>
              ) : (
                "No file selected"
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Required:</span> category, brand, model
            </div>
            <div className="mt-1 text-xs">
              <span className="font-medium text-foreground">category must be:</span> smartphones or tvs
            </div>
            <div className="mt-2 text-xs">
              <span className="font-medium text-foreground">Optional:</span> price_hint, image_url, is_active,
              affiliate_links (JSON), warranty_text, specs (JSON)
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Preview</div>
              <Button onClick={importNow} disabled={loading} className="rounded-xl">
                {loading ? "Importing…" : "Import CSV"}
              </Button>
            </div>

            <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
              {JSON.stringify(rows.slice(0, 3), null, 2)}
            </pre>

            <div className="mt-2 text-xs text-muted-foreground">Showing first 3 rows only.</div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">Import complete</div>
            <div className="mt-2 text-muted-foreground">
              Upserted: <span className="text-foreground">{result.upserted}</span>{" "}
              • Errors: <span className="text-foreground">{result.errors?.length ?? 0}</span>{" "}
              • Time: <span className="text-foreground">{result.ms}ms</span>
            </div>

            {result.errors?.length > 0 && (
              <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
                {JSON.stringify(result.errors.slice(0, 30), null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
