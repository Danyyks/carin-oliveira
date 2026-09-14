// ============================================================
// DADOS DO STUDIO (tenant) — separados do "motor" (SaaS-ready).
// Troque estes valores pelos dados reais da cliente.
// ============================================================

export type Servico = {
  nome: string;
  desc: string;
  preco: number;
  tipo?: "servico" | "combo" | "promocao";
};

export type Loja = {
  url: string;
  titulo: string;
  sub: string;
  fundo?: string; // imagem de fundo do banner em /public (ex.: "/marcas/loja-fundo.jpg")
};

export type StudioConfig = {
  nome: string;
  titulo: string; // ex.: "Nail Designer"
  foto?: string; // caminho da foto de perfil em /public (ex.: "/carin.jpg")
  whatsapp: string; // DDI+DDD+número, só dígitos
  instagram: string; // sem @
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
  enderecoTexto: "Rua Diniz Goes da Silva, 260 - casa 10, Sorocaba - SP",
  bairro: "Sorocaba, SP",
  horario: "Ter a Sáb · 9–19h",
  horarios: ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"],
  bio: [
    "Alongamento, gel e nail art",
    "Atendimento com hora marcada · Sorocaba",
  ],
  servicos: [
    { nome: "Manicure tradicional", desc: "Corte, cutícula e esmaltação", preco: 35 },
    { nome: "Esmaltação em gel", desc: "Brilho e durabilidade", preco: 65 },
    { nome: "Alongamento", desc: "Fibra ou gel, do seu jeito", preco: 120 },
    { nome: "Nail Art", desc: "Desenhos e pedrarias", preco: 45 },
  ],
  // Loja virtual (revendedora O Boticário). Imagem de fundo criada pela Carin.
  loja: {
    url: "https://minhaloja.grupoboticario.com.br/loja-carinoliveiraalmeidamarques-26635836?utm_source=app_divulgar&utm_medium=mld",
    titulo: "Acompanhe minha lojinha virtual",
    sub: "Perfumes e presentes",
    fundo: "/marcas/loja-fundo.jpg",
  },
};
