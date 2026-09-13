import type { StudioConfig } from "@/config/studio";
import Avatar from "./Avatar";
import { VerifiedIcon } from "./icons";

export default function Profile({ studio }: { studio: StudioConfig }) {
  return (
    <div className="profile">
      <Avatar nome={studio.nome} foto={studio.foto} />
      <div className="name">
        {studio.nome} <VerifiedIcon />
      </div>
      <div className="role">{studio.titulo}</div>
      <p className="bio">
        {studio.bio.map((linha, i) => (
          <span key={i}>
            {linha}
            {i < studio.bio.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </div>
  );
}
