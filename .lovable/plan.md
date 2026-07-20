## Diagnóstico confirmado

**Integração ativa:** Z-API (não Cloud API). Webhook em `supabase/functions/zapi-webhook/index.ts`.

**Causa raiz do bug:**

1. `extractMsgType()` (linhas 87-95) não reconhece `body.contact` nem `body.contactList` · sempre retorna `"text"` nesses casos.
2. `extractMediaUrl()` (linhas 78-84) não trata contato.
3. `extractTextContent()` (linhas 100-102) retorna string vazia para contato compartilhado.
4. Guard de descarte (linha 1071): `if (!phone || (!textContent && !body.image && !body.audio && !body.video && !body.document && !body.sticker && !hasLocation)) { … return no_content }` · como o contato não bate em nenhum campo, cai aqui e a mensagem é descartada (marcada como `no_content` em `whatsapp_events_raw`). É por isso que nada chega ao inbox.
5. A CHECK constraint em `conversation_messages.message_type` já permite `'vcard'` e `'multi_vcard'` · o banco está pronto, faltou webhook + UI.

**Componente real que renderiza os balões:** `src/components/inbox/MessageBubble.tsx` (445 linhas). Tem cases para `text`, `audio`, `image`, `video`, `document`, `sticker` (linhas 219-297) e `location` (linha 384). Não existe case para `vcard`. É aí que precisa entrar o novo cartão.

Formato Z-API (confirmado na doc oficial):

```json
// 1 contato
{ "contact": { "displayName": "Fulano", "vCard": "BEGIN:VCARD…", "phones": ["5544..."] } }
// N contatos
{ "contactList": { "contacts": [ { "displayName": "...", "vCard": "...", "phones": [...] }, ... ] } }
```

## Plano · restrito a recebimento + exibição de mensagens de contato

### Backend · `supabase/functions/zapi-webhook/index.ts`

Edições cirúrgicas, sem alterar nada fora do fluxo de mensagens de contato:

1. **`extractMsgType()`** · adicionar antes do fallback `"text"`:
   ```
   if (body.contactList?.contacts?.length > 1) return "multi_vcard";
   if (body.contact || body.contactList?.contacts?.length === 1) return "vcard";
   ```
2. **Guard de descarte (linha 1071)** · incluir `!body.contact && !body.contactList` na condição, para não jogar contato fora.
3. **Extração + persistência** · antes do insert em `conversation_messages`, quando `msgType === "vcard"` ou `"multi_vcard"`:
   - Normalizar em um array `contacts: Array<{ displayName: string; phones: string[]; vCard: string }>` a partir de `body.contact` ou `body.contactList.contacts`.
   - Para cada telefone dentro de `phones`/vCard, aplicar `normalizePhone()` (já existe no arquivo) e gerar link `wa.me/<digits>`.
   - Salvar:
     - `content` = string legível (`"👤 <displayName> · <telefone formatado>"` ou, para multi, `"👥 <N> contatos: <nome1>, <nome2>…"`) · isso alimenta `last_message_preview` e busca full-text.
     - `metadata.contacts` = array normalizado (nome, telefones, vCard raw). Reaproveitar coluna `metadata` já existente (mesmo padrão do `location`).
     - `message_type` = `'vcard'` ou `'multi_vcard'` (a CHECK já aceita).
   - `zapi_messages.type` também recebe o valor · mantém o mesmo backup fiel.
4. **`extractMediaUrl()`** · nenhuma mudança (contato não tem mídia).
5. **fromMe** · a mesma lógica se aplica quando o atendente compartilha contato pelo celular · vale para `sent` também (só um caminho, sem branch novo).

### Frontend · `src/components/inbox/MessageBubble.tsx`

Adicionar um novo bloco de renderização (irmão do bloco de `location` na linha 384):

- Case `msg.message_type === "vcard" || "multi_vcard"` lê `msg.metadata.contacts`.
- Renderiza um cartão inspirado no cartão nativo do WhatsApp:
  - Ícone `UserRound`/`Users` (lucide-react) em avatar circular.
  - Nome em bold (`displayName`).
  - Telefone(s) formatado(s) via `formatPhoneDisplay` de `src/lib/phone.ts`.
  - Botão "Conversar" → abre `https://wa.me/<digits>` em nova aba (ou, se o telefone já for cliente conhecido, poderia abrir a conversa interna · **fora do escopo desta correção, fica pra depois** para não expandir).
  - Para `multi_vcard`, lista compacta com até 3 visíveis e "+N contatos" ao final.
- Estilo consistente com os outros balões (bg, padding, radius já usados no arquivo).

### Lista de conversas · `src/components/inbox/ConversationItem.tsx`

Em `getPreviewContent()` (linha 59), adicionar caso para preview começando com `"👤 "` ou `"👥 "`:
- Ícone `UserRound` verde + texto "Contato" (ou "N contatos").
Mantém consistente com áudio/foto/vídeo/documento/localização já existentes.

### O que NÃO será tocado

- Nenhum outro extractor, guard, roteamento de flow, LID resolver, cache de mídia, watchdog, envio, retry, notificações, IA · nada.
- Nenhuma outra tela · só `MessageBubble.tsx` e `ConversationItem.tsx`.
- Nada de Cloud API (integração inativa).
- Sem migração (CHECK já aceita `vcard`/`multi_vcard`).

### Arquivos alterados

- `supabase/functions/zapi-webhook/index.ts` · 3 pontos (extractMsgType, guard, bloco de persistência para vcard).
- `src/components/inbox/MessageBubble.tsx` · novo case de render.
- `src/components/inbox/ConversationItem.tsx` · novo case no preview da lista.

### Validação após implementar

1. Pedir ao Tiago para compartilhar um contato de teste no WhatsApp.
2. Conferir no banco: `select message_type, content, metadata from conversation_messages order by created_at desc limit 5` · deve ter `vcard` com metadata populada.
3. Conferir na tela: balão aparece com nome + telefone + botão "Conversar"; preview na lista mostra "👤 Contato".
4. Testar `contactList` com 2+ contatos (compartilhamento múltiplo do WhatsApp).