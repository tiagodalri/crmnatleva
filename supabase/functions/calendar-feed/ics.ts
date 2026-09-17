// Montagem do calendário iCal (sem acesso a banco — só recebe os dados e devolve o texto .ics).

export interface FeedSale {
  id: string;
  display_id: string | null;
  name: string | null;
  client_id: string | null;
  status: string | null;
  departure_date: string | null;
  return_date: string | null;
  origin_iata: string | null;
  destination_iata: string | null;
  locators: string[] | null;
  hotel_name: string | null;
  hotel_city: string | null;
  hotel_address: string | null;
  hotel_checkin_date: string | null;
  hotel_checkout_date: string | null;
  hotel_reservation_code: string | null;
  updated_at: string | null;
}

export interface FeedSegment {
  id: string;
  sale_id: string;
  direction: string | null;
  segment_order: number | null;
  airline: string | null;
  flight_number: string | null;
  origin_iata: string;
  destination_iata: string;
  departure_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  duration_minutes: number | null;
  flight_class: string | null;
  terminal: string | null;
}

export interface FeedClient {
  display_name: string | null;
  phone: string | null;
}

export interface FeedInput {
  calName: string;
  appUrl: string;
  sales: FeedSale[];
  segments: FeedSegment[];
  clients: Record<string, FeedClient>;
  passengers: Record<string, string[]>;
  now?: Date;
}

// ─── Fusos dos aeroportos (cópia de src/lib/airportTimezones.ts + FEN, ADZ e NQZ) ───

export const AIRPORT_TZ: Record<string, string> = {
  GRU: "America/Sao_Paulo", CGH: "America/Sao_Paulo", VCP: "America/Sao_Paulo",
  GIG: "America/Sao_Paulo", SDU: "America/Sao_Paulo",
  CNF: "America/Sao_Paulo", PLU: "America/Sao_Paulo",
  BSB: "America/Sao_Paulo", CWB: "America/Sao_Paulo", POA: "America/Sao_Paulo",
  FLN: "America/Sao_Paulo", NAT: "America/Sao_Paulo", REC: "America/Recife",
  SSA: "America/Bahia", FOR: "America/Fortaleza", BEL: "America/Belem",
  MAO: "America/Manaus", CGB: "America/Cuiaba", CGR: "America/Campo_Grande",
  PMW: "America/Sao_Paulo", GYN: "America/Sao_Paulo", VIX: "America/Sao_Paulo",
  IGU: "America/Sao_Paulo", MCZ: "America/Maceio", AJU: "America/Maceio",
  THE: "America/Fortaleza", SLZ: "America/Fortaleza", JPA: "America/Fortaleza",
  PVH: "America/Porto_Velho", RBR: "America/Rio_Branco", BVB: "America/Boa_Vista",
  MCP: "America/Belem", PNZ: "America/Recife",
  IOS: "America/Bahia", LDB: "America/Sao_Paulo", JOI: "America/Sao_Paulo",
  NVT: "America/Sao_Paulo", XAP: "America/Sao_Paulo", UDI: "America/Sao_Paulo",
  RAO: "America/Sao_Paulo", BPS: "America/Bahia", PNB: "America/Belem",
  FEN: "America/Noronha",

  EZE: "America/Argentina/Buenos_Aires", AEP: "America/Argentina/Buenos_Aires",
  SCL: "America/Santiago", LIM: "America/Lima", BOG: "America/Bogota",
  UIO: "America/Guayaquil", GYE: "America/Guayaquil",
  CCS: "America/Caracas", MVD: "America/Montevideo",
  ASU: "America/Asuncion", LPB: "America/La_Paz", VVI: "America/La_Paz",
  CTG: "America/Bogota", MDE: "America/Bogota", CLO: "America/Bogota",
  MZQ: "America/Argentina/Buenos_Aires", COR: "America/Argentina/Buenos_Aires",
  USH: "America/Argentina/Ushuaia", IGR: "America/Argentina/Buenos_Aires",
  CUZ: "America/Lima", AQP: "America/Lima",
  CCP: "America/Santiago", IPC: "Pacific/Easter",
  ADZ: "America/Bogota",

  JFK: "America/New_York", LGA: "America/New_York", EWR: "America/New_York",
  BOS: "America/New_York", PHL: "America/New_York", IAD: "America/New_York",
  DCA: "America/New_York", BWI: "America/New_York", ATL: "America/New_York",
  MIA: "America/New_York", FLL: "America/New_York", MCO: "America/New_York",
  TPA: "America/New_York", CLT: "America/New_York", RDU: "America/New_York",
  DTW: "America/Detroit", CLE: "America/New_York", PIT: "America/New_York",
  ORD: "America/Chicago", MDW: "America/Chicago", MSP: "America/Chicago",
  STL: "America/Chicago", MCI: "America/Chicago", IAH: "America/Chicago",
  HOU: "America/Chicago", DAL: "America/Chicago", DFW: "America/Chicago",
  AUS: "America/Chicago", SAT: "America/Chicago", MEM: "America/Chicago",
  BNA: "America/Chicago", MSY: "America/Chicago",
  DEN: "America/Denver", SLC: "America/Denver", PHX: "America/Phoenix",
  ABQ: "America/Denver", LAS: "America/Los_Angeles",
  LAX: "America/Los_Angeles", SFO: "America/Los_Angeles",
  SAN: "America/Los_Angeles", SJC: "America/Los_Angeles", OAK: "America/Los_Angeles",
  SEA: "America/Los_Angeles", PDX: "America/Los_Angeles",
  ANC: "America/Anchorage", HNL: "Pacific/Honolulu", OGG: "Pacific/Honolulu",
  YYZ: "America/Toronto", YUL: "America/Toronto", YOW: "America/Toronto",
  YVR: "America/Vancouver", YYC: "America/Edmonton", YEG: "America/Edmonton",
  YHZ: "America/Halifax", YWG: "America/Winnipeg",
  MEX: "America/Mexico_City", CUN: "America/Cancun", GDL: "America/Mexico_City",
  MTY: "America/Monterrey", PVR: "America/Mexico_City", SJD: "America/Mazatlan",
  HAV: "America/Havana", SDQ: "America/Santo_Domingo", PUJ: "America/Santo_Domingo",
  SJU: "America/Puerto_Rico", NAS: "America/Nassau", MBJ: "America/Jamaica",
  KIN: "America/Jamaica", BGI: "America/Barbados", AUA: "America/Aruba",
  CUR: "America/Curacao", PTP: "America/Guadeloupe",

  LHR: "Europe/London", LGW: "Europe/London", STN: "Europe/London",
  LTN: "Europe/London", LCY: "Europe/London", MAN: "Europe/London",
  EDI: "Europe/London", DUB: "Europe/Dublin",
  CDG: "Europe/Paris", ORY: "Europe/Paris", BVA: "Europe/Paris",
  NCE: "Europe/Paris", LYS: "Europe/Paris", MRS: "Europe/Paris",
  TLS: "Europe/Paris", BOD: "Europe/Paris",
  AMS: "Europe/Amsterdam", BRU: "Europe/Brussels", LUX: "Europe/Luxembourg",
  FRA: "Europe/Berlin", MUC: "Europe/Berlin", BER: "Europe/Berlin",
  HAM: "Europe/Berlin", DUS: "Europe/Berlin", CGN: "Europe/Berlin",
  STR: "Europe/Berlin", NUE: "Europe/Berlin", HAJ: "Europe/Berlin",
  ZRH: "Europe/Zurich", GVA: "Europe/Zurich", BSL: "Europe/Zurich",
  VIE: "Europe/Vienna", SZG: "Europe/Vienna", INN: "Europe/Vienna",
  MAD: "Europe/Madrid", BCN: "Europe/Madrid", AGP: "Europe/Madrid",
  PMI: "Europe/Madrid", VLC: "Europe/Madrid", SVQ: "Europe/Madrid",
  BIO: "Europe/Madrid", IBZ: "Europe/Madrid", LPA: "Atlantic/Canary",
  TFS: "Atlantic/Canary", TFN: "Atlantic/Canary", ACE: "Atlantic/Canary",
  LIS: "Europe/Lisbon", OPO: "Europe/Lisbon", FAO: "Europe/Lisbon",
  FNC: "Atlantic/Madeira", PDL: "Atlantic/Azores",
  FCO: "Europe/Rome", CIA: "Europe/Rome", MXP: "Europe/Rome",
  LIN: "Europe/Rome", BGY: "Europe/Rome", VCE: "Europe/Rome",
  NAP: "Europe/Rome", BLQ: "Europe/Rome", FLR: "Europe/Rome",
  PSA: "Europe/Rome", CTA: "Europe/Rome", PMO: "Europe/Rome",
  ATH: "Europe/Athens", SKG: "Europe/Athens", HER: "Europe/Athens",
  JTR: "Europe/Athens", JMK: "Europe/Athens",
  CPH: "Europe/Copenhagen", BLL: "Europe/Copenhagen",
  ARN: "Europe/Stockholm", BMA: "Europe/Stockholm", GOT: "Europe/Stockholm",
  OSL: "Europe/Oslo", BGO: "Europe/Oslo",
  HEL: "Europe/Helsinki",
  KEF: "Atlantic/Reykjavik",
  WAW: "Europe/Warsaw", KRK: "Europe/Warsaw", GDN: "Europe/Warsaw",
  PRG: "Europe/Prague", BUD: "Europe/Budapest", OTP: "Europe/Bucharest",
  SOF: "Europe/Sofia", BEG: "Europe/Belgrade", ZAG: "Europe/Zagreb",
  LJU: "Europe/Ljubljana", SKP: "Europe/Skopje", TIA: "Europe/Tirane",
  IST: "Europe/Istanbul", SAW: "Europe/Istanbul", AYT: "Europe/Istanbul",
  ESB: "Europe/Istanbul", ADB: "Europe/Istanbul",
  SVO: "Europe/Moscow", DME: "Europe/Moscow", VKO: "Europe/Moscow",
  LED: "Europe/Moscow", KBP: "Europe/Kiev", IEV: "Europe/Kiev",
  MLA: "Europe/Malta", LCA: "Asia/Nicosia",

  DXB: "Asia/Dubai", DWC: "Asia/Dubai", AUH: "Asia/Dubai",
  DOH: "Asia/Qatar", BAH: "Asia/Bahrain", KWI: "Asia/Kuwait",
  RUH: "Asia/Riyadh", JED: "Asia/Riyadh", MED: "Asia/Riyadh",
  MCT: "Asia/Muscat", AMM: "Asia/Amman", BEY: "Asia/Beirut",
  TLV: "Asia/Jerusalem", CAI: "Africa/Cairo",
  IKA: "Asia/Tehran", THR: "Asia/Tehran",
  BOM: "Asia/Kolkata", DEL: "Asia/Kolkata", BLR: "Asia/Kolkata",
  MAA: "Asia/Kolkata", CCU: "Asia/Kolkata", HYD: "Asia/Kolkata",
  COK: "Asia/Kolkata", GOI: "Asia/Kolkata",
  CMB: "Asia/Colombo", MLE: "Indian/Maldives", KTM: "Asia/Kathmandu",
  DAC: "Asia/Dhaka", KHI: "Asia/Karachi", LHE: "Asia/Karachi", ISB: "Asia/Karachi",
  BKK: "Asia/Bangkok", DMK: "Asia/Bangkok", HKT: "Asia/Bangkok",
  CNX: "Asia/Bangkok", USM: "Asia/Bangkok", KBV: "Asia/Bangkok",
  SIN: "Asia/Singapore", KUL: "Asia/Kuala_Lumpur", PEN: "Asia/Kuala_Lumpur",
  CGK: "Asia/Jakarta", DPS: "Asia/Makassar", SUB: "Asia/Jakarta",
  MNL: "Asia/Manila", CEB: "Asia/Manila",
  HAN: "Asia/Ho_Chi_Minh", SGN: "Asia/Ho_Chi_Minh", DAD: "Asia/Ho_Chi_Minh",
  PNH: "Asia/Phnom_Penh", REP: "Asia/Phnom_Penh", VTE: "Asia/Vientiane",
  RGN: "Asia/Yangon",
  HKG: "Asia/Hong_Kong", MFM: "Asia/Macau", TPE: "Asia/Taipei",
  KHH: "Asia/Taipei",
  PVG: "Asia/Shanghai", SHA: "Asia/Shanghai", PEK: "Asia/Shanghai",
  PKX: "Asia/Shanghai", CAN: "Asia/Shanghai", SZX: "Asia/Shanghai",
  CTU: "Asia/Shanghai", XIY: "Asia/Shanghai", CKG: "Asia/Shanghai",
  HGH: "Asia/Shanghai", WUH: "Asia/Shanghai", KMG: "Asia/Shanghai",
  ICN: "Asia/Seoul", GMP: "Asia/Seoul", PUS: "Asia/Seoul", CJU: "Asia/Seoul",
  NRT: "Asia/Tokyo", HND: "Asia/Tokyo", KIX: "Asia/Tokyo", ITM: "Asia/Tokyo",
  NGO: "Asia/Tokyo", FUK: "Asia/Tokyo", CTS: "Asia/Tokyo", OKA: "Asia/Tokyo",
  ULN: "Asia/Ulaanbaatar",
  TAS: "Asia/Tashkent", ALA: "Asia/Almaty",
  NQZ: "Asia/Almaty",

  SYD: "Australia/Sydney", MEL: "Australia/Melbourne", BNE: "Australia/Brisbane",
  PER: "Australia/Perth", ADL: "Australia/Adelaide", CBR: "Australia/Sydney",
  OOL: "Australia/Brisbane", CNS: "Australia/Brisbane", DRW: "Australia/Darwin",
  HBA: "Australia/Hobart", AKL: "Pacific/Auckland", WLG: "Pacific/Auckland",
  CHC: "Pacific/Auckland", ZQN: "Pacific/Auckland",
  NAN: "Pacific/Fiji", PPT: "Pacific/Tahiti",

  JNB: "Africa/Johannesburg", CPT: "Africa/Johannesburg", DUR: "Africa/Johannesburg",
  NBO: "Africa/Nairobi", ADD: "Africa/Addis_Ababa", DAR: "Africa/Dar_es_Salaam",
  ZNZ: "Africa/Dar_es_Salaam", JRO: "Africa/Dar_es_Salaam", EBB: "Africa/Kampala",
  KGL: "Africa/Kigali", MPM: "Africa/Maputo",
  CMN: "Africa/Casablanca", RAK: "Africa/Casablanca", TNG: "Africa/Casablanca",
  TUN: "Africa/Tunis", ALG: "Africa/Algiers",
  LOS: "Africa/Lagos", ABV: "Africa/Lagos", ACC: "Africa/Accra",
  DKR: "Africa/Dakar", LFW: "Africa/Lome",
  MRU: "Indian/Mauritius", SEZ: "Indian/Mahe",
};

function tzOffsetMinutes(timezone: string, date: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const map: Record<string, string> = {};
    dtf.formatToParts(date).forEach((p) => { if (p.type !== "literal") map[p.type] = p.value; });
    const asUTC = Date.UTC(
      parseInt(map.year), parseInt(map.month) - 1, parseInt(map.day),
      parseInt(map.hour === "24" ? "0" : map.hour), parseInt(map.minute), parseInt(map.second),
    );
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return -180;
  }
}

/** Hora local do aeroporto → instante UTC. Aeroporto desconhecido = horário de Brasília. */
export function airportLocalToUTC(iata: string | null, dateStr: string, timeStr: string): Date | null {
  const [y, mo, d] = dateStr.slice(0, 10).split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  if (!y || !mo || !d || isNaN(h) || isNaN(mi)) return null;
  const naive = Date.UTC(y, mo - 1, d, h, mi, 0);
  const tz = AIRPORT_TZ[(iata || "").toUpperCase().trim()] || "America/Sao_Paulo";
  const first = tzOffsetMinutes(tz, new Date(naive));
  const second = tzOffsetMinutes(tz, new Date(naive - first * 60000));
  return new Date(naive - second * 60000);
}

// ─── Formato iCal ───

function esc(value: string): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

// Quebra de linha a cada 75 bytes (RFC 5545).
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    if (bytes + size > 75) {
      out.push(current);
      current = " " + ch;
      bytes = 1 + size;
    } else {
      current += ch;
      bytes += size;
    }
  }
  if (current) out.push(current);
  return out.join("\r\n");
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function dateValue(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}

function brDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function hhmm(time: string | null): string | null {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

function directionLabel(direction: string | null): string {
  if (direction === "volta") return "Volta";
  if (direction === "ida") return "Ida";
  return direction || "Trecho";
}

interface CalEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  lastModified: Date;
  allDay?: string; // YYYY-MM-DD
  start?: Date;
  end?: Date;
  alarms?: string[]; // ex.: "-P1D"
}

export function buildCalendar(input: FeedInput): string {
  const now = input.now ?? new Date();
  const stamp = utcStamp(now);

  const segmentsBySale = new Map<string, FeedSegment[]>();
  for (const seg of input.segments) {
    const list = segmentsBySale.get(seg.sale_id) ?? [];
    list.push(seg);
    segmentsBySale.set(seg.sale_id, list);
  }
  for (const list of segmentsBySale.values()) {
    list.sort((a, b) =>
      `${a.departure_date ?? ""} ${a.departure_time ?? ""} ${String(a.segment_order ?? 0).padStart(3, "0")}`
        .localeCompare(`${b.departure_date ?? ""} ${b.departure_time ?? ""} ${String(b.segment_order ?? 0).padStart(3, "0")}`),
    );
  }

  const events: CalEvent[] = [];

  for (const sale of input.sales) {
    const client = sale.client_id ? input.clients[sale.client_id] : undefined;
    const clientName = (client?.display_name || sale.name || "Cliente").trim();
    const pax = input.passengers[sale.id] ?? [];
    const extraPax = pax.length > 1 ? ` (+${pax.length - 1})` : "";
    const draft = sale.status === "Rascunho" ? " [Rascunho]" : "";
    const saleUrl = `${input.appUrl}/sales/${sale.id}`;
    const lastModified = sale.updated_at ? new Date(sale.updated_at) : now;
    // Remove trechos duplicados (mesmo voo cadastrado duas vezes)
    const seen = new Set<string>();
    const segs = (segmentsBySale.get(sale.id) ?? []).filter((s) => {
      const key = [s.direction, s.flight_number, s.origin_iata, s.destination_iata, s.departure_date, s.departure_time].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const locators = [...new Set((sale.locators ?? []).filter(Boolean))].join(", ");

    const commonLines = [
      `Venda: ${sale.name || "—"}${sale.display_id ? ` (${sale.display_id})` : ""}${draft}`,
      client?.display_name ? `Cliente: ${client.display_name}` : null,
      client?.phone ? `Telefone: ${client.phone}` : null,
      pax.length ? `Passageiros: ${pax.join(", ")}` : null,
      locators ? `Localizador: ${locators}` : null,
    ];
    const withLink = (lines: (string | null)[]) =>
      [...lines, `Abrir venda: ${saleUrl}`].filter(Boolean).join("\n");

    // ✈️ Cada trecho de voo
    for (const seg of segs) {
      const date = isoDate(seg.departure_date);
      if (!date) continue;
      const depTime = hhmm(seg.departure_time);
      const arrTime = hhmm(seg.arrival_time);
      const flight = (seg.flight_number || seg.airline || "Voo").trim();
      const route = `${seg.origin_iata}→${seg.destination_iata}`;
      const details = withLink([
        ...commonLines,
        `Trecho: ${directionLabel(seg.direction)} · ${route}`,
        `Partida: ${brDate(date)} ${depTime ?? "(horário não cadastrado)"} (hora local ${seg.origin_iata})`,
        arrTime ? `Chegada: ${arrTime} (hora local ${seg.destination_iata})` : null,
        seg.airline ? `Companhia: ${seg.airline}` : null,
        seg.flight_class ? `Classe: ${seg.flight_class}` : null,
        seg.terminal ? `Terminal: ${seg.terminal}` : null,
      ]);
      const base = {
        uid: `${seg.id}-voo@natleva`,
        summary: `✈️ ${flight} ${route} – ${clientName}${extraPax}${draft}`,
        description: details,
        location: `Aeroporto ${seg.origin_iata}`,
        url: saleUrl,
        lastModified,
      };

      const start = depTime ? airportLocalToUTC(seg.origin_iata, date, depTime) : null;
      if (!start) {
        events.push({ ...base, allDay: date });
        continue;
      }
      let end: Date | null = null;
      if (arrTime) {
        end = airportLocalToUTC(seg.destination_iata, date, arrTime);
        let guard = 0;
        while (end && end.getTime() <= start.getTime() && guard < 3) {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
          guard++;
        }
      }
      if (!end && seg.duration_minutes) end = new Date(start.getTime() + seg.duration_minutes * 60000);
      if (!end) end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      events.push({ ...base, start, end, alarms: ["-P1D", "-PT3H"] });
    }

    // 🛫 Dia da ida / 🛬 dia da volta
    const idaSegs = segs.filter((s) => s.direction !== "volta");
    const voltaSegs = segs.filter((s) => s.direction === "volta");
    const idaDate = isoDate(sale.departure_date) || isoDate(idaSegs[0]?.departure_date ?? null);
    const voltaDate = isoDate(sale.return_date) || isoDate(voltaSegs[0]?.departure_date ?? null);

    if (idaDate) {
      const from = idaSegs[0]?.origin_iata || sale.origin_iata || "";
      const to = idaSegs[idaSegs.length - 1]?.destination_iata || sale.destination_iata || "";
      const route = from && to ? ` – ${from} → ${to}` : "";
      events.push({
        uid: `${sale.id}-ida@natleva`,
        summary: `🛫 Embarque: ${clientName}${extraPax}${route}${draft}`,
        description: withLink(commonLines),
        location: from ? `Aeroporto ${from}` : "",
        url: saleUrl,
        lastModified,
        allDay: idaDate,
      });
    }
    if (voltaDate) {
      const from = voltaSegs[0]?.origin_iata || sale.destination_iata || "";
      const to = voltaSegs[voltaSegs.length - 1]?.destination_iata || sale.origin_iata || "";
      const route = from && to ? ` – ${from} → ${to}` : "";
      events.push({
        uid: `${sale.id}-volta@natleva`,
        summary: `🛬 Retorno: ${clientName}${extraPax}${route}${draft}`,
        description: withLink(commonLines),
        location: from ? `Aeroporto ${from}` : "",
        url: saleUrl,
        lastModified,
        allDay: voltaDate,
      });
    }

    // 🏨 Hotel
    const hotel = (sale.hotel_name || "Hotel").trim();
    const hotelLines = withLink([
      ...commonLines,
      `Hotel: ${hotel}${sale.hotel_city ? ` (${sale.hotel_city})` : ""}`,
      sale.hotel_reservation_code ? `Reserva do hotel: ${sale.hotel_reservation_code}` : null,
      sale.hotel_checkin_date ? `Check-in: ${brDate(sale.hotel_checkin_date.slice(0, 10))}` : null,
      sale.hotel_checkout_date ? `Check-out: ${brDate(sale.hotel_checkout_date.slice(0, 10))}` : null,
    ]);
    const hotelLocation = sale.hotel_address || [sale.hotel_name, sale.hotel_city].filter(Boolean).join(", ");
    const checkin = isoDate(sale.hotel_checkin_date);
    const checkout = isoDate(sale.hotel_checkout_date);
    if (checkin) {
      events.push({
        uid: `${sale.id}-hotel-in@natleva`,
        summary: `🏨 Check-in: ${hotel} – ${clientName}${draft}`,
        description: hotelLines, location: hotelLocation, url: saleUrl, lastModified, allDay: checkin,
      });
    }
    if (checkout) {
      events.push({
        uid: `${sale.id}-hotel-out@natleva`,
        summary: `🧳 Check-out: ${hotel} – ${clientName}${draft}`,
        description: hotelLines, location: hotelLocation, url: saleUrl, lastModified, allDay: checkout,
      });
    }
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NatLeva//Viagens Feed//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(input.calName)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const ev of events) {
    const modified = isNaN(ev.lastModified.getTime()) ? now : ev.lastModified;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${utcStamp(modified)}`,
      `SEQUENCE:${Math.floor(modified.getTime() / 1000)}`,
    );
    if (ev.allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${dateValue(ev.allDay)}`,
        `DTEND;VALUE=DATE:${nextDay(ev.allDay)}`,
        "TRANSP:TRANSPARENT",
      );
    } else if (ev.start && ev.end) {
      lines.push(`DTSTART:${utcStamp(ev.start)}`, `DTEND:${utcStamp(ev.end)}`, "TRANSP:OPAQUE");
    }
    lines.push(
      `SUMMARY:${esc(ev.summary)}`,
      `LOCATION:${esc(ev.location)}`,
      `DESCRIPTION:${esc(ev.description)}`,
      `URL:${ev.url}`,
      "STATUS:CONFIRMED",
    );
    for (const trigger of ev.alarms ?? []) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(ev.summary)}`,
        `TRIGGER:${trigger}`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
