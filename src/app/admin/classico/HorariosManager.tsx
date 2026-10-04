"use client";

import { useEffect, useState } from "react";
import { ouvirAgenda, salvarAgenda } from "@/lib/db";
import { detalheErro } from "../detalheErro";
import CardColapsavel from "./CardColapsavel";

// ---------------- Horários ----------------
const DIAS = [
  { k: "1", label: "Segunda" },
  { k: "2", label: "Terça" },
  { k: "3", label: "Quarta" },
  { k: "4", label: "Quinta" },
  { k: "5", label: "Sexta" },
  { k: "6", label: "Sábado" },
  { k: "0", label: "Domingo" },
];
const HORARIOS_POSSIVEIS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];

export default function HorariosManager({ semSanfona }: { semSanfona?: boolean } = {}) {
  const [dias, setDias] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let primeiro = true;
    const unsub = ouvirAgenda((a) => {
      if (primeiro) {
        setDias(a.dias || {});
        primeiro = false;
      }
    });
    return unsub;
  }, []);

  function toggle(diaK: string, h: string) {
    setMsg(null);
    setDias((prev) => {
      const atuais = prev[diaK] || [];
      const novo = atuais.includes(h) ? atuais.filter((x) => x !== h) : [...atuais, h].sort();
      return { ...prev, [diaK]: novo };
    });
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      await salvarAgenda({ dias });
      setMsg({ ok: true, texto: "Horários salvos!" });
    } catch (e) {
      setMsg({ ok: false, texto: `Não consegui salvar (${detalheErro(e)}).` });
    } finally {
      setSalvando(false);
    }
  }

  const diasAtivos = Object.values(dias).filter((hs) => hs && hs.length).length;
  return (
    <CardColapsavel
      titulo="Dias e horários"
      resumo={diasAtivos ? `${diasAtivos} ${diasAtivos === 1 ? "dia" : "dias"}` : "nenhum"}
      abertoInicial={semSanfona}
    >
      <p className="adm-muted">Toque nos horários que você atende em cada dia.</p>
      <div className="adm-dias">
        {DIAS.map((d) => (
          <div className="adm-dia" key={d.k}>
            <div className="adm-dia-label">{d.label}</div>
            <div className="chips">
              {HORARIOS_POSSIVEIS.map((h) => {
                const on = (dias[d.k] || []).includes(h);
                return (
                  <button type="button" key={h} className={`chip${on ? " active" : ""}`} onClick={() => toggle(d.k, h)}>
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="adm-actions">
        <button className="adm-btn" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar horários"}</button>
        {msg && <span className={msg.ok ? "adm-ok" : "adm-erro"}>{msg.texto}</span>}
      </div>
    </CardColapsavel>
  );
}
