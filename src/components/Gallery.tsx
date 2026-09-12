import type { GaleriaItem } from "@/config/studio";

// Vitrine com as fotos passando (loop contínuo). Placeholders em degradê
// entram no lugar das fotos reais quando a Carin enviar.
export default function Gallery({ itens }: { itens: GaleriaItem[] }) {
  const loop = [...itens, ...itens]; // duplicado para o loop ficar contínuo
  return (
    <div className="tile t-gal wide">
      <div className="gal-head">
        <b>Galeria de trabalhos</b>
        <span>✨ atualizada sempre</span>
      </div>
      <div className="gal-viewport">
        <div className="gal-track">
          {loop.map((g, i) => (
            <div key={i} className={`g ${g.cls}`}>
              <span className="cap">{g.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
