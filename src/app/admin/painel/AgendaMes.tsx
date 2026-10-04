"use client";

import { useState } from "react";
import { gradeDoMes, hojeKeySalao } from "@/lib/datas";

const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function ymd(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Calendário do mês, só para navegar (escolher um dia distante) — a Agenda por dia
 * continua sendo a tela principal. Diferente do calendário de Folgas do painel clássico:
 * aqui dá para tocar em dias passados também (é navegação, não marcar folga).
 */
export default function AgendaMes({
  dataSelecionada,
  pedidos,
  folgas,
  onEscolher,
}: {
  dataSelecionada: string;
  pedidos: Set<string>;
  folgas: Set<string>;
  onEscolher: (dataKey: string) => void;
}) {
  const [ano0, mes0] = dataSelecionada.split("-").map(Number);
  const [mesRef, setMesRef] = useState(() => new Date(ano0, mes0 - 1, 1));
  const hoje = hojeKeySalao();
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const grade = gradeDoMes(ano, mes);

  return (
    <div className="pn-mes">
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => setMesRef(new Date(ano, mes - 1, 1))}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <div className="cal-titulo">
          {MESES_NOME[mes]} {ano}
        </div>
        <button
          type="button"
          className="cal-nav"
          onClick={() => setMesRef(new Date(ano, mes + 1, 1))}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className="cal-grid cal-dow">
        {DOW.map((d) => (
          <div key={d} className="cal-dow-cell">
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {grade.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = ymd(ano, mes, d);
          const passado = key < hoje;
          const cls = ["cal-dia"];
          if (passado) cls.push("cal-passado");
          if (key === hoje) cls.push("cal-hoje");
          if (key === dataSelecionada) cls.push("pn-mes-selecionado");
          if (folgas.has(key)) cls.push("cal-folga");
          return (
            <button
              key={key}
              type="button"
              className={cls.join(" ")}
              aria-current={key === dataSelecionada}
              onClick={() => onEscolher(key)}
            >
              {d}
              {pedidos.has(key) && <span className="pn-mes-ponto" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
