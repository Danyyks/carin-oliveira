import { useEffect, useState } from "react";

/** Fica de olho na conexão do aparelho, pro painel avisar quando ficar offline. */
export function useOffline() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);
  return offline;
}
