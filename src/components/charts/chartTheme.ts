/**
 * Shared chart theme tokens and helpers.
 * All colors reference semantic CSS variables so charts follow light/dark themes.
 */

export const CHART_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
  "hsl(var(--chart-4))",
];

export const paletteAt = (index: number) => CHART_PALETTE[index % CHART_PALETTE.length];

export const axisTick = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const;

export const axisLine = {
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.6,
} as const;

export const gridProps = {
  strokeDasharray: "2 6",
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.7,
  vertical: false,
} as const;

export const cursorFill = { fill: "hsl(var(--muted))", fillOpacity: 0.35 } as const;

export const fmtCurrency = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const fmtCompact = (v: number) => {
  const n = v ?? 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}k`;
  return String(n);
};

export const fmtCurrencyCompact = (v: number) => `R$ ${fmtCompact(v)}`;

export const fmtNumber = (v: number) => (v ?? 0).toLocaleString("pt-BR");

export const fmtPercent = (v: number, digits = 1) => `${(v ?? 0).toFixed(digits)}%`;
