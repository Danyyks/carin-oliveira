"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { studio } from "@/config/studio";

/**
 * Mostra o link público do site ("link na bio") pronto pra colar na bio do Instagram ou
 * de outras redes sociais, com um botão de copiar — a dona não precisa digitar nem
 * lembrar o endereço de cor.
 */
export default function MeuLink() {
  const [copiado, setCopiado] = useState(false);
  const url = studio.siteUrl;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Alguns navegadores exigem HTTPS/permissão pra Clipboard API; sem ela, a dona
      // ainda consegue selecionar o texto na tela e copiar manualmente.
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <section className="admin-card">
      <h2 className="adm-section">Meu link</h2>
      <p className="adm-muted">Esse é o link do seu site — cole na bio do Instagram ou de outras redes sociais.</p>
      <div className="pn-meulink">
        <span className="pn-meulink-url">{url}</span>
        <button type="button" className={`adm-btn pn-meulink-btn${copiado ? " copiado" : ""}`} onClick={copiar}>
          {copiado ? (
            <>
              <Check size={16} aria-hidden="true" /> Copiado!
            </>
          ) : (
            <>
              <Copy size={16} aria-hidden="true" /> Copiar
            </>
          )}
        </button>
      </div>
    </section>
  );
}
