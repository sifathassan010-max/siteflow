// Pure CSV parsing for Shopify's admin product export (Products -> Export).
// Runs in the BROWSER (the file is parsed on the owner's machine and only the
// compact result is uploaded, so big exports never hit Vercel's 4.5 MB body
// limit) and in node tests. The server re-sanitizes everything it receives.
// Unit-tested in shopify-csv.test.ts.
import {
  buildProductRecord,
  parsePrice,
  type LooseProduct,
  type ProductRecord,
} from "./shopify-core.ts";

// ---- RFC 4180 style parser ----
// Handles: quoted fields, "" escapes, delimiters / CR / LF / CRLF inside quotes,
// UTF-8 BOM, missing final newline. Rows that are completely empty are dropped.
export function parseCsv(input: string, delimiter = ","): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === "") {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      endField();
      i++;
      continue;
    }
    if (c === "\r") {
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (c === "\n") {
      endRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// Looks at the header line only (outside quotes) and picks , ; or tab.
export function detectDelimiter(text: string): string {
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (c === "\n" || c === "\r") break;
      if (c in counts) counts[c]++;
    }
  }
  let best = ",";
  for (const d of [";", "\t"]) if (counts[d] > counts[best]) best = d;
  return best;
}

// ---- Shopify export -> products ----

export type CsvImportResult = {
  products: ProductRecord[];
  totalProducts: number; // distinct handles in the file
  skippedUnpublished: number; // draft / archived / not published
  invalid: number; // missing title or bad handle
};

export type CsvError = "empty" | "not_shopify_csv";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function indexOfAny(header: string[], names: string[]): number {
  for (const n of names) {
    const i = header.indexOf(n);
    if (i !== -1) return i;
  }
  return -1;
}

type VariantAcc = { values: string[]; price: number | null; compare: number | null; available: boolean };
type ProductAcc = {
  handle: string;
  title: string;
  body: string;
  vendor: string;
  type: string;
  tags: string;
  published: string;
  status: string;
  image: string;
  optionNames: string[];
  optionValues: Set<string>[];
  variants: VariantAcc[];
};

export function csvToProducts(
  csvText: string,
  origin: string,
  currency: string | null
): { ok: true; result: CsvImportResult } | { ok: false; error: CsvError } {
  if (!csvText || !csvText.trim()) return { ok: false, error: "empty" };
  const rows = parseCsv(csvText, detectDelimiter(csvText));
  if (rows.length < 2) return { ok: false, error: "empty" };

  const header = rows[0].map(norm);
  const col = {
    handle: indexOfAny(header, ["handle"]),
    title: indexOfAny(header, ["title"]),
    body: indexOfAny(header, ["body (html)", "body html", "body", "description"]),
    vendor: indexOfAny(header, ["vendor"]),
    type: indexOfAny(header, ["type", "product type"]),
    category: indexOfAny(header, ["product category"]),
    tags: indexOfAny(header, ["tags"]),
    published: indexOfAny(header, ["published"]),
    status: indexOfAny(header, ["status"]),
    price: indexOfAny(header, ["variant price"]),
    compare: indexOfAny(header, ["variant compare at price"]),
    tracker: indexOfAny(header, ["variant inventory tracker"]),
    qty: indexOfAny(header, ["variant inventory qty"]),
    policy: indexOfAny(header, ["variant inventory policy"]),
    image: indexOfAny(header, ["image src"]),
    optName: [1, 2, 3].map((n) => indexOfAny(header, [`option${n} name`])),
    optVal: [1, 2, 3].map((n) => indexOfAny(header, [`option${n} value`])),
  };
  if (col.handle === -1 || col.title === -1) return { ok: false, error: "not_shopify_csv" };

  const get = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());

  const order: string[] = [];
  const byHandle = new Map<string, ProductAcc>();
  let lastHandle = "";

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    let handle = get(row, col.handle);
    if (!handle) handle = lastHandle; // some exports leave Handle blank on continuation rows
    if (!handle) continue;
    lastHandle = handle;

    let acc = byHandle.get(handle);
    if (!acc) {
      acc = {
        handle,
        title: "",
        body: "",
        vendor: "",
        type: "",
        tags: "",
        published: "",
        status: "",
        image: "",
        optionNames: ["", "", ""],
        optionValues: [new Set(), new Set(), new Set()],
        variants: [],
      };
      byHandle.set(handle, acc);
      order.push(handle);
    }

    // Product-level fields live on the first row, but fill gaps from any row.
    acc.title ||= get(row, col.title);
    acc.body ||= get(row, col.body);
    acc.vendor ||= get(row, col.vendor);
    acc.type ||= get(row, col.type) || get(row, col.category);
    acc.tags ||= get(row, col.tags);
    acc.published ||= get(row, col.published).toLowerCase();
    acc.status ||= get(row, col.status).toLowerCase();
    acc.image ||= get(row, col.image);

    const values: string[] = [];
    for (let k = 0; k < 3; k++) {
      const name = get(row, col.optName[k]);
      if (name && !acc.optionNames[k]) acc.optionNames[k] = name;
      const val = get(row, col.optVal[k]);
      if (val) {
        acc.optionValues[k].add(val);
        values.push(val);
      }
    }

    // A variant row has a price or option values. Image-only rows have neither.
    const priceRaw = get(row, col.price);
    if (priceRaw === "" && values.length === 0) continue;
    const tracker = get(row, col.tracker);
    const qtyRaw = get(row, col.qty);
    const qty = qtyRaw === "" ? 0 : Number(qtyRaw);
    const policy = get(row, col.policy).toLowerCase();
    const available = tracker === "" ? true : qty > 0 || policy === "continue";
    acc.variants.push({
      values,
      price: parsePrice(priceRaw),
      compare: parsePrice(get(row, col.compare)),
      available,
    });
  }

  const products: ProductRecord[] = [];
  let skippedUnpublished = 0;
  let invalid = 0;

  for (const handle of order) {
    const a = byHandle.get(handle)!;
    // status column (newer exports): only "active" is live. Older exports: Published=false.
    const live = a.status ? a.status === "active" : a.published !== "false";
    if (!live) {
      skippedUnpublished++;
      continue;
    }
    const priced = a.variants.filter((v) => v.price !== null) as (VariantAcc & { price: number })[];
    let price: number | null = null;
    let priceMax: number | null = null;
    let compare: number | null = null;
    if (priced.length > 0) {
      const lowest = priced.reduce((x, y) => (y.price < x.price ? y : x));
      price = lowest.price;
      priceMax = priced.reduce((m, v) => Math.max(m, v.price), 0);
      compare = lowest.compare;
    }
    const loose: LooseProduct = {
      external_id: handle,
      title: a.title,
      handle,
      price,
      price_max: priceMax,
      compare_at_price: compare,
      available: a.variants.length === 0 ? true : a.variants.some((v) => v.available),
      vendor: a.vendor,
      product_type: a.type,
      tags: a.tags,
      description: a.body,
      image_url: a.image,
      variants: a.variants.map((v) => ({ t: v.values.join(" / "), p: v.price, a: v.available })),
      options: [0, 1, 2]
        .filter((k) => a.optionNames[k] && a.optionValues[k].size > 0)
        .map((k) => ({ name: a.optionNames[k], values: [...a.optionValues[k]] })),
    };
    const rec = buildProductRecord(loose, origin, currency);
    if (rec) products.push(rec);
    else invalid++;
  }

  return {
    ok: true,
    result: { products, totalProducts: order.length, skippedUnpublished, invalid },
  };
}
