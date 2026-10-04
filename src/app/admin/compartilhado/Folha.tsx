"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Folha (bottom sheet) do painel. Base de todas as telas que sobem de baixo.
 *
 * - Monte só quando estiver aberta (`{aberta && <Folha …/>}`): o que está dentro nasce e some com ela.
 * - Fecha pelo X (sempre visível), pelo toque no fundo e pela tecla Esc.
 * - Trava a rolagem da página por trás e devolve o foco ao botão que abriu.
 * - Acompanha o teclado do iPhone (`visualViewport`), para o botão do rodapé nunca ficar escondido.
 * - `rodape` fica fixo embaixo (botão principal); o corpo rola por dentro se for grande.
 */
export default function Folha({
  titulo,
  onFechar,
  rodape,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const idTitulo = useId();
  const folha = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  // Sempre o `onFechar` mais recente, sem refazer os efeitos a cada render do pai.
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });

  // Foco no título ao abrir (leitor de tela anuncia a folha) e de volta à origem ao fechar.
  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    tituloRef.current?.focus({ preventScroll: true });
    return () => origem?.focus?.({ preventScroll: true });
  }, []);

  // Trava a rolagem da página enquanto aberta.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  // Esc fecha.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar.current();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  // Teclado do iPhone: sobe a folha pela altura que o teclado ocupa (variável --kb no CSS).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const ajustar = () => {
      const teclado = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      folha.current?.style.setProperty("--kb", `${Math.round(teclado)}px`);
    };
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => {
      vv.removeEventListener("resize", ajustar);
      vv.removeEventListener("scroll", ajustar);
    };
  }, []);

  return (
    <>
      <div className="pn-fundo" onClick={onFechar} aria-hidden="true" />
      <div ref={folha} className="pn-folha" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <div className="pn-folha-topo">
          <span className="pn-tracinho" aria-hidden="true" />
          <h2 id={idTitulo} ref={tituloRef} tabIndex={-1} className="pn-folha-titulo">
            {titulo}
          </h2>
          <button type="button" className="pn-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="pn-folha-corpo">{children}</div>
        {rodape && <div className="pn-folha-rodape">{rodape}</div>}
      </div>
    </>
  );
}
