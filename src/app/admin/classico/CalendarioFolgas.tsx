"use client";

import { useEffect, useState } from "react";
import { ouvirAgenda, salvarBloqueios } from "@/lib/db";
import { detalheErro } from "../detalheErro";
import CardColapsavel from "./CardColapsavel";

// ---------------- Folgas (calendário) ----------------
const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Data local no formato "YYYY-MM-DD" (mesmo `key` que o site usa por dia).
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarioFolgas({ semSanfona }: { semSanfona?: boolean } = {}) {
  const [bloqueios, setBloqueios] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [mesRef, setMesRef] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });

  useEffect(() => ouvirAgenda((a) => setBloqueios(a.bloqueios ?? [])), []);

  const hojeKey = ymd(new Date());
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const inicioMesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const podeVoltar = mesRef > inicioMesAtual;

  async function toggleDia(key: string) {
    setErro("");
    const marcado = bloqueios.includes(key);
    // Mantém só folgas de hoje em diante (limpa as que já passaram).
    const novo = (marcado ? bloqueios.filter((x) => x !== key) : [...bloqueios, key])
      .filter((k) => k >= hojeKey)
      .sort();
    setBloqueios(novo); // otimista
    try {
      await salvarBloqueios(novo);
    } catch (e) {
      setErro(`Não consegui salvar (${detalheErro(e)}).`);
    }
  }

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);

  const folgasFuturas = bloqueios.filter((k) => k >= hojeKey).length;
  return (
    <CardColapsavel
      titulo="Folgas"
      resumo={folgasFuturas ? `${folgasFuturas} ${folgasFuturas === 1 ? "folga" : "folgas"}` : "nenhuma"}
      abertoInicial={semSanfona}
    >
      <p className="adm-muted">Toque num dia para marcar ou tirar uma folga. Nos dias de folga, o site não mostra horários.</p>

      <div className="cal-head">
        <button className="cal-nav" onClick={() => setMesRef(new Date(ano, mes - 1, 1))} disabled={!podeVoltar} aria-label="Mês anterior">‹</button>
        <div className="cal-titulo">{MESES_NOME[mes]} {ano}</div>
        <button className="cal-nav" onClick={() => setMesRef(new Date(ano, mes + 1, 1))} aria-label="Próximo mês">›</button>
      </div>

      <div className="cal-grid cal-dow">
        {DOW.map((d) => <div key={d} className="cal-dow-cell">{d}</div>)}
      </div>
      <div className="cal-grid">
        {celulas.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = ymd(new Date(ano, mes, d));
          const passado = key < hojeKey;
          const cls = ["cal-dia"];
          if (passado) cls.push("cal-passado");
          if (key === hojeKey) cls.push("cal-hoje");
          if (bloqueios.includes(key)) cls.push("cal-folga");
          return (
            <button key={key} type="button" className={cls.join(" ")} disabled={passado} onClick={() => toggleDia(key)}>
              {d}
            </button>
          );
        })}
      </div>

      <div className="cal-legenda">
        <span><i className="cal-leg cal-leg-hoje" />hoje</span>
        <span><i className="cal-leg cal-leg-folga" />folga (sem atendimento)</span>
      </div>
      {erro && <p className="adm-erro">{erro}</p>}
    </CardColapsavel>
  );
}
