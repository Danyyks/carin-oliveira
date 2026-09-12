import { Camera } from "lucide-react";
import type { StudioConfig } from "@/config/studio";
import { VerifiedIcon } from "./icons";

export default function Profile({ studio }: { studio: StudioConfig }) {
  return (
    <div className="profile">
      <div className="avatar">
        <span>{studio.nome.trim().charAt(0)}</span>
        <div className="cam">
          <Camera size={13} strokeWidth={2.2} />
        </div>
      </div>
      <div className="name">
        {studio.nome} <VerifiedIcon />
      </div>
      <div className="handle">@{studio.instagram}</div>
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
