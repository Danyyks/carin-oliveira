"use client";

import { useState, type ReactNode } from "react";

// ---------------- Seção colapsável (sanfona) ----------------
// Usada nas seções de CONFIGURAÇÃO (fechadas por padrão no painel clássico). Agendamentos
// fica fora, sempre visível. O `resumo` mostra a info-chave mesmo com a seção fechada.
// `abertoInicial`: o painel novo passa `true` — dentro de uma aba dedicada (ex.: "Serviços"),
// a seção já nasce aberta (a aba é a própria sanfona); continua colapsável se a dona preferir.
export default function CardColapsavel({
  titulo,
  resumo,
  children,
  abertoInicial = false,
}: {
  titulo: string;
  resumo?: string;
  children: ReactNode;
  abertoInicial?: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  return (
    <section className={`admin-card adm-col${aberto ? " aberto" : ""}`}>
      <button type="button" className="adm-col-head" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        <span className="adm-section">{titulo}</span>
        {resumo && <span className="adm-col-resumo">{resumo}</span>}
        <span className="adm-col-seta" aria-hidden="true">›</span>
      </button>
      {aberto && <div className="adm-col-inner">{children}</div>}
    </section>
  );
}
