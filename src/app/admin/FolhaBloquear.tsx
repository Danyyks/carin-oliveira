"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Lock } from "lucide-react";
import { diaDaSemana, hojeKey, labelData, proximosDias } from "@/lib/utils";
import { primeiroNome } from "@/lib/mensagens";
import {
  datasRepetidas,
  diferencaBloqueio,
  horariosDoDia,
  mensagemDaMudanca,
  periodoDaHora,
  rotuloBloqueio,
  selecaoDoAtalho,
  type AtalhoBloqueio,
} from "@/lib/agendaDia";
import {
  bloquearDias,
  bloquearHorarios,
  liberarDias,
  liberarHorarios,
  ouvirAgenda,
  ouvirAgendamentos,
  ouvirSlotsOcupados,
  type Agenda,
  type Agendamento,
} from "@/lib/db";
import Folha from "./compartilhado/Folha";

const ATALHOS: { id: AtalhoBloqueio; rotulo: string }[] = [
  { id: "manha", rotulo: "Manhã" },
  { id: "tarde", rotulo: "Tarde" },
  { id: "noite", rotulo: "Noite" },
  { id: "dia", rotulo: "Dia todo" },
];

const SEMANAS_REPETICAO = 12;
const DIA_SEMANA_PLURAL = ["domingos", "segundas", "terças", "quartas", "quintas", "sextas", "sábados"];

// Mensagens em português simples (sem código técnico), pelo tipo de falha do Firestore.
function erroHumano(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === "permission-denied") return "Sem permissão para salvar. Saia do painel e entre de novo.";
  if (code === "unavailable" || code === "deadline-exceeded") return "Sem conexão. Confira a internet e tente de novo.";
  if (code === "resource-exhausted") return "O limite de uso de hoje foi atingido. Tente de novo amanhã.";
  return "Não consegui salvar. Tente de novo.";
}

/**
 * Folha "Bloquear horários": a dona escolhe um dia, toca nos horários que quer fechar (ou em
 * Manhã / Tarde / Noite / Dia todo) e salva. Só marca; nada muda até tocar no botão do rodapé.
 * Monte só quando estiver aberta: lê a agenda e os horários enquanto está na tela.
 *
 * `onSalvo` recebe o aviso ("2 horários bloqueados.") e o que desfaz a mudança.
 */
export default function FolhaBloquear({
  onFechar,
  onSalvo,
  dataInicial,
}: {
  onFechar: () => void;
  onSalvo: (texto: string, desfazer: () => Promise<unknown>) => void;
  /** Abre já com esse dia escolhido (ex.: a Agenda por dia chamando com o dia visível). */
  dataInicial?: string;
}) {
  const [hoje] = useState(hojeKey);
  const dias = useMemo(() => proximosDias(14, true), []);
  const [agenda, setAgenda] = useState<Agenda>({ dias: {}, bloqueios: [] });
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [bloqueados, setBloqueados] = useState<Set<string>>(new Set());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [data, setData] = useState(dataInicial ?? "");
  // Horários marcados nesta visita; `null` = ela ainda não mexeu (vale o que já está bloqueado).
  const [marcados, setMarcados] = useState<Set<string> | null>(null);
  const [repetir, setRepetir] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => ouvirAgenda(setAgenda), []);
  useEffect(
    () =>
      ouvirSlotsOcupados(
        (oc, bq) => {
          setOcupados(oc);
          setBloqueados(bq ?? new Set());
        },
        { desde: hoje },
      ),
    [hoje],
  );
  useEffect(() => ouvirAgendamentos(setAgendamentos), []);

  const dataOk = data !== "" && data >= hoje;
  const folgas = useMemo(() => new Set(agenda.bloqueios ?? []), [agenda]);
  const emFolga = dataOk && folgas.has(data);

  // Horários do dia: os da tabela dela + o que já tem cliente ou bloqueio (mesmo fora da tabela).
  const grade = dataOk ? ((agenda.dias ?? {})[String(diaDaSemana(data))] ?? []) : [];
  const horarios = dataOk ? horariosDoDia(data, grade, ocupados, agendamentos, bloqueados) : [];
  const comCliente = horarios.filter((h) => h.ocupado && !h.bloqueado);
  const selecionaveis = horarios.filter((h) => !h.ocupado || h.bloqueado).map((h) => h.hora);
  const antes = new Set(horarios.filter((h) => h.bloqueado).map((h) => h.hora));
  const selecao = marcados ?? antes;

  const mudanca = diferencaBloqueio(antes, selecao);
  // Todos os horários livres marcados (e ela mudou algo): vira folga do dia inteiro.
  const diaTodo =
    !emFolga && selecionaveis.length > 0 && selecionaveis.every((h) => selecao.has(h)) && mudanca.bloquear.length > 0;
  const rotuloBase = emFolga ? { texto: "Liberar o dia", vazio: false } : rotuloBloqueio(mudanca, diaTodo);
  const rotulo =
    diaTodo && repetir
      ? { ...rotuloBase, texto: `Marcar ${SEMANAS_REPETICAO} ${DIA_SEMANA_PLURAL[diaDaSemana(data)]}` }
      : rotuloBase;
  const podeSalvar = dataOk && !rotulo.vazio && !salvando;

  function escolherData(valor: string) {
    setData(valor);
    setMarcados(null);
    setRepetir(false);
    setErro("");
  }
  function alternar(hora: string) {
    const nova = new Set(selecao);
    if (nova.has(hora)) nova.delete(hora);
    else nova.add(hora);
    setMarcados(nova);
    setErro("");
  }
  function atalho(id: AtalhoBloqueio) {
    setMarcados(selecaoDoAtalho(selecionaveis, selecao, id));
    setErro("");
  }
  const grupo = (id: AtalhoBloqueio) => (id === "dia" ? selecionaveis : selecionaveis.filter((h) => periodoDaHora(h) === id));

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      if (emFolga) {
        await liberarDias([data]);
        onSalvo("Folga desfeita.", () => bloquearDias([data]));
        return onFechar();
      }
      if (diaTodo) {
        const datas = repetir ? datasRepetidas(data, SEMANAS_REPETICAO) : [data];
        await bloquearDias(datas);
        const texto =
          datas.length > 1
            ? `${datas.length} ${DIA_SEMANA_PLURAL[diaDaSemana(data)]} bloqueados, até ${labelData(datas[datas.length - 1])}.`
            : `Folga marcada em ${labelData(data)}.`;
        onSalvo(texto, () => liberarDias(datas));
        return onFechar();
      }

      const alvos = (horas: string[]) => horas.map((hora) => ({ data, hora }));
      const rb = mudanca.bloquear.length ? await bloquearHorarios(alvos(mudanca.bloquear)) : null;
      const rl = mudanca.liberar.length ? await liberarHorarios(alvos(mudanca.liberar)) : null;
      const feitos = rb?.feitos ?? [];
      const liberados = rl?.liberados ?? [];
      if (feitos.length === 0 && liberados.length === 0) {
        setErro("Nada mudou: esses horários já foram ocupados ou alterados. Confira a lista.");
        return;
      }
      const tomados = rb?.ignorados.filter((i) => i.motivo === "ocupado").length ?? 0;
      let texto = mensagemDaMudanca({ bloquear: feitos.map((a) => a.hora), liberar: liberados.map((a) => a.hora) });
      if (tomados > 0) texto += ` ${tomados === 1 ? "1 já tinha cliente" : `${tomados} já tinham cliente`}.`;
      onSalvo(texto, async () => {
        if (feitos.length) await liberarHorarios(feitos);
        if (liberados.length) await bloquearHorarios(liberados);
      });
      onFechar();
    } catch (e) {
      setErro(erroHumano(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha
      titulo="Bloquear horários"
      onFechar={onFechar}
      rodape={
        <div className="pn-rodape-col">
          {erro && (
            <p className="adm-erro" role="alert">
              {erro}
            </p>
          )}
          <button type="button" className="adm-btn pn-btn-largo" disabled={!podeSalvar} onClick={salvar}>
            {salvando ? "Salvando…" : rotulo.texto}
          </button>
        </div>
      }
    >
      <div className="pn-bloco">
        <span className="pn-rotulo">Dia</span>
        <div className="pn-dias" role="group" aria-label="Escolha o dia">
          {dias.map((d, i) => {
            const folga = folgas.has(d.key);
            return (
              <button
                key={d.key}
                type="button"
                className={`chip day-chip${data === d.key ? " active" : ""}`}
                aria-pressed={data === d.key}
                aria-label={`${i === 0 ? "Hoje, " : ""}${d.label}${folga ? ", folga" : ""}`}
                onClick={() => escolherData(d.key)}
              >
                {i === 0 ? "hoje" : d.dia}
                <b>{d.num}</b>
                <small className={folga ? "pn-folga" : undefined}>{folga ? "folga" : d.mes}</small>
              </button>
            );
          })}
        </div>
        <label className="adm-field pn-outra-data">
          <span>Outra data</span>
          <input className="adm-input" type="date" min={hoje} value={data} onChange={(e) => escolherData(e.target.value)} />
        </label>
      </div>

      {!dataOk && <p className="adm-muted">Escolha o dia para ver os horários.</p>}

      {emFolga && (
        <p className="pn-nota" role="note">
          <CalendarOff size={18} aria-hidden="true" />
          <span>Este dia está em folga: nenhum horário aparece no site. Toque em Liberar o dia para reabrir.</span>
        </p>
      )}

      {dataOk && !emFolga && horarios.length === 0 && (
        <p className="adm-muted">Sem horários na sua tabela neste dia.</p>
      )}

      {dataOk && !emFolga && horarios.length > 0 && (
        <div className="pn-bloco">
          <span className="pn-rotulo">Horários</span>
          <div className="chips pn-atalhos" role="group" aria-label="Atalhos">
            {ATALHOS.filter((a) => grupo(a.id).length > 0).map((a) => {
              const g = grupo(a.id);
              const ativo = g.every((h) => selecao.has(h));
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`chip chip-outro${ativo ? " active" : ""}`}
                  aria-pressed={ativo}
                  onClick={() => atalho(a.id)}
                >
                  {a.rotulo}
                </button>
              );
            })}
          </div>

          <div className="chips" role="group" aria-label="Horários do dia">
            {horarios.map((h) => {
              if (h.ocupado && !h.bloqueado) {
                const quem = h.nome ? primeiroNome(h.nome) : "";
                return (
                  <button
                    key={h.hora}
                    type="button"
                    className="chip taken"
                    disabled
                    aria-label={`${h.hora}, ocupado${quem ? ` por ${quem}` : ""}`}
                  >
                    {h.hora}
                    <small>{quem || "ocupado"}</small>
                  </button>
                );
              }
              const marcado = selecao.has(h.hora);
              return (
                <button
                  key={h.hora}
                  type="button"
                  className={`chip${marcado ? " active" : ""}`}
                  aria-pressed={marcado}
                  onClick={() => alternar(h.hora)}
                >
                  {h.hora}
                  {marcado && (
                    <small>
                      <Lock size={12} aria-hidden="true" />
                    </small>
                  )}
                </button>
              );
            })}
          </div>

          <p className="adm-muted pn-dica">
            {antes.size > 0
              ? "Horários com cadeado estão bloqueados. Toque para liberar ou para bloquear mais."
              : "Toque nos horários que quer bloquear."}
          </p>

          {diaTodo && (
            <label className="adm-check">
              <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} />
              <span>
                Repetir nas próximas {SEMANAS_REPETICAO} {DIA_SEMANA_PLURAL[diaDaSemana(data)]}
              </span>
            </label>
          )}

          {diaTodo && comCliente.length > 0 && (
            <p className="pn-nota" role="note">
              <CalendarOff size={18} aria-hidden="true" />
              <span>
                {comCliente.length === 1 ? "Já tem 1 cliente marcada" : `Já tem ${comCliente.length} clientes marcadas`} neste
                dia. A folga fecha só os horários livres.
              </span>
            </p>
          )}
        </div>
      )}
    </Folha>
  );
}
