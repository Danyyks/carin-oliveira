"use client";

import { useEffect, useState, type FormEvent } from "react";
import { brl, formatarDuracao } from "@/lib/utils";
import { ouvirServicos, addServico, updateServico, removeServico, type ServicoDoc } from "@/lib/db";
import { detalheErro } from "../detalheErro";
import CardColapsavel from "./CardColapsavel";

// ---------------- Serviços ----------------
const FORM_VAZIO = { nome: "", desc: "", preco: "", destaque: false, duracao: "" };

export default function ServicosManager({ semSanfona }: { semSanfona?: boolean } = {}) {
  const [lista, setLista] = useState<ServicoDoc[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroServ, setErroServ] = useState("");

  useEffect(() => ouvirServicos(setLista), []);

  function editar(s: ServicoDoc) {
    setEditId(s.id);
    setForm({ nome: s.nome, desc: s.desc, preco: String(s.preco), destaque: !!s.destaque, duracao: s.duracaoMin ? String(s.duracaoMin) : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelar() {
    setEditId(null);
    setForm(FORM_VAZIO);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const preco = parseFloat(String(form.preco).replace(",", "."));
    if (!form.nome.trim() || Number.isNaN(preco)) return;
    const duracaoTxt = form.duracao.trim();
    let duracaoMin: number | undefined;
    if (duracaoTxt) {
      duracaoMin = parseInt(duracaoTxt, 10);
      if (Number.isNaN(duracaoMin) || duracaoMin <= 0) return setErroServ("Duração inválida (em minutos).");
    }
    setSalvando(true);
    setErroServ("");
    const data = { nome: form.nome.trim(), desc: form.desc.trim(), preco, destaque: form.destaque, duracaoMin };
    try {
      if (editId) await updateServico(editId, data);
      else await addServico(data);
      cancelar();
    } catch (e) {
      setErroServ(`Não consegui salvar (${detalheErro(e)}).`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(s: ServicoDoc) {
    if (confirm(`Excluir "${s.nome}"?`)) await removeServico(s.id);
  }

  return (
    <CardColapsavel
      titulo="Tabela de preços"
      resumo={`${lista.length} ${lista.length === 1 ? "serviço" : "serviços"}`}
      abertoInicial={semSanfona}
    >

      <form className="adm-form" onSubmit={submit}>
        <div className="adm-row2">
          <label className="adm-field">
            <span>Nome</span>
            <input className="adm-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </label>
          <label className="adm-field">
            <span>Preço (R$)</span>
            <input className="adm-input" inputMode="decimal" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="ex.: 65" required />
          </label>
        </div>
        <label className="adm-field">
          <span>Descrição</span>
          <input className="adm-input" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="ex.: Brilho e durabilidade" />
        </label>
        <label className="adm-field">
          <span>
            Duração (minutos, opcional){form.duracao && ` · ${formatarDuracao(parseInt(form.duracao, 10) || 0)}`}
          </span>
          <input
            className="adm-input"
            inputMode="numeric"
            value={form.duracao}
            onChange={(e) => setForm({ ...form, duracao: e.target.value.replace(/\D/g, "") })}
            placeholder="ex.: 90"
          />
        </label>
        <p className="adm-muted">
          Com a duração preenchida, um agendamento mais longo que o intervalo até o próximo horário bloqueia esse
          horário seguinte sozinho — ninguém marca em cima.
        </p>
        <label className="adm-check">
          <input type="checkbox" checked={form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.checked })} />
          <span>Destacar como “Mais pedido” (aparece no topo)</span>
        </label>
        <div className="adm-actions">
          <button className="adm-btn" disabled={salvando}>{editId ? "Salvar alterações" : "Adicionar serviço"}</button>
          {editId && (
            <button type="button" className="adm-btn-ghost" onClick={cancelar}>Cancelar</button>
          )}
          {erroServ && <span className="adm-erro">{erroServ}</span>}
        </div>
      </form>

      <div className="adm-list">
        {lista.length === 0 && <p className="adm-muted">Nenhum serviço ainda. Adicione o primeiro acima.</p>}
        {lista.map((s) => (
          <div className="adm-item" key={s.id}>
            <div className="adm-item-info">
              <b>
                {s.nome}
                {s.destaque && <span className="svc-selo">Mais pedido</span>}
              </b>
              <span>{s.desc}</span>
            </div>
            <div className="adm-item-right">
              <span className="adm-preco">
                {brl(s.preco)}
                {s.duracaoMin ? ` · ${formatarDuracao(s.duracaoMin)}` : ""}
              </span>
              <button className="adm-mini" onClick={() => editar(s)}>Editar</button>
              <button className="adm-mini adm-mini-danger" onClick={() => excluir(s)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </CardColapsavel>
  );
}
