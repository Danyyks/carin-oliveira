"use client";

import { useState } from "react";
import type { Agenda } from "@/lib/db";
import { salvarAgenda } from "@/lib/db";
import { erroHumano } from "@/lib/erroHumano";
import Folha from "../compartilhado/Folha";

const HORARIOS_POSSIVEIS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];
const DIAS_UTEIS = ["1", "2", "3", "4", "5"]; // segunda a sexta

/** Editor de horários de UM dia da semana (Fase C) — chips + "copiar para seg a sex". */
export default function FolhaHorarioDia({
  diaK,
  diaLabel,
  agenda,
  onFechar,
  onSalvo,
}: {
  diaK: string;
  diaLabel: string;
  agenda: Agenda;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [horas, setHoras] = useState<string[]>(() => [...(agenda.dias?.[diaK] ?? [])].sort());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function toggle(h: string) {
    setHoras((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort()));
  }

  async function salvar(copiarSegASex: boolean) {
    setSalvando(true);
    setErro("");
    const dias = { ...(agenda.dias ?? {}) };
    dias[diaK] = horas;
    if (copiarSegASex) {
      for (const k of DIAS_UTEIS) dias[k] = horas;
    }
    try {
      await salvarAgenda({ dias });
      onSalvo();
    } catch (e) {
      setErro(erroHumano(e));
    } finally {
      setSalvando(false);
    }
  }

  const podeCopiar = DIAS_UTEIS.includes(diaK);

  return (
    <Folha
      titulo={diaLabel}
      onFechar={onFechar}
      rodape={
        <div className="pn-rodape-col">
          <button type="button" className="adm-btn pn-btn-largo" onClick={() => salvar(false)} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {podeCopiar && (
            <button
              type="button"
              className="adm-btn-ghost pn-btn-largo"
              onClick={() => salvar(true)}
              disabled={salvando}
            >
              Salvar e copiar para segunda a sexta
            </button>
          )}
          {erro && <p className="adm-erro" style={{ margin: 0 }}>{erro}</p>}
        </div>
      }
    >
      <p className="adm-muted">Toque nos horários que você atende neste dia.</p>
      <div className="chips">
        {HORARIOS_POSSIVEIS.map((h) => {
          const on = horas.includes(h);
          return (
            <button type="button" key={h} className={`chip${on ? " active" : ""}`} onClick={() => toggle(h)}>
              {h}
            </button>
          );
        })}
      </div>
    </Folha>
  );
}
