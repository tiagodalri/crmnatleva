/**
 * Blueprint primitives compartilhados por todos os vouchers (aéreo, hotel,
 * genérico). Componentes de alto nível construídos sobre a engine.
 */
import { col, grid, row, text, spacer, icon, type Node, type Style } from "./index";
import { BRAND } from "./theme/institutional";
import type { IconDraw } from "./index";

// ── Estilos atômicos ────────────────────────────────────────────────────────
export const style = {
  H1: { font: { size: 24, weight: "bold" as const, color: BRAND.greenDark, letterSpacing: -0.05 } },
  SUB: { font: { size: 8, weight: "bold" as const, color: BRAND.green, transform: "uppercase" as const, letterSpacing: 0.25 } },
  H2: { font: { size: 11, weight: "bold" as const, color: BRAND.greenDark, transform: "uppercase" as const, letterSpacing: 0.15 } },
  BODY: { font: { size: 10, color: BRAND.textDark, lineHeight: 1.55 } },
  BODY_MUTED: { font: { size: 10, color: BRAND.muted, lineHeight: 1.55 } },
  CELL: {
    minHeight: 9,
    padding: [0, 4] as [number, number],
    font: { size: 9, color: BRAND.textDark },
  } satisfies Style,
  CELL_HEAD: {
    minHeight: 8,
    padding: [0, 4] as [number, number],
    bg: BRAND.rowAlt,
    font: { size: 7.5, weight: "bold" as const, color: BRAND.greenDark, transform: "uppercase" as const, letterSpacing: 0.1 },
    border: { color: BRAND.border, width: 0.15, sides: ["bottom" as const] },
  } satisfies Style,
};

// ── Section title with divider (mimics the "|| SEÇÃO" bar) ──────────────────
export function sectionTitle(label: string): Node {
  return col({ gap: 3 }, [
    text(label, { minHeight: 7, ...style.H2 }),
    { kind: "rule", color: BRAND.green, thickness: 0.35, style: { minHeight: 0.35 } } as Node,
    spacer(3),
  ]);
}

// ── Card "chave: valor" (Informações Básicas) ──────────────────────────────
export function labelValueCard(rows: Array<[string, string]>): Node {
  return col({
    border: { color: BRAND.border, width: 0.15 },
    radius: 1.5,
  }, rows.map(([k, v], i) => grid([38, 62], {
    bg: i % 2 === 1 ? BRAND.rowAlt : BRAND.white,
    border: i === rows.length - 1 ? undefined : { color: BRAND.border, width: 0.1, sides: ["bottom"] },
  }, [
    text(k, { ...style.CELL, font: { ...style.CELL.font, weight: "bold", color: BRAND.greenDark } }),
    text(v, { ...style.CELL, font: { ...style.CELL.font, weight: "bold" } }),
  ])));
}

// ── Tabela genérica (header + linhas) ──────────────────────────────────────
export interface TableSpec {
  cols: number[];                       // fractions
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
      const alt = i % 2 === 1;
      children.push(grid(spec.cols, {
        bg: alt ? BRAND.rowAlt : BRAND.white,
        border: isLast ? undefined : { color: BRAND.border, width: 0.1, sides: ["bottom"] },
      }, cells.map((v, j) => text(v, {
        ...style.CELL,
        textAlign: align[j],
        font: { ...style.CELL.font, size: spec.fontSize ?? 9, align: align[j] },
      }))));
    });
  }

  return col({
    border: { color: BRAND.border, width: 0.15 },
    radius: 1.5,
  }, children);
}

// ── InfoLine: ícone em círculo + título + subtítulo ────────────────────────
export function infoLine(iconDraw: IconDraw, title: string, lines: string[]): Node {
  // A row with fixed-width icon column and flexible text column.
  const badgeSize = 9;   // mm — outer circle
  const iconSize = 4.5;  // mm — icon graphic inside

  const iconCell = col({ padding: [0, 0, 0, 0], gap: 0 }, [
    // wrapper box that draws the outer circle via border + radius
    {
      kind: "box",
      style: {
        minHeight: badgeSize,
        width: badgeSize,
        border: { color: BRAND.green, width: 0.35 },
        radius: badgeSize / 2,
      },
      children: [icon(iconDraw, iconSize, BRAND.green, 0.35, { minHeight: badgeSize })],
    } as Node,
  ]);

  const textCell = col({ gap: 1 }, [
    text(title, { font: { size: 10.5, weight: "bold", color: BRAND.greenDark } }),
    ...lines.map((l) => text(l, { font: { size: 9.5, color: BRAND.textDark, lineHeight: 1.5 } })),
  ]);

  return grid([badgeSize + 5, 100 - (badgeSize + 5)], { gap: 2 }, [iconCell, textCell]);
}

// ── Bag (para a seção de bagagens do voucher aéreo) ────────────────────────
export function bagItem(iconDraw: IconDraw, title: string, desc: string): Node {
  return col({ gap: 1.5 }, [
    icon(iconDraw, 8, BRAND.green, 0.4, { minHeight: 8 }),
    text(title, { font: { size: 10, weight: "bold", color: BRAND.greenDark } }),
    text(desc, { font: { size: 9, color: BRAND.textDark, lineHeight: 1.5 } }),
  ]);
}

// ── Bloco de destaque (No-Show, etc.) ──────────────────────────────────────
export function highlightBlock(title: string, body: string, bullets?: string[]): Node {
  const children: Node[] = [
    text(title, { font: { size: 11, weight: "bold", color: BRAND.greenDark, transform: "uppercase", letterSpacing: 0.15 } }),
    text(body, { font: { size: 9.5, color: BRAND.textDark, lineHeight: 1.55 } }),
  ];
  if (bullets && bullets.length > 0) {
    bullets.forEach((b) => {
      children.push(row({ gap: 2 }, [
        text("•", { font: { size: 10, weight: "bold", color: BRAND.green } }),
        text(b, { font: { size: 9.5, color: BRAND.textDark, lineHeight: 1.5 } }),
      ]));
    });
  }
  return col({
    bg: "#eaf3ec",
    border: { color: BRAND.border, width: 0.15 },
    radius: 2,
    padding: [6, 7],
    gap: 3,
  }, children);
}

// ── Voucher header (SUB + H1 + traço) — mesmo bloco em todos os vouchers ──
export function voucherIntro(sub: string, title: string): Node {
  return col({ gap: 2 }, [
    text(sub, { minHeight: 5, ...style.SUB }),
    text(title, { minHeight: 11, ...style.H1 }),
    { kind: "box", style: { minHeight: 1.2, width: 20, bg: BRAND.green, radius: 0.6 } } as Node,
    spacer(4),
  ]);
}
