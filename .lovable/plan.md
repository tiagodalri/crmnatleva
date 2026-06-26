## Refatoração Segura · Fase 1 (OperacaoInbox)

### Princípio
Zero mudança de comportamento. Só vamos **mover pedaços** do arquivo gigante para arquivos menores. Nenhuma regra de negócio é alterada. Se algo quebrar, basta reverter pelo History.

### Por que começar pelo OperacaoInbox
É o maior do sistema (4.103 linhas) e o que mais pesa para qualquer manutenção futura. Reduzir ele já dá ganho enorme de estabilidade.

### Como vamos trabalhar (passos pequenos, validados um a um)

**Passo 1 · Mapeamento (sem mexer em código)**
- Ler o arquivo inteiro e listar os blocos internos: subcomponentes declarados dentro do arquivo, funções auxiliares, tipos, hooks customizados embutidos.
- Entregar esse "mapa" antes de mover qualquer coisa.

**Passo 2 · Extrair tipos e constantes**
- Mover `interface`/`type` e constantes puras para `src/pages/operacao/inbox/types.ts` e `constants.ts`.
- Risco: praticamente zero (não há lógica).
- Validação: abrir a tela /operacao/inbox e conferir que tudo carrega igual.

**Passo 3 · Extrair funções utilitárias puras**
- Funções que só recebem dados e devolvem dados (formatadores, parsers, filtros) vão para `src/pages/operacao/inbox/utils.ts`.
- Risco: baixo. São funções isoladas.
- Validação: mesma tela, ações principais (abrir conversa, filtrar, buscar).

**Passo 4 · Extrair subcomponentes visuais**
- Cada subcomponente declarado dentro do arquivo vira um arquivo próprio em `src/pages/operacao/inbox/components/`.
- Um por vez, validando a tela entre cada extração.
- Risco: baixo a médio. Atenção às props passadas.

**Passo 5 · Extrair hooks customizados**
- Blocos de `useState`/`useEffect` relacionados (ex: busca de mensagens, contadores) viram hooks em `src/pages/operacao/inbox/hooks/`.
- Risco: médio. É onde mais se precisa cuidado, por isso fica por último.

### Regras de segurança aplicadas em todo passo
1. **Um passo por vez.** Eu paro depois de cada extração e te aviso para você testar no preview.
2. **Sem refatorar lógica.** Só recortar e colar. Nada de "aproveitar para melhorar".
3. **Imports explícitos.** Cada peça extraída é importada de volta no arquivo original, mantendo o mesmo comportamento.
4. **Reversível.** Qualquer passo pode ser desfeito pelo History sem afetar os anteriores.

### O que NÃO vamos fazer agora
- Não mexer em `FlowBuilder.tsx` nem em outros arquivos grandes nesta fase.
- Não criar testes ainda (fica para fase 2, depois que o arquivo estiver menor).
- Não tocar em backend, edge functions, banco ou regras de negócio.

### Estimativa
- Passo 1 (mapa): 1 rodada.
- Passos 2 a 5: ~4 a 8 rodadas, com você validando entre elas.

### Como você participa
Depois de cada passo, eu te aviso "pode testar X, Y, Z no preview". Se algo estranho aparecer, você me fala e eu reverto na hora.

Posso começar pelo Passo 1 (mapeamento) agora?