"use client";

import { useState, type FormEvent } from "react";
import { formatarDuracao } from "@/lib/utils";
import { addServico, updateServico, removeServico, type ServicoDoc } from "@/lib/db";
import { erroHumano } from "@/lib/erroHumano";
import Folha from "../compartilhado/Folha";
import Dialogo from "../compartilhado/Dialogo";

/** Criar ou editar um serviço (Fase C) — folha própria do painel novo, sem sanfona. */
export default function FolhaServico({
  servico,
  onFechar,
  onSalvo,
}: {
  servico: ServicoDoc | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(servico?.nome ?? "");
  // No mesmo formato em que ela digita ("37,50"), não o do JavaScript ("37.5").
  const [preco, setPreco] = useState(
    servico ? (Number.isInteger(servico.preco) ? String(servico.preco) : servico.preco.toFixed(2).replace(".", ",")) : "",
  );
  const [desc, setDesc] = useState(servico?.desc ?? "");
  const [duracao, setDuracao] = useState(servico?.duracaoMin ? String(servico.duracaoMin) : "");
  const [destaque, setDestaque] = useState(!!servico?.destaque);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const precoNum = parseFloat(preco.replace(",", "."));
    if (!nome.trim() || Number.isNaN(precoNum)) return;
    const duracaoTxt = duracao.trim();
    let duracaoMin: number | undefined;
    if (duracaoTxt) {
      duracaoMin = parseInt(duracaoTxt, 10);
      if (Number.isNaN(duracaoMin) || duracaoMin <= 0) return setErro("Duração inválida (em minutos).");
    }
    setSalvando(true);
    setErro("");
    const data = { nome: nome.trim(), desc: desc.trim(), preco: precoNum, destaque, duracaoMin };
    try {
      if (servico) await updateServico(servico.id, data);
      else await addServico(data);
      onSalvo();
    } catch (e) {
      setErro(erroHumano(e));
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!servico) return;
    setExcluindo(true);
    setErro("");
    try {
      await removeServico(servico.id);
      onSalvo();
    } catch (e) {
      setErro(erroHumano(e));
      setExcluirAberto(false);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Folha
        titulo={servico ? "Editar serviço" : "Novo serviço"}
        onFechar={onFechar}
        rodape={
          <div className="pn-rodape-col">
            <button type="submit" form="form-servico" className="adm-btn pn-btn-largo" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
            {servico && (
              <button
                type="button"
                className="adm-btn-danger pn-btn-largo"
                onClick={() => setExcluirAberto(true)}
                disabled={salvando}
              >
                Excluir serviço
              </button>
            )}
            {erro && <p className="adm-erro" style={{ margin: 0 }}>{erro}</p>}
          </div>
        }
      >
        <form id="form-servico" className="adm-form" onSubmit={submit}>
          <label className="adm-field">
            <span>Nome</span>
            <input className="adm-input" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          </label>
          <label className="adm-field">
            <span>Preço (R$)</span>
            <input
              className="adm-input"
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="ex.: 65"
              required
            />
          </label>
          <label className="adm-field">
            <span>Descrição</span>
            <input
              className="adm-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="ex.: Brilho e durabilidade"
            />
          </label>
          <label className="adm-field">
            <span>
              Duração (minutos, opcional){duracao && ` · ${formatarDuracao(parseInt(duracao, 10) || 0)}`}
            </span>
            <input
              className="adm-input"
              inputMode="numeric"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value.replace(/\D/g, ""))}
              placeholder="ex.: 90"
            />
          </label>
          <p className="adm-muted">
            Com a duração preenchida, um agendamento mais longo que o intervalo até o próximo horário bloqueia esse
            horário seguinte sozinho — ninguém marca em cima.
          </p>
          <label className="adm-check">
            <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} />
            <span>Destacar como “Mais pedido” (aparece no topo)</span>
          </label>
        </form>
      </Folha>
      {excluirAberto && (
        <Dialogo
          titulo="Excluir serviço"
          texto={`Excluir "${servico?.nome}"? A tabela de preços perde esse serviço; agendamentos já feitos não mudam.`}
          textoConfirmar={excluindo ? "Excluindo…" : "Excluir"}
          perigo
          onConfirmar={confirmarExclusao}
          onCancelar={() => setExcluirAberto(false)}
        />
      )}
    </>
  );
}
