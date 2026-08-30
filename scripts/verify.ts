/**
 * Runs the engine over every case in the public dataset.
 *
 * This is the smoke gate: it proves the engine parses all 25 official cases,
 * produces the four required outputs for each, and never emits a NaN, an
 * Infinity, or a money value that isn't canonical 2dp. Run it before every push.
 *
 *   npm run verify            # summary table
 *   npm run verify -- PUB-03  # full JSON for one case
 */
import fs from "node:fs";
import path from "node:path";
import { buildReport } from "../src/core/report";
import { DatasetSchema } from "../src/core/types";

const MONEY_RE = /^-?\d+\.\d{2}$/;

function assertCanonicalMoney(node: unknown, trail: string, problems: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === "number" && !Number.isFinite(node)) {
    problems.push(`${trail} is ${node}`);
    return;
  }
  if (typeof node === "string") {
    if (trail.endsWith("_bdt") && !MONEY_RE.test(node) && node !== "—") {
      problems.push(`${trail} = "${node}" is not canonical 2dp money`);
    }
    if (node.includes("NaN") || node.includes("Infinity")) {
      problems.push(`${trail} contains "${node}"`);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => assertCanonicalMoney(v, `${trail}[${i}]`, problems));
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      assertCanonicalMoney(v, trail ? `${trail}.${k}` : k, problems);
    }
  }
}

const datasetPath = path.join(process.cwd(), "src/data/p12-public.json");
const dataset = DatasetSchema.parse(JSON.parse(fs.readFileSync(datasetPath, "utf8")));

const only = process.argv[2];

if (only) {
  const found = dataset.cases.find((c) => c.case_id === only);
  if (!found) {
    console.error(`No such case: ${only}`);
    process.exit(1);
  }
  console.log(JSON.stringify(buildReport(found), null, 2));
  process.exit(0);
}

let failures = 0;

console.log(
  [
    "case".padEnd(8),
    "salary".padStart(11),
    "spent".padStart(11),
    "projected".padStart(11),
    "end pos".padStart(12),
    "ins".padStart(4),
    "pk".padStart(3),
    "  first pocket completes",
  ].join(""),
);
console.log("-".repeat(96));

for (const c of dataset.cases) {
  const problems: string[] = [];
  try {
    const report = buildReport(c);
    assertCanonicalMoney(report, "", problems);

    if (report.insights.length < 3) {
      problems.push(`only ${report.insights.length} insights (brief requires >= 3)`);
    }

    const f = report.forecast;
    const p0 = report.pockets[0];
    console.log(
      [
        c.case_id.padEnd(8),
        f.salary_bdt.padStart(11),
        f.spent_to_date_bdt.padStart(11),
        f.projected_month_total_bdt.padStart(11),
        f.projected_end_position_bdt.padStart(12),
        String(report.insights.length).padStart(4),
        String(report.pockets.length).padStart(3),
        p0 ? `  ${p0.expected_completion_date} (${p0.months_to_target}m, DPS +${p0.dps_gain_bdt})` : "  —",
      ].join(""),
    );
  } catch (error) {
    problems.push(`threw: ${(error as Error).message}`);
    console.log(`${c.case_id.padEnd(8)}  THREW`);
  }

  if (problems.length > 0) {
    failures += problems.length;
    for (const p of problems) console.log(`         ✗ ${p}`);
  }
}

console.log("-".repeat(96));
if (failures > 0) {
  console.log(`FAILED — ${failures} problem(s) across ${dataset.cases.length} cases`);
  process.exit(1);
}
console.log(`OK — ${dataset.cases.length} cases, no NaN/Infinity, all money canonical 2dp, all >= 3 insights`);
