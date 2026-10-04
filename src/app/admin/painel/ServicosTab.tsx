"use client";

import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { brl, formatarDuracao } from "@/lib/utils";
import type { ServicoDoc } from "@/lib/db";
import { useDados } from "./DadosProvider";
import FolhaServico from "./FolhaServico";

/** Aba Serviços (Fase C, redesenho definitivo): lista + folha, lendo do DadosProvider. */
export default function ServicosTab() {
  const { servicos, erros } = useDados();
  const [folha, setFolha] = useState<"novo" | ServicoDoc | null>(null);

  const lista = [...servicos].sort((a, b) => Number(b.destaque) - Number(a.destaque));

  return (
    <div className="pn-agenda">
      <div className="pn-dia-cabecalho">
        <div>
          <div className="pn-dia-titulo">Serviços</div>
          <div className="pn-dia-resumo">
            {lista.length === 0 ? "Nenhum ainda" : `${lista.length} ${lista.length === 1 ? "serviço" : "serviços"}`}
          </div>
        </div>
        <button type="button" className="adm-btn pn-btn-topo" onClick={() => setFolha("novo")}>
          <Plus size={18} aria-hidden="true" />
          Novo
        </button>
      </div>

      {erros.servicos && <p className="adm-erro">Não consegui carregar os serviços agora. Tente de novo.</p>}

      <div className="pn-lista-periodo">
        {lista.length === 0 && !erros.servicos && (
          <p className="adm-muted">Nenhum serviço ainda. Toque em “Novo” para adicionar o primeiro.</p>
        )}
        {lista.map((s) => (
          <button
            type="button"
            key={s.id}
            className="pn-linha pn-linha-clicavel"
            onClick={() => setFolha(s)}
          >
            <div className="pn-linha-principal">
              <b>
                {s.nome}
                {s.destaque && <span className="svc-selo">Mais pedido</span>}
              </b>
              <small>
                {brl(s.preco)}
                {s.duracaoMin ? ` · ${formatarDuracao(s.duracaoMin)}` : ""}
              </small>
            </div>
            <ChevronRight size={18} className="pn-linha-chevron" aria-hidden="true" />
          </button>
        ))}
      </div>

      {folha && (
        <FolhaServico
          servico={folha === "novo" ? null : folha}
          onFechar={() => setFolha(null)}
          onSalvo={() => setFolha(null)}
        />
      )}
    </div>
  );
}
