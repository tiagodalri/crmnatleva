/**
 * Gera todas as variações de identificador de telefone que a Z-API pode usar
 * para o mesmo contato (formato cru, com +, sufixo @c.us, @s.whatsapp.net, etc).
 *
 * Função pura · sem dependência de estado de componente.
 */
export function getZapiPhoneCandidates(conversationId: string): string[] {
  const phone = conversationId.replace("wa_", "").replace(/\D/g, "").trim();
  if (!phone) return [];
  return Array.from(new Set([
    phone,
    `+${phone}`,
    `${phone}@c.us`,
    `${phone}@s.whatsapp.net`,
    `${phone}-group`,
    `${phone}@g.us`,
  ]));
}
