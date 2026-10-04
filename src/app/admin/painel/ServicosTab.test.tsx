// @vitest-environment jsdom
// Aba Serviços (Fase C): lista lendo do DadosProvider, ordenada com destaque no topo,
// e abertura da folha de criar/editar.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ServicoDoc } from "@/lib/db";
import ServicosTab from "./ServicosTab";

const banco = vi.hoisted(() => ({
  servicos: [] as ServicoDoc[],
  erros: { servicos: false, agenda: false, slots: false, agendamentos: false },
}));
vi.mock("./DadosProvider", () => ({ useDados: () => banco }));
vi.mock("./FolhaServico", () => ({
  default: ({ servico, onFechar }: { servico: ServicoDoc | null; onFechar: () => void }) => (
    <div data-testid="folha-servico" data-servico-id={servico?.id ?? "novo"}>
      <button onClick={onFechar}>fechar folha</button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  banco.servicos = [];
  banco.erros = { servicos: false, agenda: false, slots: false, agendamentos: false };
});

const svc = (over: Partial<ServicoDoc>): ServicoDoc => ({
  id: "s1",
  nome: "Esmaltação em gel",
  desc: "Brilho e durabilidade",
  preco: 85,
  destaque: false,
  ...over,
});

describe("ServicosTab", () => {
  it("mostra o estado vazio quando não há serviços", () => {
    render(<ServicosTab />);
    expect(screen.getByText(/Nenhum serviço ainda/)).toBeTruthy();
  });

  it("lista os serviços com preço e duração", () => {
    banco.servicos = [svc({ id: "s1", nome: "Esmaltação em gel", preco: 85, duracaoMin: 45 })];
    render(<ServicosTab />);
    expect(screen.getByText("Esmaltação em gel")).toBeTruthy();
    expect(screen.getByText(/R\$\s*85.*45min/)).toBeTruthy();
  });

  it("coloca o serviço em destaque no topo, com o selo", () => {
    banco.servicos = [
      svc({ id: "s1", nome: "Spa dos pés", destaque: false }),
      svc({ id: "s2", nome: "Alongamento em fibra", destaque: true }),
    ];
    render(<ServicosTab />);
    const nomes = screen.getAllByRole("button", { name: /Spa dos pés|Alongamento em fibra/ }).map((b) => b.textContent);
    expect(nomes[0]).toContain("Alongamento em fibra");
    expect(nomes[0]).toContain("Mais pedido");
  });

  it("toca em Novo abre a folha sem serviço (criação)", () => {
    render(<ServicosTab />);
    fireEvent.click(screen.getByRole("button", { name: /Novo/ }));
    expect(screen.getByTestId("folha-servico").getAttribute("data-servico-id")).toBe("novo");
  });

  it("toca num serviço abre a folha de edição dele", () => {
    banco.servicos = [svc({ id: "s7", nome: "Spa dos pés" })];
    render(<ServicosTab />);
    fireEvent.click(screen.getByRole("button", { name: /Spa dos pés/ }));
    expect(screen.getByTestId("folha-servico").getAttribute("data-servico-id")).toBe("s7");
  });

  it("fechar a folha volta pra lista", () => {
    render(<ServicosTab />);
    fireEvent.click(screen.getByRole("button", { name: /Novo/ }));
    fireEvent.click(screen.getByRole("button", { name: "fechar folha" }));
    expect(screen.queryByTestId("folha-servico")).toBeNull();
  });

  it("mostra aviso quando a leitura de serviços falha", () => {
    banco.erros = { ...banco.erros, servicos: true };
    render(<ServicosTab />);
    expect(screen.getByText(/Não consegui carregar os serviços/)).toBeTruthy();
  });
});
