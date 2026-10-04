"use client";

import { useState } from "react";
import { brl, wppUrl, zap } from "@/lib/utils";
import { hojeKeySalao } from "@/lib/datas";
import { linkConfirmacao, msgRecusa, msgCancelamento } from "@/lib/mensagens";
import { confirmarAgendamento, recusarAgendamento, type Agendamento } from "@/lib/db";
import { erroHumano } from "@/lib/erroHumano";
import { gravarEAbrirWhatsapp } from "../compartilhado/whatsappToque";
import Dialogo from "../compartilhado/Dialogo";
import { useDados } from "./DadosProvider";

/** Aba Pedidos (Fase C, redesenho definitivo): lê do DadosProvider, sem assinatura própria. */
export default function PedidosTab() {
  const { agendamentos, erros } = useDados();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<Agendamento | null>(null);
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);
  const [erro, setErro] = useState("");

  const hoje = hojeKeySalao();
  const pendentes = agendamentos.filter((a) => a.status === "pendente");
  // Mesma regra do painel clássico: confirmado some do painel no dia seguinte ao atendimento.
  const confirmados = agendamentos.filter((a) => a.status === "confirmado" && a.data >= hoje);

  async function confirmar(a: Agendamento) {
    setOcupado(a.id);
    setErro("");
    const url = linkConfirmacao(a);
    await gravarEAbrirWhatsapp(
      url ? window.open("", "_blank") : null,
      () => confirmarAgendamento(a.id),
      url,
      (e) => setErro(erroHumano(e)),
    );
    setOcupado(null);
  }

  async function recusar(a: Agendamento) {
    setRecusando(null);
    setOcupado(a.id);
    setErro("");
    const url = a.clienteWhatsapp ? wppUrl(zap(a.clienteWhatsapp), msgRecusa(a)) : null;
    await gravarEAbrirWhatsapp(
      url ? window.open("", "_blank") : null,
      () => recusarAgendamento(a.id),
      url,
      (e) => setErro(erroHumano(e)),
    );
    setOcupado(null);
  }

  async function cancelar(a: Agendamento) {
    setCancelando(null);
    setOcupado(a.id);
    setErro("");
    const url = a.clienteWhatsapp ? wppUrl(zap(a.clienteWhatsapp), msgCancelamento(a)) : null;
    await gravarEAbrirWhatsapp(
      url ? window.open("", "_blank") : null,
      () => recusarAgendamento(a.id),
      url,
      (e) => setErro(erroHumano(e)),
    );
    setOcupado(null);
  }

  return (
    <div className="pn-agenda">
      <div className="pn-dia-cabecalho">
        <div>
          <div className="pn-dia-titulo">Pedidos</div>
          <div className="pn-dia-resumo">
            {pendentes.length === 0
              ? "Nenhum pendente"
              : `${pendentes.length} ${pendentes.length === 1 ? "pendente" : "pendentes"}`}
          </div>
        </div>
      </div>

      {erros.agendamentos && <p className="adm-erro">Não consegui carregar os pedidos agora. Tente de novo.</p>}
      {erro && <p className="adm-erro">{erro}</p>}

      {pendentes.length === 0 && !erros.agendamentos && <p className="adm-muted">Nenhum pedido pendente.</p>}
      {pendentes.map((a) => (
        <div className="ag-item" key={a.id}>
          <div className="ag-info">
            <b>{a.clienteNome}</b>
            <span>
              {a.servicos.map((s) => s.nome).join(", ")} · {brl(a.total)}
            </span>
            <span className="ag-quando">
              {a.diaLabel} · {a.hora}
            </span>
          </div>
          <div className="ag-acoes">
            <button className="adm-btn ag-confirmar" disabled={ocupado === a.id} onClick={() => confirmar(a)}>
              Confirmar
            </button>
            <button
              className="adm-mini adm-mini-danger"
              disabled={ocupado === a.id}
              onClick={() => setRecusando(a)}
            >
              Recusar
            </button>
          </div>
        </div>
      ))}

      {confirmados.length > 0 && (
        <>
          <h3 className="pn-periodo-label">Confirmados</h3>
          {confirmados.map((a) => {
            const linkWpp = linkConfirmacao(a);
            return (
              <div className="ag-item" key={a.id}>
                <div className="ag-info">
                  <b>{a.clienteNome}</b>
                  <span>
                    {a.servicos.map((s) => s.nome).join(", ")} · {brl(a.total)}
                  </span>
                  <span className="ag-quando">
                    {a.diaLabel} · {a.hora}
                  </span>
                </div>
                <div className="ag-acoes">
                  {linkWpp && (
                    <a
                      className="adm-mini ag-whatsapp"
                      href={linkWpp}
                      target="_blank"
                      rel="noopener"
                      title="Enviar a confirmação pelo WhatsApp"
                    >
                      WhatsApp
                    </a>
                  )}
                  <button
                    className="adm-mini adm-mini-danger"
                    disabled={ocupado === a.id}
                    onClick={() => setCancelando(a)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {recusando && (
        <Dialogo
          titulo="Recusar pedido"
          texto={`Recusar o pedido de ${recusando.clienteNome} (${recusando.diaLabel} · ${recusando.hora})?`}
          textoConfirmar="Recusar"
          perigo
          onConfirmar={() => recusar(recusando)}
          onCancelar={() => setRecusando(null)}
        />
      )}
      {cancelando && (
        <Dialogo
          titulo="Cancelar agendamento"
          texto={`Cancelar o agendamento de ${cancelando.clienteNome} (${cancelando.diaLabel} · ${cancelando.hora})?`}
          textoConfirmar="Cancelar horário"
          perigo
          onConfirmar={() => cancelar(cancelando)}
          onCancelar={() => setCancelando(null)}
        />
      )}
    </div>
  );
}
