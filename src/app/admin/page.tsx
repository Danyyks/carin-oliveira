"use client";

import { useState } from "react";
import AdminGate from "./AdminGate";
import DashboardClassico from "./classico/DashboardClassico";
import PainelNovo from "./painel/PainelNovo";

const CHAVE_VERSAO = "painel-carin:versao";

// Lido uma vez, no mount: `/admin/classico` e `/admin/nova` continuam fixos em cada
// versão, então a troca por aparelho não depende de decorar uma URL diferente.
function versaoInicial(): "novo" | "classico" {
  if (typeof window === "undefined") return "novo";
  return window.localStorage.getItem(CHAVE_VERSAO) === "classico" ? "classico" : "novo";
}

// `/admin` abre o painel novo (barra de abas + Agenda por dia) por padrão (Fase B4). Se
// ele der problema num aparelho específico, gravar "classico" em
// `localStorage["painel-carin:versao"]` naquele aparelho faz o `/admin` normal voltar a
// abrir o painel clássico ali — sem precisar de outro deploy.
export default function AdminPage() {
  const [versao] = useState(versaoInicial);
  return (
    <AdminGate
      render={(props) => (versao === "classico" ? <DashboardClassico {...props} /> : <PainelNovo {...props} />)}
    />
  );
}
