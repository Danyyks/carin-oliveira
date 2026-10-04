"use client";

import { useState } from "react";
import { brl, wppUrl, zap } from "@/lib/utils";
import { linkConfirmacao, msgRecusa, msgCancelamento } from "@/lib/mensagens";
import { confirmarAgendamento, recusarAgendamento, type Agendamento } from "@/lib/db";
import { erroHumano } from "@/lib/erroHumano";
import { gravarEAbrirWhatsapp } from "../compartilhado/whatsappToque";
import Folha from "../compartilhado/Folha";
import Dialogo from "../compartilhado/Dialogo";

/**
 * Folha "Detalhe": aberta ao tocar num horário Confirmado ou Pedido da Agenda por dia.
 * Pedido ganha Confirmar/Recusar (mesmo padrão de toque-abre-aba-antes do
 * `AgendamentosManager` clássico, pro WhatsApp não ser bloqueado no iPhone); Confirmado
 * ganha o link de reenviar a confirmação e Cancelar horário.
 */
export default function FolhaDetalhe({
  agendamento,
  onFechar,
}: {
  agendamento: Agendamento;
  onFechar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState<"recusar" | "cancelar" | null>(null);
  const a = agendamento;
  const pendente = a.status === "pendente";
  const linkWpp = !pendente ? linkConfirmacao(a) : null;

  async function confirmar() {
    setOcupado(true);
    setErro("");
    const url = linkConfirmacao(a);
    let falhou = false;
    await gravarEAbrirWhatsapp(url ? window.open("", "_blank") : null, () => confirmarAgendamento(a.id), url, (e) => {
      falhou = true;
      setErro(erroHumano(e));
    });
    setOcupado(false);
    if (!falhou) onFechar();
  }

  async function recusar() {
    setConfirmando(null);
    setOcupado(true);
    setErro("");
    const url = a.clienteWhatsapp ? wppUrl(zap(a.clienteWhatsapp), msgRecusa(a)) : null;
    let falhou = false;
    await gravarEAbrirWhatsapp(url ? window.open("", "_blank") : null, () => recusarAgendamento(a.id), url, (e) => {
      falhou = true;
      setErro(erroHumano(e));
    });
    setOcupado(false);
    if (!falhou) onFechar();
  }

  async function cancelar() {
    setConfirmando(null);
    setOcupado(true);
    setErro("");
    const url = a.clienteWhatsapp ? wppUrl(zap(a.clienteWhatsapp), msgCancelamento(a)) : null;
    let falhou = false;
    await gravarEAbrirWhatsapp(url ? window.open("", "_blank") : null, () => recusarAgendamento(a.id), url, (e) => {
      falhou = true;
      setErro(erroHumano(e));
    });
    setOcupado(false);
    if (!falhou) onFechar();
  }

  return (
    <>
    <Folha titulo={pendente ? "Pedido" : "Agendamento"} onFechar={onFechar}>
      <div className="pn-bloco">
        <span className="pn-rotulo">Cliente</span>
        <p className="pn-detalhe-nome">{a.clienteNome}</p>
      </div>

      <div className="pn-bloco">
        <span className="pn-rotulo">Quando</span>
        <p>
          {a.diaLabel} às {a.hora}
        </p>
      </div>

      <div className="pn-bloco">
        <span className="pn-rotulo">{a.servicos.length > 1 ? "Serviços" : "Serviço"}</span>
        {a.servicos.map((s, i) => (
          <p key={i} className="adm-muted">
            {s.nome} — {brl(s.preco)}
          </p>
        ))}
        <p className="pn-detalhe-total">Total: {brl(a.total)}</p>
      </div>

      <div className="adm-actions pn-detalhe-acoes">
        {pendente ? (
          <>
            <button type="button" className="adm-btn ag-confirmar" disabled={ocupado} onClick={confirmar}>
              Confirmar
            </button>
            <button
              type="button"
              className="adm-mini adm-mini-danger"
              disabled={ocupado}
              onClick={() => setConfirmando("recusar")}
            >
              Recusar
            </button>
          </>
        ) : (
          <>
            {linkWpp && (
              <a className="adm-mini ag-whatsapp" href={linkWpp} target="_blank" rel="noopener">
                Enviar confirmação
              </a>
            )}
            <button
              type="button"
              className="adm-mini adm-mini-danger"
              disabled={ocupado}
              onClick={() => setConfirmando("cancelar")}
            >
              Cancelar horário
            </button>
          </>
        )}
        {erro && <p className="adm-erro">{erro}</p>}
      </div>
    </Folha>
    {confirmando === "recusar" && (
      <Dialogo
        titulo="Recusar pedido"
        texto={`Recusar o pedido de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`}
        textoConfirmar="Recusar"
        perigo
        onConfirmar={recusar}
        onCancelar={() => setConfirmando(null)}
      />
    )}
    {confirmando === "cancelar" && (
      <Dialogo
        titulo="Cancelar horário"
        texto={`Cancelar o agendamento de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`}
        textoConfirmar="Cancelar horário"
        perigo
        onConfirmar={cancelar}
        onCancelar={() => setConfirmando(null)}
      />
    )}
    </>
  );
}
