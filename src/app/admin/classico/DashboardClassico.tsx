"use client";

import AssinaturaDSS from "@/components/AssinaturaDSS";
import type { DashboardProps } from "../AdminGate";
import AgendamentosManager from "./AgendamentosManager";
import NovoAgendamentoManual from "./NovoAgendamentoManual";
import NotificacoesCard from "./NotificacoesCard";
import ServicosManager from "./ServicosManager";
import HorariosManager from "./HorariosManager";
import CalendarioFolgas from "./CalendarioFolgas";

// ---------------- Painel clássico (rolagem única) ----------------
export default function DashboardClassico({ email, logout }: DashboardProps) {
  return (
    <div className="admin">
      <header className="admin-head">
        <div>
          <h1 className="adm-title">Painel · Carin</h1>
          <p className="adm-muted">{email}</p>
        </div>
        <button className="adm-btn-ghost" onClick={() => logout()}>Sair</button>
      </header>
      <AgendamentosManager />
      <NovoAgendamentoManual />
      <NotificacoesCard />
      <ServicosManager />
      <HorariosManager />
      <CalendarioFolgas />
      <AssinaturaDSS />
    </div>
  );
}
