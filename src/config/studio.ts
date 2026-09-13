// ============================================================
// DADOS DO STUDIO (tenant) — separados do "motor" (SaaS-ready).
// Troque estes valores pelos dados reais da cliente.
// ============================================================

export type Servico = {
  nome: string;
  desc: string;
  dur: string;
  preco: number;
  tipo?: "servico" | "combo" | "promocao";
};

export type MarcaLoja = {
  nome: string;
  logo?: string; // caminho do logo oficial em /public (ex.: "/marcas/eudora.svg"); vazio = usa selo estilizado
};

export type Loja = {
  url: string;
  titulo: string;
  sub: string;
  simbolo?: string; // símbolo oficial do Boticário p/ o cabeçalho (ex.: "/marcas/boticario.svg")
  marcas?: MarcaLoja[];
};

export type StudioConfig = {
  nome: string;
  titulo: string; // ex.: "Nail Designer"
  foto?: string; // caminho da foto de perfil em /public (ex.: "/carin.jpg")
  whatsapp: string; // DDI+DDD+número, só dígitos
  instagram: string; // sem @
  emailDono: string; // recebe aviso de agendamento pendente (Etapa 6)
  enderecoTexto: string;
  bairro: string;
  horario: string;
  horarios: string[]; // horários oferecidos (provisório; virá do painel na Etapa 4)
  bio: string[];
  servicos: Servico[];
  loja?: Loja;
};

export const studio: StudioConfig = {
  nome: "Carin",
  titulo: "Nail Designer",
  foto: "/carin.jpg",
  whatsapp: "5511933400707", // provisório (WhatsApp do Dany, p/ testes)
  instagram: "carinoliveira9",
  emailDono: "danyy.jonathan@gmail.com", // provisório (e-mail do Dany, p/ testes)
  enderecoTexto: "Rua Diniz Goes da Silva, 260 - casa 10, Sorocaba - SP",
  bairro: "Sorocaba, SP",
  horario: "Ter a Sáb · 9–19h",
  horarios: ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"],
  bio: [
    "Alongamento, gel e nail art",
    "Atendimento com hora marcada · Sorocaba",
  ],
  servicos: [
    { nome: "Manicure tradicional", desc: "Corte, cutícula e esmaltação", dur: "45 min", preco: 35 },
    { nome: "Esmaltação em gel", desc: "Brilho e durabilidade", dur: "1h", preco: 65 },
    { nome: "Alongamento", desc: "Fibra ou gel, do seu jeito", dur: "2h", preco: 120 },
    { nome: "Nail Art", desc: "Desenhos e pedrarias", dur: "1h15", preco: 45 },
  ],
  // Loja virtual (revendedora O Boticário).
  // Os logos oficiais devem ser fornecidos pela Carin (arquivos em /public/marcas).
  // Enquanto `simbolo`/`logo` estiverem vazios, mostramos selos estilizados de reserva.
  loja: {
    url: "https://minhaloja.grupoboticario.com.br/loja-carinoliveiraalmeidamarques-26635836?utm_source=app_divulgar&utm_medium=mld",
    titulo: "O Boticário",
    sub: "Minha loja virtual · perfumes e presentes",
    simbolo: undefined, // ex.: "/marcas/boticario.svg" quando o arquivo estiver em /public/marcas
    marcas: [
      { nome: "O Boticário", logo: undefined }, // ex.: "/marcas/boticario.svg"
      { nome: "Eudora", logo: undefined }, // ex.: "/marcas/eudora.svg"
      { nome: "O.U.I. Paris", logo: undefined }, // ex.: "/marcas/oui.svg"
      { nome: "Quem disse, Berenice?", logo: undefined }, // ex.: "/marcas/berenice.svg"
    ],
  },
};
