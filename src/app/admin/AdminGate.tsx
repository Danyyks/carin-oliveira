"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export type DashboardProps = { email: string; logout: () => Promise<void> };

/**
 * Porteiro do painel: contexto seguro → carregando → login → o painel escolhido
 * (`render`). Compartilhado pelo painel clássico (`/admin`, `/admin/classico`) e pelo
 * painel novo (`/admin/nova`) — a autenticação é a mesma, só o que vem depois muda.
 */
export default function AdminGate({ render }: { render: (props: DashboardProps) => ReactNode }) {
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
  return <>{render({ email: user.email ?? "", logout })}</>;
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
