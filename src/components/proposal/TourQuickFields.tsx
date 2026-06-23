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
} from "lucide-react";
import HotelPhotoGallery from "@/components/proposal/HotelPhotoGallery";

interface ItemShape {
  title?: string;
  description?: string;
  image_url?: string;
  data?: Record<string, any>;
}

interface Props {
  item: ItemShape;
  /** kind = "tour" or "ticket" — only affects placeholders and labels. */
  kind: "tour" | "ticket";
  onItemChange: (key: "title" | "description" | "image_url", value: string) => void;
  onDataChange: (key: string, value: any) => void;
}

const TOUR_CATEGORIES = [
  "Passeio de barco",
  "City tour",
  "Trilha / Caminhada",
  "Mergulho / Snorkel",
  "Gastronômico",
  "Cultural / Museu",
  "Aventura",
  "Bike tour",
  "Helicóptero",
  "4x4 / Off-road",
  "Pôr do sol",
  "Show / Espetáculo",
  "Parque temático",
  "Outro",
];

const TICKET_CATEGORIES = [
  "Parque temático",
  "Museu",
  "Atração turística",
  "Show / Espetáculo",
  "Esporte / Evento",
  "Mirante / Observação",
  "Aquário",
  "Outro",
];

const SUGGESTED_INCLUDES_TOUR = [
  "Transporte ida e volta do hotel",
  "Guia bilíngue credenciado",
  "Equipamentos de segurança",
  "Seguro de responsabilidade civil",
  "Água mineral durante o passeio",
  "Lanche / refeição",
  "Entradas e ingressos das atrações",
];

const SUGGESTED_EXCLUDES_TOUR = [
  "Gorjetas",
  "Refeições não mencionadas",
  "Bebidas alcoólicas",
  "Despesas pessoais",
  "Itens de uso pessoal",
];

const SUGGESTED_WHAT_TO_BRING = [
  "Roupa de banho",
  "Toalha",
  "Protetor solar",
  "Repelente",
  "Tênis fechado",
  "Roupa leve e confortável",
  "Documento com foto",
  "Câmera fotográfica",
  "Dinheiro para extras",
];

function StringListEditor({
  label,
  icon,
  items,
  onChange,
  placeholder,
  suggestions,
  emptyHint,
  tone = "muted",
}: {
  label: string;
  icon: React.ReactNode;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  suggestions?: string[];
  emptyHint?: string;
  tone?: "accent" | "muted" | "danger";
}) {
  const update = (i: number, value: string) => onChange(items.map((it, idx) => (idx === i ? value : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = (value = "") => onChange([...items, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon} {label} {items.length > 0 && <span className="text-muted-foreground/60">· {items.length}</span>}
        </Label>
        <div className="flex items-center gap-1.5">
          {suggestions && suggestions.length > 0 && (
            <select
              className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                add(v);
                e.currentTarget.value = "";
              }}
            >
              <option value="">+ Sugestão</option>
              {suggestions.filter((s) => !items.includes(s)).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={() => add()} className="h-7 gap-1 text-xs">
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3 bg-background rounded-lg border border-dashed border-border/50">
          {emptyHint || "Nenhum item adicionado"}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={it}
                onChange={(e) => update(i, e.target.value)}
                placeholder={placeholder}
                className="h-8 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => remove(i)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TourQuickFields({ item, kind, onItemChange, onDataChange }: Props) {
  const d = item.data || {};
  const isTicket = kind === "ticket";

  const highlights: string[] = Array.isArray(d.highlights) ? d.highlights : [];
  const includes: string[] = Array.isArray(d.includes) ? d.includes : (d.includes ? [String(d.includes)] : []);
  const excludes: string[] = Array.isArray(d.excludes) ? d.excludes : [];
  const whatToBring: string[] = Array.isArray(d.what_to_bring) ? d.what_to_bring : [];
  const gallery: any[] = Array.isArray(d.gallery) ? d.gallery : [];

  const categoriesList = isTicket ? TICKET_CATEGORIES : TOUR_CATEGORIES;
  const labelMain = isTicket ? "Ingresso" : "Passeio";

  return (
    <div className="space-y-5 rounded-xl border border-border/50 bg-muted/10 p-3.5">
      {/* ── Identidade ── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent" />
              Título do {labelMain.toLowerCase()} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={item.title || ""}
              onChange={(e) => onItemChange("title", e.target.value)}
              placeholder={isTicket ? "Ex.: Ingresso Cristo Redentor + Trem do Corcovado" : "Ex.: Passeio de Barco em Arraial do Cabo"}
              className="font-medium"
            />
            <p className="text-[10.5px] text-muted-foreground/80">
              Este é o título que aparece em destaque no card da proposta.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><Tag className="w-3 h-3" /> Categoria</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={d.category || ""}
              onChange={(e) => onDataChange("category", e.target.value)}
            >
              <option value="">Selecione...</option>
              {categoriesList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><Clock className="w-3 h-3" /> Duração</Label>
            <Input
              value={d.duration || ""}
              onChange={(e) => onDataChange("duration", e.target.value)}
              placeholder="Ex.: 4 horas, dia inteiro"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea
            rows={3}
            value={item.description || ""}
            onChange={(e) => onItemChange("description", e.target.value)}
            placeholder={
              isTicket
                ? "Conte rapidamente o que o cliente vai vivenciar com este ingresso..."
                : "Conte como é a experiência, o que torna esse passeio especial..."
            }
          />
          <p className="text-[10.5px] text-muted-foreground/80">
            Aparece como subtítulo do card. Mantenha entre 1 e 3 linhas para melhor leitura.
          </p>
        </div>
      </div>

      {/* ── Quando & Onde ── */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Quando & Onde
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Data</Label>
            <Input type="date" value={d.start_date || d.date || ""} onChange={(e) => onDataChange("start_date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Horário início</Label>
            <Input type="time" value={d.start_time || ""} onChange={(e) => onDataChange("start_time", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Horário fim</Label>
            <Input type="time" value={d.end_time || ""} onChange={(e) => onDataChange("end_time", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Users className="w-3 h-3" /> Pessoas</Label>
            <Input
              type="number"
              min={1}
              value={d.guests || ""}
              onChange={(e) => onDataChange("guests", Number(e.target.value) || undefined)}
              placeholder="Ex.: 2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3" /> Local / cidade</Label>
            <Input
              value={d.location || ""}
              onChange={(e) => onDataChange("location", e.target.value)}
              placeholder="Ex.: Arraial do Cabo, RJ"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3" /> Ponto de encontro</Label>
            <Input
              value={d.meeting_point || ""}
              onChange={(e) => onDataChange("meeting_point", e.target.value)}
              placeholder="Ex.: Marina dos Pescadores, Rua X, 123"
            />
          </div>
        </div>
      </div>

      {/* ── Fornecedor & Detalhes ── */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="w-3 h-3" /> Fornecedor & Detalhes
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Operadora / Fornecedor</Label>
            <Input
              value={d.provider || ""}
              onChange={(e) => onDataChange("provider", e.target.value)}
              placeholder="Ex.: Marlin Tour"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</Label>
            <Input
              value={d.provider_phone || ""}
              onChange={(e) => onDataChange("provider_phone", e.target.value)}
              placeholder="(22) 99999-9999"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Globe className="w-3 h-3" /> Idioma do guia</Label>
            <Input
              value={d.guide_language || ""}
              onChange={(e) => onDataChange("guide_language", e.target.value)}
              placeholder="Português, Inglês..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Ticket className="w-3 h-3" /> Código de reserva</Label>
            <Input
              value={d.locator || d.reservation_code || ""}
              onChange={(e) => onDataChange("locator", e.target.value)}
              placeholder="Ex.: AB123XYZ"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Tipo / Categoria interna</Label>
            <Input
              value={d.ticket_type || ""}
              onChange={(e) => onDataChange("ticket_type", e.target.value)}
              placeholder={isTicket ? "Ex.: Inteira, Fast Pass" : "Ex.: Compartilhado, Privativo"}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1"><Link2 className="w-3 h-3" /> Link / Voucher</Label>
            <Input
              value={d.booking_url || ""}
              onChange={(e) => onDataChange("booking_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* ── Destaques ── */}
      <StringListEditor
        label="Destaques da experiência"
        icon={<Star className="w-3 h-3 text-accent" />}
        items={highlights}
        onChange={(next) => onDataChange("highlights", next)}
        placeholder="Ex.: Parada para banho na Praia do Farol"
        emptyHint="Adicione 3 a 5 destaques · aparecem em chips no card da proposta"
      />

      {/* ── Inclui / Não inclui ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StringListEditor
          label="O que está incluso"
          icon={<CheckCircle className="w-3 h-3 text-accent" />}
          items={includes}
          onChange={(next) => onDataChange("includes", next)}
          placeholder="Ex.: Guia bilíngue"
          suggestions={SUGGESTED_INCLUDES_TOUR}
          emptyHint="Liste tudo que está no preço"
        />
        <StringListEditor
          label="Não está incluso"
          icon={<X className="w-3 h-3 text-muted-foreground" />}
          items={excludes}
          onChange={(next) => onDataChange("excludes", next)}
          placeholder="Ex.: Gorjetas"
          suggestions={SUGGESTED_EXCLUDES_TOUR}
          emptyHint="Evita surpresas para o cliente"
        />
      </div>

      {/* ── O que levar ── */}
      <StringListEditor
        label="O que levar"
        icon={<Backpack className="w-3 h-3 text-accent" />}
        items={whatToBring}
        onChange={(next) => onDataChange("what_to_bring", next)}
        placeholder="Ex.: Protetor solar"
        suggestions={SUGGESTED_WHAT_TO_BRING}
        emptyHint="Dica prática que faz toda a diferença"
      />

      {/* ── Política & Observações ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-accent" /> Política de cancelamento
          </Label>
          <Textarea
            rows={3}
            value={d.cancellation_policy || ""}
            onChange={(e) => onDataChange("cancellation_policy", e.target.value)}
            placeholder="Ex.: Cancelamento gratuito até 48h antes do passeio."
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-accent" /> Observações importantes
          </Label>
          <Textarea
            rows={3}
            value={d.notes || ""}
            onChange={(e) => onDataChange("notes", e.target.value)}
            placeholder="Ex.: Não recomendado para gestantes ou pessoas com mobilidade reduzida."
            className="text-xs"
          />
        </div>
      </div>

      {/* ── Galeria ── */}
      <div className="space-y-2 rounded-xl border border-border/50 bg-background p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> Galeria de fotos
          </Label>
          <span className="text-[10.5px] text-muted-foreground/80">
            A primeira foto marcada como capa aparece no topo do card.
          </span>
        </div>
        <HotelPhotoGallery
          photos={gallery}
          coverUrl={item.image_url || ""}
          onPhotosChange={(next) => onDataChange("gallery", next)}
          onCoverChange={(url) => onItemChange("image_url", url)}
        />
      </div>
    </div>
  );
}
