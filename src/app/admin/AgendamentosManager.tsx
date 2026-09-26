"use client";

import { useEffect, useState } from "react";
import { brl, wppUrl, zap, hojeKey } from "@/lib/utils";
import { linkConfirmacao, msgRecusa, msgCancelamento } from "@/lib/mensagens";
import {
  ouvirAgendamentos,
  confirmarAgendamento,
  recusarAgendamento,
  type Agendamento,
} from "@/lib/db";

// Abre o WhatsApp de forma confiável — inclusive no iPhone (Safari e app instalado).
// O iOS só deixa abrir uma aba nova se isso acontecer NO MESMO toque; por isso a
// janela é aberta ANTES de esperar o Firebase (o chamador passa `win` já aberto).
// Se o iPhone bloquear a aba mesmo assim (`win` nulo), navega na própria aba, que
// nunca é bloqueada. Depois do await, é só apontar a janela para a URL.
function abrirWhatsapp(win: Window | null, url: string) {
  if (win && !win.closed) win.location.href = url;
  else window.location.href = url;
}

// Grava a mudança e, só se deu certo, manda a aba (já aberta no toque) para o WhatsApp.
// Se a gravação falhar, fecha a aba em branco e não avisa ninguém por WhatsApp.
async function gravarEAbrirWhatsapp(win: Window | null, gravar: () => Promise<unknown>, url: string | null) {
  try {
    await gravar();
  } catch (e) {
    win?.close();
    console.error("Não consegui gravar a mudança do agendamento:", e);
    return;
  }
  if (url) abrirWhatsapp(win, url);
}

// "Hoje" que se atualiza sozinho: quando o app volta ao primeiro plano (o iPhone pausa o
// PWA em segundo plano), quando a tela ganha foco e a cada minuto (virada do dia com o app
// aberto). Sem isso o "hoje" só seria recalculado quando algo redesenhasse a tela, e os
// agendamentos de ontem continuariam à mostra se o app ficasse aberto de um dia pro outro.
// Se o valor não mudou, o React não redesenha nada.
function useHoje() {
  const [hoje, setHoje] = useState(hojeKey);
  useEffect(() => {
    const atualizar = () => setHoje(hojeKey());
    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("focus", atualizar);
    window.addEventListener("pageshow", atualizar);
    const timer = setInterval(atualizar, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("focus", atualizar);
      window.removeEventListener("pageshow", atualizar);
      clearInterval(timer);
    };
  }, []);
  return hoje;
}

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
  // A aba do WhatsApp é aberta ANTES do await, senão o iPhone bloqueia (ver abrirWhatsapp).
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
