// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import DadosProvider, { useDados } from "./DadosProvider";
import { hojeKeySalao, somarDias } from "@/lib/datas";

const banco = vi.hoisted(() => ({
  servicosCb: null as null | ((v: unknown[]) => void),
  servicosErro: null as null | ((e: unknown) => void),
  agendaCb: null as null | ((v: unknown) => void),
  agendaErro: null as null | ((e: unknown) => void),
  slotsCb: null as null | ((v: unknown[]) => void),
  slotsErro: null as null | ((e: unknown) => void),
  agendamentosCb: null as null | ((v: unknown[]) => void),
  agendamentosErro: null as null | ((e: unknown) => void),
  janelaSlots: null as null | { desde?: string; ate?: string },
}));

vi.mock("@/lib/db", () => ({
  ouvirServicos: (cb: (v: unknown[]) => void, onErro?: (e: unknown) => void) => {
    banco.servicosCb = cb;
    banco.servicosErro = onErro ?? null;
    return () => {};
  },
  ouvirAgenda: (cb: (v: unknown) => void, onErro?: (e: unknown) => void) => {
    banco.agendaCb = cb;
    banco.agendaErro = onErro ?? null;
    return () => {};
  },
  ouvirSlots: (cb: (v: unknown[]) => void, janela: unknown, onErro?: (e: unknown) => void) => {
    banco.slotsCb = cb;
    banco.slotsErro = onErro ?? null;
    banco.janelaSlots = janela as { desde?: string; ate?: string };
    return () => {};
  },
  ouvirAgendamentos: (cb: (v: unknown[]) => void, onErro?: (e: unknown) => void) => {
    banco.agendamentosCb = cb;
    banco.agendamentosErro = onErro ?? null;
    return () => {};
  },
}));

function Sonda() {
  const d = useDados();
  return (
    <div>
      <span data-testid="carregando">{String(d.carregando)}</span>
      <span data-testid="n-servicos">{d.servicos.length}</span>
      <span data-testid="n-slots">{d.slots.length}</span>
      <span data-testid="erro-slots">{String(d.erros.slots)}</span>
    </div>
  );
}

beforeEach(() => {
  banco.servicosCb = null;
  banco.agendaCb = null;
  banco.slotsCb = null;
  banco.agendamentosCb = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDados fora do provider", () => {
  it("lança um erro claro", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Sonda />)).toThrow("useDados precisa estar dentro de <DadosProvider>");
    errSpy.mockRestore();
  });
});

describe("esqueleto de carregamento", () => {
  it("não mostra carregando antes de 250ms, mesmo sem dados ainda", () => {
    vi.useFakeTimers();
    render(
      <DadosProvider>
        <Sonda />
      </DadosProvider>,
    );
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByTestId("carregando").textContent).toBe("false");
  });

  it("depois de 250ms sem os dados terem chegado, mostra carregando", () => {
    vi.useFakeTimers();
    render(
      <DadosProvider>
        <Sonda />
      </DadosProvider>,
    );
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("carregando").textContent).toBe("true");
  });

  it("assim que os dados chegam, carregando vira false mesmo depois de 250ms", () => {
    vi.useFakeTimers();
    render(
      <DadosProvider>
        <Sonda />
      </DadosProvider>,
    );
    act(() => {
      banco.servicosCb?.([]);
      banco.agendaCb?.({ dias: {} });
      banco.slotsCb?.([]);
      banco.agendamentosCb?.([]);
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("carregando").textContent).toBe("false");
  });
});

describe("agregação dos dados", () => {
  it("repassa o que cada fonte publica", () => {
    render(
      <DadosProvider>
        <Sonda />
      </DadosProvider>,
    );
    act(() => {
      banco.servicosCb?.([{ id: "1" }, { id: "2" }]);
      banco.slotsCb?.([{ id: "a" }]);
    });
    expect(screen.getByTestId("n-servicos").textContent).toBe("2");
    expect(screen.getByTestId("n-slots").textContent).toBe("1");
  });

  it("lê slots de 7 dias atrás até além dos 3 meses que o site pode abrir (fuso do salão)", () => {
    render(
      <DadosProvider>
        <Sonda />
      </DadosProvider>,
    );
    expect(banco.janelaSlots).toBeTruthy();
    const hoje = hojeKeySalao();
    expect(banco.janelaSlots!.desde).toBe(somarDias(hoje, -7));
    // A maior antecedência do site é 90 dias: a Agenda tem que enxergar pelo menos isso.
    expect(banco.janelaSlots!.ate! >= somarDias(hoje, 90)).toBe(true);
  });
});

describe("erro por fonte", () => {
  it("erro nos slots marca só `erros.slots`, sem derrubar as outras fontes", () => {
    render(
      <DadosProvider>
        <Sonda />
      </DadosProvider>,
    );
    act(() => {
      banco.servicosCb?.([{ id: "1" }]);
      banco.slotsErro?.(new Error("permission-denied"));
    });
    expect(screen.getByTestId("erro-slots").textContent).toBe("true");
    expect(screen.getByTestId("n-servicos").textContent).toBe("1"); // não foi afetado
  });
});
