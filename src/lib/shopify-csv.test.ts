// Run with: node --experimental-strip-types --test src/lib/shopify-csv.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, detectDelimiter, csvToProducts } from "./shopify-csv.ts";

test("parseCsv: quoted fields, escaped quotes, commas, multi-line cells, CRLF", () => {
  const csv = 'a,b,c\r\n1,"x, y","say ""hi"""\r\n2,"line1\nline2",z\r\n';
  assert.deepEqual(parseCsv(csv), [
    ["a", "b", "c"],
    ["1", "x, y", 'say "hi"'],
    ["2", "line1\nline2", "z"],
  ]);
});

test("parseCsv: BOM, no trailing newline, empty trailing cells, blank lines dropped", () => {
  const csv = "﻿a,b,c\n1,,\n\n2,x,";
  assert.deepEqual(parseCsv(csv), [
    ["a", "b", "c"],
    ["1", "", ""],
    ["2", "x", ""],
  ]);
});

test("parseCsv: quote in the middle of an unquoted field is kept literally", () => {
  assert.deepEqual(parseCsv('a,5" pipe,c'), [["a", '5" pipe', "c"]]);
});

test("detectDelimiter picks ; and tab, ignores delimiters inside quotes", () => {
  assert.equal(detectDelimiter("a;b;c\n1;2;3"), ";");
  assert.equal(detectDelimiter("a\tb\tc\n"), "\t");
  assert.equal(detectDelimiter('"a,b,c",d\n1,2'), ",");
});

const HEADER =
  "Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Status";

test("csvToProducts: multiple rows per product (variants + image-only rows), HTML stripped, link built from origin", () => {
  const rows = [
    HEADER,
    // product 1: 2 variants, multi-line quoted body with HTML, image on first row
    'blue-hoodie,Blue Hoodie,"<p>Warm &amp; soft</p>\n<ul><li>100% cotton</li></ul>",Acme,Apparel > Hoodies,Hoodies,"winter, sale",true,Size,S,Color,Blue,,,SKU1,500,shopify,5,deny,manual,49.00,59.00,true,true,,https://cdn.shopify.com/a.jpg,1,,false,,,,,,,active',
    "blue-hoodie,,,,,,,,,M,,Blue,,,SKU2,500,shopify,0,deny,manual,54.00,,true,true,,,,,,,,,,,,",
    "blue-hoodie,,,,,,,,,,,,,,,,,,,,,,,,,https://cdn.shopify.com/b.jpg,2,,,,,,,,,",
    // product 2: draft -> skipped
    "draft-thing,Draft Thing,,Acme,,,,false,Title,Default Title,,,,,S3,0,,,,manual,10.00,,true,true,,,,,false,,,,,,,draft",
    // product 3: single variant, not tracked -> available; no status col filled but published true
    "cap,Red Cap,Nice cap,Acme,,Hats,,true,Title,Default Title,,,,,S4,0,,,,manual,15.50,,true,true,,,,,false,,,,,,,active",
    // product 4: sold out
    "mug,Mug,,Acme,,Mugs,,true,Title,Default Title,,,,,S5,0,shopify,0,deny,manual,9.00,,true,true,,,,,false,,,,,,,active",
  ].join("\r\n");
  const r = csvToProducts(rows, "https://shop.example.com", "USD");
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.result.totalProducts, 4);
  assert.equal(r.result.skippedUnpublished, 1);
  assert.equal(r.result.products.length, 3);

  const hoodie = r.result.products[0];
  assert.equal(hoodie.title, "Blue Hoodie");
  assert.equal(hoodie.url, "https://shop.example.com/products/blue-hoodie");
  assert.equal(hoodie.price, 49);
  assert.equal(hoodie.price_max, 54);
  assert.equal(hoodie.compare_at_price, 59);
  assert.equal(hoodie.currency, "USD");
  assert.equal(hoodie.available, true); // S variant has stock
  assert.equal(hoodie.description, "Warm & soft 100% cotton");
  assert.equal(hoodie.tags, "winter, sale");
  assert.equal(hoodie.product_type, "Hoodies");
  assert.equal(hoodie.image_url, "https://cdn.shopify.com/a.jpg");
  assert.equal(hoodie.variants.length, 2);
  assert.deepEqual(hoodie.variants[1], { t: "M / Blue", p: 54, a: false });
  assert.deepEqual(hoodie.options, [
    { name: "Size", values: ["S", "M"] },
    { name: "Color", values: ["Blue"] },
  ]);

  const cap = r.result.products[1];
  assert.equal(cap.available, true);
  assert.equal(cap.price, 15.5);
  assert.deepEqual(cap.options, []); // "Title / Default Title" is not a real option

  assert.equal(r.result.products[2].available, false);
});

test("csvToProducts: inventory policy 'continue' keeps a 0-qty variant sellable", () => {
  const csv = [
    "Handle,Title,Variant Price,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Status",
    "a,A,10,shopify,0,continue,active",
  ].join("\n");
  const r = csvToProducts(csv, "https://s.com", null);
  assert.ok(r.ok && r.result.products[0].available);
});

test("csvToProducts: rejects non-Shopify CSV and empty input", () => {
  assert.deepEqual(csvToProducts("name,price\nx,1", "https://s.com", null), { ok: false, error: "not_shopify_csv" });
  assert.deepEqual(csvToProducts("", "https://s.com", null), { ok: false, error: "empty" });
  assert.deepEqual(csvToProducts("Handle,Title\n", "https://s.com", null), { ok: false, error: "empty" });
});

test("csvToProducts: bad handle / missing title counted as invalid, never crashes", () => {
  const csv = ["Handle,Title,Variant Price", "bad handle!,X,1", "ok,,2", "good,Good,3"].join("\n");
  const r = csvToProducts(csv, "https://s.com", null);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.result.invalid, 2);
  assert.equal(r.result.products.length, 1);
});

test("csvToProducts: semicolon-delimited export works", () => {
  const csv = "Handle;Title;Variant Price\nx;X Thing;12,5\ny;Y;3.5";
  const r = csvToProducts(csv, "https://s.com", null);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.result.products.length, 2);
  assert.equal(r.result.products[0].price, 12.5);
  assert.equal(r.result.products[1].price, 3.5);
});
