import { ReactNode } from "react";

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
  dataKey?: string | number;
}

interface Props {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Formats each value. Return a string or a node. */
  valueFormatter?: (value: number, entry: TooltipEntry) => ReactNode;
  /** Overrides the tooltip title. */
  labelFormatter?: (label: string | number | undefined) => ReactNode;
  /** Extra content rendered below the values. */
  footer?: ReactNode;
  hideLabel?: boolean;
}

/**
 * Unified tooltip card used by every chart in the app.
 * Uses semantic tokens so it stays readable in light and dark themes.
 */
export default function ChartTooltipCard({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  footer,
  hideLabel,
}: Props) {
  if (!active || !payload || payload.length === 0) return null;

  const title = labelFormatter ? labelFormatter(label) : label;

  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm max-w-[240px]">
      {!hideLabel && title != null && title !== "" && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground break-words">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const numeric = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          return (
            <div key={i} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entry.color || "hsl(var(--primary))" }}
                />
                <span className="truncate text-muted-foreground">{entry.name ?? entry.dataKey}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {valueFormatter ? valueFormatter(numeric, entry) : numeric.toLocaleString("pt-BR")}
              </span>
            </div>
          );
        })}
      </div>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-muted-foreground">{footer}</div>}
    </div>
  );
}
