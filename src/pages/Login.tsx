import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatlevaGold from "@/assets/logo-natleva-champagne.webp";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-[#e8e4dd] p-4 sm:p-6">
      <div className="flex w-full max-w-[1000px] min-h-[640px] bg-[#faf8f5] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden border border-[#1a3c2a]/5 animate-fade-in">
        {/* Left Panel · Immersive Forest */}
        <div className="hidden md:flex w-1/2 bg-[#1a3c2a] relative flex-col items-center justify-center p-12 overflow-hidden">
          {/* Soft radial glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, rgba(201,168,76,0.18), transparent 55%), radial-gradient(circle at 75% 80%, rgba(201,168,76,0.10), transparent 60%)",
            }}
          />
          {/* Vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, transparent 55%, rgba(13,31,22,0.55) 100%)",
            }}
          />
          {/* Thin gold corner lines */}
          <div className="absolute top-10 left-10 h-px w-16 bg-[#c9a84c]/40" />
          <div className="absolute top-10 left-10 w-px h-16 bg-[#c9a84c]/40" />
          <div className="absolute bottom-10 right-10 h-px w-16 bg-[#c9a84c]/40" />
          <div className="absolute bottom-10 right-10 w-px h-16 bg-[#c9a84c]/40" />

          {/* Logo area */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <img
              src={logoNatlevaGold}
              alt="NatLeva"
              className="h-20 lg:h-24 w-auto select-none drop-shadow-[0_10px_30px_rgba(201,168,76,0.25)]"
              draggable={false}
            />
            <div className="mt-6 h-px w-12 bg-[#c9a84c]/50" />
            <p className="mt-5 text-[#c9a84c]/75 text-[10px] uppercase tracking-[0.4em] font-medium leading-relaxed">
              Boutique Travel Management
            </p>
          </div>

          {/* Bottom accent */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#c9a84c]/35 text-[9px] uppercase tracking-[0.3em]">
            Acesso Restrito
          </div>
        </div>

        {/* Right Panel · Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 bg-[#faf8f5] relative">
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-10">
            <img src={logoNatleva} alt="NatLeva" className="h-10 w-auto" />
          </div>

          <div className="mb-10 text-center md:text-left">
            <span className="block text-[10px] uppercase tracking-[0.3em] text-[#c9a84c] font-semibold mb-3">
              {isSignUp ? "Novo acesso" : "Acesso ao sistema"}
            </span>
            <h2 className="text-[#1a3c2a] text-3xl font-light tracking-tight mb-2">
              {isSignUp ? "Criar conta" : "Bem-vindo"}
            </h2>
            <p className="text-[#1a3c2a]/60 text-sm font-light">
              {isSignUp
                ? "Cadastre-se para acessar o ecossistema NatLeva."
                : "Identifique-se para acessar o ecossistema NatLeva."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className="block text-[10px] uppercase tracking-widest text-[#1a3c2a]/50 font-bold ml-1"
                >
                  Nome completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-[#1a3c2a]/10 rounded-lg text-[#1a3c2a] text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c] focus:border-[#c9a84c] transition-all placeholder:text-[#1a3c2a]/30 shadow-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-[10px] uppercase tracking-widest text-[#1a3c2a]/50 font-bold ml-1"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                placeholder="seu@natleva.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-[#1a3c2a]/10 rounded-lg text-[#1a3c2a] text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c] focus:border-[#c9a84c] transition-all placeholder:text-[#1a3c2a]/30 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[10px] uppercase tracking-widest text-[#1a3c2a]/50 font-bold ml-1"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 bg-white border border-[#1a3c2a]/10 rounded-lg text-[#1a3c2a] text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a84c] focus:border-[#c9a84c] transition-all placeholder:text-[#1a3c2a]/30 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#1a3c2a]/40 hover:text-[#1a3c2a] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1a3c2a] text-[#faf8f5] font-medium rounded-lg hover:bg-[#132c1f] active:scale-[0.99] transition-all shadow-[0_10px_30px_-10px_rgba(26,60,42,0.5)] tracking-wide text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#1a3c2a]/10 text-center">
            <p className="text-xs text-[#1a3c2a]/60">
              {isSignUp ? "Já tem uma conta?" : "Não possui uma conta?"}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-[#c9a84c] font-semibold hover:underline underline-offset-4 ml-1"
              >
                {isSignUp ? "Entrar" : "Cadastre-se"}
              </button>
            </p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-[#1a3c2a]/30">
              © {new Date().getFullYear()} NatLeva
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
