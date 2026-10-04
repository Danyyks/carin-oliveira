"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Diálogo de confirmação próprio (Fase C) — substitui o `confirm()` nativo do navegador,
 * que no iPhone sai feio e sem tema. Mesma trava de rolagem e fechamento por Esc/toque no
 * fundo da `Folha`, mas menor e sem arrastar (é uma decisão pontual, não uma tela).
 */
export default function Dialogo({
  titulo,
  texto,
  textoConfirmar = "Confirmar",
  perigo = false,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  texto: string;
  textoConfirmar?: string;
  perigo?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const idTitulo = useId();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const cancelar = useRef(onCancelar);
  useEffect(() => {
    cancelar.current = onCancelar;
  });

  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    tituloRef.current?.focus({ preventScroll: true });
    return () => origem?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelar.current();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  return (
    <>
      <div className="pn-fundo" onClick={onCancelar} aria-hidden="true" />
      <div className="pn-dialogo" role="alertdialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo} ref={tituloRef} tabIndex={-1} className="pn-dialogo-titulo">
          {titulo}
        </h2>
        <p className="pn-dialogo-texto">{texto}</p>
        <div className="pn-dialogo-acoes">
          {/* "Voltar", nunca "Cancelar": a ação perigosa costuma ser justamente cancelar um horário. */}
          <button type="button" className="adm-btn-ghost" onClick={onCancelar}>
            Voltar
          </button>
          <button
            type="button"
            className={perigo ? "adm-btn adm-btn-danger" : "adm-btn"}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </>
  );
}
