// @vitest-environment jsdom
// Caracterização do porteiro do painel: contexto inseguro, carregando, login e o
// painel escolhido (`render`) — extraído de page.tsx na Fase B0, sem mudar comportamento.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminGate from "./AdminGate";

const auth = vi.hoisted(() => ({
  user: null as { email: string | null } | null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => auth,
}));

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  auth.login.mockReset().mockResolvedValue(undefined);
  auth.logout.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
});
afterEach(() => cleanup());

describe("Contexto inseguro", () => {
  it("http de rede (fora de localhost): mostra a orientação, sem tentar logar", () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    render(<AdminGate render={() => <div>painel</div>} />);
    expect(screen.getByText("Abra em modo seguro")).toBeTruthy();
  });
});

describe("Carregando", () => {
  it("mostra o carregando enquanto o Firebase Auth resolve", () => {
    auth.loading = true;
    render(<AdminGate render={() => <div>painel</div>} />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });
});

describe("Login", () => {
  it("sem usuário, mostra o formulário de login", () => {
    render(<AdminGate render={() => <div>painel</div>} />);
    expect(screen.getByRole("heading", { name: "Painel" })).toBeTruthy();
  });

  it("envia e-mail e senha para login()", async () => {
    render(<AdminGate render={() => <div>painel</div>} />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "carin@example.com " } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("carin@example.com", "segredo123"));
  });

  it("login inválido mostra a mensagem de erro", async () => {
    auth.login.mockRejectedValue(new Error("wrong-password"));
    render(<AdminGate render={() => <div>painel</div>} />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "carin@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeTruthy();
  });
});

describe("Logada", () => {
  it("chama render() com o e-mail e o logout", () => {
    auth.user = { email: "carin@example.com" };
    render(<AdminGate render={(props) => <div>olá {props.email}</div>} />);
    expect(screen.getByText("olá carin@example.com")).toBeTruthy();
  });

  it("usuário sem e-mail (nunca deveria acontecer aqui) devolve string vazia", () => {
    auth.user = { email: null };
    render(<AdminGate render={(props) => <div>email:[{props.email}]</div>} />);
    expect(screen.getByText("email:[]")).toBeTruthy();
  });
});
