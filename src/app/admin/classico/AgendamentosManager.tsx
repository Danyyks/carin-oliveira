"use client";

import { useEffect, useState } from "react";
import { brl, wppUrl, zap } from "@/lib/utils";
import { linkConfirmacao, msgRecusa, msgCancelamento } from "@/lib/mensagens";
import {
  ouvirAgendamentos,
  confirmarAgendamento,
  recusarAgendamento,
  type Agendamento,
} from "@/lib/db";
import { gravarEAbrirWhatsapp } from "../compartilhado/whatsappToque";
import { useHoje } from "../compartilhado/useHoje";

// ---------------- Agendamentos ----------------
export default function AgendamentosManager() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  useEffect(() => ouvirAgendamentos(setLista), []);
  const hoje = useHoje();

  const pendentes = lista.filter((a) => a.status === "pendente");
  // Confirmados somem do painel na virada do dia seguinte ao atendimento (opção B):
  // fica visível o dia inteiro do agendamento e sai quando a data já passou. O
  // registro continua salvo no banco (histórico), só não aparece mais na lista.
  const confirmados = lista.filter((a) => a.status === "confirmado" && a.data >= hoje);

  // Bolinha no ícone do app (igual app nativo) com o nº de pedidos pendentes.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!("setAppBadge" in nav)) return;
    if (pendentes.length > 0) nav.setAppBadge?.(pendentes.length).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [pendentes.length]);

  // Confirma e abre o WhatsApp do cliente com a mensagem de confirmação pronta.
  // A aba do WhatsApp é aberta ANTES do await, senão o iPhone bloqueia (ver whatsappToque.ts).
  async function confirmar(a: Agendamento) {
    const url = linkConfirmacao(a);
    await gravarEAbrirWhatsapp(url ? window.open("", "_blank") : null, () => confirmarAgendamento(a.id), url);
  }

  // Recusa um pedido pendente + abre o WhatsApp com a mensagem de recusa (se tiver).
  async function recusar(a: Agendamento) {
    if (!confirm(`Recusar o pedido de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`)) return;
    const url = a.clienteWhatsapp ? wppUrl(zap(a.clienteWhatsapp), msgRecusa(a)) : null;
    await gravarEAbrirWhatsapp(url ? window.open("", "_blank") : null, () => recusarAgendamento(a.id), url);
  }

  // Cancela um agendamento confirmado + abre o WhatsApp com a mensagem de cancelamento (se tiver).
  async function cancelar(a: Agendamento) {
    if (!confirm(`Cancelar o agendamento de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`)) return;
    const url = a.clienteWhatsapp ? wppUrl(zap(a.clienteWhatsapp), msgCancelamento(a)) : null;
    await gravarEAbrirWhatsapp(url ? window.open("", "_blank") : null, () => recusarAgendamento(a.id), url);
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Agendamentos</h2>

      <div className="ag-grupo-label">Pendentes ({pendentes.length})</div>
      {pendentes.length === 0 && <p className="adm-muted">Nenhum pedido pendente.</p>}
      {pendentes.map((a) => (
        <div className="ag-item" key={a.id}>
          <div className="ag-info">
            <b>{a.clienteNome}</b>
            <span>{a.servicos.map((s) => s.nome).join(", ")} · {brl(a.total)}</span>
            <span className="ag-quando">{a.diaLabel} · {a.hora}</span>
          </div>
          <div className="ag-acoes">
            <button className="adm-btn ag-confirmar" onClick={() => confirmar(a)}>Confirmar</button>
            <button className="adm-mini adm-mini-danger" onClick={() => recusar(a)}>Recusar</button>
          </div>
        </div>
      ))}

      {confirmados.length > 0 && (
        <>
          <div className="ag-grupo-label">Confirmados</div>
          {confirmados.map((a) => {
            // Mesma confirmação do botão "Confirmar" e do agendamento manual: serve também
            // de "reenviar" se a primeira não saiu. Sem WhatsApp cadastrado, não há botão.
            const linkWpp = linkConfirmacao(a);
            return (
              <div className="ag-item" key={a.id}>
                <div className="ag-info">
                  <b>
                    {a.clienteNome} <span className="ag-tag-ok">confirmado</span>
                  </b>
                  <span>{a.servicos.map((s) => s.nome).join(", ")} · {brl(a.total)}</span>
                  <span className="ag-quando">{a.diaLabel} · {a.hora}</span>
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
                  <button className="adm-mini adm-mini-danger" onClick={() => cancelar(a)}>Cancelar</button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
