// Mensagens de WhatsApp enviadas ao cliente (formatadas, sem emojis).
// Usam o negrito do WhatsApp (*texto*) e bullets "•" — nada de emoji.
import { brl } from "./utils";
import { studio } from "@/config/studio";
import type { Agendamento } from "./db";

const mapsUrl = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.enderecoTexto)}`;

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

const listaServicos = (ag: Agendamento) =>
  ag.servicos.map((s) => `• ${s.nome} — ${brl(s.preco)}`).join("\n");

/** Enviada quando a Carin CONFIRMA o agendamento. */
export function msgConfirmacao(ag: Agendamento) {
  const linhas = [
    `Olá, ${primeiroNome(ag.clienteNome)}! Seu horário está *confirmado*.`,
    "",
    ag.servicos.length > 1 ? "*Serviços*" : "*Serviço*",
    listaServicos(ag),
  ];
  if (ag.servicos.length > 1) linhas.push(`*Total: ${brl(ag.total)}*`);
  linhas.push(
    "",
    `*Quando:* ${ag.diaLabel} às ${ag.hora}`,
    "",
    `*Onde:* ${studio.enderecoTexto}`,
    `Como chegar: ${mapsUrl()}`,
    "",
    "Qualquer dúvida é só me chamar por aqui. Até breve!",
  );
  return linhas.join("\n");
}

/** Enviada quando a Carin RECUSA um pedido ainda pendente. */
export function msgRecusa(ag: Agendamento) {
  return [
    `Olá, ${primeiroNome(ag.clienteNome)}. Infelizmente não vou conseguir atender neste horário:`,
    "",
    listaServicos(ag),
    `*${ag.diaLabel} às ${ag.hora}*`,
    "",
    "Me chama por aqui pra encontrarmos um novo horário. Desculpe o transtorno!",
  ].join("\n");
}

/** Enviada quando a Carin CANCELA um agendamento já confirmado. */
export function msgCancelamento(ag: Agendamento) {
  return [
    `Olá, ${primeiroNome(ag.clienteNome)}. Preciso *cancelar* o seu agendamento:`,
    "",
    listaServicos(ag),
    `*${ag.diaLabel} às ${ag.hora}*`,
    "",
    "Me chama por aqui pra remarcarmos o quanto antes. Desculpe o imprevisto!",
  ].join("\n");
}
