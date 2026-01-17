"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ValueType = "text" | "number" | "boolean" | "url";

type KVRow = {
  id: string;
  key: string;
  type: ValueType;
  value: string; // stored as string in UI, serialized by type on submit
};

function uid() {
  return Math.random().toString(16).slice(2);
}

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function toRows(initialObject: any): KVRow[] {
  const obj = isPlainObject(initialObject) ? initialObject : {};

  const entries = Object.entries(obj);
  if (!entries.length) return [{ id: uid(), key: "", type: "text", value: "" }];

  return entries.map(([k, v]) => {
    // infer type from existing value
    let type: ValueType = "text";
    if (typeof v === "number") type = "number";
    else if (typeof v === "boolean") type = "boolean";
    else if (typeof v === "string" && /^https?:\/\//i.test(v)) type = "url";

    return {
      id: uid(),
      key: String(k),
      type,
      value: v === null || v === undefined ? "" : String(v),
    };
  });
}

function serializeValue(type: ValueType, value: string) {
  const v = value.trim();

  if (type === "number") {
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  if (type === "boolean") {
    // accept common truthy/falsey
    const lower = v.toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(lower)) return true;
    if (["false", "0", "no", "n", "off"].includes(lower)) return false;
    // default: empty -> null, else falsey safe
    if (lower === "") return null;
    return false;
  }

  if (type === "url") {
    if (v === "") return "";
    // minimal validation; keep string if it looks like a URL
    if (/^https?:\/\//i.test(v)) return v;
    // if user pastes without protocol, auto-fix
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
    return v;
  }

  // text
  return v;
}

export function JsonKeyValueEditor({
  label,
  help,
  name,
  initialObject,
  placeholderKey = "e.g. screen_size",
  placeholderValue = "e.g. 55",
}: {
  label: string;
  help?: string;
  name: string; // hidden form field name e.g. "specs" or "affiliate_links"
  initialObject: any;
  placeholderKey?: string;
  placeholderValue?: string;
}) {
  const initialRows = useMemo(() => toRows(initialObject), [initialObject]);
  const [rows, setRows] = useState<KVRow[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const jsonString = useMemo(() => {
    const out: Record<string, any> = {};

    for (const r of rows) {
      const k = r.key.trim();
      if (!k) continue;

      const val = serializeValue(r.type, r.value);
      // if number/boolean empty -> null, we can choose to omit instead:
      if (val === null) continue;

      out[k] = val;
    }

    return JSON.stringify(out);
  }, [rows]);

  function updateRow(id: string, patch: Partial<KVRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { id: uid(), key: "", type: "text", value: "" }]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [{ id: uid(), key: "", type: "text", value: "" }];
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">{label}</Label>
        {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
      </div>

      {/* Hidden input: server action reads this as JSON string */}
      <input type="hidden" name={name} value={jsonString} />

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            {/* Key */}
            <div className="sm:col-span-4">
              <Input
                className="rounded-xl"
                placeholder={placeholderKey}
                value={r.key}
                onChange={(e) => updateRow(r.id, { key: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="sm:col-span-3">
              <select
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                value={r.type}
                onChange={(e) => updateRow(r.id, { type: e.target.value as ValueType })}
              >
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="url">url</option>
              </select>
            </div>

            {/* Value */}
            <div className="sm:col-span-4">
              <Input
                className="rounded-xl"
                placeholder={placeholderValue}
                value={r.value}
                onChange={(e) => updateRow(r.id, { value: e.target.value })}
              />
            </div>

            {/* Remove */}
            <div className="sm:col-span-1 flex items-center">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => removeRow(r.id)}
                aria-label="Remove row"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" className="rounded-xl" onClick={addRow}>
          Add field
        </Button>
      </div>
    </div>
  );
}
