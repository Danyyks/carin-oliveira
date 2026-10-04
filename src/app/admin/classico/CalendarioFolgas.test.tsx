// @vitest-environment jsdom
// Caracterização do calendário de Folgas (marcar/tirar folga, navegação de mês) — trava
// o comportamento atual antes da Fase B mexer no painel.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CalendarioFolgas from "./CalendarioFolgas";

const banco = vi.hoisted(() => ({
  bloqueios: [] as string[],
  salvar: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  ouvirAgenda: (cb: (a: unknown) => void) => {
    cb({ dias: {}, bloqueios: banco.bloqueios });
    return () => {};
  },
  salvarBloqueios: banco.salvar,
}));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

function hojeKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

beforeEach(() => {
  banco.bloqueios = [];
  banco.salvar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function abrirSecao() {
  fireEvent.click(screen.getByRole("button", { name: /Folgas/ }));
}

describe("Resumo (fechado)", () => {
  it("sem folgas futuras, mostra 'nenhuma'", () => {
    render(<CalendarioFolgas />);
    expect(screen.getByRole("button", { name: /Folgas/ }).textContent).toContain("nenhuma");
  });

  it("conta só as folgas de hoje em diante", () => {
    banco.bloqueios = ["2020-01-01", hojeKey()];
    render(<CalendarioFolgas />);
    expect(screen.getByRole("button", { name: /Folgas/ }).textContent).toContain("1 folga");
  });
});

describe("Marcar/tirar folga", () => {
  it("tocar num dia sem folga marca (otimista) e chama salvarBloqueios", () => {
    render(<CalendarioFolgas />);
    abrirSecao();
    const hoje = hojeKey();
    const dia = Number(hoje.split("-")[2]);
    fireEvent.click(screen.getByRole("button", { name: String(dia) }));
    expect(banco.salvar).toHaveBeenCalledWith([hoje]);
  });

  it("dias passados ficam desabilitados (não dá pra marcar folga retroativa)", () => {
    render(<CalendarioFolgas />);
    abrirSecao();
    const hoje = hojeKey();
    const diaHoje = Number(hoje.split("-")[2]);
    if (diaHoje > 1) {
      const botaoOntem = screen.getByRole("button", { name: String(diaHoje - 1) });
      expect((botaoOntem as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe("Navegação de mês", () => {
  it("não deixa voltar antes do mês atual", () => {
    render(<CalendarioFolgas />);
    abrirSecao();
    const voltar = screen.getByRole("button", { name: "Mês anterior" });
    expect((voltar as HTMLButtonElement).disabled).toBe(true);
  });

  it("avançar um mês habilita o botão de voltar", () => {
    render(<CalendarioFolgas />);
    abrirSecao();
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    const voltar = screen.getByRole("button", { name: "Mês anterior" });
    expect((voltar as HTMLButtonElement).disabled).toBe(false);
  });
});
