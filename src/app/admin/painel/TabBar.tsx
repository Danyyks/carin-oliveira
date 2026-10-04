"use client";

import { Calendar, Bell, Clock, Sparkles, User } from "lucide-react";

export type Aba = "agenda" | "pedidos" | "horarios" | "servicos" | "conta";

const ABAS: { id: Aba; rotulo: string; Icone: typeof Calendar }[] = [
  { id: "agenda", rotulo: "Agenda", Icone: Calendar },
  { id: "pedidos", rotulo: "Pedidos", Icone: Bell },
  { id: "horarios", rotulo: "Horários", Icone: Clock },
  { id: "servicos", rotulo: "Serviços", Icone: Sparkles },
  { id: "conta", rotulo: "Conta", Icone: User },
];

/** Valida um texto solto (ex.: vindo de `?aba=` na URL) como uma aba de verdade, ou `null`. */
export function abaValida(valor: string | null | undefined): Aba | null {
  return ABAS.some((a) => a.id === valor) ? (valor as Aba) : null;
}

/** Barra de navegação inferior do painel novo — 5 abas fixas, com a bolinha de Pedidos. */
export default function TabBar({ aba, onMudar, pedidos }: { aba: Aba; onMudar: (a: Aba) => void; pedidos: number }) {
  return (
    <nav className="pn-tabbar" role="tablist" aria-label="Seções do painel">
      {ABAS.map(({ id, rotulo, Icone }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={aba === id}
          className={`pn-tab${aba === id ? " active" : ""}`}
          onClick={() => onMudar(id)}
        >
          <span className="pn-tab-icone">
            <Icone size={24} aria-hidden="true" />
            {id === "pedidos" && pedidos > 0 && (
              <span className="pn-tab-badge">{pedidos > 99 ? "99+" : pedidos}</span>
            )}
          </span>
          <span className="pn-tab-rotulo">{rotulo}</span>
        </button>
      ))}
    </nav>
  );
}
