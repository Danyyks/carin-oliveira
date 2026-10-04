"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { StudioConfig, Servico } from "@/config/studio";
import { brl, proximosDias, type Dia } from "@/lib/utils";
import { ouvirAgenda, ouvirSlotsOcupados, criarAgendamento, type Agenda } from "@/lib/db";
import { duracaoTotal, duracaoCabe, horariosAfetados } from "@/lib/agendaDia";

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
  const [svcs, setSvcs] = useState<number[]>([]); // índices dos serviços escolhidos
  const [diaSel, setDiaSel] = useState<Dia | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [baseDias, setBaseDias] = useState<Dia[]>([]);
  const [agenda, setAgenda] = useState<Agenda>({ dias: {} });
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Só começa a ler a agenda e os horários quando a cliente ABRE o sheet: quem apenas olha
  // a página não gasta leituras do Firestore (a cota grátis é por dia). Depois da primeira
  // abertura, segue em tempo real.
  const [carregar, setCarregar] = useState(false);
  const [agendaOk, setAgendaOk] = useState(false);
  const [slotsOk, setSlotsOk] = useState(false);
  const [demorou, setDemorou] = useState(false);
  if (open && !carregar) setCarregar(true);

  // Datas e disponibilidade (client-side, evita divergência de hidratação).
  useEffect(() => setBaseDias(proximosDias(14)), []);
  useEffect(() => {
    if (!carregar) return;
    return ouvirAgenda((a) => {
      setAgenda(a);
      setAgendaOk(true);
    });
  }, [carregar]);
  // Lê só a janela que o site oferece (de amanhã a +14 dias), não o histórico inteiro.
  const desde = baseDias[0]?.key;
  const ate = baseDias[baseDias.length - 1]?.key;
  useEffect(() => {
    if (!carregar || !desde || !ate) return;
    return ouvirSlotsOcupados(
      (o) => {
        setOcupados(o);
        setSlotsOk(true);
      },
      { desde, ate },
    );
  }, [carregar, desde, ate]);
  // Se a leitura falhar, não deixa "Carregando…" para sempre. Sem os dados de verdade nenhum
  // horário é oferecido (o padrão do config só vale quando a agenda chegou e está vazia).
  useEffect(() => {
    if (!carregar) return;
    const t = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(t);
  }, [carregar]);
  const dadosOk = agendaOk && slotsOk;
  const carregando = carregar && !dadosOk && !demorou;

  useEffect(() => {
    if (open && preset != null) setSvcs([preset]);
  }, [open, preset]);

  function toggleServico(i: number) {
    setSvcs((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

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
      setSvcs([]);
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
    if (!dadosOk) return [];
    const configurada = Object.values(agenda.dias ?? {}).some((hs) => hs && hs.length > 0);
    const bloqueadas = new Set(agenda.bloqueios ?? []); // folgas (datas)
    return baseDias
      .filter((d) => !bloqueadas.has(d.key)) // pula os dias de folga
      .map((d) => {
        const hors = configurada ? (agenda.dias ?? {})[String(d.weekday)] || [] : studio.horarios;
        const livres = hors.filter((h) => !ocupados.has(`${d.key}_${h}`));
        return { ...d, livres, grade: hors };
      })
      .filter((d) => d.livres.length > 0);
  }, [dadosOk, baseDias, agenda, ocupados, studio.horarios]);

  // Serviços escolhidos + total (na ordem em que aparecem na lista) e a duração somada,
  // usada pra não oferecer um horário que o serviço não cabe até o próximo da tabela.
  const escolhidos = servicos.filter((_, i) => svcs.includes(i));
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  const duracaoMin = duracaoTotal(escolhidos);

  const diaAtual = diaSel ? diasDisponiveis.find((d) => d.key === diaSel.key) : undefined;
  const horariosLivres =
    !diaAtual || duracaoMin <= 0
      ? (diaAtual?.livres ?? [])
      : diaAtual.livres.filter((h) => duracaoCabe(diaAtual.key, h, duracaoMin, diaAtual.grade, ocupados));

  // Se o horário escolhido foi ocupado por outra pessoa, limpa a seleção.
  useEffect(() => {
    if (hora && !horariosLivres.includes(hora)) setHora(null);
  }, [hora, horariosLivres]);

  const nomeOk = nome.trim().length >= 2;
  const whatsappOk = whatsapp.replace(/\D/g, "").length >= 10;
  const pronto = svcs.length > 0 && !!diaSel && !!hora && nomeOk && whatsappOk;

  async function finalizar() {
    if (!pronto) return;
    setEnviando(true);
    setErro("");
    try {
      // Serviço mais longo que o intervalo até o próximo horário: fecha esse(s) horário(s)
      // junto com o pedido, pra outra cliente não marcar em cima.
      const bloquearApos = diaAtual ? horariosAfetados(hora!, duracaoMin, diaAtual.grade) : [];
      const agendamentoId = await criarAgendamento(
        {
          servicos: escolhidos.map((s) => ({ nome: s.nome, preco: s.preco })),
          total,
          clienteNome: nome.trim(),
          clienteWhatsapp: whatsapp.trim(),
          data: diaSel!.key,
          hora: hora!,
          diaLabel: diaSel!.label,
        },
        bloquearApos,
      );
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
    } catch (e) {
      // "permission-denied" é a colisão do id do horário (alguém pegou primeiro, ou a dona
      // bloqueou) detectada pelas regras; "horario-ocupado" é a mesma colisão detectada por
      // nós antes de escrever. Os outros casos são cota estourada ou falta de conexão.
      const code = (e as { code?: string })?.code;
      if (code === "permission-denied" || code === "horario-ocupado") {
        setErro("Esse horário acabou de ser reservado. Escolha outro, por favor.");
        setHora(null);
      } else if (code === "resource-exhausted") {
        setErro("Muitas pessoas agendando agora. Tente de novo em alguns minutos.");
      } else {
        setErro("Não consegui enviar o pedido. Confira sua conexão e tente de novo.");
      }
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
                <span className="n">1</span>Serviços
                <span className="step-hint">pode escolher mais de um</span>
              </div>
              {servicos.length === 0 ? (
                <p className="sheet-vazio">Os serviços ainda vão ser cadastrados. Volte em breve!</p>
              ) : (
                <div className="chips">
                  {servicos.map((s, i) => (
                    <button key={i} type="button" className={`chip${svcs.includes(i) ? " active" : ""}`} onClick={() => toggleServico(i)}>
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
                <p className="sheet-vazio">{carregando ? "Carregando horários…" : "Sem horários disponíveis no momento."}</p>
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
              {!diaSel ? (
                <p className="sheet-vazio">Escolha um dia primeiro.</p>
              ) : horariosLivres.length > 0 ? (
                <div className="chips">
                  {horariosLivres.map((h) => (
                    <button key={h} type="button" className={`chip${hora === h ? " active" : ""}`} onClick={() => setHora(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="sheet-vazio">Esse serviço não cabe em nenhum horário livre neste dia. Escolha outro dia.</p>
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
                  <b>{escolhidos.map((s) => s.nome).join(", ")}</b> · {diaSel!.label} · <b>{hora}</b>
                </span>
                <span>{brl(total)}</span>
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
