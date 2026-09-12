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

export type GaleriaItem = { cls: string; nome: string };

export type StudioConfig = {
  nome: string;
  whatsapp: string; // DDI+DDD+número, só dígitos
  instagram: string; // sem @
  enderecoTexto: string;
  bairro: string;
  horario: string;
  horarios: string[]; // horários oferecidos (provisório; virá do painel na Etapa 4)
  bio: string[];
  servicos: Servico[];
  galeria: GaleriaItem[];
};

export const studio: StudioConfig = {
  nome: "Carin Oliveira",
  whatsapp: "5511999999999",
  instagram: "carinoliveira.nails",
  enderecoTexto: "Rua das Flores, 123 - Vila Mariana, São Paulo - SP",
  bairro: "Vila Mariana, SP",
  horario: "Ter a Sáb · 9–19h",
  horarios: ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"],
  bio: [
    "Nail Designer · Alongamento, gel e nail art",
    "Atendimento com hora marcada · São Paulo",
  ],
  servicos: [
    { nome: "Manicure tradicional", desc: "Corte, cutícula e esmaltação", dur: "45 min", preco: 35 },
    { nome: "Esmaltação em gel", desc: "Brilho e durabilidade", dur: "1h", preco: 65 },
    { nome: "Alongamento", desc: "Fibra ou gel, do seu jeito", dur: "2h", preco: 120 },
    { nome: "Nail Art", desc: "Desenhos e pedrarias", dur: "1h15", preco: 45 },
  ],
  galeria: [
    { cls: "sw-rose", nome: "Rosa chá" },
    { cls: "sw-french", nome: "French" },
    { cls: "sw-nude", nome: "Nude glow" },
    { cls: "sw-wine", nome: "Vinho" },
    { cls: "sw-glow", nome: "Nude" },
    { cls: "sw-lav", nome: "Lavanda" },
    { cls: "sw-red", nome: "Cereja" },
  ],
};
