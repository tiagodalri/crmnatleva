// Helpers para converter/exibir preços de Aluguel de Carros.
// A API do Booking (booking-com15) SEMPRE devolve valores em USD nesse endpoint
// (confirmado por teste direto · countryOfResidence só muda formato do símbolo e
// mix de fornecedores, nunca converte moeda). Aqui centralizamos a extração do
// valor numérico em USD e a formatação USD + estimativa em BRL.

export type ConvertFn = (amount: number, from: string, to: string) => number | null;

/**
 * Extrai um valor numérico em USD a partir de qualquer shape que a API do
 * Booking devolve: string ("US$232", "$1,234.50"), number (assumido USD nesse
 * endpoint), ou objeto com { rawValue | value | amount } / wrappers aninhados
 * (price, displayPrice, primaryPrice, perRental, base, display, displayValue).
 */
export function extractUsdValue(p: unknown): number | null {
  if (p == null) return null;
  if (typeof p === "number") return Number.isFinite(p) ? p : null;
  if (typeof p === "string") {
    // Só interpreta como USD se tem símbolo $ ou "USD" · evita converter algo
    // já em outra moeda por engano.
    const isUsd = /\$/.test(p) || /USD/i.test(p);
    if (!isUsd) return null;
    const cleaned = p.replace(/[^0-9.,]/g, "");
    if (!cleaned) return null;
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    let num: number;
    if (cleaned.includes(",") && cleaned.includes(".")) {
      if (lastComma > lastDot) num = Number(cleaned.replace(/\./g, "").replace(",", "."));
      else num = Number(cleaned.replace(/,/g, ""));
    } else if (cleaned.includes(",")) {
      const parts = cleaned.split(",");
      num = parts[parts.length - 1].length === 3
        ? Number(cleaned.replace(/,/g, ""))
        : Number(cleaned.replace(",", "."));
    } else {
      num = Number(cleaned);
    }
    return Number.isFinite(num) ? num : null;
  }
  if (typeof p !== "object") return null;
  const obj = p as Record<string, unknown>;

  // Se o objeto declara moeda explícita e não é USD, aborta a conversão.
  const cur = obj.currency ?? obj.currencyCode ?? obj.baseCurrency;
  if (typeof cur === "string" && cur && cur.toUpperCase() !== "USD") {
    // Ainda pode ter wrappers, mas priorizamos honestidade: sem BRL estimado.
    return null;
  }

  if (typeof obj.rawValue === "number") return obj.rawValue;
  if (typeof obj.value === "number") return obj.value;
  if (typeof obj.amount === "number") return obj.amount;

  for (const key of [
    "display",
    "displayValue",
    "displayPrice",
    "price",
    "primaryPrice",
    "base",
    "perRental",
    "label",
    "text",
  ]) {
    if (obj[key] != null && obj[key] !== p) {
      const nested = extractUsdValue(obj[key]);
      if (nested != null) return nested;
    }
  }
  return null;
}

/** Formata "US$ 1.234" (sem casas por padrão · pt-BR). */
export function formatUsd(value: number, opts: { withCents?: boolean } = {}): string {
  if (!Number.isFinite(value)) return "";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: opts.withCents ? 2 : 0,
      maximumFractionDigits: opts.withCents ? 2 : 0,
    }).format(value);
  } catch {
    return `US$ ${value.toFixed(opts.withCents ? 2 : 0)}`;
  }
}

/** Formata "≈ R$ 1.234" a partir de um valor em USD e da função de conversão. */
export function formatBrlEstimate(usd: number, convert: ConvertFn | null | undefined): string | null {
  if (!Number.isFinite(usd) || !convert) return null;
  const brl = convert(usd, "USD", "BRL");
  if (brl == null || !Number.isFinite(brl)) return null;
  try {
    return `≈ ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(brl)}`;
  } catch {
    return `≈ R$ ${brl.toFixed(0)}`;
  }
}

/**
 * Recebe qualquer shape de preço (string/number/objeto) tratando o valor como
 * USD e devolve o par para exibição. `display` sempre vem preenchido quando dá
 * pra extrair um valor · `brl` só quando a taxa de câmbio está disponível.
 */
export function usdWithBrl(
  raw: unknown,
  convert: ConvertFn | null | undefined,
  opts: { withCents?: boolean; fallbackString?: string } = {},
): { display: string; brl: string | null } {
  const value = extractUsdValue(raw);
  if (value == null) {
    return {
      display: opts.fallbackString ?? (typeof raw === "string" ? raw : ""),
      brl: null,
    };
  }
  return {
    display: formatUsd(value, { withCents: opts.withCents }),
    brl: formatBrlEstimate(value, convert),
  };
}
