import { useEffect, useState } from "react";
import { hojeKey } from "@/lib/utils";

/**
 * "Hoje" que se atualiza sozinho: quando o app volta ao primeiro plano (o iPhone pausa o
 * PWA em segundo plano), quando a tela ganha foco e a cada minuto (virada do dia com o app
 * aberto). Sem isso o "hoje" só seria recalculado quando algo redesenhasse a tela, e os
 * agendamentos de ontem continuariam à mostra se o app ficasse aberto de um dia pro outro.
 * Se o valor não mudou, o React não redesenha nada.
 */
export function useHoje() {
  const [hoje, setHoje] = useState(hojeKey);
  useEffect(() => {
    const atualizar = () => setHoje(hojeKey());
    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("focus", atualizar);
    window.addEventListener("pageshow", atualizar);
    const timer = setInterval(atualizar, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("focus", atualizar);
      window.removeEventListener("pageshow", atualizar);
      clearInterval(timer);
    };
  }, []);
  return hoje;
}
