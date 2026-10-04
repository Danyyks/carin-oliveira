"use client";

import AdminGate from "../AdminGate";
import DashboardClassico from "./DashboardClassico";

// Acesso direto ao painel clássico, preservado como "plano B" (Fase B4): se o painel
// novo der problema num aparelho, é só abrir por aqui — mesmo login, mesmos dados.
export default function AdminClassicoPage() {
  return <AdminGate render={(props) => <DashboardClassico {...props} />} />;
}
