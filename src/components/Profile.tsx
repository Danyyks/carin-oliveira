import { MapPin } from "lucide-react";
import type { StudioConfig } from "@/config/studio";
import Avatar from "./Avatar";

export default function Profile({ studio }: { studio: StudioConfig }) {
  return (
    <div className="profile">
      <Avatar nome={studio.nome} foto={studio.foto} />
      <div className="name">{studio.nome}</div>
      <div className="role">{studio.titulo}</div>
      <p className="bio">
        {studio.bio.map((linha, i) => (
          <span key={i}>
            {linha}
            {i < studio.bio.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
      <div className="local-chip">
        <MapPin size={13} strokeWidth={2.2} aria-hidden="true" />
        <span>{studio.bairro}</span>
      </div>
    </div>
  );
}
