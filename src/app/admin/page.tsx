"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { brl, wppUrl, labelData } from "@/lib/utils";
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
  salvarBloqueios,
  ouvirSlotsOcupados,
  ouvirAgendamentos,
  confirmarAgendamento,
  recusarAgendamento,
  criarAgendamentoManual,
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
      <NovoAgendamentoManual />
      <NotificacoesCard />
      <ServicosManager />
      <HorariosManager />
      <CalendarioFolgas />
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
    if (a.clienteWhatsapp) window.open(wppUrl(zap(a.clienteWhatsapp), msgConfirmacao(a)), "_blank");
  }

  // Recusa um pedido pendente + abre o WhatsApp com a mensagem de recusa (se tiver).
  async function recusar(a: Agendamento) {
    if (!confirm(`Recusar o pedido de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`)) return;
    await recusarAgendamento(a.id);
    if (a.clienteWhatsapp) window.open(wppUrl(zap(a.clienteWhatsapp), msgRecusa(a)), "_blank");
  }

  // Cancela um agendamento confirmado + abre o WhatsApp com a mensagem de cancelamento (se tiver).
  async function cancelar(a: Agendamento) {
    if (!confirm(`Cancelar o agendamento de ${a.clienteNome} (${a.diaLabel} · ${a.hora})?`)) return;
    await recusarAgendamento(a.id);
    if (a.clienteWhatsapp) window.open(wppUrl(zap(a.clienteWhatsapp), msgCancelamento(a)), "_blank");
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
                {a.clienteWhatsapp && (
                  <a className="adm-mini ag-whatsapp" href={`https://wa.me/${zap(a.clienteWhatsapp)}`} target="_blank" rel="noopener">WhatsApp</a>
                )}
                <button className="adm-mini adm-mini-danger" onClick={() => cancelar(a)}>Cancelar</button>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

// ---------------- Novo agendamento manual (a dona registra) ----------------
function NovoAgendamentoManual() {
  const [aberto, setAberto] = useState(false);
  const [servicos, setServicos] = useState<ServicoDoc[]>([]);
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [svcSel, setSvcSel] = useState<string[]>([]);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => ouvirServicos(setServicos), []);
  useEffect(() => ouvirSlotsOcupados(setOcupados), []);

  const escolhidos = servicos.filter((s) => svcSel.includes(s.id));
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  const hojeKey = new Date().toISOString().slice(0, 10);

  function toggleSvc(id: string) {
    setSvcSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function limpar() {
    setNome(""); setWhatsapp(""); setSvcSel([]); setData(""); setHora(""); setErro("");
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    const wpp = whatsapp.replace(/\D/g, "");
    if (nome.trim().length < 2) return setErro("Coloque o nome da cliente.");
    if (escolhidos.length === 0) return setErro("Escolha pelo menos um serviço.");
    if (!data || !hora) return setErro("Escolha a data e a hora.");
    if (data < hojeKey) return setErro("Essa data já passou.");
    if (whatsapp && wpp.length < 10) return setErro("WhatsApp incompleto (ou deixe em branco).");
    if (ocupados.has(`${data}_${hora}`)) return setErro("Já existe um agendamento nesse horário.");

    setSalvando(true);
    try {
      await criarAgendamentoManual({
        servicos: escolhidos.map((s) => ({ nome: s.nome, preco: s.preco })),
        total,
        clienteNome: nome.trim(),
        clienteWhatsapp: whatsapp.trim(),
        data,
        hora,
        diaLabel: labelData(data),
      });
      limpar();
      setAberto(false);
      setOk(true);
    } catch (e) {
      setErro(`Não consegui salvar (${detalheErro(e)}).`);
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <section className="admin-card">
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => { setAberto(true); setOk(false); }}>+ Adicionar agendamento</button>
          {ok && <span className="adm-ok">Agendamento adicionado!</span>}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Novo agendamento</h2>
      <p className="adm-muted">Registre uma cliente da sua agenda manual. Entra já confirmado e trava o horário.</p>
      <form className="adm-form" onSubmit={salvar}>
        <div className="adm-row2">
          <label className="adm-field">
            <span>Nome da cliente</span>
            <input className="adm-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="adm-field">
            <span>WhatsApp (opcional)</span>
            <input className="adm-input" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="com DDD" />
          </label>
        </div>

        <div className="adm-field">
          <span>Serviços</span>
          {servicos.length === 0 ? (
            <p className="adm-muted">Cadastre um serviço primeiro (na seção abaixo).</p>
          ) : (
            <div className="chips">
              {servicos.map((s) => (
                <button type="button" key={s.id} className={`chip${svcSel.includes(s.id) ? " active" : ""}`} onClick={() => toggleSvc(s.id)}>
                  {s.nome}<small>{brl(s.preco)}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="adm-row2">
          <label className="adm-field">
            <span>Data</span>
            <input className="adm-input" type="date" min={hojeKey} value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          <label className="adm-field">
            <span>Hora</span>
            <input className="adm-input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </label>
        </div>

        {escolhidos.length > 0 && <p className="adm-muted">Total: <b>{brl(total)}</b></p>}

        <div className="adm-actions">
          <button className="adm-btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar agendamento"}</button>
          <button type="button" className="adm-btn-ghost" onClick={() => { setAberto(false); limpar(); }}>Fechar</button>
          {erro && <span className="adm-erro">{erro}</span>}
        </div>
      </form>
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

// ---------------- Folgas (calendário) ----------------
const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Data local no formato "YYYY-MM-DD" (mesmo `key` que o site usa por dia).
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarioFolgas() {
  const [bloqueios, setBloqueios] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [mesRef, setMesRef] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });

  useEffect(() => ouvirAgenda((a) => setBloqueios(a.bloqueios ?? [])), []);

  const hojeKey = ymd(new Date());
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const inicioMesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const podeVoltar = mesRef > inicioMesAtual;

  async function toggleDia(key: string) {
    setErro("");
    const marcado = bloqueios.includes(key);
    // Mantém só folgas de hoje em diante (limpa as que já passaram).
    const novo = (marcado ? bloqueios.filter((x) => x !== key) : [...bloqueios, key])
      .filter((k) => k >= hojeKey)
      .sort();
    setBloqueios(novo); // otimista
    try {
      await salvarBloqueios(novo);
    } catch (e) {
      setErro(`Não consegui salvar (${detalheErro(e)}).`);
    }
  }

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);

  return (
    <section className="admin-card">
      <h2 className="adm-section">Folgas</h2>
      <p className="adm-muted">Toque num dia para marcar ou tirar uma folga. Nos dias de folga, o site não mostra horários.</p>

      <div className="cal-head">
        <button className="cal-nav" onClick={() => setMesRef(new Date(ano, mes - 1, 1))} disabled={!podeVoltar} aria-label="Mês anterior">‹</button>
        <div className="cal-titulo">{MESES_NOME[mes]} {ano}</div>
        <button className="cal-nav" onClick={() => setMesRef(new Date(ano, mes + 1, 1))} aria-label="Próximo mês">›</button>
      </div>

      <div className="cal-grid cal-dow">
        {DOW.map((d) => <div key={d} className="cal-dow-cell">{d}</div>)}
      </div>
      <div className="cal-grid">
        {celulas.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = ymd(new Date(ano, mes, d));
          const passado = key < hojeKey;
          const cls = ["cal-dia"];
          if (passado) cls.push("cal-passado");
          if (key === hojeKey) cls.push("cal-hoje");
          if (bloqueios.includes(key)) cls.push("cal-folga");
          return (
            <button key={key} type="button" className={cls.join(" ")} disabled={passado} onClick={() => toggleDia(key)}>
              {d}
            </button>
          );
        })}
      </div>

      <div className="cal-legenda">
        <span><i className="cal-leg cal-leg-hoje" />hoje</span>
        <span><i className="cal-leg cal-leg-folga" />folga (sem atendimento)</span>
      </div>
      {erro && <p className="adm-erro">{erro}</p>}
    </section>
  );
}
