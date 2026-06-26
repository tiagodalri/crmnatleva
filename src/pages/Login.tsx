import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Eye, EyeOff, Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp) {
      const { error: err } = await signUp(email, password, fullName);
      if (err) setError(err);
      else navigate(from, { replace: true });
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
      else navigate(from, { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-[hsl(40,33%,91%)] dark:bg-background">
      {/* Left · Branding (dark green w/ sand accents) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-[hsl(150,40%,5%)]">
        {/* Soft radial glow */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, hsl(41 51% 57% / 0.18), transparent 55%), radial-gradient(circle at 70% 80%, hsl(154 56% 27% / 0.35), transparent 60%)",
          }}
        />
        {/* Decorative grid of planes */}
        <div className="absolute inset-0 opacity-[0.07]">
          {[...Array(5)].map((_, i) => (
            <Plane
              key={i}
              className="absolute text-[hsl(41,51%,80%)]"
              style={{
                width: `${40 + i * 22}px`,
                height: `${40 + i * 22}px`,
                top: `${12 + i * 17}%`,
                left: `${8 + i * 16}%`,
                transform: `rotate(${-30 + i * 15}deg)`,
              }}
            />
          ))}
        </div>
        {/* Gold thin lines */}
        <div className="absolute top-10 left-10 h-px w-24 bg-[hsl(41,51%,57%)]/60" />
        <div className="absolute bottom-10 right-10 h-px w-24 bg-[hsl(41,51%,57%)]/60" />

        <div className="relative z-10 text-center px-12 max-w-md">
          <img
            src={logoNatleva}
            alt="NatLeva Viagens"
            className="h-16 mx-auto mb-10 brightness-0 invert opacity-95"
          />
          <div className="mx-auto mb-6 h-px w-16 bg-[hsl(41,51%,57%)]" />
          <h1 className="font-serif text-4xl text-[hsl(38,28%,92%)] mb-4 leading-tight">
            Inteligência de viagens, com alma de boutique.
          </h1>
          <p className="text-[hsl(38,28%,82%)]/70 text-base leading-relaxed">
            CRM · Vendas · Operação · Concierge
          </p>

          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-[hsl(41,51%,57%)]/30 bg-[hsl(41,51%,57%)]/5 px-4 py-1.5 text-xs text-[hsl(41,51%,75%)]">
            <Sparkles className="h-3.5 w-3.5" />
            Sistema interno NatLeva
          </div>
        </div>
      </div>

      {/* Right · Form on bege */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative bg-[hsl(40,33%,91%)] dark:bg-background">
        {/* subtle texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, hsl(35 30% 75% / 0.5), transparent 50%), radial-gradient(circle at 0% 100%, hsl(41 51% 57% / 0.12), transparent 55%)",
          }}
        />

        <div className="relative w-full max-w-md animate-fade-in">
          {/* Card */}
          <div className="rounded-2xl border border-[hsl(35,30%,75%)]/60 bg-[hsl(39,30%,95%)] dark:bg-card shadow-[0_30px_80px_-30px_hsl(150_40%_15%/0.25)] backdrop-blur-sm">
            {/* gold top accent line */}
            <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-transparent via-[hsl(41,51%,57%)] to-transparent" />

            <div className="p-8 sm:p-10">
              <div className="lg:hidden mb-8 text-center">
                <img src={logoNatleva} alt="NatLeva" className="h-12 mx-auto" />
              </div>

              <div className="mb-8">
                <span className="inline-block text-[10px] tracking-[0.2em] uppercase text-[hsl(154,56%,27%)] font-medium mb-3">
                  {isSignUp ? "Novo acesso" : "Acesso restrito"}
                </span>
                <h2 className="text-3xl font-serif text-[hsl(153,55%,17%)] dark:text-foreground mb-2 leading-tight">
                  {isSignUp ? "Criar conta" : "Bem-vindo de volta"}
                </h2>
                <p className="text-sm text-[hsl(153,30%,30%)]/70 dark:text-muted-foreground">
                  {isSignUp
                    ? "Cadastre-se para acessar o sistema NatLeva."
                    : "Acesse sua conta NatLeva e siga sua jornada."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[hsl(153,55%,17%)] dark:text-foreground text-xs font-medium tracking-wide uppercase">
                      Nome completo
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(154,56%,27%)]/60" />
                      <Input
                        id="fullName"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUp}
                        className="pl-10 h-12 bg-[hsl(40,33%,93%)] dark:bg-background border-[hsl(35,30%,75%)] focus-visible:ring-[hsl(41,51%,57%)] focus-visible:border-[hsl(41,51%,57%)]"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[hsl(153,55%,17%)] dark:text-foreground text-xs font-medium tracking-wide uppercase">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(154,56%,27%)]/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@natleva.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 bg-[hsl(40,33%,93%)] dark:bg-background border-[hsl(35,30%,75%)] focus-visible:ring-[hsl(41,51%,57%)] focus-visible:border-[hsl(41,51%,57%)]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[hsl(153,55%,17%)] dark:text-foreground text-xs font-medium tracking-wide uppercase">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(154,56%,27%)]/60" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10 h-12 bg-[hsl(40,33%,93%)] dark:bg-background border-[hsl(35,30%,75%)] focus-visible:ring-[hsl(41,51%,57%)] focus-visible:border-[hsl(41,51%,57%)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(154,56%,27%)]/60 hover:text-[hsl(154,56%,27%)] transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-[hsl(154,56%,27%)] hover:bg-[hsl(154,56%,22%)] text-[hsl(40,33%,93%)] text-base font-medium shadow-[0_10px_30px_-10px_hsl(154_56%_27%/0.5)] transition-all"
                  disabled={loading}
                >
                  {loading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
                </Button>
              </form>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[hsl(35,30%,75%)]/60" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                  <span className="bg-[hsl(39,30%,95%)] dark:bg-card px-3 text-[hsl(153,30%,30%)]/60">
                    ou
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="block w-full text-center text-sm text-[hsl(153,55%,17%)]/80 dark:text-muted-foreground hover:text-[hsl(154,56%,27%)] transition-colors"
              >
                {isSignUp ? (
                  <>Já tem conta? <span className="font-medium underline underline-offset-4 decoration-[hsl(41,51%,57%)]">Entrar</span></>
                ) : (
                  <>Não tem conta? <span className="font-medium underline underline-offset-4 decoration-[hsl(41,51%,57%)]">Criar agora</span></>
                )}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[hsl(153,30%,30%)]/60 dark:text-muted-foreground/60">
            © {new Date().getFullYear()} NatLeva Viagens · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
