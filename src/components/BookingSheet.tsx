"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { StudioConfig, Servico } from "@/config/studio";
import { brl, proximosDias, type Dia } from "@/lib/utils";
import { ouvirAgenda, ouvirSlotsOcupados, criarAgendamento } from "@/lib/db";

export default function BookingSheet({
  studio,
  servicos,
  open,
  preset,
  onClose,
}: {
  studio: StudioConfig;
  servicos: Servico[];
  open: boolean;
  preset: number | null;
  onClose: () => void;
}) {
  const [svc, setSvc] = useState<number | null>(null);
  const [diaSel, setDiaSel] = useState<Dia | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [baseDias, setBaseDias] = useState<Dia[]>([]);
  const [agenda, setAgenda] = useState<{ dias: Record<string, string[]> }>({ dias: {} });
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Datas e disponibilidade (client-side, evita divergência de hidratação).
  useEffect(() => setBaseDias(proximosDias(14)), []);
  useEffect(() => ouvirAgenda((a) => setAgenda(a)), []);
  useEffect(() => ouvirSlotsOcupados((o) => setOcupados(o)), []);

  useEffect(() => {
    if (open && preset != null) setSvc(preset);
  }, [open, preset]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Reseta ao fechar (depois da animação).
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setSucesso(false);
      setErro("");
      setSvc(null);
      setDiaSel(null);
      setHora(null);
      setNome("");
      setWhatsapp("");
    }, 320);
    return () => clearTimeout(t);
  }, [open]);

  // Dias com pelo menos um horário livre (respeita a agenda da dona; se ela ainda
  // não configurou nada, usa os horários padrão do config como reserva).
  const diasDisponiveis = useMemo(() => {
    const configurada = Object.values(agenda.dias).some((hs) => hs && hs.length > 0);
    return baseDias
      .map((d) => {
        const hors = configurada ? agenda.dias[String(d.weekday)] || [] : studio.horarios;
        const livres = hors.filter((h) => !ocupados.has(`${d.key}_${h}`));
        return { ...d, livres };
      })
      .filter((d) => d.livres.length > 0);
  }, [baseDias, agenda, ocupados, studio.horarios]);

  const diaAtual = diaSel ? diasDisponiveis.find((d) => d.key === diaSel.key) : undefined;
  const horariosLivres = diaAtual?.livres ?? [];

  // Se o horário escolhido foi ocupado por outra pessoa, limpa a seleção.
  useEffect(() => {
    if (hora && !horariosLivres.includes(hora)) setHora(null);
  }, [hora, horariosLivres]);

  const nomeOk = nome.trim().length >= 2;
  const whatsappOk = whatsapp.replace(/\D/g, "").length >= 10;
  const pronto = svc != null && !!diaSel && !!hora && nomeOk && whatsappOk;

  async function finalizar() {
    if (!pronto) return;
    setEnviando(true);
    setErro("");
    try {
      const s = servicos[svc!];
      const agendamentoId = await criarAgendamento({
        servicoNome: s.nome,
        servicoPreco: s.preco,
        clienteNome: nome.trim(),
        clienteWhatsapp: whatsapp.trim(),
        data: diaSel!.key,
        hora: hora!,
        diaLabel: diaSel!.label,
      });
      // Avisa a dona por push (não bloqueia o sucesso se o aviso falhar).
      // Manda só o id; o servidor lê os dados reais no Firestore.
      try {
        await fetch("/api/notify-owner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agendamentoId }),
        });
      } catch {
        // pedido já foi criado; ignora falha do aviso
      }
      setSucesso(true);
    } catch {
      setErro("Esse horário acabou de ser reservado. Escolha outro, por favor.");
      setHora(null);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className={`overlay${open ? " open" : ""}`} onClick={onClose} />
      <div className={`sheet${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Agendar horário">
        <div className="grabber" />

        {sucesso ? (
          <div className="sheet-sucesso">
            <div className="sucesso-check">
              <Check size={30} strokeWidth={3} />
            </div>
            <h2>Pedido enviado!</h2>
            <p className="lead">A Carin vai confirmar e te avisar pelo WhatsApp. É rapidinho!</p>
            <button className="sheet-btn" onClick={onClose}>Fechar</button>
          </div>
        ) : (
          <>
            <h2>Agendar horário</h2>
            <p className="lead">Escolha, preencha seus dados e finalize — a Carin confirma e te avisa no WhatsApp.</p>

            <div className="step">
              <div className="step-label">
                <span className="n">1</span>Serviço
              </div>
              {servicos.length === 0 ? (
                <p className="sheet-vazio">Os serviços ainda vão ser cadastrados. Volte em breve!</p>
              ) : (
                <div className="chips">
                  {servicos.map((s, i) => (
                    <button key={i} type="button" className={`chip${svc === i ? " active" : ""}`} onClick={() => setSvc(i)}>
                      {s.nome}
                      <small>{brl(s.preco)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="step">
              <div className="step-label">
                <span className="n">2</span>Dia
              </div>
              {diasDisponiveis.length === 0 ? (
                <p className="sheet-vazio">Sem horários disponíveis no momento.</p>
              ) : (
                <div className="chips">
                  {diasDisponiveis.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      className={`chip day-chip${diaSel?.key === d.key ? " active" : ""}`}
                      onClick={() => {
                        setDiaSel(d);
                        setHora(null);
                      }}
                    >
                      {d.dia}
                      <b>{d.num}</b>
                      <small>{d.mes}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="step">
              <div className="step-label">
                <span className="n">3</span>Horário
              </div>
              {diaSel ? (
                <div className="chips">
                  {horariosLivres.map((h) => (
                    <button key={h} type="button" className={`chip${hora === h ? " active" : ""}`} onClick={() => setHora(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="sheet-vazio">Escolha um dia primeiro.</p>
              )}
            </div>

            <div className="step">
              <div className="step-label">
                <span className="n">4</span>Seus dados
              </div>
              <div className="sheet-campos">
                <label className="sheet-field">
                  <span>Nome</span>
                  <input className="sheet-input" placeholder="ex.: Maria Silva" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
                </label>
                <label className="sheet-field">
                  <span>WhatsApp (com DDD)</span>
                  <input className="sheet-input" placeholder="ex.: 11 99999-8888" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
                </label>
              </div>
            </div>

            {pronto ? (
              <div className="summary">
                <span>
                  <b>{servicos[svc!].nome}</b> · {diaSel!.label} · <b>{hora}</b>
                </span>
                <span>{brl(servicos[svc!].preco)}</span>
              </div>
            ) : (
              <div className="summary empty">Preencha os passos acima para finalizar.</div>
            )}

            {erro && <p className="sheet-erro">{erro}</p>}

            <button className="sheet-btn" disabled={!pronto || enviando} onClick={finalizar}>
              {enviando ? "Enviando…" : "Finalizar pedido"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
