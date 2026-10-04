"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import AssinaturaDSS from "@/components/AssinaturaDSS";
import type { DashboardProps } from "../AdminGate";
import NotificacoesCard from "../classico/NotificacoesCard";
import { useOffline } from "../compartilhado/useOffline";
import DadosProvider, { useDados } from "./DadosProvider";
import TabBar, { abaValida, type Aba } from "./TabBar";
import AgendaDia from "./AgendaDia";
import ServicosTab from "./ServicosTab";
import HorariosTab from "./HorariosTab";
import PedidosTab from "./PedidosTab";
import MeuLink from "./MeuLink";

/**
 * Painel novo (Fase C): barra de abas + Agenda por dia como tela principal — Agenda, Pedidos,
 * Serviços e Horários já com o redesenho definitivo (própria leitura do `DadosProvider`, sem
 * depender do painel clássico). Conta ainda reaproveita `NotificacoesCard` do clássico (não tem
 * leitura própria do Firestore, então não carrega a mesma dívida de performance das outras).
 */
export default function PainelNovo(props: DashboardProps) {
  return (
    <DadosProvider>
      <PainelNovoConteudo {...props} />
    </DadosProvider>
  );
}

function PainelNovoConteudo({ email, logout }: DashboardProps) {
  // Deep link da notificação (abertura fria): "?aba=pedidos" e/ou "?dia=2026-10-02".
  const [aba, setAba] = useState<Aba>(
    () => abaValida(new URLSearchParams(window.location.search).get("aba")) ?? "agenda",
  );
  const [diaAlvo, setDiaAlvo] = useState<string | undefined>(
    () => new URLSearchParams(window.location.search).get("dia") ?? undefined,
  );
  const { agendamentos } = useDados();
  const pedidos = agendamentos.filter((a) => a.status === "pendente").length;
  const offline = useOffline();

  // O deep link é de uso único: some da URL depois de lido, senão ela fica "presa" nessa aba.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Deep link com o app JÁ aberto: o clique na notificação só foca a janela (não recarrega
  // a página, então a query string acima nunca é lida) — o service worker avisa por postMessage.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function aoReceberMensagem(e: MessageEvent) {
      if (e.data?.type !== "notification-clicked") return;
      const novaAba = abaValida(e.data.aba);
      if (novaAba) setAba(novaAba);
      if (typeof e.data.dia === "string") setDiaAlvo(e.data.dia);
    }
    navigator.serviceWorker.addEventListener("message", aoReceberMensagem);
    return () => navigator.serviceWorker.removeEventListener("message", aoReceberMensagem);
  }, []);

  // Bolinha no ícone do app: precisa rodar sempre, não só enquanto a aba Pedidos está montada.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!("setAppBadge" in nav)) return;
    if (pedidos > 0) nav.setAppBadge?.(pedidos).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [pedidos]);

  function verNaAgenda(dataKey: string) {
    setDiaAlvo(dataKey);
    setAba("agenda");
  }

  return (
    <div className="admin pn-shell">
      {offline && (
        <div className="pn-offline" role="status">
          <WifiOff size={16} aria-hidden="true" />
          Sem conexão — o que você fizer agora pode não salvar.
        </div>
      )}
      {aba === "agenda" && <AgendaDia onIrParaPedidos={() => setAba("pedidos")} diaInicial={diaAlvo} />}
      {aba === "pedidos" && <PedidosTab />}
      {aba === "horarios" && <HorariosTab onVerNoDia={verNaAgenda} />}
      {aba === "servicos" && <ServicosTab />}
      {aba === "conta" && <ContaTab email={email} logout={logout} />}
      <TabBar aba={aba} onMudar={setAba} pedidos={pedidos} />
    </div>
  );
}

export function ContaTab({ email, logout }: DashboardProps) {
  return (
    <>
      <section className="admin-card">
        <h2 className="adm-section">Conta</h2>
        <p className="adm-muted">{email}</p>
        <div className="adm-actions" style={{ marginTop: 14 }}>
          <button className="adm-btn-ghost" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </section>
      <MeuLink />
      <NotificacoesCard semSanfona />
      <AssinaturaDSS />
    </>
  );
}
