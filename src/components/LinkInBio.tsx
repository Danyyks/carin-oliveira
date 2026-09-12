"use client";

import { useState } from "react";
import type { StudioConfig } from "@/config/studio";
import Profile from "./Profile";
import BentoGrid from "./BentoGrid";
import BookingSheet from "./BookingSheet";

// Orquestrador do link na bio: monta a página a partir do config
// e controla a abertura do sheet de agendamento.
export default function LinkInBio({ studio }: { studio: StudioConfig }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number | null>(null);

  function book(servicoIndex?: number) {
    setPreset(servicoIndex ?? null);
    setOpen(true);
  }

  return (
    <div className="app">
      <Profile studio={studio} />
      <BentoGrid studio={studio} onBook={book} />
      <BookingSheet studio={studio} open={open} preset={preset} onClose={() => setOpen(false)} />
    </div>
  );
}
