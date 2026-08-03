import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conjunto de telefones (apenas dígitos) que pediram para não receber disparos.
 * Somente indicador visual · o bloqueio real acontece no worker e na montagem da audiência.
 * Usuários sem permissão de leitura recebem um conjunto vazio (nenhum badge).
 */
export function useWhatsAppOptOuts() {
  const { data } = useQuery({
    queryKey: ["whatsapp-optouts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_optouts").select("phone");
      if (error) return new Set<string>();
      return new Set<string>(
        (data || []).map((o) => String(o.phone || "").replace(/\D/g, "")).filter(Boolean)
      );
    },
  });

  return data ?? new Set<string>();
}
