/**
 * Confirmation Vouchers (Hotel & Aéreo) — visual replica of the Gamma PDF template.
 * Uses inline styles so html2canvas/html2pdf render an identical, isolated layout
 * regardless of the host app's Tailwind theme.
 *
 * Two flavours:
 *  - <HotelVoucher />   — one per hotel/lodging entry
 *  - <AereoVoucher />   — one consolidated air voucher with all flight segments
 */
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { Backpack, Briefcase, Luggage, Clock, MessageCircle, AlertCircle, ShieldCheck, Shield, MapPin, Ticket, Car, Ship, Train, Bus, Package, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import logoNatleva from "@/assets/logo-natleva.png";
import { normalizePassengerName } from "@/lib/nameUtils";

// Brand palette extracted from the original PDF
const GREEN = "#1f5f3a";
const GREEN_DARK = "#0f3d24";
const TEXT = "#1f5f3a";
const ROW_ALT = "#f3f5f1";
const BORDER = "#e2e6df";
const SOFT_BG = "#ffffff";

const baseFont = {
  fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
  color: TEXT,
  letterSpacing: 0,
  fontFeatureSettings: "normal",
  WebkitFontSmoothing: "antialiased" as const,
};

const page: CSSProperties = {
  ...baseFont,
  width: 794,
  padding: "32px 40px 40px",
  background: SOFT_BG,
  boxSizing: "border-box",
};

const h1: CSSProperties = {
  fontFamily: baseFont.fontFamily,
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1.15,
  margin: 0,
  color: GREEN_DARK,
  letterSpacing: "-0.01em",
};
const sub: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: GREEN,
  marginTop: 8,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const headerRule: CSSProperties = {
  height: 3,
  width: 56,
  background: GREEN,
  borderRadius: 2,
  marginTop: 18,
  marginBottom: 4,
};
const h2: CSSProperties = {
  fontFamily: baseFont.fontFamily,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.25,
  color: GREEN_DARK,
  marginTop: 40,
  marginBottom: 22,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
const card: CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  overflow: "hidden",
  background: SOFT_BG,
};
const oneLine: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const ROW_H = 44;
const HEAD_H = 40;

const cellHead: CSSProperties = {
  padding: "0 16px",
  height: HEAD_H,
  lineHeight: `${HEAD_H}px`,
  fontSize: 11,
  fontWeight: 700,
  color: GREEN_DARK,
  background: ROW_ALT,
  textAlign: "left",
  borderBottom: `1px solid ${BORDER}`,
  boxSizing: "border-box",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};
const cell: CSSProperties = {
  padding: "0 16px",
  height: ROW_H,
  lineHeight: `${ROW_H}px`,
  fontSize: 12.5,
  color: "#1f2937",
  borderBottom: `1px solid ${BORDER}`,
  boxSizing: "border-box",
  overflow: "hidden",
};
const labelCell: CSSProperties = { ...cell, ...oneLine, fontWeight: 700, color: GREEN_DARK, width: "38%" };

const tableRow = (background: string, borderBottom: string): CSSProperties => ({
  display: "grid",
  background,
  borderBottom,
});

// cellInner mantém compatibilidade com chamadas existentes: apenas passa-through de estilo.
const cellInner: CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const centeredCellInner: CSSProperties = {
  ...cellInner,
  textAlign: "center",
};

const headerCellInner: CSSProperties = {
  ...cellInner,
};

const centeredHeaderCellInner: CSSProperties = {
  ...centeredCellInner,
};


const voucherPageStyle = (_exportMode?: boolean): CSSProperties => ({
  ...page,
});



function renderPassengerName(name?: string | null): string {
  return normalizePassengerName(name) || "—";
}

const logoBlock = (
  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 36 }}>
    <img src={logoNatleva} alt="NatLeva" style={{ height: 38, objectFit: "contain" }} crossOrigin="anonymous" />
  </div>
);

const fmtDateBR = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y.slice(2)}`;
};

const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

// ────────────────────────────────────────────────────────────────────────────
// HOTEL VOUCHER
// ────────────────────────────────────────────────────────────────────────────
export interface HotelVoucherData {
  hotel_name?: string | null;
  meal_plan?: string | null;
  room_type?: string | null;
  reservation_code?: string | null;
  pin_code?: string | null;
  address?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
  guests: Array<{ name: string; doc?: string | null }>;
  checkin_time?: string;
  checkout_time?: string;
  doc_note?: string;
}

export const HotelVoucher = forwardRef<HTMLDivElement, { data: HotelVoucherData; exportMode?: boolean }>(
  ({ data, exportMode }, ref) => {
    const rows: Array<[string, string]> = [
      ["Hotel:", data.hotel_name || "—"],
      ["Alimentação:", data.meal_plan || "—"],
      ["Tipo de quarto:", data.room_type || "—"],
      ["Número de reserva:", data.reservation_code || "—"],
      ["Código pin:", data.pin_code || "—"],
    ];
    return (
      <div ref={ref} data-voucher-page="true" style={voucherPageStyle(exportMode)}>
        <div data-pdf-section style={{ breakInside: "avoid" }}>
          {logoBlock}
          <div style={sub}>Voucher de Hospedagem</div>
          <h1 style={{ ...h1, marginTop: 6 }}>Confirmação de Reserva</h1>
          <div style={headerRule} />
        </div>


        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações Básicas</h2>
          <div style={card}>
            {rows.map(([k, v], i) => (
              <div
                key={k}
                style={{
                  ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === rows.length - 1 ? "none" : `1px solid ${BORDER}`),
                  gridTemplateColumns: "38% 62%",
                }}
              >
                <div style={{ ...labelCell, width: "auto", borderBottom: "none" }} title={k}><div style={cellInner}>{k}</div></div>
                <div style={{ ...cell, ...oneLine, borderBottom: "none", fontWeight: 600 }} title={v}><div style={cellInner}>{v}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações do Hóspede</h2>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={cellHead}><div style={headerCellInner}>Nome completo:</div></div>
              <div style={cellHead}><div style={headerCellInner}>Documento:</div></div>
            </div>
            {data.guests.length === 0 ? (
              <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
                Nenhum hóspede cadastrado.
              </div>
            ) : (
              data.guests.map((g, i) => (
                <div
                  key={i}
                  style={{
                    ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === data.guests.length - 1 ? "none" : `1px solid ${BORDER}`),
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={renderPassengerName(g.name)}><div style={cellInner}>{renderPassengerName(g.name)}</div></div>
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={g.doc || "—"}><div style={cellInner}>{g.doc || "—"}</div></div>
                </div>
              ))
            )}
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Detalhes da Hospedagem</h2>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr" }}>
              <div style={{ ...cellHead, ...oneLine }}><div style={headerCellInner}>Endereço:</div></div>
              <div style={{ ...cellHead, ...oneLine }}><div style={headerCellInner}>Data de Chegada:</div></div>
              <div style={{ ...cellHead, ...oneLine }}><div style={headerCellInner}>Data de Saída:</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr" }}>
              <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={data.address || "—"}><div style={cellInner}>{data.address || "—"}</div></div>
              <div style={{ ...cell, ...oneLine, borderBottom: "none" }}><div style={cellInner}>{fmtDateBR(data.checkin_date)}</div></div>
              <div style={{ ...cell, ...oneLine, borderBottom: "none" }}><div style={cellInner}>{fmtDateBR(data.checkout_date)}</div></div>
            </div>
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações importantes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 4 }}>
            <InfoLine
              icon={<Clock size={18} color={GREEN} strokeWidth={1.8} />}
              title="Horários"
              lines={[
                `Check-in: a partir das ${data.checkin_time || "15:00"}`,
                `Check-out: até às ${data.checkout_time || "12:00"}`,
              ]}
            />
            <InfoLine
              icon={<ShieldCheck size={18} color={GREEN} strokeWidth={1.8} />}
              title="Documentação"
              lines={[data.doc_note || "Apresente seu passaporte no momento do check-in."]}
            />
          </div>
        </div>
      </div>
    );
  },
);
HotelVoucher.displayName = "HotelVoucher";

// ────────────────────────────────────────────────────────────────────────────
// AÉREO VOUCHER
// ────────────────────────────────────────────────────────────────────────────
export interface AereoVoucherData {
  flight_class?: string | null;
  emission_date?: string | null;
  reservation_code?: string | null;
  passengers: Array<{ name: string; type?: string | null; doc?: string | null }>;
  segments: Array<{
    flight_number?: string | null;
    origin_label?: string;
    origin_iata?: string | null;
    destination_label?: string;
    destination_iata?: string | null;
    airline?: string | null;
    date?: string | null;
    departure_time?: string | null;
    arrival_time?: string | null;
  }>;
}

export const AereoVoucher = forwardRef<HTMLDivElement, { data: AereoVoucherData; exportMode?: boolean }>(
  ({ data, exportMode }, ref) => {
    const basics: Array<[string, string]> = [
      ["Classe:", data.flight_class || "Econômica"],
      ["Data da emissão:", fmtDateBR(data.emission_date)],
      ["Código Reserva :", data.reservation_code || "—"],
    ];
    return (
      <div ref={ref} data-voucher-page="true" style={voucherPageStyle(exportMode)}>
        <div data-pdf-section style={{ breakInside: "avoid" }}>
          {logoBlock}
          <div style={sub}>Voucher de Viagem</div>
          <h1 style={{ ...h1, marginTop: 6 }}>Confirmação de Reserva</h1>
          <div style={headerRule} />
        </div>


        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações Básicas</h2>
          <div style={card}>
            {basics.map(([k, v], i) => (
              <div
                key={k}
                style={{
                  ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === basics.length - 1 ? "none" : `1px solid ${BORDER}`),
                  gridTemplateColumns: "38% 62%",
                }}
              >
                <div style={{ ...labelCell, width: "auto", borderBottom: "none" }} title={k}><div style={cellInner}>{k}</div></div>
                <div style={{ ...cell, ...oneLine, borderBottom: "none", fontWeight: 600 }} title={v}><div style={cellInner}>{v}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações dos Passageiros</h2>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr" }}>
              <div style={cellHead}><div style={headerCellInner}>Nome completo:</div></div>
              <div style={cellHead}><div style={headerCellInner}>Tipo de passageiro:</div></div>
              <div style={cellHead}><div style={headerCellInner}>Documento:</div></div>
            </div>
            {data.passengers.length === 0 ? (
              <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
                Nenhum passageiro cadastrado.
              </div>
            ) : (
              data.passengers.map((p, i) => (
                <div
                  key={i}
                  style={{
                    ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === data.passengers.length - 1 ? "none" : `1px solid ${BORDER}`),
                    gridTemplateColumns: "2fr 1fr 1fr",
                  }}
                >
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={renderPassengerName(p.name)}><div style={cellInner}>{renderPassengerName(p.name)}</div></div>
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }}><div style={cellInner}>{p.type || "Adulto"}</div></div>
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={p.doc || "—"}><div style={cellInner}>{p.doc || "—"}</div></div>
                </div>
              ))
            )}
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Detalhes da Viagem</h2>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 1fr 1fr 1fr 1fr" }}>
              {["Voo:", "De:", "Para:", "Cia:", "Data:", "Partida:", "Chegada:"].map((t, i) => (
                <div
                  key={t}
                  style={{
                    ...cellHead,
                    textAlign: i === 0 ? "left" : "center",
                    justifyContent: i === 0 ? "flex-start" : "center",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                  }}
                >
                  <div style={i === 0 ? headerCellInner : centeredHeaderCellInner}>{t}</div>
                </div>
              ))}
            </div>
            {data.segments.length === 0 ? (
              <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
                Nenhum trecho cadastrado.
              </div>
            ) : (
              data.segments.map((s, i) => {
                const cells = [
                  s.flight_number || "—",
                  s.origin_label || s.origin_iata || "—",
                  s.destination_label || s.destination_iata || "—",
                  s.airline || "—",
                  fmtDateBR(s.date),
                  fmtTime(s.departure_time),
                  fmtTime(s.arrival_time),
                ];
                return (
                  <div
                    key={i}
                    style={{
                      ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === data.segments.length - 1 ? "none" : `1px solid ${BORDER}`),
                      gridTemplateColumns: "1fr 2fr 2fr 1fr 1fr 1fr 1fr",
                    }}
                  >
                    {cells.map((c, j) => (
                      <div
                        key={j}
                        style={{
                          ...cell,
                          borderBottom: "none",
                          textAlign: j === 0 ? "left" : "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: 11.5,
                          padding: "0 8px",
                          minHeight: 42,
                        }}
                        title={String(c)}
                      >
                        <div style={j === 0 ? cellInner : centeredCellInner}>{c}</div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Bagagens Incluídas (por passageiro)</h2>
          <div style={{ display: "flex", gap: 24, marginTop: 6 }}>
            <Bag
              icon={<Backpack size={28} color={GREEN} strokeWidth={1.6} />}
              title="1 item pessoal (10kg)"
              desc="Deve ser acomodado sob o assento"
            />
            <Bag
              icon={<Briefcase size={28} color={GREEN} strokeWidth={1.6} />}
              title="1 bagagem de mão (12kg)"
              desc="Levado na cabine do avião"
            />
            <Bag
              icon={<Luggage size={28} color={GREEN} strokeWidth={1.6} />}
              title="1 bagagem despachada (23kg)"
              desc="Entregue no check-in"
            />
          </div>

          <div style={{ marginTop: 28, fontSize: 14, fontWeight: 800, color: GREEN_DARK }}>Medidas:</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 14 }}>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK }}>Item pessoal:</div>
              <div style={{ fontSize: 12, color: "#1f2937", marginTop: 4, lineHeight: 1.6 }}>
                Altura: 45 cm x Comprimento: 35 cm x Largura: 20 cm, incluindo os bolsos, as rodas, a alça, etc. (17,8 x 13,8 x 7,9 in).
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK }}>Bagagem de mão:</div>
              <div style={{ fontSize: 12, color: "#1f2937", marginTop: 4, lineHeight: 1.6 }}>
                Altura: 55 cm x Comprimento: 35 cm x Largura: 25 cm, incluindo os bolsos, as rodas, a alça, etc. (21,6 x 13,8 x 9,8 in).
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK }}>Bagagem despachada:</div>
              <div style={{ fontSize: 12, color: "#1f2937", marginTop: 4, lineHeight: 1.6 }}>
                Soma das três dimensões (altura + largura + comprimento) até 158 cm lineares e peso máximo de 23 kg por volume.
              </div>
            </div>
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Check-in Automático</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 4 }}>
            <InfoLine
              icon={<Clock size={18} color={GREEN} strokeWidth={1.8} />}
              title="24 Horas Antes"
              lines={["Realizamos o check-in automaticamente um dia antes da sua partida."]}
            />
            <InfoLine
              icon={<MessageCircle size={18} color={GREEN} strokeWidth={1.8} />}
              title="Cartão de Embarque"
              lines={["Enviamos seus cartões de embarque diretamente pelo WhatsApp."]}
            />
            <InfoLine
              icon={<AlertCircle size={18} color={GREEN} strokeWidth={1.8} />}
              title="Exceções"
              lines={[
                "Eventualmente a companhia aérea pode exigir check-in presencial para verificação de documentos.",
              ]}
            />
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Alterações</h2>
          <p style={paragraph}>
            O Cliente pode solicitar alterações no itinerário sujeitas à disponibilidade e às políticas
            de cancelamento dos prestadores de serviços. O cliente é responsável por quaisquer custos
            adicionais associados a tais alterações.
          </p>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Cancelamento</h2>
          <p style={paragraph}>
            Em caso de cancelamento por parte do Cliente, a Agência não efetuará reembolsos, exceto
            quando permitido pelas políticas dos prestadores de serviços envolvidos. O cliente será
            responsável por todas as despesas de cancelamento, taxas ou penalidades aplicáveis.
          </p>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <div
            style={{
              marginTop: 24,
              background: "#eaf3ec",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "22px 26px 24px",
            }}
          >
            <div
              style={{
                ...h2,
                marginTop: 0,
                marginBottom: 14,
              }}
            >
              Política de No-Show
            </div>
            <p style={{ ...paragraph, margin: 0 }}>
              Em caso de não comparecimento (no-show), a Agência não efetuará reembolsos e não será
              responsável por quaisquer custos ou despesas adicionais incorridas pelo cliente devido a
              esse não comparecimento. Em caso de não comparecimento, as incidências são:
            </p>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Perda total do valor pago",
                "Cancelamento automático da reserva",
                "Impossibilidade de remarcação",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "#1f2937",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: GREEN,
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
AereoVoucher.displayName = "AereoVoucher";

// ────────────────────────────────────────────────────────────────────────────
// Shared bits
// ────────────────────────────────────────────────────────────────────────────
const paragraph: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "#1f2937",
  margin: "4px 0 0",
};

function InfoLine({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: `1.5px solid ${GREEN}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: GREEN,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: GREEN_DARK }}>{title}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: "#1f2937", marginTop: 2 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bag({ icon, title, desc, dims }: { icon: React.ReactNode; title: string; desc: string; dims?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color: GREEN, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK, marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#1f2937", marginTop: 2 }}>{desc}</div>
      {dims && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2, fontStyle: "italic" }}>{dims}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// GENERIC VOUCHER — usado para qualquer produto que NÃO seja hotel/aéreo
// (seguro viagem, passeios, transfer, aluguel de carro, cruzeiro, ingressos,
// trem, ônibus, roteiros personalizados, serviços extras, etc.)
// ────────────────────────────────────────────────────────────────────────────

export type GenericServiceSlug =
  | "seguro-viagem"
  | "passeios"
  | "ingressos"
  | "transfer"
  | "aluguel-carro"
  | "cruzeiro"
  | "trem"
  | "onibus"
  | "bagagem"
  | "assento-conforto"
  | "roteiro-personalizado"
  | "servicos-extras"
  | "pacote"
  | "outros"
  | "generico";

export interface GenericVoucherPreset {
  headerLabel: string;    // "Voucher de Seguro Viagem"
  title: string;          // "Confirmação de Serviço"
  sectionTitle: string;   // "Detalhes do Seguro"
  icon: LucideIcon;
}

export const GENERIC_PRESETS: Record<GenericServiceSlug, GenericVoucherPreset> = {
  "seguro-viagem":       { headerLabel: "Voucher de Seguro Viagem",   title: "Confirmação de Cobertura", sectionTitle: "Detalhes da Cobertura", icon: Shield },
  "passeios":            { headerLabel: "Voucher de Passeio",         title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Passeio",   icon: MapPin },
  "ingressos":           { headerLabel: "Voucher de Ingresso",        title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Ingresso",  icon: Ticket },
  "transfer":            { headerLabel: "Voucher de Transfer",        title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Transfer",  icon: Car },
  "aluguel-carro":       { headerLabel: "Voucher de Aluguel de Carro",title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Aluguel",   icon: Car },
  "cruzeiro":            { headerLabel: "Voucher de Cruzeiro",        title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Cruzeiro",  icon: Ship },
  "trem":                { headerLabel: "Voucher de Passagem de Trem",title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Trecho",    icon: Train },
  "onibus":              { headerLabel: "Voucher de Passagem de Ônibus",title: "Confirmação de Reserva", sectionTitle: "Detalhes do Trecho",    icon: Bus },
  "bagagem":             { headerLabel: "Voucher de Bagagem Extra",   title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: Luggage },
  "assento-conforto":    { headerLabel: "Voucher de Assento Conforto",title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: Sparkles },
  "roteiro-personalizado":{headerLabel: "Voucher de Roteiro",         title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Roteiro",   icon: MapPin },
  "servicos-extras":     { headerLabel: "Voucher de Serviço",         title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: Sparkles },
  "pacote":              { headerLabel: "Voucher de Pacote",          title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Pacote",    icon: Package },
  "outros":              { headerLabel: "Voucher de Serviço",         title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: Package },
  "generico":            { headerLabel: "Voucher de Serviço",         title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: Package },
};

export interface GenericVoucherData {
  slug: GenericServiceSlug;
  service_name: string;             // ex.: nome do passeio, seguradora, cia de cruzeiro
  supplier?: string | null;
  reservation_code?: string | null;
  description?: string | null;      // texto livre descrevendo o produto
  location?: string | null;         // cidade/endereço/porto/local do passeio
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  category_label?: string | null;   // ex.: "Categoria do carro", "Cabine", "Cobertura"
  category_value?: string | null;
  extras?: Array<[string, string]>; // pares customizados adicionais
  passengers: Array<{ name: string; doc?: string | null; type?: string | null }>;
  notes?: string | null;
}

export const GenericVoucher = forwardRef<HTMLDivElement, { data: GenericVoucherData; exportMode?: boolean }>(
  ({ data, exportMode }, ref) => {
    const preset = GENERIC_PRESETS[data.slug] || GENERIC_PRESETS["generico"];
    const Icon = preset.icon;

    const period = (() => {
      const a = fmtDateBR(data.start_date);
      const b = fmtDateBR(data.end_date);
      if (a !== "—" && b !== "—" && a !== b) return `${a} → ${b}`;
      if (a !== "—") return a;
      return "—";
    })();

    const times = (() => {
      const a = data.start_time ? fmtTime(data.start_time) : "";
      const b = data.end_time ? fmtTime(data.end_time) : "";
      if (a && b) return `${a} · ${b}`;
      return a || b || "—";
    })();

    const basics: Array<[string, string]> = [
      ["Serviço:", data.service_name || preset.headerLabel],
      ...(data.supplier ? [["Fornecedor:", data.supplier] as [string, string]] : []),
      ...(data.category_label && data.category_value
        ? [[`${data.category_label}:`, data.category_value] as [string, string]]
        : []),
      ["Código da reserva:", data.reservation_code || "—"],
      ["Período:", period],
      ...(times !== "—" ? [["Horário:", times] as [string, string]] : []),
      ...(data.location ? [["Local:", data.location] as [string, string]] : []),
      ...(data.extras || []),
    ];

    return (
      <div ref={ref} data-voucher-page="true" style={voucherPageStyle(exportMode)}>
        <div data-pdf-section style={{ breakInside: "avoid" }}>
          {logoBlock}
          <div style={sub}>{preset.headerLabel}</div>
          <h1 style={{ ...h1, marginTop: 6 }}>{preset.title}</h1>
          <div style={headerRule} />
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações Básicas</h2>
          <div style={card}>
            {basics.map(([k, v], i) => (
              <div
                key={`${k}-${i}`}
                style={{
                  ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === basics.length - 1 ? "none" : `1px solid ${BORDER}`),
                  gridTemplateColumns: "38% 62%",
                }}
              >
                <div style={{ ...labelCell, width: "auto", borderBottom: "none" }} title={k}><div style={cellInner}>{k}</div></div>
                <div style={{ ...cell, borderBottom: "none", fontWeight: 600, wordBreak: "break-word" }} title={v}><div style={cellInner}>{v}</div></div>
              </div>
            ))}
          </div>
        </div>

        {data.description && (
          <div data-pdf-section style={{ breakInside: "avoid" }}>
            <h2 style={h2}>{preset.sectionTitle}</h2>
            <div style={card}>
              <div style={{ ...cell, borderBottom: "none", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {data.description}
              </div>
            </div>
          </div>
        )}

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Beneficiários</h2>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr" }}>
              <div style={cellHead}><div style={headerCellInner}>Nome completo:</div></div>
              <div style={cellHead}><div style={headerCellInner}>Tipo:</div></div>
              <div style={cellHead}><div style={headerCellInner}>Documento:</div></div>
            </div>
            {data.passengers.length === 0 ? (
              <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
                Nenhum beneficiário cadastrado.
              </div>
            ) : (
              data.passengers.map((p, i) => (
                <div
                  key={i}
                  style={{
                    ...tableRow(i % 2 === 0 ? "transparent" : ROW_ALT, i === data.passengers.length - 1 ? "none" : `1px solid ${BORDER}`),
                    gridTemplateColumns: "2fr 1fr 1fr",
                  }}
                >
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={renderPassengerName(p.name)}><div style={cellInner}>{renderPassengerName(p.name)}</div></div>
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }}><div style={cellInner}>{p.type || "Adulto"}</div></div>
                  <div style={{ ...cell, ...oneLine, borderBottom: "none" }} title={p.doc || "—"}><div style={cellInner}>{p.doc || "—"}</div></div>
                </div>
              ))
            )}
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Informações importantes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 4 }}>
            <InfoLine
              icon={<Icon size={18} color={GREEN} strokeWidth={1.8} />}
              title="Sobre este serviço"
              lines={[
                data.notes ||
                  "Apresente este voucher ao fornecedor no momento da utilização do serviço. Chegue com antecedência ao ponto de encontro/embarque.",
              ]}
            />
            <InfoLine
              icon={<AlertCircle size={18} color={GREEN} strokeWidth={1.8} />}
              title="Documentação"
              lines={["Tenha em mãos um documento oficial com foto e este voucher (impresso ou digital)."]}
            />
            <InfoLine
              icon={<MessageCircle size={18} color={GREEN} strokeWidth={1.8} />}
              title="Suporte"
              lines={["Em caso de dúvidas ou imprevistos, entre em contato com a NatLeva pelo WhatsApp."]}
            />
          </div>
        </div>

        <div data-pdf-section style={{ breakInside: "avoid" }}>
          <h2 style={h2}>Alterações e Cancelamento</h2>
          <p style={paragraph}>
            Solicitações de alteração ou cancelamento estão sujeitas à disponibilidade e às políticas do
            fornecedor deste serviço. Eventuais custos, taxas ou penalidades aplicáveis são de
            responsabilidade do cliente.
          </p>
        </div>
      </div>
    );
  },
);
GenericVoucher.displayName = "GenericVoucher";

