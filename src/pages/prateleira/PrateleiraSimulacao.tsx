/**
 * PrateleiraSimulacao
 * Etapa do funil bank-style: usuário "sobe ficha" pra simular parcelamento no boleto.
 * Fluxo:
 *  1. Intro · contexto + valor do pacote
 *  2. Ficha em steps (CPF · nome/nascimento · renda/estado civil · celular)
 *  3. Análise imersiva com progresso (bureaus, score, condições, propostas)
 *  4. Aprovação · confete + 3 propostas de parcelamento + CTA WhatsApp
 *
 * Sem chamadas de backend reais · a simulação é puramente cosmética pra criar
 * ansiedade e conduzir o lead pro consultor.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ShieldCheck,
  Lock,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileSearch,
  Landmark,
  Gauge,
  BadgeCheck,
  MessageCircle,
  Clock,
  User,
  Calendar,
  Wallet,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { buildWhatsAppLink } from "@/components/ui/phone-input";
import { resolveAgencyWhatsApp, DEFAULT_AGENCY_WHATSAPP } from "@/lib/natleva/whatsapp";
import { toast } from "sonner";
import { computeNatlevaPlan, paymentPlanOptionsFromTerms, formatMoneyBR } from "@/lib/prateleira/payment-plan";

// ============================================================
// Utilitários
// ============================================================
function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}
function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function maskDate(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}
function maskMoney(v: string) {
  const d = onlyDigits(v).slice(0, 9);
  if (!d) return "";
  const n = Number(d) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type ProductLite = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  whatsapp?: string | null;
};

const CIVIL_OPTIONS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável"];

// ============================================================
// Componente principal
// ============================================================
export default function PrateleiraSimulacao() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateProduct = (location.state as { product?: ProductLite } | null)?.product;

  const [product, setProduct] = useState<ProductLite | null>(stateProduct ?? null);
  const [loading, setLoading] = useState(!stateProduct);

  // Fase do fluxo · intro → ficha → analise → aprovado
  const [phase, setPhase] = useState<"intro" | "ficha" | "analise" | "aprovado">("intro");

  // Steps da ficha
  const [fichaStep, setFichaStep] = useState(0);

  // Dados do formulário
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [renda, setRenda] = useState("");
  const [civil, setCivil] = useState("");
  const [celular, setCelular] = useState("");

  // Carrega produto se não veio via state
  useEffect(() => {
    if (stateProduct || !slug) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("experience_products")
          .select("id, slug, title, price_from, price_promo, currency, whatsapp_number")
          .eq("slug", slug)
          .maybeSingle();
        if (data) {
          setProduct({
            id: data.id,
            slug: data.slug,
            title: data.title,
            price: Number(data.price_promo ?? data.price_from ?? 0),
            currency: data.currency ?? "BRL",
            whatsapp: data.whatsapp_number ?? null,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, stateProduct]);

  // Redireciona se sem produto após load
  useEffect(() => {
    if (!loading && !product && slug) {
      // sem produto · volta pra loja
      navigate(`/loja/${slug}`, { replace: true });
    }
  }, [loading, product, slug, navigate]);

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1f14]">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4b06a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1f14] text-slate-100 relative overflow-hidden">
      {/* Fundo bank-style · gradiente sutil + grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(212,176,106,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(45,107,67,0.28), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,176,106,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,176,106,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <TopBar onBack={() => navigate(`/loja/${slug}`)} />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pt-6 pb-16 sm:pt-10">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <IntroPhase
              key="intro"
              product={product}
              onStart={() => setPhase("ficha")}
            />
          )}
          {phase === "ficha" && (
            <FichaPhase
              key="ficha"
              step={fichaStep}
              setStep={setFichaStep}
              cpf={cpf}
              setCpf={setCpf}
              nome={nome}
              setNome={setNome}
              nascimento={nascimento}
              setNascimento={setNascimento}
              renda={renda}
              setRenda={setRenda}
              civil={civil}
              setCivil={setCivil}
              celular={celular}
              setCelular={setCelular}
              product={product}
              onFinish={() => setPhase("analise")}
            />
          )}
          {phase === "analise" && (
            <AnalisePhase key="analise" onDone={() => setPhase("aprovado")} />
          )}
          {phase === "aprovado" && (
            <AprovadoPhase
              key="aprovado"
              product={product}
              nome={nome}
              cpf={cpf}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================================
// Topo bank-style
// ============================================================
function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <header className="relative z-10 border-b border-white/10 bg-[#0d1f14]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5 text-[#d4b06a]" />
          Simulação segura · SSL 256 bits
        </div>
      </div>
    </header>
  );
}

// ============================================================
// Fase 1 · Intro
// ============================================================
function IntroPhase({ product, onStart }: { product: ProductLite; onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
      className="pt-4"
    >
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-[#d4b06a]/25 blur-2xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2d6b43] to-[#12331f] flex items-center justify-center shadow-2xl">
            <Landmark className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#d4b06a] font-semibold mb-2">
          Análise de crédito · Boleto NatLeva
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white leading-tight mb-3">
          Simule seu parcelamento em<br />poucos segundos
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          Analisamos seu perfil em tempo real e mostramos as melhores condições
          de parcelamento no boleto disponíveis pra você.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 mb-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#d4b06a] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Pacote analisado</p>
            <p className="text-sm font-semibold text-white leading-snug">{product.title}</p>
            <p className="text-lg font-semibold text-[#d4b06a] mt-2">
              {fmtBRL(product.price)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-8">
        {[
          { icon: Gauge, label: "Análise instantânea", desc: "resposta em menos de 30 segundos" },
          { icon: ShieldCheck, label: "Sem afetar seu score", desc: "consulta interna · não impacta o CPF" },
          { icon: BadgeCheck, label: "Até 12x no boleto", desc: "condições personalizadas pro seu perfil" },
        ].map((it) => (
          <div key={it.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d6b43]/20 border border-[#2d6b43]/40 flex items-center justify-center">
              <it.icon className="w-4 h-4 text-[#d4b06a]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{it.label}</p>
              <p className="text-[11px] text-slate-400">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#2d6b43] to-[#1f4a2e] hover:from-[#3a8556] hover:to-[#2d6b43] text-white font-semibold text-base shadow-2xl shadow-[#2d6b43]/40 transition flex items-center justify-center gap-2 group"
      >
        Iniciar simulação
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      <p className="text-center text-[11px] text-slate-500 mt-4 leading-relaxed">
        Ao continuar, você aceita que a NatLeva utilize seus dados<br />
        apenas para simulação e contato comercial.
      </p>
    </motion.div>
  );
}

// ============================================================
// Fase 2 · Ficha · steps
// ============================================================
type FichaProps = {
  step: number;
  setStep: (n: number) => void;
  cpf: string;
  setCpf: (v: string) => void;
  nome: string;
  setNome: (v: string) => void;
  nascimento: string;
  setNascimento: (v: string) => void;
  renda: string;
  setRenda: (v: string) => void;
  civil: string;
  setCivil: (v: string) => void;
  celular: string;
  setCelular: (v: string) => void;
  product: ProductLite;
  onFinish: () => void;
};

function FichaPhase(props: FichaProps) {
  const { step, setStep, product, onFinish } = props;
  const steps = ["Identificação", "Perfil", "Financeiro", "Contato"];

  const canProceed = useMemo(() => {
    if (step === 0) return onlyDigits(props.cpf).length === 11;
    if (step === 1) return props.nome.trim().length >= 5 && onlyDigits(props.nascimento).length === 8;
    if (step === 2) return onlyDigits(props.renda).length >= 4 && props.civil.length > 0;
    if (step === 3) return onlyDigits(props.celular).length >= 10;
    return false;
  }, [step, props.cpf, props.nome, props.nascimento, props.renda, props.civil, props.celular]);

  const next = () => {
    if (!canProceed) return;
    if (step < 3) setStep(step + 1);
    else onFinish();
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      {/* Progress steps */}
      <div className="flex items-center gap-1.5 mb-6">
        {steps.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-all ${
                i < step
                  ? "bg-[#d4b06a]"
                  : i === step
                    ? "bg-gradient-to-r from-[#d4b06a] to-[#b8934a]"
                    : "bg-white/10"
              }`}
            />
            <span
              className={`text-[10px] font-medium tracking-wide transition ${
                i <= step ? "text-[#d4b06a]" : "text-slate-500"
              }`}
            >
              {String(i + 1).padStart(2, "0")} · {label}
            </span>
          </div>
        ))}
      </div>

      {/* Header do produto compacto */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Analisando</p>
          <p className="text-xs font-medium text-white truncate">{product.title}</p>
        </div>
        <p className="text-sm font-semibold text-[#d4b06a] shrink-0">{fmtBRL(product.price)}</p>
      </div>

      {/* Card do step */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-6 shadow-2xl">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepShell key="s0" icon={User} title="Qual seu CPF?" subtitle="Consulta segura, sem impacto no seu score.">
              <FieldInput
                label="CPF"
                inputMode="numeric"
                autoFocus
                value={props.cpf}
                onChange={(v) => props.setCpf(maskCPF(v))}
                placeholder="000.000.000-00"
              />
            </StepShell>
          )}
          {step === 1 && (
            <StepShell key="s1" icon={Calendar} title="Vamos te conhecer" subtitle="Precisamos confirmar sua identidade.">
              <FieldInput
                label="Nome completo"
                value={props.nome}
                onChange={props.setNome}
                placeholder="Como está no documento"
                autoFocus
              />
              <FieldInput
                label="Data de nascimento"
                inputMode="numeric"
                value={props.nascimento}
                onChange={(v) => props.setNascimento(maskDate(v))}
                placeholder="DD/MM/AAAA"
              />
            </StepShell>
          )}
          {step === 2 && (
            <StepShell key="s2" icon={Wallet} title="Perfil financeiro" subtitle="Usamos pra calcular a melhor condição.">
              <FieldInput
                label="Renda mensal (R$)"
                inputMode="numeric"
                value={props.renda}
                onChange={(v) => props.setRenda(maskMoney(v))}
                placeholder="0,00"
                prefix="R$"
                autoFocus
              />
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Estado civil
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CIVIL_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => props.setCivil(opt)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition text-left ${
                        props.civil === opt
                          ? "bg-[#d4b06a]/10 border-[#d4b06a]/60 text-[#e8c77e]"
                          : "bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </StepShell>
          )}
          {step === 3 && (
            <StepShell key="s3" icon={Smartphone} title="Onde te avisamos?" subtitle="Enviamos o resultado da análise no WhatsApp.">
              <FieldInput
                label="Celular com DDD"
                inputMode="tel"
                value={props.celular}
                onChange={(v) => props.setCelular(maskPhone(v))}
                placeholder="(11) 90000-0000"
                autoFocus
              />
              <div className="rounded-xl border border-[#d4b06a]/25 bg-[#2d6b43]/10 p-3 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#d4b06a] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Seus dados são protegidos por criptografia. Não compartilhamos com terceiros
                  e você pode solicitar exclusão a qualquer momento.
                </p>
              </div>
            </StepShell>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={back}
              className="h-12 px-4 rounded-xl border border-white/10 bg-white/[0.02] text-slate-300 text-sm font-medium hover:bg-white/[0.05] transition"
            >
              Voltar
            </button>
          )}
          <button
            onClick={next}
            disabled={!canProceed}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#2d6b43] to-[#1f4a2e] hover:from-[#3a8556] hover:to-[#2d6b43] disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#2d6b43]/25"
          >
            {step === 3 ? "Enviar para análise" : "Continuar"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3" />
        Ambiente criptografado · dados usados apenas para simulação
      </p>
    </motion.div>
  );
}

function StepShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#2d6b43]/20 border border-[#d4b06a]/25 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#d4b06a]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white leading-tight">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  autoFocus,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "tel" | "text";
  autoFocus?: boolean;
  prefix?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
            {prefix}
          </span>
        )}
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          className={`w-full h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-slate-600 text-base focus:outline-none focus:border-[#d4b06a]/60 focus:bg-white/[0.05] transition ${
            prefix ? "pl-10 pr-4" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}

// ============================================================
// Fase 3 · Análise imersiva
// ============================================================
const ANALYSIS_STEPS = [
  { icon: FileSearch, label: "Validando documentos", detail: "Verificando CPF nas bases federais" },
  { icon: Landmark, label: "Consultando bureaus de crédito", detail: "Serasa · SPC · Boa Vista" },
  { icon: Gauge, label: "Calculando perfil de risco", detail: "Analisando histórico financeiro" },
  { icon: Sparkles, label: "Buscando melhores condições", detail: "Comparando taxas em bancos parceiros" },
  { icon: BadgeCheck, label: "Montando propostas personalizadas", detail: "Selecionando 3 melhores opções" },
];

function AnalisePhase({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0);
  const [percent, setPercent] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    // Avança steps a cada ~3s · total ~15s (mais imersivo e ansioso)
    const stepInterval = setInterval(() => {
      setCurrent((c) => {
        if (c >= ANALYSIS_STEPS.length - 1) {
          clearInterval(stepInterval);
          return c;
        }
        return c + 1;
      });
    }, 3000);

    // Progresso contínuo
    const start = Date.now();
    const total = ANALYSIS_STEPS.length * 3000 + 400;
    const pctInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / total) * 100);
      setPercent(p);
      if (p >= 100 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(pctInterval);
        setTimeout(onDone, 500);
      }
    }, 60);

    return () => {
      clearInterval(stepInterval);
      clearInterval(pctInterval);
    };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="pt-6"
    >
      {/* Radar animado */}
      <div className="flex justify-center mb-8">
        <div className="relative w-32 h-32">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#d4b06a]/25"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border-2 border-[#d4b06a]/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#2d6b43] to-[#12331f] flex items-center justify-center shadow-2xl shadow-[#2d6b43]/50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#d4b06a] font-semibold mb-2">
          Análise em andamento
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
          Aguarde enquanto analisamos seu perfil
        </h2>
        <p className="text-sm text-slate-400">
          Este processo geralmente leva menos de 30 segundos
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Progresso</span>
          <span className="text-xs font-semibold text-[#d4b06a] tabular-nums">{Math.floor(percent)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#d4b06a] to-[#b8934a]"
            style={{ width: `${percent}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      </div>

      {/* Lista de etapas */}
      <div className="space-y-2">
        {ANALYSIS_STEPS.map((s, i) => {
          const isDone = i < current;
          const isActive = i === current;
          const isPending = i > current;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                isActive
                  ? "border-[#d4b06a]/40 bg-[#2d6b43]/10"
                  : isDone
                    ? "border-white/5 bg-white/[0.02]"
                    : "border-white/5 bg-white/[0.01] opacity-50"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isDone
                    ? "bg-[#2d6b43]/30 border border-[#d4b06a]/40"
                    : isActive
                      ? "bg-[#2d6b43]/20 border border-[#d4b06a]/40"
                      : "bg-white/[0.03] border border-white/10"
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 text-[#d4b06a]" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-[#d4b06a] animate-spin" />
                ) : (
                  <s.icon className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isPending ? "text-slate-500" : "text-white"}`}>
                  {s.label}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{s.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================
// Fase 4 · Aprovado · confete + propostas
// ============================================================
function AprovadoPhase({
  product,
  nome,
  cpf,
}: {
  product: ProductLite;
  nome: string;
  cpf: string;
}) {
  const firstName = (nome.trim().split(/\s+/)[0] || "Viajante").replace(/[^A-Za-zÀ-ÿ]/g, "");
  const cpfMasked = cpf ? cpf.replace(/(\d{3}\.\d{3})\.\d{3}(-\d{2})/, "$1.***$2") : "";

  // 3 propostas · derivadas do valor · sem juros no boleto
  const proposals = useMemo(() => {
    const total = product.price;
    return [
      { installments: 6, label: "Curto prazo", tag: "Menor total" },
      { installments: 10, label: "Equilibrado", tag: "Mais escolhido", highlight: true },
      { installments: 12, label: "Parcela leve", tag: "Menor mensal" },
    ].map((p) => ({
      ...p,
      value: total / p.installments,
      total,
    }));
  }, [product.price]);

  // Confete on mount
  useEffect(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#2d6b43", "#4a8f5c", "#d4b06a", "#e8c77e", "#f5efd8"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // Estouro central inicial
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.4 },
      colors,
    });
  }, []);

  const goWhatsApp = (installments?: number) => {
    const target = resolveAgencyWhatsApp(product.whatsapp);
    const parts = [
      `Olá! Simulei parcelamento pro pacote "${product.title}" e foi aprovado.`,
    ];
    if (installments) {
      const parcela = product.price / installments;
      parts.push(
        `Quero seguir com a opção de ${installments}x de ${fmtBRL(parcela)} no boleto sem juros.`,
      );
    } else {
      parts.push("Quero conversar com um consultor pra fechar.");
    }
    if (firstName) parts.push(`Meu nome é ${firstName}.`);
    const msg = parts.join(" ");
    window.open(buildWhatsAppLink(target, msg), "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="pt-4"
    >
      {/* Selo aprovado · verde vivo com impacto de conquista */}
      <div className="flex justify-center mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="relative"
        >
          {/* Glow externo dourado pulsante */}
          <motion.div
            className="absolute inset-[-12px] rounded-full bg-[#d4b06a]/40 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 rounded-full bg-[#22c55e]/30 blur-2xl" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a] flex items-center justify-center shadow-[0_0_40px_-8px_rgba(74,222,128,0.6),0_0_16px_-2px_rgba(212,176,106,0.5)] border-[6px] border-[#d4b06a] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            <Check className="w-12 h-12 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" strokeWidth={3} />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center mb-6"
      >
        <p className="text-[11px] tracking-[0.2em] uppercase text-[#d4b06a] font-semibold mb-2">
          Análise concluída
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight mb-3">
          Parabéns, {firstName}!
        </h1>
        <p className="text-base text-slate-300 max-w-md mx-auto leading-relaxed">
          <span className="text-[#d4b06a] font-semibold">3 propostas de parcelamento no boleto</span>{" "}
          foram aprovadas {cpfMasked ? `para o CPF ${cpfMasked}` : "para o seu CPF"}.
        </p>
      </motion.div>

      {/* Card do produto */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-5 flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pacote aprovado</p>
          <p className="text-sm font-semibold text-white truncate">{product.title}</p>
        </div>
        <p className="text-lg font-semibold text-[#d4b06a] shrink-0">{fmtBRL(product.price)}</p>
      </motion.div>

      {/* Propostas */}
      <div className="space-y-3 mb-6">
        {proposals.map((p, i) => (
          <motion.button
            key={p.installments}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            onClick={() => goWhatsApp(p.installments)}
            className={`w-full text-left rounded-2xl border p-4 transition-all hover:scale-[1.01] active:scale-[0.99] ${
              p.highlight
                ? "border-[#d4b06a]/60 bg-gradient-to-br from-[#d4b06a]/15 to-[#2d6b43]/10 shadow-lg shadow-[#2d6b43]/15"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{p.label}</p>
                <p className="text-2xl font-semibold text-white">
                  {p.installments}x
                  <span className="text-base font-normal text-slate-400"> de </span>
                  <span className="text-[#d4b06a]">{fmtBRL(p.value)}</span>
                </p>
              </div>
              {p.highlight ? (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#d4b06a] text-[#0d1f14]">
                  {p.tag}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  {p.tag}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] text-slate-400">
                Total: <span className="text-white font-medium">{fmtBRL(p.total)}</span> · sem juros
              </span>
              <span className="text-[11px] text-[#d4b06a] font-semibold flex items-center gap-1">
                Escolher <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* CTA principal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="space-y-3"
      >
        <button
          onClick={() => goWhatsApp()}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#2d6b43] to-[#1f4a2e] hover:from-[#3a8556] hover:to-[#2d6b43] text-white font-semibold text-base shadow-2xl shadow-[#2d6b43]/40 transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Falar com consultor agora
        </button>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-[#d4b06a] shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Ou aguarde · em até <span className="font-semibold text-white">1 hora</span> um consultor NatLeva
            entra em contato pelo número que você informou pra finalizar a reserva.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
