"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { StudioConfig, Servico } from "@/config/studio";
import { brl, dataPorExtenso, diaDaSemana, hojeKey, labelData, proximosDias } from "@/lib/utils";
import { ouvirAgenda, ouvirSlotsOcupados, criarAgendamento, type Agenda } from "@/lib/db";
import { antecedenciaDe, duracaoTotal, duracaoCabe, horariosAfetados } from "@/lib/agendaDia";
import { gradeDoMes, somarDias } from "@/lib/datas";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const chaveDe = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

type DiaEscolhido = { key: string; label: string; livres: string[]; grade: string[] };

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
  const [diaSelKey, setDiaSelKey] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [amanha, setAmanha] = useState<string | null>(null);
  const [mesEscolhido, setMesEscolhido] = useState<{ ano: number; mes: number } | null>(null);
  const [agenda, setAgenda] = useState<Agenda>({ dias: {} });
  // Ocupados de UM mês (o que está na tela), marcados com o mês a que pertencem: ao trocar de
  // mês, os dias novos só aparecem quando os ocupados DELES chegaram (nunca livre por engano).
  const [ocupMes, setOcupMes] = useState<{ chave: string; ids: Set<string> } | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Só começa a ler a agenda e os horários quando a cliente ABRE o sheet: quem apenas olha
  // a página não gasta leituras do Firestore (a cota grátis é por dia). Depois da primeira
  // abertura, segue em tempo real.
  const [carregar, setCarregar] = useState(false);
  const [agendaOk, setAgendaOk] = useState(false);
  const [demorou, setDemorou] = useState(false);
  if (open && !carregar) setCarregar(true);

  // "Amanhã" no aparelho da cliente (client-side, evita divergência de hidratação).
  useEffect(() => setAmanha(proximosDias(1)[0].key), []);
  useEffect(() => {
    if (!carregar) return;
    return ouvirAgenda((a) => {
      setAgenda(a);
      setAgendaOk(true);
    });
  }, [carregar]);

  // Mês na tela: começa no mês de amanhã; as setas andam até o limite que a Carin escolheu.
  const mesAtual = mesEscolhido ?? (amanha ? { ano: +amanha.slice(0, 4), mes: +amanha.slice(5, 7) - 1 } : null);
  const chaveMes = mesAtual ? chaveDe(mesAtual.ano, mesAtual.mes, 1).slice(0, 7) : null;
  const limite = amanha ? somarDias(hojeKey(), antecedenciaDe(agenda)) : null;

  // Lê só o mês que a cliente está vendo (a partir de amanhã), não a janela toda de uma vez —
  // com a agenda aberta por até 3 meses, cada visita continua gastando pouco da cota grátis.
  const desde = mesAtual && amanha ? [`${chaveMes}-01`, amanha].sort()[1] : null;
  const ate = mesAtual ? chaveDe(mesAtual.ano, mesAtual.mes, new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate()) : null;
  useEffect(() => {
    if (!carregar || !desde || !ate || !chaveMes) return;
    return ouvirSlotsOcupados((ids) => setOcupMes({ chave: chaveMes, ids }), { desde, ate });
  }, [carregar, desde, ate, chaveMes]);
  const slotsOk = ocupMes?.chave === chaveMes;
  const ocupados = useMemo(() => (slotsOk && ocupMes ? ocupMes.ids : new Set<string>()), [slotsOk, ocupMes]);
  // Se a leitura falhar, não deixa "Carregando…" para sempre. Sem os dados de verdade nenhum
  // horário é oferecido (o padrão do config só vale quando a agenda chegou e está vazia).
  useEffect(() => {
    if (!carregar) return;
    const t = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(t);
  }, [carregar]);
  const dadosOk = agendaOk && slotsOk;
  // Primeira leitura: o calendário só aparece quando a agenda E um mês de horários chegaram.
  // Trocar de mês depois não some com o calendário — só deixa os dias inativos um instante.
  const primeiraCarga = agendaOk && ocupMes !== null;
  const carregando = carregar && !primeiraCarga && !demorou;

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
      setDiaSelKey(null);
      setMesEscolhido(null);
      setHora(null);
      setNome("");
      setWhatsapp("");
    }, 320);
    return () => clearTimeout(t);
  }, [open]);

  // Células do mês na tela. Um dia é tocável se está entre amanhã e o limite da Carin, não é
  // folga e tem horário livre (respeita a agenda da dona; se ela ainda não configurou nada,
  // usa os horários padrão do config como reserva).
  const anoVis = mesAtual?.ano;
  const mesVis = mesAtual?.mes;
  const celulas = useMemo(() => {
    if (anoVis === undefined || mesVis === undefined || !amanha || !limite) return [];
    const configurada = Object.values(agenda.dias ?? {}).some((hs) => hs && hs.length > 0);
    const folgas = new Set(agenda.bloqueios ?? []);
    return gradeDoMes(anoVis, mesVis).map((dia) => {
      if (dia === null) return null;
      const key = chaveDe(anoVis, mesVis, dia);
      const grade = configurada ? (agenda.dias ?? {})[String(diaDaSemana(key))] || [] : studio.horarios;
      const noPeriodo = key >= amanha && key <= limite;
      const folga = noPeriodo && folgas.has(key);
      const livres = noPeriodo && !folga && dadosOk ? grade.filter((h) => !ocupados.has(`${key}_${h}`)) : [];
      return { dia, key, grade, livres, folga };
    });
  }, [anoVis, mesVis, amanha, limite, agenda, ocupados, dadosOk, studio.horarios]);
  const algumLivreNoMes = celulas.some((c) => c && c.livres.length > 0);
  const podeVoltar = !!chaveMes && !!amanha && chaveMes > amanha.slice(0, 7);
  const proximoMes = mesAtual ? new Date(mesAtual.ano, mesAtual.mes + 1, 1) : null;
  const podeAvancar = !!proximoMes && !!limite && chaveDe(proximoMes.getFullYear(), proximoMes.getMonth(), 1) <= limite;

  function mudarMes(delta: number) {
    if (!mesAtual) return;
    const d = new Date(mesAtual.ano, mesAtual.mes + delta, 1);
    setMesEscolhido({ ano: d.getFullYear(), mes: d.getMonth() });
    setDiaSelKey(null);
    setHora(null);
  }

  const celulaSel = diaSelKey ? celulas.find((c) => c?.key === diaSelKey) : undefined;
  const diaSel: DiaEscolhido | null =
    celulaSel && celulaSel.livres.length > 0
      ? { key: celulaSel.key, label: labelData(celulaSel.key), livres: celulaSel.livres, grade: celulaSel.grade }
      : null;

  // Serviços escolhidos + total (na ordem em que aparecem na lista) e a duração somada,
  // usada pra não oferecer um horário que o serviço não cabe até o próximo da tabela.
  const escolhidos = servicos.filter((_, i) => svcs.includes(i));
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  const duracaoMin = duracaoTotal(escolhidos);

  const diaAtual = diaSel;
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
              {!primeiraCarga || !mesAtual ? (
                <p className="sheet-vazio">{carregando ? "Carregando horários…" : "Sem horários disponíveis no momento."}</p>
              ) : (
                <div className="cal-site">
                  <div className="cal-site-topo">
                    <button type="button" className="cal-site-nav" onClick={() => mudarMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior">
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <span className="cal-site-mes" aria-live="polite">
                      {MESES[mesAtual.mes]} {mesAtual.ano}
                    </span>
                    <button type="button" className="cal-site-nav" onClick={() => mudarMes(1)} disabled={!podeAvancar} aria-label="Próximo mês">
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="cal-site-grade">
                    {SEMANA.map((s, i) => (
                      <span key={i} className="cal-site-sem" aria-hidden="true">
                        {s}
                      </span>
                    ))}
                    {celulas.map((c, i) =>
                      c === null ? (
                        <span key={`v${i}`} />
                      ) : (
                        <button
                          key={c.key}
                          type="button"
                          data-dia={c.key}
                          className={`cal-site-dia${c.livres.length > 0 ? " livre" : ""}${c.folga ? " folga" : ""}${diaSelKey === c.key ? " active" : ""}`}
                          disabled={c.livres.length === 0}
                          aria-pressed={diaSelKey === c.key}
                          aria-label={`${labelData(c.key)}${c.folga ? ", folga" : c.livres.length === 0 ? ", sem horário" : ""}`}
                          onClick={() => {
                            setDiaSelKey(c.key);
                            setHora(null);
                          }}
                        >
                          {c.dia}
                        </button>
                      ),
                    )}
                  </div>
                  {slotsOk && !algumLivreNoMes && (
                    <p className="sheet-vazio">
                      {podeAvancar ? "Sem horários livres neste mês. Veja o próximo." : "Sem horários livres neste mês."}
                    </p>
                  )}
                  {limite && <p className="cal-site-limite">Agenda aberta até {dataPorExtenso(limite)}</p>}
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
