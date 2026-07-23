// Dicionário de tradução/normalização para dados crus da Booking Cars API (V2).
// A API não expõe parâmetro de idioma nesse endpoint, então centralizamos
// aqui toda tradução para PT-BR de valores enum-like que aparecem no card
// da lista e no drawer de detalhe.

const TRANSMISSION_MAP: Record<string, string> = {
  automatic: "Automático",
  auto: "Automático",
  manual: "Manual",
};

const FUEL_POLICY_MAP: Record<string, string> = {
  "like for like": "Devolver com o mesmo nível de combustível da retirada",
  "full to full": "Tanque cheio na retirada e na devolução",
  "full to empty": "Tanque cheio na retirada, devolver vazio",
  "free tank": "Tanque incluso no preço",
};

const CATEGORY_MAP: Record<string, string> = {
  economy: "Econômico",
  compact: "Compacto",
  intermediate: "Intermediário",
  standard: "Standard",
  "full-size": "Grande",
  fullsize: "Grande",
  "full size": "Grande",
  large: "Grande",
  premium: "Premium",
  luxury: "Luxo",
  minivan: "Minivan",
  suv: "SUV",
  midsize: "Intermediário",
  "mid-size": "Intermediário",
  small: "Pequeno",
  medium: "Médio",
};

const EXTRA_MAP: Record<string, string> = {
  "additional driver": "Motorista adicional",
  "child seat": "Cadeira infantil",
  "booster seat": "Assento de elevação",
  "infant seat": "Bebê conforto",
  gps: "GPS",
  "snow chains": "Correntes de neve",
  "winter tyres": "Pneus de inverno",
  "ski rack": "Rack de esqui",
  "wi-fi": "Wi-Fi",
  wifi: "Wi-Fi",
};

const CHECKLIST_MAP: Record<string, string> = {
  "arrive on time": "Chegue no horário",
  "what to bring": "O que levar",
  "refundable deposit": "Depósito reembolsável",
  "credit card": "Cartão de crédito",
  "driver's licence": "CNH · Carteira de motorista",
  "driver's license": "CNH · Carteira de motorista",
  "driving licence": "CNH · Carteira de motorista",
  "driving license": "CNH · Carteira de motorista",
  "passport or national id card": "Passaporte ou documento de identidade",
  "voucher": "Voucher da reserva",
  "proof of address": "Comprovante de endereço",
};

const BREAKDOWN_MAP: Record<string, string> = {
  value: "Custo-benefício",
  "quality of staff service": "Atendimento",
  "pick-up speed": "Agilidade na retirada",
  "pickup speed": "Agilidade na retirada",
  "drop-off speed": "Agilidade na devolução",
  "dropoff speed": "Agilidade na devolução",
  "car cleanliness": "Limpeza do veículo",
  "car comfort": "Conforto do veículo",
  "directions to counter": "Facilidade pra achar o balcão",
  "efficiency": "Eficiência",
  "condition of car": "Condição do veículo",
};

const PAYMENT_MAP: Record<string, string> = {
  "pay now": "Pague agora",
  "pay at pick-up": "Pague na retirada",
  "pay at pickup": "Pague na retirada",
  "pay at counter": "Pague na retirada",
  "pay later": "Pague depois",
};

const FEE_MAP: Record<string, string> = {
  deposit: "Depósito caução",
  mileage: "Franquia de quilometragem",
  "young driver fee": "Taxa de motorista jovem",
  "one way fee": "Taxa de devolução em outro local",
  "airport fee": "Taxa de aeroporto",
  "out of hours fee": "Taxa de horário estendido",
};

const RCF_REGEX = /third[-\s]?party liability(?:\s*\(tpl\))?/i;

function lookup(map: Record<string, string>, raw: string): string | undefined {
  return map[raw.trim().toLowerCase()];
}

export function tTransmission(raw?: string | null): string {
  if (!raw) return "";
  return lookup(TRANSMISSION_MAP, raw) ?? raw;
}

export function tFuelPolicy(raw?: string | null): string {
  if (!raw) return "";
  return lookup(FUEL_POLICY_MAP, raw) ?? raw;
}

export function tCategory(raw?: string | null): string {
  if (!raw) return "";
  return lookup(CATEGORY_MAP, raw) ?? raw;
}

export function tExtra(raw?: string | null): string {
  if (!raw) return "";
  const s = raw.trim();
  return lookup(EXTRA_MAP, s) ?? s;
}

export function tChecklist(raw?: string | null): string {
  if (!raw) return "";
  return lookup(CHECKLIST_MAP, raw) ?? raw;
}

export function tBreakdown(raw?: string | null): string {
  if (!raw) return "";
  return lookup(BREAKDOWN_MAP, raw) ?? raw;
}

export function tPayment(raw?: string | null): string {
  if (!raw) return "";
  return lookup(PAYMENT_MAP, raw) ?? raw;
}

export function tFee(raw?: string | null): string {
  if (!raw) return "";
  const s = raw.trim();
  const direct = lookup(FEE_MAP, s);
  if (direct) return direct;
  // uppercase enum ("DEPOSIT", "MILEAGE") comum em fees
  const lower = s.toLowerCase().replace(/_/g, " ");
  return lookup(FEE_MAP, lower) ?? s;
}

// "N x Large Bag" / "N x Small Bag" -> "N mala(s) grande(s)" etc.
export function tBaggage(raw?: string | null): string {
  if (!raw) return "";
  const s = raw.trim();
  const m = s.match(/^(\d+)\s*x\s*(large|small|medium)\s*bag/i);
  if (m) {
    const n = Number(m[1]);
    const size = m[2].toLowerCase();
    const label =
      size === "large" ? "grande" : size === "small" ? "pequena" : "média";
    const plural = n === 1 ? "" : "s";
    return `${n} mala${plural} ${label}${plural}`;
  }
  return s;
}

// "N miles per rental" / "unlimited"
export function tMileage(raw?: string | null): string {
  if (!raw) return "";
  const s = raw.trim();
  if (/unlimited/i.test(s)) return "Quilometragem ilimitada";
  const m = s.match(/([\d.,]+)\s*miles?\s*(?:per\s*rental)?/i);
  if (m) return `${m[1]} milhas por aluguel`;
  const km = s.match(/([\d.,]+)\s*km/i);
  if (km) return `${km[1]} km incluídos no aluguel`;
  return s;
}

// "Free cancellation up to N hours before pick-up"
export function tFreeCancellation(raw?: string | null): string {
  if (!raw) return "";
  const s = raw.trim();
  const m = s.match(/(\d+)\s*hours?\s*before\s*pick[-\s]?up/i);
  if (m) return `Cancelamento grátis até ${m[1]} horas antes da retirada`;
  if (/free cancellation/i.test(s)) return "Cancelamento grátis";
  return s;
}

// "or similar large car" -> "ou similar · categoria Grande"
export function tGroupOrSimilar(raw?: string | null): string {
  if (!raw) return "";
  const s = raw.trim();
  const m = s.match(
    /or similar\s+(economy|compact|intermediate|standard|full-?size|premium|luxury|minivan|suv|small|medium|large|midsize|mid-size)\b/i,
  );
  if (m) {
    const size = tCategory(m[1]);
    return `ou similar · categoria ${size}`;
  }
  if (/or similar/i.test(s)) return "ou similar";
  return s;
}

// Traduz frases inteiras que costumam vir cruas
export function tGeneric(raw?: string | null): string {
  if (!raw) return "";
  let s = raw;
  // RCF · substitui referência TPL
  if (RCF_REGEX.test(s)) {
    s = s.replace(RCF_REGEX, "Responsabilidade civil obrigatória (RCF)");
  }
  return s;
}

// Placeholder padrão para imagem de veículo indisponível.
// Ícone de carro estilizado, fundo neutro compatível com dark/light via SVG inline.
export const CAR_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 100'>
      <rect width='160' height='100' fill='hsl(210 20% 96%)'/>
      <g fill='hsl(215 15% 65%)' transform='translate(30 30)'>
        <path d='M12 20c0-2 1-4 3-5l6-3h48l6 3c2 1 3 3 3 5v14H12V20z' opacity='0.35'/>
        <rect x='8' y='30' width='84' height='10' rx='3' opacity='0.55'/>
        <circle cx='26' cy='44' r='6'/>
        <circle cx='74' cy='44' r='6'/>
      </g>
    </svg>`,
  );

// True quando existirem 2+ URLs realmente diferentes (não só variantes de tamanho).
export function hasMultipleDistinctPhotos(urls: (string | undefined | null)[]): boolean {
  const norm = new Set<string>();
  for (const u of urls) {
    if (typeof u !== "string" || !u) continue;
    // ignora variação de tamanho no nome do arquivo (ex: _lrg / _sml / _med)
    const key = u.replace(/_(lrg|sml|med|small|large|medium|thumb)\b/gi, "").toLowerCase();
    norm.add(key);
  }
  return norm.size > 1;
}
