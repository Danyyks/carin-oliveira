"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

// Facilita a instalação do app no celular da dona.
// - Android/Chrome: botão "Instalar" (usa o evento beforeinstallprompt).
// - iPhone: instrução de "Adicionar à Tela de Início".
export default function InstallButton() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) {
      setInstalado(true);
      return;
    }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    const onInstalled = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalado) return null;

  if (evt) {
    return (
      <div className="adm-install-wrap">
        <button
          className="adm-install"
          onClick={async () => {
            await evt.prompt();
            setEvt(null);
          }}
        >
          Instalar app no celular
        </button>
      </div>
    );
  }

  if (ios) {
    return (
      <div className="adm-install-wrap">
        <p className="adm-install-hint">
          Para instalar no iPhone: toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.
        </p>
      </div>
    );
  }

  return null;
}
