// @vitest-environment jsdom
// Fase B4: `/admin` escolhe o painel novo por padrão, e só abre o clássico quando o
// aparelho tem "classico" salvo em localStorage["painel-carin:versao"].
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AdminPage from "./page";

const auth = vi.hoisted(() => ({
  user: { email: "carin@example.com" } as { email: string | null } | null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));

vi.mock("./painel/PainelNovo", () => ({ default: () => <div>painel-novo</div> }));
vi.mock("./classico/DashboardClassico", () => ({ default: () => <div>painel-classico</div> }));

beforeEach(() => {
  auth.user = { email: "carin@example.com" };
  auth.loading = false;
  window.localStorage.clear();
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
});
afterEach(() => cleanup());

describe("/admin escolhe a versão do painel", () => {
  it("sem nada salvo no aparelho, abre o painel novo", () => {
    render(<AdminPage />);
    expect(screen.getByText("painel-novo")).toBeTruthy();
  });

  it('com "classico" salvo no aparelho, abre o painel clássico', () => {
    window.localStorage.setItem("painel-carin:versao", "classico");
    render(<AdminPage />);
    expect(screen.getByText("painel-classico")).toBeTruthy();
  });

  it("qualquer outro valor salvo, abre o painel novo", () => {
    window.localStorage.setItem("painel-carin:versao", "lixo");
    render(<AdminPage />);
    expect(screen.getByText("painel-novo")).toBeTruthy();
  });
});
