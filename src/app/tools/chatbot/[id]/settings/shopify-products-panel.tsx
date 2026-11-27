"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginIfUnauthorized } from "@/lib/auth-redirect";
import { csvToProducts } from "@/lib/shopify-csv";
import {
  MAX_PRODUCTS_PAID,
  MAX_PRODUCTS_TRIAL,
  PRODUCT_BATCH_MAX,
  normalizeCurrency,
  normalizeStoreUrl,
} from "@/lib/shopify-core";

export type StoreInfo = {
  store_url: string;
  currency: string | null;
  source: "shopify" | "csv";
  product_count: number;
  total_found: number | null;
  capped: boolean;
  last_synced_at: string;
  last_error: string | null;
};

const MAX_CSV_BYTES = 40 * 1024 * 1024;

export default function ShopifyProductsPanel({
  botId,
  isPaid,
  store: initialStore,
}: {
  botId: string;
  isPaid: boolean;
  store: StoreInfo | null;
}) {
  const router = useRouter();
  const [store, setStore] = useState<StoreInfo | null>(initialStore);
  const [storeUrl, setStoreUrl] = useState(initialStore?.store_url ?? "");
  const [currency, setCurrency] = useState(initialStore?.currency ?? "");
  const [busy, setBusy] = useState<"import" | "csv" | "delete" | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const limit = isPaid ? MAX_PRODUCTS_PAID : MAX_PRODUCTS_TRIAL;

  function applyResult(data: {
    count: number;
    capped?: boolean;
    storeUrl: string;
    source: "shopify" | "csv";
    currency?: string | null;
    notes?: string[];
  }) {
    setStore({
      store_url: data.storeUrl,
      currency: data.currency ?? null,
      source: data.source,
      product_count: data.count,
      total_found: data.capped ? null : data.count,
      capped: !!data.capped,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });
    setStoreUrl(data.storeUrl);
    if (data.currency) setCurrency(data.currency);
    setNotes(Array.isArray(data.notes) ? data.notes : []);
    router.refresh();
  }

  async function importFromStore(useSavedStore: boolean) {
    setError("");
    setNotes([]);
    if (!useSavedStore && !normalizeStoreUrl(storeUrl)) {
      setError("Enter your store address, e.g. mystore.com");
      return;
    }
    setBusy("import");
    setProgress("Importing products… (can take up to a minute)");
    try {
      const res = await fetch(`/api/bots/${botId}/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useSavedStore ? { currency } : { storeUrl, currency }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
        setError(data.error ?? "Import failed");
        return;
      }
      applyResult(data);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function handleFile(file: File) {
    setError("");
    setNotes([]);
    const origin = normalizeStoreUrl(storeUrl);
    if (!origin) {
      setError("Enter your store address first (e.g. mystore.com). Product links are built from it.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setError("That file is too big (max 40 MB).");
      return;
    }
    setBusy("csv");
    setProgress("Reading file…");
    try {
      const text = await file.text();
      const cur = normalizeCurrency(currency);
      const parsed = csvToProducts(text, origin, cur);
      if (!parsed.ok) {
        setError(
          parsed.error === "not_shopify_csv"
            ? "This doesn't look like a Shopify product export (no Handle / Title columns)."
            : "That file is empty."
        );
        return;
      }
      const { products, skippedUnpublished, invalid } = parsed.result;
      if (products.length === 0) {
        setError("No active products found in that file.");
        return;
      }

      const syncId = crypto.randomUUID();
      let lastData: Record<string, unknown> | null = null;
      for (let i = 0; i < products.length; i += PRODUCT_BATCH_MAX) {
        const batch = products.slice(i, i + PRODUCT_BATCH_MAX);
        const isFinal = i + PRODUCT_BATCH_MAX >= products.length;
        setProgress(`Uploading ${Math.min(i + batch.length, products.length).toLocaleString()} / ${products.length.toLocaleString()}…`);
        const res = await fetch(`/api/bots/${botId}/products/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            syncId,
            storeUrl: origin,
            currency: cur,
            products: batch,
            final: isFinal,
            totalProducts: products.length,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (redirectToLoginIfUnauthorized(res.status, router)) return;
          setError(data.error ?? "Upload failed");
          return;
        }
        lastData = data;
      }

      if (lastData) {
        const extra: string[] = [];
        if (skippedUnpublished > 0) extra.push(`${skippedUnpublished} draft/archived product(s) in the file were skipped.`);
        if (invalid > 0) extra.push(`${invalid} product(s) were skipped (missing title or invalid handle).`);
        applyResult({
          count: lastData.count as number,
          capped: lastData.capped as boolean,
          storeUrl: origin,
          source: "csv",
          currency: cur,
          notes: [...((lastData.notes as string[]) ?? []), ...extra],
        });
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(null);
      setProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete all imported products from this bot? The bot itself is kept.")) return;
    setBusy("delete");
    setError("");
    setNotes([]);
    try {
      const res = await fetch(`/api/bots/${botId}/products`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        if (redirectToLoginIfUnauthorized(res.status, router)) return;
        setError(data.error ?? "Couldn't delete the products.");
        return;
      }
      setStore(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const busyAny = busy !== null;
  const canResync = store?.source === "shopify";

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h2 className="text-sm font-semibold text-slate">Shopify products</h2>
      <p className="mt-2 text-xs text-slate">
        Import your store&apos;s products so the bot can recommend them and link to them. Up to{" "}
        {limit.toLocaleString()} products{isPaid ? "" : ` (paid plans: ${MAX_PRODUCTS_PAID.toLocaleString()})`}.
      </p>

      {store ? (
        <div className="mt-3 rounded-lg bg-canvas p-3 text-sm text-ink">
          <p className="font-semibold">
            {store.product_count.toLocaleString()} product{store.product_count === 1 ? "" : "s"} from {store.store_url}
          </p>
          <p className="mt-1 text-xs text-slate">
            {store.source === "csv" ? "From a CSV upload" : "From the store's product feed"} · last synced{" "}
            {new Date(store.last_synced_at).toLocaleString()}
            {store.currency ? ` · prices in ${store.currency}` : ""}
          </p>
          {store.capped && (
            <p className="mt-1 text-xs text-amber-700">
              Your store has more products than your plan&apos;s limit ({limit.toLocaleString()}); only the first{" "}
              {limit.toLocaleString()} were imported.
            </p>
          )}
          {store.last_error && <p className="mt-1 text-xs text-red-600">Last sync failed: {store.last_error}</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate">No products imported yet.</p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate">Store address</label>
          <input
            type="text"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="mystore.com"
            disabled={busyAny}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate">Currency (optional)</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="USD"
            disabled={busyAny}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-slate">
        Use the address your customers see (e.g. shop.com, not shop.myshopify.com). Product links will be
        that address + /products/…. Currency is detected automatically; fill it only if prices show without one.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => importFromStore(false)}
          disabled={busyAny}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {busy === "import" ? "Importing…" : "Import from store"}
        </button>
        {canResync && (
          <button
            type="button"
            onClick={() => importFromStore(true)}
            disabled={busyAny}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
          >
            Re-sync
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busyAny}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
        >
          {busy === "csv" ? "Uploading…" : "Upload product CSV"}
        </button>
        {store && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busyAny}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-canvas disabled:opacity-50"
          >
            {busy === "delete" ? "Deleting…" : "Delete products"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {progress && <p className="mt-2 text-xs text-slate">{progress}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notes.map((n, i) => (
        <p key={i} className="mt-2 text-xs text-slate">
          {n}
        </p>
      ))}

      <details className="mt-3 text-xs text-slate">
        <summary className="cursor-pointer font-semibold">Import didn&apos;t work? Use a CSV instead</summary>
        <p className="mt-2">
          In Shopify admin go to Products → Export → choose &quot;All products&quot; → &quot;CSV for Excel,
          Numbers, or other spreadsheet programs&quot; → Export products. Then click &quot;Upload product CSV&quot;
          here. Use this if your store is password protected or the store import fails.
          {store?.source === "csv" ? " Re-upload a fresh export whenever your catalog changes." : ""}
        </p>
      </details>
    </div>
  );
}
