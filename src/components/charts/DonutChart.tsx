import { useMemo, useState, ReactNode } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import ChartTooltipCard from "./ChartTooltipCard";
import { paletteAt, fmtNumber } from "./chartTheme";

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
  /** Optional payload carried through to onSelect. */
  meta?: unknown;
}

interface Props {
  data: DonutDatum[];
  /** Formats values in the legend, center and tooltip. */
  valueFormatter?: (value: number) => string;
  /** Label shown under the total in the center of the donut. */
  centerLabel?: string;
  /** Overrides the big number in the center. */
  centerValue?: string;
  onSelect?: (datum: DonutDatum, index: number) => void;
  /** Max legend rows before the list scrolls. */
  maxLegendItems?: number;
  height?: number;
  emptyState?: ReactNode;
  className?: string;
}

const renderActiveShape = (props: Record<string, number>) => (
  <g>
    <Sector
      cx={props.cx}
      cy={props.cy}
      innerRadius={props.innerRadius}
      outerRadius={props.outerRadius + 6}
      startAngle={props.startAngle}
      endAngle={props.endAngle}
      fill={(props as unknown as { fill: string }).fill}
      cornerRadius={4}
    />
  </g>
);

/**
 * Big-tech style donut: no overlapping slice labels, readable legend with
 * value + share, hover highlight, center total and optional drill-down.
 */
export default function DonutChart({
  data,
  valueFormatter = fmtNumber,
  centerLabel = "Total",
  centerValue,
  onSelect,
  maxLegendItems = 8,
  height = 220,
  emptyState,
  className,
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { series, total } = useMemo(() => {
    const clean = data.filter((d) => (d.value ?? 0) > 0).sort((a, b) => b.value - a.value);
    const sum = clean.reduce((acc, d) => acc + d.value, 0);
    return { series: clean, total: sum };
  }, [data]);

  if (series.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
        {emptyState ?? "Sem dados no período"}
      </div>
    );
  }

  const colorOf = (d: DonutDatum, i: number) => d.color || paletteAt(i);
  const active = activeIndex != null ? series[activeIndex] : null;

  return (
    <div className={className}>
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={series.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="none"
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(_, i) => onSelect?.(series[i], i)}
              className={onSelect ? "cursor-pointer outline-none" : "outline-none"}
            >
              {series.map((d, i) => (
                <Cell key={d.name} fill={colorOf(d, i)} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltipCard
                  hideLabel
                  valueFormatter={(v) => `${valueFormatter(v)} · ${total > 0 ? ((v / total) * 100).toFixed(1) : "0"}%`}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {active ? active.name : centerLabel}
          </span>
          <span className="max-w-full truncate text-base font-semibold tabular-nums text-foreground">
            {active ? valueFormatter(active.value) : centerValue ?? valueFormatter(total)}
          </span>
          {active && total > 0 && (
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              {((active.value / total) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <ul
        className="mt-3 space-y-1 overflow-y-auto pr-1"
        style={{ maxHeight: maxLegendItems * 32 }}
      >

        {series.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <li key={d.name}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => onSelect?.(d, i)}
                disabled={!onSelect}
                className={`flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors ${
                  activeIndex === i ? "bg-muted/60" : "hover:bg-muted/40"
                } ${onSelect ? "cursor-pointer" : "cursor-default"}`}

              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(d, i) }} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{d.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {valueFormatter(d.value)}
                </span>
                <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
