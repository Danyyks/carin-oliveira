// @vitest-environment jsdom
// Caracterização do gerenciador de Tabela de preços: garante o comportamento atual
// (formulário, edição, exclusão, duração opcional) antes de qualquer mudança na Fase B.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ServicosManager from "./ServicosManager";

const banco = vi.hoisted(() => ({
  lista: [] as unknown[],
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  ouvirServicos: (cb: (lista: unknown[]) => void) => {
    cb(banco.lista);
    return () => {};
  },
  addServico: banco.add,
  updateServico: banco.update,
  removeServico: banco.remove,
}));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

beforeEach(() => {
  banco.lista = [];
  banco.add.mockReset().mockResolvedValue(undefined);
  banco.update.mockReset().mockResolvedValue(undefined);
  banco.remove.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function abrirSecao() {
  fireEvent.click(screen.getByRole("button", { name: /Tabela de preços/ }));
}

describe("Lista", () => {
  it("sem serviços, mostra o aviso de lista vazia", () => {
    render(<ServicosManager />);
    abrirSecao();
    expect(screen.getByText("Nenhum serviço ainda. Adicione o primeiro acima.")).toBeTruthy();
  });

  it("mostra preço, duração (quando tem) e o selo de destaque", () => {
    banco.lista = [
      { id: "1", nome: "Esmaltação", desc: "", preco: 45, destaque: false },
      { id: "2", nome: "Alongamento", desc: "", preco: 120, destaque: true, duracaoMin: 90 },
    ];
    render(<ServicosManager />);
    abrirSecao();
    expect(screen.getByText("R$ 45")).toBeTruthy();
    expect(screen.getByText("R$ 120 · 1h30")).toBeTruthy();
    expect(screen.getByText("Mais pedido")).toBeTruthy();
  });
});

describe("Adicionar serviço", () => {
  it("envia nome, descrição, preço e destaque; sem duração, o campo não é enviado", async () => {
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Spa dos pés" } });
    fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "65" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Relaxante" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar serviço" }));

    await waitFor(() => expect(banco.add).toHaveBeenCalledOnce());
    expect(banco.add).toHaveBeenCalledWith({ nome: "Spa dos pés", desc: "Relaxante", preco: 65, destaque: false, duracaoMin: undefined });
  });

  it("aceita vírgula decimal no preço", async () => {
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "65,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar serviço" }));
    await waitFor(() => expect(banco.add).toHaveBeenCalledWith(expect.objectContaining({ preco: 65.5 })));
  });

  it("duração zero mostra erro e não salva", async () => {
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "65" } });
    fireEvent.change(screen.getByLabelText(/Duração/), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar serviço" }));
    expect(await screen.findByText("Duração inválida (em minutos).")).toBeTruthy();
    expect(banco.add).not.toHaveBeenCalled();
  });

  it("mostra a prévia da duração formatada ao digitar", () => {
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.change(screen.getByLabelText(/Duração/), { target: { value: "90" } });
    expect(screen.getByText(/Duração \(minutos, opcional\) · 1h30/)).toBeTruthy();
  });
});

describe("Editar serviço", () => {
  it("preenche o formulário e chama updateServico ao salvar", async () => {
    banco.lista = [{ id: "1", nome: "Esmaltação", desc: "Gel", preco: 45, destaque: false, duracaoMin: 45 }];
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Esmaltação");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Esmaltação em gel" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(banco.update).toHaveBeenCalledWith("1", expect.objectContaining({ nome: "Esmaltação em gel" })));
  });

  it("Cancelar volta ao formulário vazio", () => {
    banco.lista = [{ id: "1", nome: "Esmaltação", desc: "", preco: 45, destaque: false }];
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("");
  });
});

describe("Excluir serviço", () => {
  it("pede confirmação e só apaga se aceitar", async () => {
    banco.lista = [{ id: "1", nome: "Esmaltação", desc: "", preco: 45, destaque: false }];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(banco.remove).toHaveBeenCalledWith("1"));
  });

  it("desistindo da confirmação, não apaga", () => {
    banco.lista = [{ id: "1", nome: "Esmaltação", desc: "", preco: 45, destaque: false }];
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ServicosManager />);
    abrirSecao();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(banco.remove).not.toHaveBeenCalled();
  });
});
