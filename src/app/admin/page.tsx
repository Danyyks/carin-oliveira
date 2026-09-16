"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { brl, wppUrl } from "@/lib/utils";
import {
  ativarNotificacoes,
  notificacoesSuportadas,
  permissaoAtual,
  ouvirMensagensEmPrimeiroPlano,
} from "@/lib/push";
import { msgConfirmacao, msgRecusa, msgCancelamento } from "@/lib/mensagens";
import AssinaturaDSS from "@/components/AssinaturaDSS";

// Diagnóstico: código do erro do Firestore + se há login ativo no momento.
function detalheErro(e: unknown) {
  const code = (e as { code?: string })?.code || "erro";
  const uid = auth.currentUser?.uid;
  return `${code} · ${uid ? "login: " + uid.slice(0, 6) : "SEM login"}`;
}
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
      <NotificacoesCard />
      <ServicosManager />
      <HorariosManager />
      <AssinaturaDSS />
    </div>
  );
}

// ---------------- Notificações (push) ----------------
type EstadoPush = "carregando" | "indisponivel" | "off" | "ativando" | "ok" | "erro";

function NotificacoesCard() {
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
      <section className="admin-card">
        <h2 className="adm-section">Notificações</h2>
        <p className="adm-muted">Configurando as notificações neste aparelho…</p>
      </section>
    );
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Notificações</h2>
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
    </section>
  );
}

// ---------------- Agendamentos ----------------
function AgendamentosManager() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  useEffect(() => ouvirAgendamentos(setLista), []);

  const pendentes = lista.filter((a) => a.status === "pendente");
  const confirmados = lista.filter((a) => a.status === "confirmado");

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
  async function confirmar(a: Agendamento) {
    await confirmarAgendamento(a.id);
    window.open(wppUrl(zap(a.clienteWhatsapp), msgConfirmacao(a)), "_blank");
  }

  // Recusa um pedido pendente + abre o WhatsApp com a mensagem de recusa.
  async function recusar(a: Agendamento) {
    if (!confirm(`Recusar o pedido de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?\nVai abrir o WhatsApp com um aviso pronto para o cliente.`)) return;
    await recusarAgendamento(a.id);
    window.open(wppUrl(zap(a.clienteWhatsapp), msgRecusa(a)), "_blank");
  }

  // Cancela um agendamento confirmado + abre o WhatsApp com a mensagem de cancelamento.
  async function cancelar(a: Agendamento) {
    if (!confirm(`Cancelar o agendamento de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?\nVai abrir o WhatsApp com um aviso pronto para o cliente.`)) return;
    await recusarAgendamento(a.id);
    window.open(wppUrl(zap(a.clienteWhatsapp), msgCancelamento(a)), "_blank");
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
          {confirmados.map((a) => (
            <div className="ag-item" key={a.id}>
              <div className="ag-info">
                <b>
                  {a.clienteNome} <span className="ag-tag-ok">confirmado</span>
                </b>
                <span>{a.servicos.map((s) => s.nome).join(", ")} · {brl(a.total)}</span>
                <span className="ag-quando">{a.diaLabel} · {a.hora}</span>
              </div>
              <div className="ag-acoes">
                <a className="adm-mini" href={`https://wa.me/${zap(a.clienteWhatsapp)}`} target="_blank" rel="noopener">WhatsApp</a>
                <button className="adm-mini adm-mini-danger" onClick={() => cancelar(a)}>Cancelar</button>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

// ---------------- Serviços ----------------
const FORM_VAZIO = { nome: "", desc: "", preco: "", destaque: false };

function ServicosManager() {
  const [lista, setLista] = useState<ServicoDoc[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroServ, setErroServ] = useState("");

  useEffect(() => ouvirServicos(setLista), []);

  function editar(s: ServicoDoc) {
    setEditId(s.id);
    setForm({ nome: s.nome, desc: s.desc, preco: String(s.preco), destaque: !!s.destaque });
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
    setErroServ("");
    const data = { nome: form.nome.trim(), desc: form.desc.trim(), preco, destaque: form.destaque };
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
    <section className="admin-card">
      <h2 className="adm-section">Tabela de preços</h2>

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
              <span className="adm-preco">{brl(s.preco)}</span>
              <button className="adm-mini" onClick={() => editar(s)}>Editar</button>
              <button className="adm-mini adm-mini-danger" onClick={() => excluir(s)}>Excluir</button>
            </div>
          </div>
        ))}
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
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
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
      setMsg({ ok: false, texto: `Não consegui salvar (${detalheErro(e)}).` });
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
