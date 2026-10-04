"use client";

// Prévia visual da Agenda nova (Fase B1) com dados FICTÍCIOS — sem precisar logar.
// Página temporária, só para o Dany revisar o visual antes do deploy final; não faz
// parte do fluxo real do app (o painel de verdade sempre lê o Firestore de verdade).
import { useState } from "react";
import { notFound } from "next/navigation";
import type { Agendamento, ServicoDoc, SlotDoc } from "@/lib/db";
import { hojeKeySalao, somarDias } from "@/lib/datas";
import { labelData } from "@/lib/utils";
import { DadosContext, type Dados } from "../admin/painel/DadosProvider";
import TabBar, { type Aba } from "../admin/painel/TabBar";
import AgendaDia from "../admin/painel/AgendaDia";
import ServicosTab from "../admin/painel/ServicosTab";
import HorariosTab from "../admin/painel/HorariosTab";
import PedidosTab from "../admin/painel/PedidosTab";
import { ContaTab } from "../admin/painel/PainelNovo";

const hoje = hojeKeySalao();
const d = (n: number) => somarDias(hoje, n);

const ag = (over: Partial<Agendamento>): Agendamento => {
  const data = over.data ?? hoje;
  const hora = over.hora ?? "09:00";
  return {
    id: `${data}_${hora}`,
    servicos: [{ nome: "Esmaltação em gel", preco: 85 }],
    total: 85,
    clienteNome: "Cliente",
    clienteWhatsapp: "15999998888",
    data,
    hora,
    diaLabel: labelData(data),
    status: "confirmado",
    ...over,
  };
};

const agendamentos: Agendamento[] = [
  ag({ hora: "09:00", clienteNome: "Ana Beatriz", status: "confirmado" }),
  ag({
    hora: "11:00",
    clienteNome: "Bruna Lima",
    status: "confirmado",
    servicos: [
      { nome: "Alongamento em fibra", preco: 150 },
      { nome: "Esmaltação em gel", preco: 85 },
    ],
    total: 235,
  }),
  ag({ hora: "15:00", clienteNome: "Carla Souza", status: "pendente", servicos: [{ nome: "Spa dos pés", preco: 65 }], total: 65 }),
  ag({ hora: "10:00", data: d(1), clienteNome: "Duda Martins", status: "pendente" }),
  ag({ hora: "14:00", data: d(2), clienteNome: "Elaine Rocha", status: "confirmado" }),
  ag({ hora: "09:30", data: d(-1), clienteNome: "Fernanda Dias", status: "confirmado" }),
];

const slots: SlotDoc[] = [
  ...agendamentos.map((a) => ({ id: a.id, data: a.data, hora: a.hora, status: a.status })),
  { id: `${hoje}_16:00`, data: hoje, hora: "16:00", status: "bloqueado" as const },
];

const servicos: ServicoDoc[] = [
  { id: "s1", nome: "Esmaltação em gel", desc: "Brilho e durabilidade", preco: 85, destaque: true, duracaoMin: 45 },
  { id: "s2", nome: "Alongamento em fibra", desc: "Fibra de vidro", preco: 150, destaque: false, duracaoMin: 90 },
  { id: "s3", nome: "Spa dos pés", desc: "Esfoliação e hidratação", preco: 65, destaque: false, duracaoMin: 40 },
];

const dadosFicticios: Dados = {
  servicos,
  agenda: {
    dias: {
      // grade igual todo dia da semana, só pra a prévia ter bastante horário pra mostrar
      "0": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      "1": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      "2": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      "3": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      "4": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      "5": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      "6": ["09:00", "10:00", "11:00"],
    },
    bloqueios: [d(4)],
  },
  slots,
  agendamentos,
  carregando: false,
  erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
};

// Ferramenta só de desenvolvimento: no site publicado responde "página não encontrada".
export default function DevPreviewAgenda() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Previa />;
}

function Previa() {
  const [aba, setAba] = useState<Aba>("agenda");
  const [diaAlvo, setDiaAlvo] = useState<string | undefined>(undefined);
  const pedidos = agendamentos.filter((a) => a.status === "pendente").length;

  return (
    <DadosContext.Provider value={dadosFicticios}>
      <div className="admin pn-shell">
        <div className="admin-card" style={{ marginBottom: 4, background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.3)" }}>
          <p className="adm-muted" style={{ margin: 0 }}>
            <b>Prévia com dados fictícios</b> — Ana, Bruna, Carla etc. não existem. Servem só para mostrar o visual da
            Agenda nova antes do deploy final.
          </p>
        </div>
        {aba === "agenda" && <AgendaDia onIrParaPedidos={() => setAba("pedidos")} diaInicial={diaAlvo} />}
        {aba === "servicos" && <ServicosTab />}
        {aba === "horarios" && (
          <HorariosTab
            onVerNoDia={(data) => {
              setDiaAlvo(data);
              setAba("agenda");
            }}
          />
        )}
        {aba === "conta" && <ContaTab email="carin@exemplo.com (fictício)" logout={async () => {}} />}
        {aba === "pedidos" && <PedidosTab />}
        <TabBar aba={aba} onMudar={setAba} pedidos={pedidos} />
      </div>
    </DadosContext.Provider>
  );
}
