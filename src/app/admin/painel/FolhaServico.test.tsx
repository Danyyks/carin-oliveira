// @vitest-environment jsdom
// Folha de criar/editar serviço (Fase C): formulário, exclusão via Dialogo próprio
// (não o confirm() nativo) e mensagens de erro em português claro.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ServicoDoc } from "@/lib/db";
import FolhaServico from "./FolhaServico";

const banco = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  addServico: banco.add,
  updateServico: banco.update,
  removeServico: banco.remove,
}));

const svc: ServicoDoc = {
  id: "s1",
  nome: "Esmaltação em gel",
  desc: "Brilho e durabilidade",
  preco: 85,
  destaque: false,
  duracaoMin: 45,
};

beforeEach(() => {
  banco.add.mockReset().mockResolvedValue(undefined);
  banco.update.mockReset().mockResolvedValue(undefined);
  banco.remove.mockReset().mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe("FolhaServico — criar", () => {
  it("título 'Novo serviço' e sem botão de excluir", () => {
    render(<FolhaServico servico={null} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Novo serviço" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Excluir/ })).toBeNull();
  });

  it("salva com os dados preenchidos e chama onSalvo", async () => {
    const onSalvo = vi.fn();
    render(<FolhaServico servico={null} onFechar={vi.fn()} onSalvo={onSalvo} />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Spa dos pés" } });
    fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(banco.add).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Spa dos pés", preco: 65 }),
      ),
    );
    expect(onSalvo).toHaveBeenCalledOnce();
  });

  it("duração inválida mostra erro e não salva", () => {
    render(<FolhaServico servico={null} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "10" } });
    const duracao = screen.getByLabelText(/Duração/);
    fireEvent.change(duracao, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(banco.add).not.toHaveBeenCalled();
  });

  it("erro ao salvar mostra mensagem humana, sem código técnico", async () => {
    banco.add.mockRejectedValue({ code: "permission-denied" });
    render(<FolhaServico servico={null} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText(/Sem permissão/)).toBeTruthy();
  });
});

describe("FolhaServico — editar", () => {
  it("pré-carrega os campos do serviço", () => {
    render(<FolhaServico servico={svc} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Editar serviço" })).toBeTruthy();
    expect(screen.getByLabelText("Nome")).toHaveProperty("value", "Esmaltação em gel");
    expect(screen.getByLabelText(/Duração/)).toHaveProperty("value", "45");
  });

  it("salvar chama updateServico com o id certo", async () => {
    render(<FolhaServico servico={svc} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(banco.update).toHaveBeenCalledWith("s1", expect.objectContaining({ nome: svc.nome })));
  });

  it("Excluir abre um diálogo próprio (não o confirm nativo) antes de apagar", () => {
    const confirmNativo = vi.spyOn(window, "confirm");
    render(<FolhaServico servico={svc} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir serviço" }));
    expect(confirmNativo).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Excluir serviço" })).toBeTruthy();
    expect(banco.remove).not.toHaveBeenCalled();
  });

  it("cancelar no diálogo não exclui", () => {
    render(<FolhaServico servico={svc} onFechar={vi.fn()} onSalvo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir serviço" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(banco.remove).not.toHaveBeenCalled();
  });

  it("confirmar no diálogo exclui e chama onSalvo", async () => {
    const onSalvo = vi.fn();
    render(<FolhaServico servico={svc} onFechar={vi.fn()} onSalvo={onSalvo} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir serviço" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(banco.remove).toHaveBeenCalledWith("s1"));
    expect(onSalvo).toHaveBeenCalledOnce();
  });
});
