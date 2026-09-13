"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import type { StudioConfig, Servico } from "@/config/studio";
import { ouvirServicos } from "@/lib/db";
import Profile from "./Profile";
import BentoGrid from "./BentoGrid";
import BookingSheet from "./BookingSheet";

// Orquestrador do link na bio: monta a página a partir do config,
// lê os serviços reais do Firestore (com a lista do config como reserva)
// e controla a abertura do sheet de agendamento.
export default function LinkInBio({ studio }: { studio: StudioConfig }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);
  const [servicos, setServicos] = useState<Servico[]>(studio.servicos);

  useEffect(
    () =>
      ouvirServicos((list) => {
        if (list.length) {
          setServicos(
            list.map((s) => ({ nome: s.nome, desc: s.desc, preco: s.preco, tipo: s.tipo })),
          );
        }
      }),
    [],
  );

  function book(servicoIndex?: number) {
    setPreset(servicoIndex ?? null);
    setOpen(true);
  }

  return (
    <div className="app">
      <Profile studio={studio} />
      <BentoGrid studio={studio} servicos={servicos} onBook={book} />
      <BookingSheet studio={studio} servicos={servicos} open={open} preset={preset} onClose={() => setOpen(false)} />

      {/* Acesso discreto ao painel (só durante o desenvolvimento; some no go-live). */}
      <footer className="app-foot">
        <a href="/admin" className="admin-gear" aria-label="Painel da administradora">
          <Settings size={17} strokeWidth={2} />
        </a>
      </footer>
    </div>
  );
}
