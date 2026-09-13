// Selos estilizados das marcas do Grupo Boticário que a Carin revende.
// São versões SIMPLIFICADAS (não os logotipos oficiais), desenhadas em path
// para não depender de fontes — servem só para reconhecimento visual rápido.

export function MarkBoticario({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#0A7A49" />
      <path
        d="M19 8.2c-1.2 0-2.2.9-2.4 2.1l-.3 1.9c-2.5.7-4.3 3-4.3 5.6v8.9c0 1.8 1.5 3.3 3.3 3.3h7.4c1.8 0 3.3-1.5 3.3-3.3v-8.9c0-2.6-1.8-4.9-4.3-5.6l-.3-1.9c-.2-1.2-1.2-2.1-2.4-2.1Z"
        fill="#fff"
      />
      <rect x="17.4" y="10.6" width="3.2" height="2" rx="1" fill="#0A7A49" />
    </svg>
  );
}

export function MarkEudora({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#5A2A43" />
      <path d="M14.5 12.5h9.2v2.6h-6.4v3h5.7v2.6h-5.7v3.2h6.6v2.6h-9.4V12.5Z" fill="#fff" />
    </svg>
  );
}

export function MarkOui({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#9E1B32" />
      <circle
        cx="19"
        cy="19"
        r="14.3"
        fill="none"
        stroke="#fff"
        strokeWidth="1"
        strokeDasharray="2.1 2.6"
        opacity="0.85"
      />
      <g fill="#fff">
        <rect x="12.4" y="17.3" width="3.2" height="3.4" rx="1.6" />
        <rect x="17.4" y="17.3" width="3.2" height="3.4" rx="1.6" />
        <rect x="22.4" y="17.3" width="3.2" height="3.4" rx="1.6" />
        <circle cx="24.9" cy="21.6" r="0.9" />
      </g>
    </svg>
  );
}

export function MarkBerenice({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#D6249F" />
      <path
        d="M19 27.3 12.7 21.4c-1.9-1.8-1.9-4.7 0-6.5 1.8-1.7 4.6-1.5 6.3.3 1.7-1.8 4.5-2 6.3-.3 1.9 1.8 1.9 4.7 0 6.5L19 27.3Z"
        fill="#fff"
      />
    </svg>
  );
}
