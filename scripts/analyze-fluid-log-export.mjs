#!/usr/bin/env node
/**
 * Summarize a Vercel log export JSON array for Fluid kill/feud cost review.
 * Usage: node client/scripts/analyze-fluid-log-export.mjs path/to/export.json
 */
import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node analyze-fluid-log-export.mjs <export.json>");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(path, "utf8"));
if (!Array.isArray(rows)) {
  console.error("Expected JSON array");
  process.exit(1);
}

const fn = rows.filter((r) => r.type === "function");
let prov = 0;
let timeoutProv = 0;
let over60 = 0;
let over300 = 0;

for (const r of fn) {
  const d = r.durationMs ?? 0;
  const p = d * (r.memorySize ?? 2048);
  prov += p;
  if (d > 60_000) over60 += 1;
  if (d >= 299_000) {
    over300 += 1;
    timeoutProv += p;
  }
}

const byFn = {};
for (const r of fn) {
  const f = r.function ?? "?";
  byFn[f] = (byFn[f] ?? 0) + 1;
}

console.log(
  JSON.stringify(
    {
      totalRows: rows.length,
      functionRows: fn.length,
      over60s: over60,
      over300s: over300,
      provisionedGBs: Number((prov / 1e9).toFixed(2)),
      timeoutShareOfGBsPct: prov ? Math.round((100 * timeoutProv) / prov) : 0,
      topFunctions: Object.entries(byFn)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    },
    null,
    2
  )
);
