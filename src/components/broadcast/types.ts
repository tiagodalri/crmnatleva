// Tipos compartilhados do configurador de disparo em massa.

export type MediaKind = "image" | "audio" | "document";

export interface BroadcastMedia {
  url: string;
  type: MediaKind;
  filename: string;
  mimetype: string;
  size: number;
}

export interface AudienceCandidate {
  id: string;
  phone: string;
  name: string;
  tags: string[];
  stage: string | null;
  last_message_at: string | null;
  profile_picture_url: string | null;
  opted_out?: boolean;
}

export interface AudienceStats {
  activeCount: number;
  optoutOverlap: number;
  eligibleCount: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  message_text: string | null;
  media_url: string | null;
  media_type: string | null;
  media_filename: string | null;
  caption: string | null;
  audience_type: string;
  audience_size: number | null;
  status: string;
  throttle_min_seconds: number;
  throttle_max_seconds: number;
  daily_limit: number;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  paused_reason: string | null;
  next_eligible_send_at: string | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  test_sent_at: string | null;
}

export interface RecipientRow {
  id: string;
  phone: string;
  contact_name: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  order_index: number | null;
}

export const CAMPAIGN_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
  test_sent: { label: "Teste enviado", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  confirmed: { label: "Confirmada", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  sending: { label: "Enviando", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  paused: { label: "Pausada", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  completed: { label: "Concluída", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive" },
};

export const RECIPIENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  sending: { label: "Enviando", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  sent: { label: "Enviada", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive" },
  skipped_optout: { label: "Opt-out", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  skipped_duplicate: { label: "Duplicado", cls: "bg-muted text-muted-foreground" },
};

export function formatPhone(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return raw;
}
