"use client";

/**
 * Charts, drawn as ruled bars.
 *
 * Two constraints shape every one of these:
 *   1. A float may set a width and nothing else. Every printed figure is the
 *      canonical string from the API, never a number derived from it.
 *   2. Colour is never the only signal. Each bar is labelled and each chart
 *      carries a text equivalent, so a screen reader and a monochrome print get
 *      the same information the colours carry.
 */
import { Amount } from "./money";
import { formatMoney, toChartWidth } from "@/lib/money";
import type { CategoryLine } from "@/lib/types";

const CATEGORY_VARS = [
  "--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5",
  "--cat-6", "--cat-7", "--cat-8", "--cat-9", "--cat-10",
];

export function categoryColour(index: number): string {
  return `var(${CATEGORY_VARS[index % CATEGORY_VARS.length]})`;
}

export function CategoryBars({ lines }: { lines: CategoryLine[] }) {
  if (lines.length === 0) {
    return <p className="empty">Nothing recorded this month yet.</p>;
  }

  const widest = Math.max(...lines.map((line) => toChartWidth(line.total_bdt)), 1);

  return (
    <div
      role="img"
      aria-label={`Spending by category: ${lines
        .map((line) => `${line.category}, ${formatMoney(line.total_bdt)}, ${line.share_percent} percent`)
        .join("; ")}`}
    >
      {lines.map((line, index) => (
        <div className="bar-row" key={line.category}>
          <span className="note" style={{ margin: 0 }}>
            {line.category}
          </span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{
                width: `${(toChartWidth(line.total_bdt) / widest) * 100}%`,
                background: categoryColour(index),
              }}
            />
          </span>
          <span className="nowrap">
            <Amount value={line.total_bdt} />
            <span className="faint mono" style={{ fontSize: "var(--t-xs)", marginLeft: "var(--s-2)" }}>
              {line.share_percent}%
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The month's runway: what is already spent, what the pace projects on top, and
 * what is left of the salary. Three segments of one bar, because the question
 * "will this reach the end of the month" is a question about one length.
 */
export function RunwayBar({
  salary,
  spent,
  projectedRemaining,
}: {
  salary: string;
  spent: string;
  projectedRemaining: string;
}) {
  const salaryWidth = toChartWidth(salary);
  const spentWidth = toChartWidth(spent);
  const projectedWidth = toChartWidth(projectedRemaining);

  // When the projection overruns the salary, the bar is scaled to the projection
  // so the overrun is visible as a proportion rather than being clipped away.
  const scale = Math.max(salaryWidth, spentWidth + projectedWidth, 1);
  const pct = (value: number) => `${Math.max((value / scale) * 100, 0)}%`;
  const leftOver = Math.max(salaryWidth - spentWidth - projectedWidth, 0);

  return (
    <div>
      <div
        className="runway"
        role="img"
        aria-label={`Of a ${formatMoney(salary)} salary, ${formatMoney(spent)} is spent and ${formatMoney(projectedRemaining)} more is projected for the rest of the month.`}
      >
        <span className="runway-seg" style={{ width: pct(spentWidth), background: "var(--ink)" }} />
        <span
          className="runway-seg"
          style={{
            width: pct(projectedWidth),
            background: "var(--vermillion)",
            opacity: 0.55,
          }}
        />
        <span className="runway-seg" style={{ width: pct(leftOver), background: "transparent" }} />
      </div>

      <div className="runway-legend">
        {[
          { swatch: "var(--ink)", label: "Spent", value: spent },
          { swatch: "var(--vermillion)", label: "Projected", value: projectedRemaining },
          { swatch: "transparent", label: "Salary", value: salary },
        ].map((item) => (
          <span className="row" key={item.label} style={{ gap: "var(--s-2)" }}>
            <span
              className="swatch"
              style={{
                background: item.swatch,
                border: item.swatch === "transparent" ? "1px solid var(--rule-firm)" : "none",
                opacity: item.label === "Projected" ? 0.55 : 1,
              }}
              aria-hidden="true"
            />
            <span className="label">{item.label}</span>
            <Amount value={item.value} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** A DPS balance curve, drawn from the schedule the engine produced. */
export function DpsCurve({
  schedule,
}: {
  schedule: Array<{ month_index: number; closing_balance_bdt: string; deposit_bdt: string }>;
}) {
  if (schedule.length < 2) return null;

  const width = 520;
  const height = 130;
  const peak = Math.max(...schedule.map((row) => toChartWidth(row.closing_balance_bdt)), 1);

  const point = (index: number, value: number) => {
    const x = (index / (schedule.length - 1)) * width;
    const y = height - (value / peak) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const balancePoints = schedule.map((row, index) =>
    point(index, toChartWidth(row.closing_balance_bdt)),
  );

  // The same contributions with no interest — the comparison that makes the
  // interest figure mean something.
  const deposit = toChartWidth(schedule[0]?.deposit_bdt ?? "0.00");
  const plainPoints = schedule.map((_, index) => point(index, deposit * (index + 1)));

  const balance = balancePoints.join(" ");
  const plain = plainPoints.join(" ");

  /**
   * The band between the two lines is the interest.
   *
   * Over a short term the two curves sit within a couple of percent of each
   * other and read as one line, which makes the chart say nothing. Shading the
   * gap keeps the axes honest — no truncated baseline, no exaggerated scale —
   * while making the quantity the panel is about actually visible.
   */
  const gain = `${plainPoints.join(" ")} ${[...balancePoints].reverse().join(" ")}`;

  const last = schedule[schedule.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "130px" }}
      role="img"
      aria-label={`Balance over ${schedule.length} months, reaching ${formatMoney(last?.closing_balance_bdt ?? "0.00")} against ${formatMoney(String((deposit * schedule.length).toFixed(2)))} deposited.`}
    >
      <polygon points={gain} fill="var(--forest)" opacity="0.16" />
      <polyline
        points={plain}
        fill="none"
        stroke="var(--rule-firm)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={balance}
        fill="none"
        stroke="var(--forest)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
