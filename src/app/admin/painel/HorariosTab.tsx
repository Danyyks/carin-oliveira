"use client";

import { useState } from "react";
import { ChevronRight, CalendarOff } from "lucide-react";
import { labelData } from "@/lib/utils";
import { hojeKeySalao } from "@/lib/datas";
import { useDados } from "./DadosProvider";
import FolhaHorarioDia from "./FolhaHorarioDia";

const DIAS = [
  { k: "1", label: "Segunda" },
  { k: "2", label: "Terça" },
  { k: "3", label: "Quarta" },
  { k: "4", label: "Quinta" },
  { k: "5", label: "Sexta" },
  { k: "6", label: "Sábado" },
  { k: "0", label: "Domingo" },
];

function resumoDoDia(horas: string[]): string {
  if (horas.length === 0) return "Sem atendimento";
  return `${horas[0]} às ${horas[horas.length - 1]} · ${horas.length} ${horas.length === 1 ? "horário" : "horários"}`;
}

/** Aba Horários (Fase C, redesenho definitivo): uma linha por dia + próximas folgas. */
export default function HorariosTab({ onVerNoDia }: { onVerNoDia: (dataKey: string) => void }) {
  const { agenda, erros } = useDados();
  const [diaAberto, setDiaAberto] = useState<string | null>(null);

  const hoje = hojeKeySalao();
  const folgas = [...(agenda.bloqueios ?? [])].filter((d) => d >= hoje).sort();

  return (
    <div className="pn-agenda">
      <div className="pn-dia-cabecalho">
        <div>
          <div className="pn-dia-titulo">Horários</div>
          <div className="pn-dia-resumo">Toque num dia para editar</div>
        </div>
      </div>

      {erros.agenda && <p className="adm-erro">Não consegui carregar os horários agora. Tente de novo.</p>}

      <div className="pn-lista-periodo">
        {DIAS.map((d) => (
          <button
            type="button"
            key={d.k}
            className="pn-linha pn-linha-clicavel"
            onClick={() => setDiaAberto(d.k)}
          >
            <div className="pn-linha-principal">
              <b>{d.label}</b>
              <small>{resumoDoDia(agenda.dias?.[d.k] ?? [])}</small>
            </div>
            <ChevronRight size={18} className="pn-linha-chevron" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="pn-lista-periodo">
        <h3 className="pn-periodo-label">Próximas folgas</h3>
        {folgas.length === 0 && <p className="adm-muted">Nenhuma folga marcada. Marque uma pela Agenda.</p>}
        {folgas.map((data) => (
          <button type="button" key={data} className="pn-linha pn-linha-clicavel" onClick={() => onVerNoDia(data)}>
            <div className="pn-linha-principal">
              <b>
                <CalendarOff size={15} aria-hidden="true" /> {labelData(data)}
              </b>
              <small>Toque para ver na Agenda</small>
            </div>
            <ChevronRight size={18} className="pn-linha-chevron" aria-hidden="true" />
          </button>
        ))}
      </div>

      {diaAberto && (
        <FolhaHorarioDia
          diaK={diaAberto}
          diaLabel={DIAS.find((d) => d.k === diaAberto)!.label}
          agenda={agenda}
          onFechar={() => setDiaAberto(null)}
          onSalvo={() => setDiaAberto(null)}
        />
      )}
    </div>
  );
}
