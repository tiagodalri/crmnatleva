
# Estratégia: passageiro já cadastrado no envio do link

## Princípio

O link de cadastro **nunca bloqueia o cliente**. Toda submissão é aceita e persistida. Quando o CPF/passaporte já existe, o novo envio entra como um **registro pendente** vinculado ao passageiro atual, e vocês decidem internamente o que fazer com ele em uma **fila de revisão dedicada**.

Isso elimina o atrito no WhatsApp ("o link deu erro") sem misturar dados sensíveis de forma automática.

## Como fica o fluxo

```text
Cliente abre link  ──►  Preenche  ──►  Envia
                                        │
                                        ▼
                        CPF/passaporte já existe no sistema?
                          │                             │
                         Não                           Sim
                          │                             │
                          ▼                             ▼
                Cria passageiro novo         Cria "cadastro pendente"
                (como hoje)                  vinculado ao passageiro atual
                                                        │
                                                        ▼
                                        Aparece em "Cadastros pendentes"
                                        com diff campo a campo
                                                        │
                                        ┌───────────────┼───────────────┐
                                        ▼               ▼               ▼
                                    Aprovar         Descartar       Mesclar
                                    (sobrescreve)   (arquiva)       (campo a campo)
```

Em todos os casos, o cliente vê a mesma tela de sucesso. Zero atrito.

## O que vai ser construído

### 1. Nova tabela `passenger_pending_submissions`
Armazena cada submissão que colidiu com um passageiro existente:
- `matched_passenger_id` — passageiro atual encontrado
- `submitted_data` (jsonb) — tudo que o cliente digitou
- `signup_link_id` — de qual link veio
- `status` — `pending`, `approved`, `discarded`, `merged`
- `reviewed_by`, `reviewed_at`, `review_notes`
- Idempotência via `submission_id` (mesma proteção contra duplo-clique que já usamos hoje)

RLS: staff autenticado gerencia; anon não vê nada.

### 2. Edge function `passenger-self-signup` (ajuste)
- Detecta colisão por CPF **ou** passaporte (regra atual).
- Em vez de retornar 409, grava em `passenger_pending_submissions` com o `matched_passenger_id` e responde 200 (sucesso) para o cliente.
- Passageiros sem colisão continuam sendo criados diretamente em `passengers` (fluxo atual, sem mudança).
- Mantém idempotência: reenvio do mesmo `submission_id` não duplica pendência.

### 3. Nova tela interna: "Cadastros pendentes de revisão"
Rota nova dentro da área de passageiros/CRM. Lista os pendentes com:
- Nome, CPF, quando chegou, de qual link veio
- Badge de contagem no menu lateral (quantos aguardando)
- Ao abrir: **diff lado a lado** — cadastro atual vs. dados enviados, campo a campo, com destaque no que mudou.
- Três ações:
  - **Aprovar tudo** → sobrescreve o passageiro com os dados novos (mantém histórico via `proposal_change_history`? não — criamos entrada em log próprio).
  - **Descartar** → arquiva a submissão, cadastro atual não muda.
  - **Mesclar seletivo** → checkbox por campo, escolhe o que absorver.
- Após ação, sai da fila e vai para "Histórico de revisões".

### 4. Ajustes no formulário público (`PassengerSelfSignup`)
- Mensagem de sucesso mantém-se genérica: "Cadastro recebido, obrigado!" — o cliente não sabe (nem precisa saber) que caiu em revisão.
- Mantém: autosave em `localStorage`, `submission_id`, continue-on-error, chaves estáveis (tudo que já foi feito na rodada anterior).

## Escopo do link (resposta 2)

Como o link é **genérico** (não amarrado a uma venda), a colisão é tratada sempre pela regra acima. Não precisamos criar contexto de viagem no link agora. Se no futuro quiser links específicos por venda, dá para adicionar o `sale_id` opcional no link sem quebrar nada.

## O que NÃO muda

- Passageiros novos (sem CPF/passaporte no sistema) → fluxo atual, criação direta.
- Ordem de submissão, autosave offline, idempotência, chaves de cartão de passageiro.
- Tabela `passengers` continua como source of truth. Nada é sobrescrito sem ação humana explícita.

## Detalhes técnicos

- **Migração**: cria `passenger_pending_submissions` com GRANT + RLS + policies para authenticated (staff) e nenhuma policy para anon (só a edge function escreve via service_role).
- **Edge function**: reaproveita a lógica de detecção de duplicado que já existe; em vez de `return 409`, insere em `passenger_pending_submissions`.
- **Frontend**: nova rota `/passageiros/pendentes` + componente `PendingSubmissionsList` + `PendingSubmissionDiffDialog`. Ícone com badge no menu (usa `lucide-react`, respeitando as diretrizes visuais — zero emojis).
- **Realtime opcional (fase 2)**: quando chega uma pendência nova, badge atualiza em tempo real via canal Supabase Realtime. Deixo fora da primeira entrega para não inflar escopo.

## Entrega em 2 fases

**Fase 1 (esta rodada)** — Backend + fluxo blindado
1. Migração da tabela `passenger_pending_submissions`
2. Ajuste da edge function para nunca falhar por duplicado (grava em pendentes)

**Fase 2 (rodada seguinte, sob aprovação)** — Interface interna
3. Tela `/passageiros/pendentes` com lista, diff, ações
4. Badge de contagem no menu
5. Log de revisões concluídas

Faço as duas fases em sequência dentro da mesma implementação se você aprovar. Se preferir validar backend primeiro em produção antes de mexer no frontend, entrego só a Fase 1 agora.

Confirma que a estratégia está boa e se quer as duas fases juntas ou faseado?
