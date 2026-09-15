import { CalendarDays, Sparkles, MapPin } from "lucide-react";
import type { StudioConfig, Servico } from "@/config/studio";
import { brl, wppUrl } from "@/lib/utils";
import { WhatsappIcon, InstagramIcon } from "./icons";

export default function BentoGrid({
  studio,
  servicos,
  onBook,
}: {
  studio: StudioConfig;
  servicos: Servico[];
  onBook: (servicoIndex?: number) => void;
}) {
  const primeiroNome = studio.nome.split(" ")[0];
  const wpp = wppUrl(
    studio.whatsapp,
    `Olá, ${primeiroNome}! Vim pela sua bio. Gostaria de agendar um horário.`,
  );
  const insta = `https://instagram.com/${studio.instagram}`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.enderecoTexto)}`;
  const mapaEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(studio.enderecoTexto)}&z=16&output=embed`;

  // Tabela única: destacados primeiro, depois em ordem alfabética.
  // Preserva o índice original de cada serviço (usado no agendamento).
  const itens = servicos
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const da = a.s.destaque ? 0 : 1;
      const db = b.s.destaque ? 0 : 1;
      if (da !== db) return da - db;
      return a.s.nome.localeCompare(b.s.nome, "pt-BR");
    });

  return (
    <div className="bento">
      <button className="tile t-book wide" onClick={() => onBook()} aria-label="Agendar horário">
        <div className="tico">
          <CalendarDays size={22} strokeWidth={2} />
        </div>
        <div className="txt">
          <div className="ttitle">Agendar horário</div>
          <div className="tsub">Serviço, dia e horário em segundos</div>
        </div>
        <span className="arrow" aria-hidden="true">→</span>
      </button>

      <a className="tile compact t-wpp" href={wpp} target="_blank" rel="noopener">
        <div className="tico">
          <WhatsappIcon />
        </div>
        <span className="ttitle">WhatsApp</span>
      </a>
      <a className="tile compact t-insta" href={insta} target="_blank" rel="noopener">
        <div className="tico">
          <InstagramIcon />
        </div>
        <span className="ttitle">Instagram</span>
      </a>

      {servicos.length > 0 && (
        <div className="tile t-serv wide">
          <div className="head">
            <div className="tico ic-rose">
              <Sparkles size={19} strokeWidth={2} />
            </div>
            <b>Serviços &amp; valores</b>
          </div>
          <div className="svc-list">
            {itens.map(({ s, i }) => (
              <div className="svc-row" key={i}>
                <div className="info">
                  <b>
                    {s.nome}
                    {s.destaque && <span className="svc-selo">Mais pedido</span>}
                  </b>
                  <span>{s.desc}</span>
                </div>
                <div className="right">
                  <span className="price">{brl(s.preco)}</span>
                  <button className="mini" onClick={() => onBook(i)}>
                    Agendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {studio.loja ? (
        <a
          className="tile t-loja wide"
          href={studio.loja.url}
          target="_blank"
          rel="noopener"
          aria-label={`${studio.loja.titulo} — ${studio.loja.sub}. Abre em nova aba.`}
          style={studio.loja.fundo ? { backgroundImage: `url(${studio.loja.fundo})` } : undefined}
        >
          <div className="loja-scrim" aria-hidden="true" />
          <div className="loja-info">
            <div className="loja-textos">
              <div className="ttitle">{studio.loja.titulo}</div>
              <div className="tsub">{studio.loja.sub}</div>
            </div>
            <span className="arrow" aria-hidden="true">→</span>
          </div>
        </a>
      ) : null}

      <div className="tile t-mapa wide">
        <iframe
          className="mapa-frame"
          src={mapaEmbed}
          title={`Mapa — ${studio.enderecoTexto}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a className="mapa-bar" href={maps} target="_blank" rel="noopener">
          <div className="tico ic-rose">
            <MapPin size={18} strokeWidth={2} />
          </div>
          <div className="mapa-txt">
            <b>{studio.bairro}</b>
            <span>{studio.enderecoTexto}</span>
          </div>
          <span className="mapa-cta">
            Como chegar <span className="arrow" aria-hidden="true">→</span>
          </span>
        </a>
      </div>
    </div>
  );
}
