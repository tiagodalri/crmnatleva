import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Calendar,
  MapPin,
  Users,
  Globe,
  Briefcase,
  Phone,
  Ticket,
  Tag,
  Link2,
  Star,
  CheckCircle,
  X,
  Backpack,
  ShieldAlert,
  FileText,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import HotelPhotoGallery from "@/components/proposal/HotelPhotoGallery";
import { cn } from "@/lib/utils";

interface ItemShape {
  title?: string;
  description?: string;
  image_url?: string;
  data?: Record<string, any>;
}

interface Props {
  item: ItemShape;
  kind: "tour" | "ticket";
  onItemChange: (key: "title" | "description" | "image_url", value: string) => void;
  onDataChange: (key: string, value: any) => void;
}

const TOUR_CATEGORIES = [
  "Passeio de barco", "City tour", "Trilha / Caminhada", "Mergulho / Snorkel",
  "Gastronômico", "Cultural / Museu", "Aventura", "Bike tour",
  "Helicóptero", "4x4 / Off-road", "Pôr do sol", "Show / Espetáculo",
  "Parque temático", "Outro",
];
const TICKET_CATEGORIES = [
  "Parque temático", "Museu", "Atração turística", "Show / Espetáculo",
  "Esporte / Evento", "Mirante / Observação", "Aquário", "Outro",
];
const SUGGESTED_INCLUDES_TOUR = [
  "Transporte ida e volta do hotel", "Guia bilíngue credenciado",
  "Equipamentos de segurança", "Seguro de responsabilidade civil",
  "Água mineral durante o passeio", "Lanche / refeição",
  "Entradas e ingressos das atrações",
];
const SUGGESTED_EXCLUDES_TOUR = [
  "Gorjetas", "Refeições não mencionadas", "Bebidas alcoólicas",
  "Despesas pessoais", "Itens de uso pessoal",
];
const SUGGESTED_WHAT_TO_BRING = [
  "Roupa de banho", "Toalha", "Protetor solar", "Repelente",
  "Tênis fechado", "Roupa leve e confortável", "Documento com foto",
  "Câmera fotográfica", "Dinheiro para extras",
];

/* ───────────── Collapsible Section ───────────── */
function Section({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {badge !== undefined && badge !== 0 && badge !== "" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground line-clamp-1">{subtitle}</p>}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">{children}</div>}
    </div>
  );
}

/* ───────────── Chip list with suggestions ───────────── */
function ChipList({
  items, onChange, placeholder, suggestions,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (!t || items.includes(t)) return;
    onChange([...items, t]);
    setInput("");
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(input); }
          }}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
        <Button size="sm" type="button" variant="outline" onClick={() => add(input)} className="h-9 gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </Button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-accent/10 text-accent text-xs border border-accent/20"
            >
              {it}
              <button
                type="button"
                onClick={() => remove(i)}
                className="w-4 h-4 rounded-full hover:bg-accent/20 inline-flex items-center justify-center"
                aria-label="Remover"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {suggestions && suggestions.filter((s) => !items.includes(s)).length > 0 && (
        <div className="pt-1">
          <p className="text-[10.5px] text-muted-foreground/80 mb-1.5">Sugestões rápidas · toque para adicionar</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.filter((s) => !items.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="text-[11px] px-2 py-1 rounded-full border border-dashed border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TourQuickFields({ item, kind, onItemChange, onDataChange }: Props) {
  const d = item.data || {};
  const isTicket = kind === "ticket";
  const labelMain = isTicket ? "Ingresso" : "Passeio";

  const highlights: string[] = Array.isArray(d.highlights) ? d.highlights : [];
  const includes: string[] = Array.isArray(d.includes) ? d.includes : (d.includes ? [String(d.includes)] : []);
  const excludes: string[] = Array.isArray(d.excludes) ? d.excludes : [];
  const whatToBring: string[] = Array.isArray(d.what_to_bring) ? d.what_to_bring : [];
  const gallery: any[] = Array.isArray(d.gallery) ? d.gallery : [];

  const categoriesList = isTicket ? TICKET_CATEGORIES : TOUR_CATEGORIES;

  const dateBadge = d.start_date || d.date ? "ok" : "";
  const providerBadge = d.provider ? "ok" : "";

  return (
    <div className="space-y-3">
      {/* ═══ ESSENCIAL · sempre visível ═══ */}
      <div className="rounded-xl border-2 border-accent/30 bg-gradient-to-br from-accent/[0.04] to-transparent p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-accent">Essencial</span>
          <span className="text-[10.5px] text-muted-foreground ml-auto">Já dá pra mostrar uma proposta linda</span>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Nome do {labelMain.toLowerCase()} <span className="text-destructive">*</span>
          </Label>
          <Input
            value={item.title || ""}
            onChange={(e) => onItemChange("title", e.target.value)}
            placeholder={isTicket ? "Ex.: Ingresso Cristo Redentor + Trem do Corcovado" : "Ex.: Passeio de Barco em Arraial do Cabo"}
            className="h-11 font-medium text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] flex items-center gap-1"><Tag className="w-3 h-3" /> Categoria</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={d.category || ""}
              onChange={(e) => onDataChange("category", e.target.value)}
            >
              <option value="">Selecione...</option>
              {categoriesList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Duração</Label>
            <Input
              value={d.duration || ""}
              onChange={(e) => onDataChange("duration", e.target.value)}
              placeholder="Ex.: 4 horas"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Descrição da experiência</Label>
          <Textarea
            rows={5}
            value={item.description || ""}
            onChange={(e) => onItemChange("description", e.target.value)}
            placeholder={
              isTicket
                ? "Descreva o que o cliente vai vivenciar com esse ingresso · pode ser longo, vai aparecer inteiro na proposta."
                : "Conte como é a experiência · ritmo, paisagens, o que faz esse passeio ser inesquecível. Pode escrever à vontade, vai aparecer completo na proposta."
            }
            className="resize-y leading-relaxed"
          />
          <p className="text-[10.5px] text-muted-foreground/80">
            Sem limite de tamanho · use parágrafos para uma leitura agradável.
          </p>
        </div>

        {/* Foto de capa rápida */}
        <div className="space-y-1.5">
          <Label className="text-[11px] flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> Foto de capa (URL ou use a galeria abaixo)
          </Label>
          <Input
            value={item.image_url || ""}
            onChange={(e) => onItemChange("image_url", e.target.value)}
            placeholder="https://..."
            className="h-10 text-sm"
          />
        </div>
      </div>

      {/* ═══ Seções opcionais · recolhíveis ═══ */}
      <Section
        title="Destaques da experiência"
        subtitle="3 a 5 pontos altos · viram chips no card"
        icon={<Star className="w-4 h-4" />}
        badge={highlights.length || undefined}
        defaultOpen={highlights.length > 0}
      >
        <ChipList
          items={highlights}
          onChange={(next) => onDataChange("highlights", next)}
          placeholder="Ex.: Parada para banho na Praia do Farol"
        />
      </Section>

      <Section
        title="Quando & onde"
        subtitle={d.start_date || d.location ? `${d.start_date || ""} ${d.location ? "· " + d.location : ""}` : "Data, horário, local e ponto de encontro"}
        icon={<Calendar className="w-4 h-4" />}
        badge={dateBadge ? "✓" : undefined}
        defaultOpen={!!(d.start_date || d.location || d.meeting_point)}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Data</Label>
            <Input type="date" value={d.start_date || d.date || ""} onChange={(e) => onDataChange("start_date", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Início</Label>
            <Input type="time" value={d.start_time || ""} onChange={(e) => onDataChange("start_time", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Fim</Label>
            <Input type="time" value={d.end_time || ""} onChange={(e) => onDataChange("end_time", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Users className="w-3 h-3" /> Pessoas</Label>
            <Input type="number" min={1} value={d.guests || ""} onChange={(e) => onDataChange("guests", Number(e.target.value) || undefined)} placeholder="2" className="h-9" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3" /> Local / cidade</Label>
            <Input value={d.location || ""} onChange={(e) => onDataChange("location", e.target.value)} placeholder="Ex.: Arraial do Cabo, RJ" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3" /> Ponto de encontro</Label>
            <Input value={d.meeting_point || ""} onChange={(e) => onDataChange("meeting_point", e.target.value)} placeholder="Ex.: Marina dos Pescadores" className="h-9" />
          </div>
        </div>
      </Section>

      <Section
        title="O que está incluso"
        subtitle="Liste o que está no preço"
        icon={<CheckCircle className="w-4 h-4" />}
        badge={includes.length || undefined}
        defaultOpen={includes.length > 0}
      >
        <ChipList
          items={includes}
          onChange={(next) => onDataChange("includes", next)}
          placeholder="Ex.: Guia bilíngue"
          suggestions={SUGGESTED_INCLUDES_TOUR}
        />
      </Section>

      <Section
        title="Não está incluso"
        subtitle="Evita surpresas para o cliente"
        icon={<X className="w-4 h-4" />}
        badge={excludes.length || undefined}
        defaultOpen={excludes.length > 0}
      >
        <ChipList
          items={excludes}
          onChange={(next) => onDataChange("excludes", next)}
          placeholder="Ex.: Gorjetas"
          suggestions={SUGGESTED_EXCLUDES_TOUR}
        />
      </Section>

      <Section
        title="O que levar"
        subtitle="Dicas práticas que fazem diferença"
        icon={<Backpack className="w-4 h-4" />}
        badge={whatToBring.length || undefined}
        defaultOpen={whatToBring.length > 0}
      >
        <ChipList
          items={whatToBring}
          onChange={(next) => onDataChange("what_to_bring", next)}
          placeholder="Ex.: Protetor solar"
          suggestions={SUGGESTED_WHAT_TO_BRING}
        />
      </Section>

      <Section
        title="Política & observações"
        subtitle="Cancelamento, restrições, avisos"
        icon={<ShieldAlert className="w-4 h-4" />}
        badge={d.cancellation_policy || d.notes ? "✓" : undefined}
        defaultOpen={!!(d.cancellation_policy || d.notes)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Política de cancelamento</Label>
            <Textarea
              rows={2}
              value={d.cancellation_policy || ""}
              onChange={(e) => onDataChange("cancellation_policy", e.target.value)}
              placeholder="Ex.: Cancelamento gratuito até 48h antes do passeio."
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Observações importantes</Label>
            <Textarea
              rows={2}
              value={d.notes || ""}
              onChange={(e) => onDataChange("notes", e.target.value)}
              placeholder="Ex.: Não recomendado para gestantes ou pessoas com mobilidade reduzida."
              className="text-sm"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Fornecedor & reserva"
        subtitle="Operadora, contato, código · 🔒 uso interno"
        icon={<Briefcase className="w-4 h-4" />}
        badge={providerBadge ? "✓" : undefined}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Operadora / Fornecedor</Label>
            <Input value={d.provider || ""} onChange={(e) => onDataChange("provider", e.target.value)} placeholder="Ex.: Marlin Tour" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</Label>
            <Input value={d.provider_phone || ""} onChange={(e) => onDataChange("provider_phone", e.target.value)} placeholder="(22) 99999-9999" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Globe className="w-3 h-3" /> Idioma do guia</Label>
            <Input value={d.guide_language || ""} onChange={(e) => onDataChange("guide_language", e.target.value)} placeholder="Português, Inglês..." className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Ticket className="w-3 h-3" /> Código de reserva</Label>
            <Input value={d.locator || d.reservation_code || ""} onChange={(e) => onDataChange("locator", e.target.value)} placeholder="Ex.: AB123XYZ" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Tipo</Label>
            <Input
              value={d.ticket_type || ""}
              onChange={(e) => onDataChange("ticket_type", e.target.value)}
              placeholder={isTicket ? "Ex.: Inteira, Fast Pass" : "Ex.: Compartilhado, Privativo"}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Link2 className="w-3 h-3" /> Link / Voucher</Label>
            <Input value={d.booking_url || ""} onChange={(e) => onDataChange("booking_url", e.target.value)} placeholder="https://..." className="h-9" />
          </div>
        </div>
      </Section>

      <Section
        title="Galeria de fotos"
        subtitle="A capa aparece em destaque no topo do card"
        icon={<ImageIcon className="w-4 h-4" />}
        badge={gallery.length || undefined}
        defaultOpen={gallery.length > 0}
      >
        <HotelPhotoGallery
          photos={gallery}
          coverUrl={item.image_url || ""}
          onPhotosChange={(next) => onDataChange("gallery", next)}
          onCoverChange={(url) => onItemChange("image_url", url)}
        />
      </Section>
    </div>
  );
}
