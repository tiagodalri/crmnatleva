/**
 * Helpers para gerar links públicos (compartilhados com clientes)
 * sempre no domínio institucional, em vez do domínio interno do CRM
 * (preview da Lovable, crmnatleva.lovable.app, etc).
 *
 * Ordem de prioridade do "host público":
 *   1. origin atual do app quando não está em localhost
 *   2. localStorage `natleva.publicHost` (override manual para testes)
 *   3. VITE_PUBLIC_SITE_URL (build-time)
 *   4. Domínio padrão de produção: https://adm.natleva.com
 *
 * Mantemos a possibilidade de fallback para o origin atual em fluxos internos
 * que dependem do mesmo domínio (ex: iframe para export de PDF).
 */

const DEFAULT_PUBLIC_HOST = "https://adm.natleva.com";

export function getPublicHost(): string {
  // 1. Override manual (útil pra testes locais apontarem pra staging real)
  try {
    const override = typeof window !== "undefined" ? localStorage.getItem("natleva.publicHost") : null;
    if (override) return stripTrailingSlash(override);
  } catch { /* noop */ }

  // 2. Se o app está rodando no PRÓPRIO domínio público (adm.natleva.com),
  //    usa o origin corrente. Caso contrário (preview Lovable, crmnatleva.lovable.app,
  //    localhost, etc), NUNCA vaza o domínio interno em links compartilhados.
  const currentOrigin = getCurrentBrowserOrigin();
  if (currentOrigin && isPublicProductionOrigin(currentOrigin)) return currentOrigin;

  // 3. Build-time env
  const envHost = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL as string | undefined;
  if (envHost) return stripTrailingSlash(envHost);

  // 4. Fallback institucional
  return DEFAULT_PUBLIC_HOST;
}

function getCurrentBrowserOrigin() {
  if (typeof window === "undefined") return null;
  return stripTrailingSlash(window.location.origin);
}

function isPublicProductionOrigin(origin: string) {
  // Só o domínio institucional do cliente é aceito como "público".
  // Preview/staging da Lovable e localhost caem no fallback DEFAULT_PUBLIC_HOST.
  return /^https:\/\/adm\.natleva\.com$/i.test(origin);
}

function stripTrailingSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/** URL pública da proposta (visível para o cliente). */
export function getPublicProposalUrl(slug: string, opts?: { print?: boolean }): string {
  const safeSlug = encodeURIComponent(slug.trim());
  const url = `${getPublicHost()}/proposta/${safeSlug}`;
  return opts?.print ? `${url}?print=1` : url;
}

/** URL do portal do viajante (login do cliente). */
export function getPublicPortalLoginUrl(): string {
  return `${getPublicHost()}/portal/login`;
}
