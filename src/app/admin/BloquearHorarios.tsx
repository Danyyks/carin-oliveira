"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import FolhaBloquear from "./FolhaBloquear";
import { useDesfazer } from "./compartilhado/useDesfazer";

/** Botão "Bloquear horários" + a folha e o aviso com Desfazer. Fica ao lado de "+ Adicionar agendamento". */
export default function BloquearHorarios() {
  const [aberta, setAberta] = useState(false);
  const { avisar, aviso } = useDesfazer();

  return (
    <>
      <button type="button" className="adm-btn-ghost pn-btn-bloquear" onClick={() => setAberta(true)}>
        <Lock size={16} aria-hidden="true" />
        Bloquear horários
      </button>
      {aberta && <FolhaBloquear onFechar={() => setAberta(false)} onSalvo={avisar} />}
      {aviso}
    </>
  );
}
