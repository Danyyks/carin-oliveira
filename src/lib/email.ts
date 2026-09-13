// Envio de e-mail de aviso via EmailJS (client-side).
// As chaves abaixo NÃO são segredo (são identificadores públicos usados no
// navegador). O e-mail vai para o endereço fixo do template (To Email).
import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_g31s4ah";
const TEMPLATE_ID = "template_cs20qhp";
const PUBLIC_KEY = "KYu7tbR4l1Dsqtr0X";

export type EmailPedido = {
  cliente_nome: string;
  cliente_whatsapp: string;
  servico: string;
  quando: string;
};

/** Avisa a dona por e-mail que chegou um pedido de agendamento. */
export function enviarEmailPedido(params: EmailPedido) {
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY });
}
