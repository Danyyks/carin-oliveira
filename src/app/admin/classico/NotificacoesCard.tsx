"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ativarNotificacoes,
  notificacoesSuportadas,
  permissaoAtual,
  ouvirMensagensEmPrimeiroPlano,
} from "@/lib/push";
import CardColapsavel from "./CardColapsavel";

// ---------------- Notificações (push) ----------------
type EstadoPush = "carregando" | "indisponivel" | "off" | "ativando" | "ok" | "erro";

export default function NotificacoesCard({ semSanfona }: { semSanfona?: boolean } = {}) {
  const [estado, setEstado] = useState<EstadoPush>("carregando");
  const [msg, setMsg] = useState("");

  // Pede permissão (se preciso), gera o token e SALVA no Firestore.
  // Só vira "ok" depois que o token foi realmente salvo — não basta a permissão.
  const ativar = useCallback(async () => {
    setEstado("ativando");
    setMsg("");
    try {
      await ativarNotificacoes();
      setEstado("ok");
    } catch (e) {
      setEstado("erro");
      const code = (e as { code?: string })?.code;
      setMsg((e as Error).message + (code ? ` [${code}]` : ""));
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const suporta = await notificacoesSuportadas();
      if (!vivo) return;
      if (!suporta) return setEstado("indisponivel");
      // Já tem permissão? Re-gera e re-salva o token pra garantir que está no banco
      // (o token pode ter rotacionado, ou a gravação anterior ter falhado).
      if (permissaoAtual() === "granted") ativar();
      else setEstado("off");
    })();
    // Aviso na tela mesmo com o painel aberto.
    const p = ouvirMensagensEmPrimeiroPlano();
    return () => {
      vivo = false;
      p.then((unsub) => unsub?.());
    };
  }, [ativar]);

  if (estado === "carregando" || estado === "ativando") {
    return (
      <CardColapsavel titulo="Notificações" abertoInicial={semSanfona}>
        <p className="adm-muted">Configurando as notificações neste aparelho…</p>
      </CardColapsavel>
    );
  }

  const resumo = estado === "ok" ? "ativadas" : estado === "indisponivel" ? "" : "desligadas";
  return (
    <CardColapsavel titulo="Notificações" resumo={resumo} abertoInicial={semSanfona}>
      {estado === "ok" ? (
        <p className="adm-ok">Ativadas neste aparelho. Você recebe um aviso na tela a cada novo pedido.</p>
      ) : estado === "indisponivel" ? (
        <p className="adm-muted">
          Este aparelho não suporta notificações por aqui. No iPhone, <b>instale o app na tela inicial</b> (menu
          Compartilhar → Adicionar à Tela de Início) e abra por ele para ativar.
        </p>
      ) : (
        <>
          <p className="adm-muted">
            {estado === "erro"
              ? "Não consegui ativar neste aparelho. Toque para tentar de novo:"
              : "Receba um aviso na tela sempre que chegar um novo agendamento."}
          </p>
          <div className="adm-actions">
            <button className="adm-btn" onClick={ativar}>
              {estado === "erro" ? "Tentar de novo" : "Ativar notificações"}
            </button>
            {estado === "erro" && <span className="adm-erro">{msg}</span>}
          </div>
        </>
      )}
    </CardColapsavel>
  );
}
