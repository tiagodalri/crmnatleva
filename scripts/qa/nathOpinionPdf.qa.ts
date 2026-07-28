/**
 * QA visual do PDF "Opinião da Nath" · fora do bundle de produção.
 * Uso: bun scripts/qa/nathOpinionPdf.qa.ts  → gera PDFs em /tmp/nathqa
 */
import { writeFileSync } from "node:fs";
import { createNathOpinionDocument } from "../../src/lib/pdf-engine/nathOpinionPdf";

const OUT = "/tmp/nathqa";

const LONG = `**❤️ RISCOS À MARCA**: A conversa mostra uma demora de resposta acima do aceitável em dois momentos distintos, o que abre espaço para o cliente buscar alternativas e enfraquece a percepção de cuidado que a NatLeva construiu. Além disso, houve uso de linguagem excessivamente técnica ao explicar as condições tarifárias, algo que gera insegurança em quem está comprando uma experiência e não um bilhete. A recomendação é reforçar acolhimento antes de qualquer explicação operacional, sempre confirmando entendimento.

**💡 OPORTUNIDADES**: O cliente demonstrou interesse claro em uma viagem em família com foco em conforto e roteiro tranquilo, mencionando datas flexíveis e disposição para antecipar a decisão caso a proposta chegue rápido. Isso é um sinal forte de momento de compra e deveria acionar prioridade máxima na fila de propostas. Vale oferecer duas faixas de investimento com diferenças bem explicadas em experiência, não em preço.

**🤝 HUMANIZAÇÃO**: O tom geral está correto, porém mecânico em vários trechos, com respostas que soam como formulário. Faltou nomear o cliente, retomar detalhes que ele já havia contado e demonstrar memória da conversa. Pequenos gestos de continuidade elevam muito a percepção de atendimento premium e reduzem a sensação de estar falando com um sistema.

**♟️ ESTRATÉGIA**: A negociação deveria ter avançado para a etapa de proposta ainda na mesma sessão, aproveitando o pico de interesse. Ao adiar, perdemos o calor da conversa e criamos um custo de reaquecimento. O ideal é fechar o briefing em no máximo cinco campos e já sinalizar prazo concreto de envio, criando compromisso mútuo.

**✅ O QUE EU FARIA**: Retomaria hoje mesmo com uma mensagem curta e pessoal, confirmando as datas e enviando duas opções de roteiro com valores claros. Em seguida agendaria um retorno em 48 horas para tratar dúvidas, mantendo o cliente aquecido sem pressionar. Registraria tudo no CRM com tags de urgência para não perder o ciclo.`;

const SHORT = `**💡 OPORTUNIDADES**: Cliente pronto para fechar, basta enviar a proposta hoje com duas opções claras.`;

const HUGE = Array.from({ length: 3 }, () => LONG).join("\n\n");

const cases: Array<{ name: string; data: Parameters<typeof createNathOpinionDocument>[0] }> = [
  { name: "1-padrao", data: { opinion: LONG, contactName: "Alessandra Oliveira", contactPhone: "5521964311748" } },
  { name: "2-sem-telefone", data: { opinion: LONG, contactName: "Alessandra Oliveira", contactPhone: null } },
  { name: "3-nome-longo", data: { opinion: SHORT, contactName: "Maria Fernanda Albuquerque de Vasconcelos Cavalcanti Ferreira", contactPhone: "552133334444" } },
  { name: "4-curta", data: { opinion: SHORT, contactName: "João Pedro", contactPhone: "21964311748" } },
  { name: "5-tres-paginas", data: { opinion: HUGE, contactName: "Alessandra Oliveira", contactPhone: "5521964311748" } },
];

for (const c of cases) {
  const { pdf } = createNathOpinionDocument({ ...c.data, generatedAt: new Date("2026-07-28T14:32:00") }, null);
  const bytes = pdf.output("arraybuffer") as ArrayBuffer;
  writeFileSync(`${OUT}/${c.name}.pdf`, Buffer.from(bytes));
  console.log(`ok ${c.name}.pdf · páginas: ${pdf.getNumberOfPages()}`);
}
