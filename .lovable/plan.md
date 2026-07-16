# Plano · Link curto para o Gerador de Link WhatsApp

Escopo restrito à tela **Operação > Gerador de Link** (`/operacao/gerador-link`). Nenhuma outra área do sistema é tocada.

## 1. Arquivo atual responsável

- `src/pages/operacao/OperacaoGeradorLink.tsx` — tela que hoje monta `https://wa.me/5511966396692?text=<mensagem encodada>` no `useMemo` e exibe nos botões Copiar / Abrir teste / QR.
- Rota registrada em `src/App.tsx`: `/operacao/gerador-link` (lazy import).

Nada mais precisa ser lido/alterado fora desses pontos + a nova rota pública + a nova tabela.

## 2. Desenho técnico

### 2.1 Formato do link curto · decisão a validar

O pedido é `https://adm.natleva.com/CODIGO`. Usar a raiz `/` tem um risco real: colide com qualquer rota nova que venha a ser criada em `App.tsx` (basta um dia alguém adicionar `/checkout`, `/parceiros`, etc., e o código curto passa a bater com a rota real). Recomendo uma das duas opções, **você escolhe antes de implementar**:

- **Opção A (mais curta, com risco):** `https://adm.natleva.com/CODIGO` · a rota `path="/:shortCode"` é declarada como **última** no `<Routes>` e o loader consulta a tabela; se não encontrar, cai no `NotFound`. Precisa manter uma blacklist de prefixos reservados (dashboard, admin, proposta, portal, vitrine, cadastro-passageiro, operacao, financeiro, rh, etc.) para nunca gerar um código que colida com uma rota existente.
- **Opção B (recomendada):** `https://adm.natleva.com/w/CODIGO` · prefixo dedicado, zero risco de colisão futura, 2 caracteres a mais. É o padrão que outros encurtadores usam.

Assumo **Opção B** no restante do plano; se preferir A, só troco a rota e adiciono a blacklist.

Código: 7 caracteres base62 (`[a-zA-Z0-9]`) gerados no cliente com retry em caso de conflito de unique.

### 2.2 Nova tabela no Supabase

Uma tabela nova, exclusiva desse recurso. Segue o padrão de `proposal_shares` + `proposal_clicks`, mas simplificada (não precisa de contexto de proposta).

```
public.whatsapp_short_links
  id              uuid pk
  short_code      text unique not null      -- ex: "a7Xk29Q"
  target_phone    text not null             -- "5511966396692"
  message         text                      -- texto pronto (pode ser null/"")
  full_wa_url     text not null             -- wa.me/... já montado (cache p/ redirect rápido)
  label           text                      -- rótulo interno opcional (ex: "Campanha instagram set/26")
  click_count     int  not null default 0   -- contador denormalizado (mesma ideia de proposals)
  created_by      uuid                      -- auth.uid() no insert
  created_at      timestamptz default now()
  updated_at      timestamptz default now()
  is_active       bool default true         -- permite desativar sem apagar
```

```
public.whatsapp_short_link_clicks
  id              uuid pk
  short_link_id   uuid fk -> whatsapp_short_links(id) on delete cascade
  clicked_at      timestamptz default now()
  user_agent      text
  referrer        text
```

**GRANTs + RLS** (regra do projeto):
- `whatsapp_short_links`: `SELECT` liberado a `anon` (o redirect público precisa ler pelo `short_code`); `INSERT/UPDATE/DELETE` só a `authenticated` (policy `created_by = auth.uid()` ou admin). `service_role` ALL.
- `whatsapp_short_link_clicks`: `INSERT` liberado a `anon` (o click público grava direto); `SELECT` só a `authenticated`. `service_role` ALL.
- Trigger `update_updated_at_column` em `whatsapp_short_links` (função já existe no projeto).
- Trigger `AFTER INSERT` em `whatsapp_short_link_clicks` que incrementa `click_count` (padrão idêntico ao `update_status_view_count`).

### 2.3 Rota pública de redirecionamento

Nova página client-side, sem layout do CRM, sem auth:

- Rota: `/w/:shortCode` registrada em `src/App.tsx` fora do `PermissionGuard`/`AppLayout` (mesmo nível de `/proposta/:slug`, `/cadastro-passageiro/:slug`).
- Componente: `src/pages/WhatsAppShortRedirect.tsx`.
- Comportamento:
  1. Lê `shortCode` da URL.
  2. `SELECT id, full_wa_url, is_active FROM whatsapp_short_links WHERE short_code = ?` (leitura anon).
  3. Se não achar / inativo → renderiza uma tela simples "Link inválido ou expirado" com botão para o WhatsApp geral da Natleva.
  4. Se achar: dispara `INSERT` fire-and-forget em `whatsapp_short_link_clicks` (não bloqueia o redirect) e imediatamente `window.location.replace(full_wa_url)`.
  5. Mostra fallback "Redirecionando pro WhatsApp..." caso o redirect demore.

Nenhuma edge function precisa ser criada · o redirect é 100% client-side.

### 2.4 Mudanças na tela `OperacaoGeradorLink.tsx`

Reescrita mínima, mantendo o mesmo layout (editor à esquerda + cartão de resultado à direita, botões Copiar / Abrir teste / QR):

- Estado novo: `shortLink` (`{ id, code, url, clickCount } | null`), `saving` (bool), `label` (string).
- Enquanto o usuário digita, o cartão da direita mostra o preview do `wa.me` completo em cinza claro ("link direto · sem rastreamento").
- Botão novo **"Gerar link curto"** logo abaixo do textarea. Ao clicar:
  1. Monta o `full_wa_url` (mesma lógica atual).
  2. Gera `short_code` aleatório (7 chars base62), tenta `INSERT` → retry até 4x em caso de colisão (unique_violation).
  3. Ao voltar, `shortLink` recebe `https://adm.natleva.com/w/<code>` (via `getPublicHost()` de `src/lib/publicUrl.ts`, que já resolve o domínio público correto).
- Depois de gerado, os botões **Copiar link**, **Abrir teste** e **QR Code** passam a operar sobre o `shortLink.url` em vez do `wa.me` longo. Antes de gerar, operam sobre o `wa.me` com aviso "sem rastreamento".
- Mini-rodapé no cartão da direita mostra "Cliques registrados: N" quando um link curto está ativo, com botão "Atualizar" (consulta `click_count`) e "Novo" (limpa e permite gerar outro).
- Campo opcional `label` (input pequeno de rótulo interno) pra facilitar identificar depois. Se vazio, salva null.

Nada mais na tela muda: emoji picker, contador de caracteres, limpar, preview da mensagem, tudo permanece.

### 2.5 Fora de escopo (não vou mexer agora)

- Listagem/gestão dos links já criados (histórico, edição, desativação) · fica pra uma segunda etapa se você quiser.
- Dashboard/analytics de cliques · a base fica pronta (`whatsapp_short_link_clicks`), mas nenhuma tela nova é criada.
- Qualquer alteração em CRM, propostas, financeiro, RH, portal, etc.

## 3. Arquivos criados / alterados

**Criados**
- `supabase/migrations/<timestamp>_whatsapp_short_links.sql` · tabelas, GRANTs, RLS, policies, trigger de `updated_at`, trigger de contador de cliques.
- `src/pages/WhatsAppShortRedirect.tsx` · página pública de redirect `/w/:shortCode`.

**Alterados**
- `src/App.tsx` · adicionar lazy import + rota pública `<Route path="/w/:shortCode" element={<WhatsAppShortRedirect />} />` (fora do `PermissionGuard`/`AppLayout`) e incluir `/w/` na lista `isPublicRoute`.
- `src/pages/operacao/OperacaoGeradorLink.tsx` · nova lógica de geração do código curto, botão "Gerar link curto", cartão da direita passando a exibir a URL curta, campo opcional de label, mini contador de cliques. Reaproveita `getPublicHost()` de `src/lib/publicUrl.ts` (já existe, não precisa alterar).

**Não alterados** (mas dependências que o código passará a usar)
- `src/lib/publicUrl.ts` · usado só como leitor, já retorna `https://adm.natleva.com`.
- `src/integrations/supabase/types.ts` · será regenerado automaticamente após a migração aprovada.

## 4. Decisões pendentes antes de implementar

1. **Prefixo da rota:** confirmo `/w/CODIGO` (recomendado) ou você prefere `/CODIGO` puro com blacklist de rotas reservadas?
2. **Campo `label` interno** na tela · manter ou descartar?
3. **IP nos cliques:** por ser 100% client-side, só dá pra gravar `user_agent` + `referrer` (sem IP). Se quiser IP real, precisa de uma edge function no meio do caminho · me diz se vale o extra ou fica só UA/referrer.
