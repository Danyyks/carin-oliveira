"use client";

import { useState } from "react";
import { brl, formatarDuracao, diaDaSemana, labelData } from "@/lib/utils";
import { linkConfirmacao, primeiroNome } from "@/lib/mensagens";
import { duracaoTotal, horariosAfetados, duracaoCabe } from "@/lib/agendaDia";
import { criarAgendamentoManual, type Agendamento, type NovoAgendamento } from "@/lib/db";
import { detalheErro } from "../detalheErro";
import Folha from "../compartilhado/Folha";
import { useDados } from "./DadosProvider";

/**
 * Folha "Agendar": aberta ao tocar num horário Livre da Agenda por dia — dia e hora já
 * vêm escolhidos (sem campo de data). Mesma validação de duração do formulário manual
 * clássico, só que lendo os dados já centralizados do `DadosProvider` (sem assinar o
 * Firestore de novo). Entra já `confirmado`, igual ao "+ Adicionar agendamento" de sempre.
 */
export default function FolhaAgendar({
  data,
  hora,
  onFechar,
  onCriado,
}: {
  data: string;
  hora: string;
  onFechar: () => void;
  onCriado: (nome: string, linkWhatsapp: string | null) => void;
}) {
  const { servicos, agenda, slots } = useDados();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [svcSel, setSvcSel] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const ocupados = new Set(slots.map((s) => s.id));
  const grade = (agenda.dias ?? {})[String(diaDaSemana(data))] ?? [];
  const escolhidos = servicos.filter((s) => svcSel.includes(s.id));
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  const duracaoMin = duracaoTotal(escolhidos);
  const semEspaco = duracaoMin > 0 && !duracaoCabe(data, hora, duracaoMin, grade, ocupados);

  function toggleSvc(id: string) {
    setSvcSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function salvar() {
    setErro("");
    const wpp = whatsapp.replace(/\D/g, "");
    if (nome.trim().length < 2) return setErro("Coloque o nome da cliente.");
    if (escolhidos.length === 0) return setErro("Escolha pelo menos um serviço.");
    if (whatsapp && wpp.length < 10) return setErro("WhatsApp incompleto (ou deixe em branco).");
    if (semEspaco) return setErro("Esse serviço não cabe: o horário seguinte já está ocupado.");

    const bloquearApos = duracaoMin > 0 ? horariosAfetados(hora, duracaoMin, grade) : [];
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
      const id = await criarAgendamentoManual(novo, bloquearApos);
      const agendamento: Agendamento = { ...novo, id, status: "confirmado" };
      onCriado(primeiroNome(novo.clienteNome), linkConfirmacao(agendamento));
      onFechar();
    } catch (e) {
      if ((e as { code?: string })?.code === "horario-ocupado") {
        setErro("Esse horário acabou de ser ocupado. Escolha outro.");
      } else {
        setErro(`Não consegui salvar (${detalheErro(e)}).`);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha
      titulo="Agendar"
      onFechar={onFechar}
      rodape={
        <div className="pn-rodape-col">
          {erro && (
            <p className="adm-erro" role="alert">
              {erro}
            </p>
          )}
          <button type="button" className="adm-btn pn-btn-largo" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar agendamento"}
          </button>
        </div>
      }
    >
      <p className="adm-muted">
        {labelData(data)} às {hora}
      </p>

      <label className="adm-field">
        <span>Nome da cliente</span>
        <input className="adm-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </label>
      <label className="adm-field">
        <span>WhatsApp (opcional)</span>
        <input
          className="adm-input"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="com DDD"
        />
      </label>

      <div className="adm-field">
        <span>Serviços</span>
        {servicos.length === 0 ? (
          <p className="adm-muted">Cadastre um serviço primeiro (na aba Serviços).</p>
        ) : (
          <div className="chips">
            {servicos.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`chip${svcSel.includes(s.id) ? " active" : ""}`}
                onClick={() => toggleSvc(s.id)}
              >
                {s.nome}
                <small>{brl(s.preco)}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {semEspaco && <p className="adm-erro">Esse serviço não cabe: o horário seguinte já está ocupado.</p>}

      {escolhidos.length > 0 && (
        <p className="adm-muted">
          Total: <b>{brl(total)}</b>
          {duracaoMin > 0 && ` · ${formatarDuracao(duracaoMin)}`}
        </p>
      )}
    </Folha>
  );
}
