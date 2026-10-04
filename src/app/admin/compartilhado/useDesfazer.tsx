"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const DURACAO_MS = 6000;

type Aviso = { id: number; texto: string; desfazer?: () => Promise<unknown> | void };

/**
 * Aviso curto na parte de baixo da tela, com "Desfazer" para o que dá para reverter.
 * Um aviso por vez (um novo troca o anterior). Some sozinho em 6 s; enquanto a dona
 * está com o dedo em cima, a contagem para.
 *
 *   const { avisar, aviso } = useDesfazer();
 *   avisar("2 horários bloqueados.", () => liberar());   // …e renderize {aviso} uma vez
 */
export function useDesfazer() {
  const [atual, setAtual] = useState<Aviso | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const contador = useRef(0);

  const parar = useCallback(() => clearTimeout(timer.current), []);
  const contar = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAtual(null), DURACAO_MS);
  }, []);
  useEffect(() => parar, [parar]);

  const avisar = useCallback(
    (texto: string, desfazer?: Aviso["desfazer"]) => {
      setAtual({ id: ++contador.current, texto, desfazer });
      contar();
    },
    [contar],
  );

  async function desfazerAgora() {
    const aviso = atual;
    if (!aviso?.desfazer || desfazendo) return;
    parar();
    setDesfazendo(true);
    try {
      await aviso.desfazer();
      avisar("Desfeito.");
    } catch {
      avisar("Não consegui desfazer. Confira a conexão e tente de novo.");
    } finally {
      setDesfazendo(false);
    }
  }

  // A região `status` fica sempre na tela, vazia: o leitor de tela anuncia o que entra nela.
  const aviso: ReactNode = (
    <div className="pn-avisos" role="status" aria-live="polite">
      {atual && (
        <div
          key={atual.id}
          className="pn-aviso"
          onPointerDown={parar}
          onPointerUp={contar}
          onPointerCancel={contar}
        >
          <span>{atual.texto}</span>
          {atual.desfazer && (
            <button type="button" className="pn-aviso-acao" onClick={desfazerAgora} disabled={desfazendo}>
              Desfazer
            </button>
          )}
        </div>
      )}
    </div>
  );

  return { avisar, aviso };
}
