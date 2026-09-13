"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { brl, wppUrl } from "@/lib/utils";
import {
  ouvirServicos,
  addServico,
  updateServico,
  removeServico,
  ouvirAgenda,
  salvarAgenda,
  ouvirAgendamentos,
  confirmarAgendamento,
  recusarAgendamento,
  type ServicoDoc,
  type TipoServico,
  type Agendamento,
} from "@/lib/db";

// Normaliza o número do cliente para o formato do wa.me (com DDI 55).
function zap(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("55") ? d : "55" + d;
}

export default function AdminPage() {
  const { user, loading, login, logout } = useAuth();
  const [contextoOk, setContextoOk] = useState(true);

  useEffect(() => setContextoOk(window.isSecureContext), []);

  if (!contextoOk) return <ContextoInseguro />;
  if (loading) {
    return (
      <div className="admin admin-center">
        <p className="adm-muted">Carregando…</p>
      </div>
    );
  }
  if (!user) return <LoginForm login={login} />;
  return <Dashboard email={user.email ?? ""} logout={logout} />;
}

// Aparece quando a página é aberta por conexão insegura (HTTP num IP de rede).
// O Firebase Auth só inicia em `localhost` ou HTTPS.
function ContextoInseguro() {
  return (
    <div className="admin admin-center">
      <div className="admin-card admin-login">
        <h1 className="adm-title">Abra em modo seguro</h1>
        <p className="adm-muted">
          O login precisa de uma conexão <b>segura (HTTPS)</b> ou de <b>localhost</b>. Você abriu por um endereço de
          rede via http, então o Firebase não inicia por aqui.
        </p>
        <p className="adm-muted">
          Para testar agora, use <b>http://localhost:3000/admin</b> no mesmo computador. No celular, vai funcionar
          assim que publicarmos o site (HTTPS).
        </p>
      </div>
    </div>
  );
}

// ---------------- Login ----------------
function LoginForm({ login }: { login: (e: string, p: string) => Promise<unknown> }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await login(email.trim(), senha);
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="admin admin-center">
      <form className="admin-card admin-login" onSubmit={submit}>
        <h1 className="adm-title">Painel</h1>
        <p className="adm-muted">Acesso restrito à dona do studio.</p>
        <label className="adm-field">
          <span>E-mail</span>
          <input className="adm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="adm-field">
          <span>Senha</span>
          <input className="adm-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
        </label>
        {erro && <p className="adm-erro">{erro}</p>}
        <button className="adm-btn" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({ email, logout }: { email: string; logout: () => Promise<void> }) {
  return (
    <div className="admin">
      <header className="admin-head">
        <div>
          <h1 className="adm-title">Painel · Carin</h1>
          <p className="adm-muted">{email}</p>
        </div>
        <button className="adm-btn-ghost" onClick={() => logout()}>Sair</button>
      </header>
      <AgendamentosManager />
      <ServicosManager />
      <HorariosManager />
    </div>
  );
}

// ---------------- Agendamentos ----------------
function AgendamentosManager() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  useEffect(() => ouvirAgendamentos(setLista), []);

  const pendentes = lista.filter((a) => a.status === "pendente");
  const confirmados = lista.filter((a) => a.status === "confirmado");

  async function confirmar(a: Agendamento) {
    await confirmarAgendamento(a.id);
    const nome = a.clienteNome.split(" ")[0];
    const msg =
      `Olá, ${nome}! Seu horário está confirmado.\n\n` +
      `• ${a.servicoNome}\n• ${a.diaLabel} às ${a.hora}\n\nTe espero!`;
    window.open(wppUrl(zap(a.clienteWhatsapp), msg), "_blank");
  }

  async function recusar(a: Agendamento, verbo: string) {
    if (confirm(`${verbo} o horário de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`)) {
      await recusarAgendamento(a.id);
    }
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
            <span>{a.servicoNome} · {brl(a.servicoPreco)}</span>
            <span className="ag-quando">{a.diaLabel} · {a.hora}</span>
          </div>
          <div className="ag-acoes">
            <button className="adm-btn ag-confirmar" onClick={() => confirmar(a)}>Confirmar</button>
            <button className="adm-mini adm-mini-danger" onClick={() => recusar(a, "Recusar")}>Recusar</button>
          </div>
        </div>
      ))}

      {confirmados.length > 0 && (
        <>
          <div className="ag-grupo-label">Confirmados</div>
          {confirmados.map((a) => (
            <div className="ag-item" key={a.id}>
              <div className="ag-info">
                <b>
                  {a.clienteNome} <span className="ag-tag-ok">confirmado</span>
                </b>
                <span>{a.servicoNome} · {brl(a.servicoPreco)}</span>
                <span className="ag-quando">{a.diaLabel} · {a.hora}</span>
              </div>
              <div className="ag-acoes">
                <a className="adm-mini" href={`https://wa.me/${zap(a.clienteWhatsapp)}`} target="_blank" rel="noopener">WhatsApp</a>
                <button className="adm-mini adm-mini-danger" onClick={() => recusar(a, "Cancelar")}>Cancelar</button>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

// ---------------- Serviços ----------------
const TIPOS: { v: TipoServico; label: string }[] = [
  { v: "servico", label: "Serviço" },
  { v: "combo", label: "Combo" },
  { v: "promocao", label: "Promoção" },
];
const SECOES: { tipo: TipoServico; label: string }[] = [
  { tipo: "servico", label: "Serviços" },
  { tipo: "combo", label: "Combos" },
  { tipo: "promocao", label: "Promoções" },
];
const FORM_VAZIO = { nome: "", desc: "", preco: "", tipo: "servico" as TipoServico };

function ServicosManager() {
  const [lista, setLista] = useState<ServicoDoc[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => ouvirServicos(setLista), []);

  function editar(s: ServicoDoc) {
    setEditId(s.id);
    setForm({ nome: s.nome, desc: s.desc, preco: String(s.preco), tipo: s.tipo });
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
    setSalvando(true);
    const data = { nome: form.nome.trim(), desc: form.desc.trim(), preco, tipo: form.tipo };
    try {
      if (editId) await updateServico(editId, data);
      else await addServico({ ...data, ordem: lista.length });
      cancelar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(s: ServicoDoc) {
    if (confirm(`Excluir "${s.nome}"?`)) await removeServico(s.id);
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Serviços &amp; valores</h2>

      <form className="adm-form" onSubmit={submit}>
        <div className="adm-row2">
          <label className="adm-field">
            <span>Nome</span>
            <input className="adm-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </label>
          <label className="adm-field">
            <span>Tipo</span>
            <select className="adm-input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoServico })}>
              {TIPOS.map((t) => (
                <option key={t.v} value={t.v}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="adm-field">
          <span>Descrição</span>
          <input className="adm-input" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="ex.: Brilho e durabilidade" />
        </label>
        <label className="adm-field">
          <span>Preço (R$)</span>
          <input className="adm-input" inputMode="decimal" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="ex.: 65" required />
        </label>
        <div className="adm-actions">
          <button className="adm-btn" disabled={salvando}>{editId ? "Salvar alterações" : "Adicionar serviço"}</button>
          {editId && (
            <button type="button" className="adm-btn-ghost" onClick={cancelar}>Cancelar</button>
          )}
        </div>
      </form>

      <div className="adm-list">
        {lista.length === 0 && <p className="adm-muted">Nenhum serviço ainda. Adicione o primeiro acima.</p>}
        {SECOES.map((sec) => {
          const itens = lista.filter((s) => (s.tipo ?? "servico") === sec.tipo);
          if (!itens.length) return null;
          return (
            <div className="adm-grupo" key={sec.tipo}>
              <div className="adm-grupo-label">{sec.label}</div>
              {itens.map((s) => (
                <div className="adm-item" key={s.id}>
                  <div className="adm-item-info">
                    <b>{s.nome}</b>
                    <span>{s.desc}</span>
                  </div>
                  <div className="adm-item-right">
                    <span className="adm-preco">{brl(s.preco)}</span>
                    <button className="adm-mini" onClick={() => editar(s)}>Editar</button>
                    <button className="adm-mini adm-mini-danger" onClick={() => excluir(s)}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------- Horários ----------------
const DIAS = [
  { k: "1", label: "Segunda" },
  { k: "2", label: "Terça" },
  { k: "3", label: "Quarta" },
  { k: "4", label: "Quinta" },
  { k: "5", label: "Sexta" },
  { k: "6", label: "Sábado" },
  { k: "0", label: "Domingo" },
];
const HORARIOS_POSSIVEIS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00",
];

function HorariosManager() {
  const [dias, setDias] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let primeiro = true;
    const unsub = ouvirAgenda((a) => {
      if (primeiro) {
        setDias(a.dias || {});
        primeiro = false;
      }
    });
    return unsub;
  }, []);

  function toggle(diaK: string, h: string) {
    setMsg(null);
    setDias((prev) => {
      const atuais = prev[diaK] || [];
      const novo = atuais.includes(h) ? atuais.filter((x) => x !== h) : [...atuais, h].sort();
      return { ...prev, [diaK]: novo };
    });
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      await salvarAgenda({ dias });
      setMsg({ ok: true, texto: "Horários salvos!" });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setMsg({ ok: false, texto: `Não consegui salvar${code ? ` (${code})` : ""}. Tente de novo.` });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Dias e horários de atendimento</h2>
      <p className="adm-muted">Toque nos horários que você atende em cada dia.</p>
      <div className="adm-dias">
        {DIAS.map((d) => (
          <div className="adm-dia" key={d.k}>
            <div className="adm-dia-label">{d.label}</div>
            <div className="chips">
              {HORARIOS_POSSIVEIS.map((h) => {
                const on = (dias[d.k] || []).includes(h);
                return (
                  <button type="button" key={h} className={`chip${on ? " active" : ""}`} onClick={() => toggle(d.k, h)}>
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="adm-actions">
        <button className="adm-btn" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar horários"}</button>
        {msg && <span className={msg.ok ? "adm-ok" : "adm-erro"}>{msg.texto}</span>}
      </div>
    </section>
  );
}
