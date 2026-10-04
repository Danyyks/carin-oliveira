"use client";

import { useMemo, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, ChevronDown, Lock, Plus } from "lucide-react";
import { brl, diaDaSemana } from "@/lib/utils";
import { agoraNoSalao, hojeKeySalao, semanaDe, somarDias } from "@/lib/datas";
import { itensDoDia, pedidosNoDia, periodoDaHora, type ItemAgenda } from "@/lib/agendaDia";
import { linkConfirmacao, primeiroNome } from "@/lib/mensagens";
import { liberarHorarios, type Agendamento } from "@/lib/db";
import { WhatsappIcon } from "@/components/icons";
import { useDados } from "./DadosProvider";
import { useDesfazer } from "../compartilhado/useDesfazer";
import FolhaBloquear from "../FolhaBloquear";
import AgendaMes from "./AgendaMes";
import FolhaAgendar from "./FolhaAgendar";
import FolhaDetalhe from "./FolhaDetalhe";

const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA_LABEL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const PERIODOS: { id: "manha" | "tarde" | "noite"; rotulo: string }[] = [
  { id: "manha", rotulo: "Manhã" },
  { id: "tarde", rotulo: "Tarde" },
  { id: "noite", rotulo: "Noite" },
];

function tituloDoDia(dataKey: string, hoje: string): string {
  const [y, m, d] = dataKey.split("-").map(Number);
  if (dataKey === hoje) return "Hoje";
  if (dataKey === somarDias(hoje, 1)) return "Amanhã";
  if (dataKey === somarDias(hoje, -1)) return "Ontem";
  const t = `${DIAS_SEMANA_LABEL[new Date(y, m - 1, d).getDay()]}, ${d} de ${MESES_NOME[m - 1]}`;
  return t[0].toUpperCase() + t.slice(1);
}

function resumoDoDia(itens: ItemAgenda[]): string {
  const confirmados = itens.filter((i) => i.estado === "confirmado").length;
  const pedidos = itens.filter((i) => i.estado === "pedido").length;
  if (confirmados === 0 && pedidos === 0) return "Nenhum agendamento";
  const partes: string[] = [];
  if (confirmados > 0) partes.push(`${confirmados} ${confirmados === 1 ? "confirmado" : "confirmados"}`);
  if (pedidos > 0) partes.push(`${pedidos} ${pedidos === 1 ? "pedido" : "pedidos"}`);
  return partes.join(" · ");
}

/** Nome curto de exibição na linha (primeiro nome; "Ocupado" quando não há registro). */
function nomeDoItem(ag?: Agendamento): string {
  return ag ? primeiroNome(ag.clienteNome) : "Ocupado";
}

export default function AgendaDia({
  onIrParaPedidos,
  diaInicial,
}: {
  onIrParaPedidos?: () => void;
  diaInicial?: string;
}) {
  const { agenda, slots, agendamentos, carregando } = useDados();
  const [dia, setDia] = useState(() => diaInicial ?? hojeKeySalao());
  const [mesAberto, setMesAberto] = useState(false);
  const [bloquearAberto, setBloquearAberto] = useState(false);
  const [agendarHora, setAgendarHora] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const [salvo, setSalvo] = useState<{ nome: string; link: string | null } | null>(null);
  const { avisar, aviso } = useDesfazer();

  const hoje = hojeKeySalao();
  const agora = agoraNoSalao();

  const ocupados = useMemo(() => new Set(slots.map((s) => s.id)), [slots]);
  const bloqueados = useMemo(
    () => new Set(slots.filter((s) => s.status === "bloqueado").map((s) => s.id)),
    [slots],
  );
  const folgas = useMemo(() => new Set(agenda.bloqueios ?? []), [agenda]);
  const emFolga = folgas.has(dia);

  const grade = (agenda.dias ?? {})[String(diaDaSemana(dia))] ?? [];
  const gradeKey = grade.join(",");
  const itens = useMemo(
    () => itensDoDia(dia, grade, ocupados, bloqueados, agendamentos, agora),
    // `agora` muda a cada render; para não recalcular o tempo todo, comparamos só a data/hora usada
    // (via `gradeKey`, já que `grade` é um array novo a cada render quando `agenda.dias` falta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dia, gradeKey, ocupados, bloqueados, agendamentos],
  );
  // "Passou" só esconde o que estava livre ou bloqueado (nunca clientes: confirmado/pedido
  // continuam visíveis, só apagados — ver `.pn-linha.passou` no CSS).
  const visiveis = itens.filter((i) => !i.passou || i.estado === "confirmado" || i.estado === "pedido");
  // Folga fecha só os horários livres (é o que a folha de Bloquear promete): clientes já
  // marcadas naquele dia continuam aparecendo.
  const lista = emFolga ? visiveis.filter((i) => i.estado === "confirmado" || i.estado === "pedido") : visiveis;
  const porPeriodo = (id: "manha" | "tarde" | "noite") => lista.filter((i) => periodoDaHora(i.hora) === id);

  const semana = useMemo(() => semanaDe(dia), [dia]);
  const pedidosPorDia = useMemo(() => {
    const s = new Set<string>();
    for (const a of agendamentos) if (a.status === "pendente") s.add(a.data);
    return s;
  }, [agendamentos]);
  const totalPedidos = useMemo(() => agendamentos.filter((a) => a.status === "pendente").length, [agendamentos]);
  const pedidosHoje = pedidosNoDia(dia, agendamentos);

  const [ano, mesIdx] = dia.split("-").map(Number);

  async function liberar(hora: string) {
    const alvo = { data: dia, hora };
    const r = await liberarHorarios([alvo]);
    if (r.liberados.length > 0) {
      avisar(`Horário das ${hora} liberado.`, async () => {
        const { bloquearHorarios } = await import("@/lib/db");
        await bloquearHorarios([alvo]);
      });
    }
  }

  if (carregando) {
    return (
      <div className="pn-agenda">
        <p className="adm-muted">Carregando a agenda…</p>
      </div>
    );
  }

  return (
    <div className="pn-agenda">
      {totalPedidos > 0 && (
        <button type="button" className="pn-banner-pedidos" onClick={onIrParaPedidos}>
          <Bell size={18} aria-hidden="true" />
          <span>
            {totalPedidos === 1 ? "1 pedido esperando você" : `${totalPedidos} pedidos esperando você`}
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      <div className="pn-agenda-cabecalho">
        <button
          type="button"
          className="pn-agenda-mes-btn"
          onClick={() => setMesAberto((v) => !v)}
          aria-expanded={mesAberto}
        >
          {MESES_NOME[mesIdx - 1]} {ano}
          <ChevronDown size={16} aria-hidden="true" className={mesAberto ? "pn-rotacionado" : undefined} />
        </button>
        <div className="pn-agenda-setas">
          {dia !== hoje && (
            <button type="button" className="pn-agenda-hoje" onClick={() => setDia(hoje)}>
              Hoje
            </button>
          )}
          <button type="button" className="cal-nav" aria-label="Semana anterior" onClick={() => setDia(somarDias(dia, -7))}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" className="cal-nav" aria-label="Semana seguinte" onClick={() => setDia(somarDias(dia, 7))}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {mesAberto && (
        <AgendaMes
          dataSelecionada={dia}
          pedidos={pedidosPorDia}
          folgas={folgas}
          onEscolher={(k) => {
            setDia(k);
            setMesAberto(false);
          }}
        />
      )}

      <div className="pn-semana" role="group" aria-label="Dias da semana">
        {semana.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`pn-semana-dia${d.key === dia ? " active" : ""}`}
            aria-pressed={d.key === dia}
            aria-label={`${d.dia}, ${d.num}${d.key === hoje ? ", hoje" : ""}${pedidosPorDia.has(d.key) ? ", com pedido" : ""}${folgas.has(d.key) ? ", folga" : ""}`}
            onClick={() => setDia(d.key)}
          >
            <small>{d.dia}</small>
            <b>{d.num}</b>
            {pedidosPorDia.has(d.key) && <span className="pn-semana-ponto" aria-hidden="true" />}
            {folgas.has(d.key) && <span className="pn-semana-hachura" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="pn-dia-cabecalho">
        <div>
          <h2 className="pn-dia-titulo">{tituloDoDia(dia, hoje)}</h2>
          <p className="pn-dia-resumo">
            {emFolga ? ["Folga marcada", lista.length > 0 && resumoDoDia(lista)].filter(Boolean).join(" · ") : resumoDoDia(visiveis)}
          </p>
        </div>
        <button type="button" className="adm-btn-ghost pn-btn-bloquear" onClick={() => setBloquearAberto(true)}>
          <Lock size={16} aria-hidden="true" />
          Bloquear
        </button>
      </div>

      {pedidosHoje > 0 && (
        <p className="pn-nota" role="note">
          <Bell size={18} aria-hidden="true" />
          <span>{pedidosHoje === 1 ? "1 pedido pendente neste dia." : `${pedidosHoje} pedidos pendentes neste dia.`}</span>
        </p>
      )}

      {emFolga && (
        <p className="adm-muted">
          {lista.length > 0
            ? "Dia marcado como folga — o site não oferece horários. Quem já estava marcada continua abaixo."
            : "Nenhum horário disponível — dia marcado como folga."}
        </p>
      )}
      {!emFolga && lista.length === 0 && (
        <p className="adm-muted">
          {itens.length > 0 ? "Os horários deste dia já passaram." : "Sem horários na tabela deste dia."}
        </p>
      )}
      {lista.length > 0 &&
        PERIODOS.map(({ id, rotulo }) => {
          const doPeriodo = porPeriodo(id);
          if (doPeriodo.length === 0) return null;
          return (
            <div className="pn-lista-periodo" key={id}>
              <h3 className="pn-periodo-label">{rotulo}</h3>
              {doPeriodo.map((item) => (
                <LinhaAgenda
                  key={item.hora}
                  item={item}
                  passouClasse={item.passou}
                  onLiberar={liberar}
                  onAbrirAgendar={setAgendarHora}
                  onAbrirDetalhe={setDetalhe}
                />
              ))}
            </div>
          );
        })}

      {bloquearAberto && (
        <FolhaBloquear dataInicial={dia} onFechar={() => setBloquearAberto(false)} onSalvo={avisar} />
      )}
      {agendarHora && (
        <FolhaAgendar
          data={dia}
          hora={agendarHora}
          onFechar={() => setAgendarHora(null)}
          onCriado={(nome, link) => setSalvo({ nome, link })}
        />
      )}
      {detalhe && <FolhaDetalhe agendamento={detalhe} onFechar={() => setDetalhe(null)} />}
      {salvo && (
        <div className="adm-salvo pn-salvo-flutuante" role="status">
          <span className="adm-ok">Agendamento de {salvo.nome} adicionado!</span>
          {salvo.link ? (
            <a className="adm-mini ag-whatsapp" href={salvo.link} target="_blank" rel="noopener" onClick={() => setSalvo(null)}>
              Enviar confirmação no WhatsApp
            </a>
          ) : (
            <span className="adm-muted">Sem WhatsApp cadastrado, a cliente não recebe a confirmação.</span>
          )}
          <button type="button" className="adm-mini" onClick={() => setSalvo(null)}>
            Fechar
          </button>
        </div>
      )}
      {aviso}
    </div>
  );
}

function LinhaAgenda({
  item,
  passouClasse,
  onLiberar,
  onAbrirAgendar,
  onAbrirDetalhe,
}: {
  item: ItemAgenda;
  passouClasse: boolean;
  onLiberar: (hora: string) => void;
  onAbrirAgendar: (hora: string) => void;
  onAbrirDetalhe: (ag: Agendamento) => void;
}) {
  const cls = `pn-linha${passouClasse ? " passou" : ""}`;

  if (item.estado === "livre") {
    return (
      <button type="button" className={`${cls} pn-linha-clicavel`} data-estado="livre" onClick={() => onAbrirAgendar(item.hora)}>
        <span className="pn-linha-hora">{item.hora}</span>
        <span className="pn-linha-principal pn-linha-livre">
          <Plus size={16} aria-hidden="true" /> Livre
        </span>
      </button>
    );
  }

  if (item.estado === "bloqueado") {
    return (
      <div className={cls} data-estado="bloqueado">
        <span className="pn-linha-hora">{item.hora}</span>
        <span className="pn-linha-principal pn-linha-bloqueado">
          <Lock size={14} aria-hidden="true" /> Bloqueado
        </span>
        <button type="button" className="adm-mini" onClick={() => onLiberar(item.hora)}>
          Liberar
        </button>
      </div>
    );
  }

  if (item.estado === "pedido") {
    const ag = item.agendamento;
    return (
      <button
        type="button"
        className={`${cls} pn-linha-clicavel`}
        data-estado="pedido"
        onClick={() => ag && onAbrirDetalhe(ag)}
      >
        <span className="pn-linha-hora">{item.hora}</span>
        <span className="pn-linha-principal">
          <b>{nomeDoItem(ag)}</b>
          {ag && <small>{descricaoServicos(ag)}</small>}
        </span>
        <span className="pn-pilula-pedido">Pedido</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    );
  }

  // confirmado — div (não <button>) porque tem um <a> dentro (WhatsApp); HTML não deixa
  // botão dentro de botão. `role="button"` + teclado mantêm o toque no corpo acessível.
  const ag = item.agendamento;
  const link = ag ? linkConfirmacao(ag) : null;
  return (
    <div
      className={`${cls} pn-linha-clicavel`}
      data-estado="confirmado"
      role="button"
      tabIndex={0}
      onClick={() => ag && onAbrirDetalhe(ag)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && ag) {
          e.preventDefault();
          onAbrirDetalhe(ag);
        }
      }}
    >
      <span className="pn-linha-hora">{item.hora}</span>
      <span className="pn-linha-principal">
        <b>{nomeDoItem(ag)}</b>
        {ag && <small>{descricaoServicos(ag)}</small>}
      </span>
      {link && (
        <a
          className="pn-linha-whatsapp"
          href={link}
          target="_blank"
          rel="noopener"
          title="Enviar confirmação pelo WhatsApp"
          aria-label="Enviar confirmação pelo WhatsApp"
          onClick={(e) => e.stopPropagation()}
        >
          <WhatsappIcon size={18} />
        </a>
      )}
    </div>
  );
}

function descricaoServicos(ag: Agendamento): string {
  const [primeiro, ...resto] = ag.servicos;
  const nomes = primeiro ? primeiro.nome + (resto.length ? ` +${resto.length}` : "") : "";
  return `${nomes} · ${brl(ag.total)}`;
}
