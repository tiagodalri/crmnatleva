/**
 * Blueprint primitives compartilhados por todos os vouchers (aéreo, hotel,
 * genérico). Componentes de alto nível construídos sobre a engine.
 *
 * PRINCÍPIOS DE DESIGN (mandatórios):
 *  · Tipografia com 3 níveis reais: H1 (24), H2 (11 caps), body (10)
 *  · Números em `courier` (monospace) para dar sensação de "tabular figures"
 *  · Grid 4pt (SPACING) — nunca hardcodar gaps
 *  · Zero zebra: linhas alternadas destroem a linguagem editorial
 *  · Hairlines finas (0.15pt) e cor `hairline`, não verde
 */
import { col, grid, row, text, spacer, icon, type Node, type Style } from "./index";
import { BRAND, SPACING } from "./theme/institutional";
import type { IconDraw } from "./index";

// ── Estilos atômicos (única fonte da hierarquia) ────────────────────────────
export const style = {
  // H1 — nome do voucher (uma vez por página inicial)
  H1: { font: { size: 26, weight: "bold" as const, color: BRAND.greenDark, letterSpacing: -0.15, lineHeight: 1.1 } },
  // Kicker acima do H1
  SUB: { font: { size: 7.5, weight: "bold" as const, color: BRAND.green, transform: "uppercase" as const, letterSpacing: 0.6 } },
  // H2 — cada seção
  H2: { font: { size: 9.5, weight: "bold" as const, color: BRAND.greenDark, transform: "uppercase" as const, letterSpacing: 0.35 } },
  BODY: { font: { size: 9.5, color: BRAND.textDark, lineHeight: 1.55 } },
  BODY_MUTED: { font: { size: 9.5, color: BRAND.textSoft, lineHeight: 1.55 } },
  // "Tabular numerals" via courier — usar para códigos, horas, distâncias
  MONO: { font: { size: 9.5, color: BRAND.textDark } },
  CELL: {
    minHeight: SPACING.lg,
    padding: [0, SPACING.sm] as [number, number],
    font: { size: 9, color: BRAND.textDark },
  } satisfies Style,
  CELL_HEAD: {
    minHeight: SPACING.md,
    padding: [0, SPACING.sm] as [number, number],
    font: { size: 7, weight: "bold" as const, color: BRAND.textSoft, transform: "uppercase" as const, letterSpacing: 0.5 },
    border: { color: BRAND.hairline, width: 0.15, sides: ["bottom" as const] },
  } satisfies Style,
};

// ── Section title (sem barra pesada; apenas H2 + spacer) ────────────────────
export function sectionTitle(label: string): Node {
  return col({ gap: SPACING.xs }, [
    text(label, { minHeight: 5, ...style.H2 }),
    spacer(SPACING.xs),
  ]);
}

// ── Card "chave: valor" (Informações Básicas) — sem zebra ──────────────────
export function labelValueCard(rows: Array<[string, string]>): Node {
  return col({
    border: { color: BRAND.hairline, width: 0.15 },
    radius: 1,
  }, rows.map(([k, v], i) => grid([38, 62], {
    border: i === rows.length - 1 ? undefined : { color: BRAND.hairline, width: 0.1, sides: ["bottom"] },
  }, [
    text(k, { ...style.CELL, font: { ...style.CELL.font, color: BRAND.textSoft } }),
    text(v, { ...style.CELL, font: { ...style.CELL.font, weight: "bold", color: BRAND.textDark } }),
  ])));
}

// ── Tabela genérica (header + linhas, ZERO zebra) ──────────────────────────
export interface TableSpec {
  cols: number[];
  headers: string[];
  rows: string[][];
  align?: Array<"left" | "center" | "right">;
  emptyLabel?: string;
  fontSize?: number;
}

export function dataTable(spec: TableSpec): Node {
  const align = spec.align ?? spec.headers.map((_, i) => (i === 0 ? "left" : "center"));
  const headerRow = grid(spec.cols, {}, spec.headers.map((h, i) => text(h, {
    ...style.CELL_HEAD,
    textAlign: align[i],
    font: { ...style.CELL_HEAD.font, align: align[i] },
  })));

  const children: Node[] = [headerRow];

  if (spec.rows.length === 0) {
    children.push(
      grid([100], {}, [
        text(spec.emptyLabel || "Nenhum registro cadastrado.", {
          ...style.CELL,
          font: { ...style.CELL.font, color: BRAND.muted, size: spec.fontSize ?? 9 },
        }),
      ]),
    );
  } else {
    spec.rows.forEach((cells, i) => {
      const isLast = i === spec.rows.length - 1;
      children.push(grid(spec.cols, {
        border: isLast ? undefined : { color: BRAND.hairline, width: 0.1, sides: ["bottom"] },
      }, cells.map((v, j) => text(v, {
        ...style.CELL,
        textAlign: align[j],
        font: { ...style.CELL.font, size: spec.fontSize ?? 9, align: align[j] },
      }))));
    });
  }

  return col({}, children);
}

// ── InfoLine: ícone em círculo + título + subtítulo ────────────────────────
export function infoLine(iconDraw: IconDraw, title: string, lines: string[]): Node {
  const badgeSize = 8.5;
  const iconSize = 4.2;

  const iconCell = col({}, [
    {
      kind: "box",
      style: {
        minHeight: badgeSize,
        width: badgeSize,
        border: { color: BRAND.green, width: 0.3 },
        radius: badgeSize / 2,
      },
      children: [icon(iconDraw, iconSize, BRAND.green, 0.3, { minHeight: badgeSize })],
    } as Node,
  ]);

  const textCell = col({ gap: SPACING.xs }, [
    text(title, { font: { size: 10, weight: "bold", color: BRAND.textDark } }),
    ...lines.map((l) => text(l, { font: { size: 9, color: BRAND.textSoft, lineHeight: 1.5 } })),
  ]);

  return grid([badgeSize + 4, 100 - (badgeSize + 4)], { gap: SPACING.sm }, [iconCell, textCell]);
}

// ── Bag (para a seção de bagagens do voucher aéreo) ────────────────────────
export function bagItem(iconDraw: IconDraw, title: string, desc: string): Node {
  return col({ gap: SPACING.xs }, [
    icon(iconDraw, 7, BRAND.green, 0.35, { minHeight: 7 }),
    text(title, { font: { size: 9.5, weight: "bold", color: BRAND.textDark } }),
    text(desc, { font: { size: 8.5, color: BRAND.textSoft, lineHeight: 1.5 } }),
  ]);
}

// ── Bloco de destaque (No-Show, etc.) — mais editorial, menos "card" ──────
export function highlightBlock(title: string, body: string, bullets?: string[]): Node {
  const children: Node[] = [
    text(title, { font: { size: 9.5, weight: "bold", color: BRAND.greenDark, transform: "uppercase", letterSpacing: 0.35 } }),
    text(body, { font: { size: 9.5, color: BRAND.textDark, lineHeight: 1.55 } }),
  ];
  if (bullets && bullets.length > 0) {
    bullets.forEach((b) => {
      children.push(row({ gap: SPACING.xs }, [
        text("—", { font: { size: 10, weight: "bold", color: BRAND.green } }),
        text(b, { font: { size: 9.5, color: BRAND.textDark, lineHeight: 1.5 } }),
      ]));
    });
  }
  return row({ gap: SPACING.sm }, [
    // barra vertical verde (rule vertical via box)
    { kind: "box", style: { width: 1, minHeight: 20, bg: BRAND.green, radius: 0.5 } } as Node,
    col({ gap: SPACING.sm, padding: [SPACING.xs, 0, SPACING.xs, SPACING.sm] }, children),
  ]);
}

// ── Voucher intro (SUB + H1) — sem barra colorida grossa ──────────────────
export function voucherIntro(sub: string, title: string): Node {
  return col({ gap: SPACING.xs }, [
    text(sub, { minHeight: 4, ...style.SUB }),
    text(title, { minHeight: 12, ...style.H1 }),
    spacer(SPACING.sm),
  ]);
}

// ── BOARDING-PASS CARD (upgrade principal do aéreo) ───────────────────────
export interface BoardingPassSegment {
  flightNumber?: string;
  airline?: string;
  cabin?: string;
  dateLabel?: string;          // "Qua, 24 Dez 2025"
  originIata?: string;
  originCity?: string;
  destinationIata?: string;
  destinationCity?: string;
  departureTime?: string;      // "22:15"
  arrivalTime?: string;
  duration?: string;           // "9h 45min"
}

const monoFont = (size: number, color: string, weight: "normal" | "bold" = "normal") =>
  ({ size, color, weight, letterSpacing: 0 });

// bloco IATA + cidade + hora (usado nas duas pontas do card)
function endpoint(iata: string, city: string, time: string, align: "left" | "right"): Node {
  return col({ gap: SPACING.xs }, [
    text(iata || "—", {
      textAlign: align,
      font: { size: 22, weight: "bold", color: BRAND.greenDark, letterSpacing: -0.5, align },
    }),
    text(city || "", {
      textAlign: align,
      font: { size: 8, color: BRAND.textSoft, transform: "uppercase", letterSpacing: 0.4, align },
    }),
    text(time || "—:—", {
      textAlign: align,
      // Helvetica bold em 12pt tem larguras próximas de tabular para dígitos
      font: { size: 13, weight: "bold", color: BRAND.textDark, align, letterSpacing: 0.1 },
    }),
  ]);
}

// linha central: hairline com bullet + duration
function connector(duration: string): Node {
  return col({ gap: SPACING.xs, padding: [SPACING.sm, 0, 0, 0] }, [
    // hairline horizontal
    { kind: "rule", color: BRAND.hairline, thickness: 0.3, style: { minHeight: 0.3 } } as Node,
    text(duration || "—", {
      textAlign: "center",
      font: { size: 8, color: BRAND.textSoft, align: "center", letterSpacing: 0.2 },
    }),
  ]);
}

export function boardingPassCard(seg: BoardingPassSegment): Node {
  const meta = [
    seg.airline || "",
    seg.flightNumber || "",
    seg.cabin || "",
  ].filter(Boolean).join("  ·  ");

  return col({
    border: { color: BRAND.hairline, width: 0.2 },
    radius: 1.5,
    padding: [SPACING.md, SPACING.lg],
    gap: SPACING.sm,
  }, [
    // topo: meta esquerda / data direita
    grid([60, 40], {}, [
      text(meta || "—", {
        font: { size: 7.5, weight: "bold", color: BRAND.textSoft, transform: "uppercase", letterSpacing: 0.55 },
      }),
      text(seg.dateLabel || "—", {
        textAlign: "right",
        font: { size: 7.5, weight: "bold", color: BRAND.textSoft, transform: "uppercase", letterSpacing: 0.55, align: "right" },
      }),
    ]),
    spacer(SPACING.xs),
    // corpo: origem · connector · destino
    grid([32, 36, 32], { gap: SPACING.sm }, [
      endpoint(seg.originIata || "", seg.originCity || "", seg.departureTime || "", "left"),
      connector(seg.duration || ""),
      endpoint(seg.destinationIata || "", seg.destinationCity || "", seg.arrivalTime || "", "right"),
    ]),
  ]);
}
