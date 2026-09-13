import { CalendarDays, Sparkles, MapPin, Clock } from "lucide-react";
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

  // Agrupa os serviços por tipo, preservando o índice original (usado no agendamento).
  const SECOES = [
    { tipo: "servico", label: "Serviços" },
    { tipo: "combo", label: "Combos" },
    { tipo: "promocao", label: "Promoções" },
  ] as const;
  const grupos = SECOES.map((sec) => ({
    ...sec,
    itens: servicos.map((s, i) => ({ s, i })).filter(({ s }) => (s.tipo ?? "servico") === sec.tipo),
  })).filter((g) => g.itens.length > 0);
  const mostrarLabels = grupos.length > 1;

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
        <span className="arrow">→</span>
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

      <div className="tile t-serv wide">
        <div className="head">
          <div className="tico ic-rose">
            <Sparkles size={19} strokeWidth={2} />
          </div>
          <b>Serviços &amp; valores</b>
        </div>
        <div className="svc-list">
          {grupos.map((g) => (
            <div className="svc-grupo" key={g.tipo}>
              {mostrarLabels && <div className="svc-grupo-label">{g.label}</div>}
              {g.itens.map(({ s, i }) => (
                <div className="svc-row" key={i}>
                  <div className="info">
                    <b>{s.nome}</b>
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
          ))}
        </div>
      </div>

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
            <span className="arrow">→</span>
          </div>
        </a>
      ) : null}

      <a className="tile compact" href={maps} target="_blank" rel="noopener">
        <div className="tico ic-rose">
          <MapPin size={19} strokeWidth={2} />
        </div>
        <span className="ttitle">{studio.bairro}</span>
        <span className="arrow">→</span>
      </a>
      <div className="tile compact" style={{ cursor: "default" }}>
        <div className="tico ic-rose">
          <Clock size={19} strokeWidth={2} />
        </div>
        <span className="ttitle" style={{ fontSize: ".86rem" }}>
          {studio.horario}
        </span>
      </div>
    </div>
  );
}
