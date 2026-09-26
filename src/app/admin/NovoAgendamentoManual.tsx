"use client";

import { useEffect, useState, type FormEvent } from "react";
import { brl, labelData, hojeKey, diaDaSemana } from "@/lib/utils";
import { linkConfirmacao, primeiroNome } from "@/lib/mensagens";
import { horariosDoDia } from "@/lib/agendaDia";
import {
  ouvirServicos,
  ouvirSlotsOcupados,
  ouvirAgenda,
  ouvirAgendamentos,
  criarAgendamentoManual,
  type Agenda,
  type Agendamento,
  type NovoAgendamento,
  type ServicoDoc,
} from "@/lib/db";
import { detalheErro } from "./detalheErro";

// Depois de salvar: o nome da cliente e o link do WhatsApp com a confirmação pronta
// (null quando o WhatsApp ficou em branco, aí não há para quem enviar).
type Salvo = { nome: string; link: string | null };

// ---------------- Novo agendamento manual (a dona registra) ----------------
export default function NovoAgendamentoManual() {
  const [aberto, setAberto] = useState(false);
  const [servicos, setServicos] = useState<ServicoDoc[]>([]);
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [agenda, setAgenda] = useState<Agenda>({ dias: {} });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [svcSel, setSvcSel] = useState<string[]>([]);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [outro, setOutro] = useState(false); // "Outro horário": digitar uma hora fora da tabela
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState<Salvo | null>(null);

  useEffect(() => ouvirServicos(setServicos), []);
  useEffect(() => ouvirSlotsOcupados(setOcupados), []);
  useEffect(() => ouvirAgenda(setAgenda), []);
  useEffect(() => ouvirAgendamentos(setAgendamentos), []);

  const escolhidos = servicos.filter((s) => svcSel.includes(s.id));
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  // Data LOCAL (toISOString usa UTC: depois das 21h no Brasil "hoje" virava "amanhã").
  const hoje = hojeKey();

  // Horários do dia escolhido: os da tabela da dona + os que já têm cliente (mesmo fora dela).
  // `agenda.dias` pode não existir se ela só salvou folgas até agora.
  const grade = data ? ((agenda.dias ?? {})[String(diaDaSemana(data))] ?? []) : [];
  const horarios = data ? horariosDoDia(data, grade, ocupados, agendamentos) : [];
  const emFolga = !!data && (agenda.bloqueios ?? []).includes(data);
  const ocupante = outro && hora ? horarios.find((h) => h.hora === hora && h.ocupado) : undefined;

  function toggleSvc(id: string) {
    setSvcSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function limpar() {
    setNome(""); setWhatsapp(""); setSvcSel([]); setData(""); setHora(""); setOutro(false); setErro("");
  }
  function escolherData(valor: string) {
    setData(valor);
    setHora(""); // o horário escolhido antes pode estar ocupado no novo dia
    setOutro(false);
    setErro("");
  }
  function escolherHora(h: string) {
    setHora(h);
    setOutro(false);
    setErro("");
  }
  function abrirOutro() {
    setOutro(true);
    setHora("");
    setErro("");
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const wpp = whatsapp.replace(/\D/g, "");
    if (nome.trim().length < 2) return setErro("Coloque o nome da cliente.");
    if (escolhidos.length === 0) return setErro("Escolha pelo menos um serviço.");
    if (!data) return setErro("Escolha a data.");
    if (!hora) return setErro("Escolha o horário.");
    if (data < hoje) return setErro("Essa data já passou.");
    if (whatsapp && wpp.length < 10) return setErro("WhatsApp incompleto (ou deixe em branco).");
    if (ocupados.has(`${data}_${hora}`)) return setErro("Já existe um agendamento nesse horário.");

    const novo: NovoAgendamento = {
      servicos: escolhidos.map((s) => ({ nome: s.nome, preco: s.preco })),
      total,
      clienteNome: nome.trim(),
      clienteWhatsapp: whatsapp.trim(),
      data,
      hora,
      diaLabel: labelData(data),
    };

    setSalvando(true);
    try {
      const id = await criarAgendamentoManual(novo);
      // Só depois de gravar de verdade é que a confirmação é oferecida.
      const agendamento: Agendamento = { ...novo, id, status: "confirmado" };
      setSalvo({ nome: novo.clienteNome, link: linkConfirmacao(agendamento) });
      limpar();
      setAberto(false);
    } catch (e) {
      setErro(`Não consegui salvar (${detalheErro(e)}).`);
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <section className="admin-card">
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => { setAberto(true); setSalvo(null); }}>+ Adicionar agendamento</button>
        </div>
        {salvo && (
          <div className="adm-salvo" role="status">
            <span className="adm-ok">Agendamento de {primeiroNome(salvo.nome)} adicionado!</span>
            {salvo.link ? (
              // Toque direto da dona no link: é o único jeito garantido de abrir o WhatsApp no iPhone.
              <a className="adm-mini ag-whatsapp" href={salvo.link} target="_blank" rel="noopener">
                Enviar confirmação no WhatsApp
              </a>
            ) : (
              <span className="adm-muted">Sem WhatsApp cadastrado, a cliente não recebe a confirmação.</span>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Novo agendamento</h2>
      <p className="adm-muted">Registre uma cliente da sua agenda manual. Entra já confirmado e trava o horário.</p>
      <form className="adm-form" onSubmit={salvar}>
        <div className="adm-row2">
          <label className="adm-field">
            <span>Nome da cliente</span>
            <input className="adm-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="adm-field">
            <span>WhatsApp (opcional)</span>
            <input className="adm-input" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="com DDD" />
          </label>
        </div>

        <div className="adm-field">
          <span>Serviços</span>
          {servicos.length === 0 ? (
            <p className="adm-muted">Cadastre um serviço primeiro (na seção abaixo).</p>
          ) : (
            <div className="chips">
              {servicos.map((s) => (
                <button type="button" key={s.id} className={`chip${svcSel.includes(s.id) ? " active" : ""}`} onClick={() => toggleSvc(s.id)}>
                  {s.nome}<small>{brl(s.preco)}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="adm-field">
          <span>Data</span>
          <input className="adm-input" type="date" min={hoje} value={data} onChange={(e) => escolherData(e.target.value)} required />
        </label>

        {data && (
          <div className="adm-field">
            <span>Horário</span>
            {emFolga && <p className="adm-muted"><b>Folga marcada neste dia.</b> Você ainda pode registrar a cliente.</p>}
            <div className="chips" role="group" aria-label="Horários do dia">
              {horarios.map((h) =>
                h.ocupado ? (
                  // Ocupado: apagado, sem clique, e já mostra quem é (só a dona vê este painel).
                  <button
                    type="button"
                    key={h.hora}
                    className="chip taken"
                    disabled
                    aria-label={`${h.hora}, ocupado${h.nome ? ` por ${primeiroNome(h.nome)}` : ""}`}
                  >
                    {h.hora}<small>{h.nome ? primeiroNome(h.nome) : "ocupado"}</small>
                  </button>
                ) : (
                  <button
                    type="button"
                    key={h.hora}
                    className={`chip${!outro && hora === h.hora ? " active" : ""}`}
                    aria-pressed={!outro && hora === h.hora}
                    onClick={() => escolherHora(h.hora)}
                  >
                    {h.hora}
                  </button>
                ),
              )}
              <button type="button" className={`chip chip-outro${outro ? " active" : ""}`} aria-pressed={outro} onClick={abrirOutro}>
                Outro horário
              </button>
            </div>
            {horarios.length === 0 && (
              <p className="adm-muted">Sem horários na sua tabela neste dia. Use o botão Outro horário.</p>
            )}
          </div>
        )}

        {outro && (
          <>
            <label className="adm-field">
              <span>Hora</span>
              <input className="adm-input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            </label>
            {ocupante && (
              <p className="adm-erro">Já tem {ocupante.nome ? primeiroNome(ocupante.nome) : "uma cliente"} às {ocupante.hora}.</p>
            )}
          </>
        )}

        {escolhidos.length > 0 && <p className="adm-muted">Total: <b>{brl(total)}</b></p>}

        <div className="adm-actions">
          <button className="adm-btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar agendamento"}</button>
          <button type="button" className="adm-btn-ghost" onClick={() => { setAberto(false); limpar(); }}>Fechar</button>
          {erro && <span className="adm-erro">{erro}</span>}
        </div>
      </form>
    </section>
  );
}
