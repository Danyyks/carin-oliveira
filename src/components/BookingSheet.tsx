"use client";

import { useEffect, useState } from "react";
import type { StudioConfig } from "@/config/studio";
import { brl, wppUrl, proximosDias, type Dia } from "@/lib/utils";
import { WhatsappIcon } from "./icons";

export default function BookingSheet({
  studio,
  open,
  preset,
  onClose,
}: {
  studio: StudioConfig;
  open: boolean;
  preset: number | null;
  onClose: () => void;
}) {
  const [dias, setDias] = useState<Dia[]>([]);
  const [svc, setSvc] = useState<number | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);

  // Datas geradas só no cliente (evita divergência de hidratação).
  useEffect(() => setDias(proximosDias(6)), []);

  // Pré-seleciona o serviço quando aberto por um card específico.
  useEffect(() => {
    if (open && preset != null) setSvc(preset);
  }, [open, preset]);

  // Trava o scroll do fundo enquanto o sheet está aberto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Fecha no Esc.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const pronto = svc != null && !!dia && !!hora;

  function confirmar() {
    if (!pronto) return;
    const s = studio.servicos[svc!];
    const primeiroNome = studio.nome.split(" ")[0];
    const msg =
      `Olá, ${primeiroNome}! Vim pela sua bio.\n\n` +
      `Gostaria de agendar:\n` +
      `• Serviço: ${s.nome}\n` +
      `• Data: ${dia}\n` +
      `• Horário: ${hora}\n\n` +
      `Pode confirmar pra mim?`;
    window.open(wppUrl(studio.whatsapp, msg), "_blank");
  }

  return (
    <>
      <div className={`overlay${open ? " open" : ""}`} onClick={onClose} />
      <div className={`sheet${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Agendar horário">
        <div className="grabber" />
        <h2>Agendar horário</h2>
        <p className="lead">Monte seu agendamento e a confirmação abre no WhatsApp.</p>

        <div className="step">
          <div className="step-label">
            <span className="n">1</span>Serviço
          </div>
          <div className="chips">
            {studio.servicos.map((s, i) => (
              <button key={i} type="button" className={`chip${svc === i ? " active" : ""}`} onClick={() => setSvc(i)}>
                {s.nome}
                <small>
                  {s.dur} · {brl(s.preco)}
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="step">
          <div className="step-label">
            <span className="n">2</span>Dia
          </div>
          <div className="chips">
            {dias.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`chip day-chip${dia === d.label ? " active" : ""}`}
                onClick={() => setDia(d.label)}
              >
                {d.dia}
                <b>{d.num}</b>
                <small>{d.mes}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="step">
          <div className="step-label">
            <span className="n">3</span>Horário
          </div>
          <div className="chips">
            {studio.horarios.map((h) => (
              <button key={h} type="button" className={`chip${hora === h ? " active" : ""}`} onClick={() => setHora(h)}>
                {h}
              </button>
            ))}
          </div>
        </div>

        {pronto ? (
          <div className="summary">
            <span>
              <b>{studio.servicos[svc!].nome}</b> · {dia} · <b>{hora}</b>
            </span>
            <span>{brl(studio.servicos[svc!].preco)}</span>
          </div>
        ) : (
          <div className="summary empty">Selecione as opções acima</div>
        )}

        <button className="confirm" disabled={!pronto} onClick={confirmar}>
          <WhatsappIcon />
          <span>Confirmar no WhatsApp</span>
        </button>
      </div>
    </>
  );
}
