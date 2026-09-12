export function WhatsappIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.6 14.2c-.24.67-1.4 1.3-1.94 1.34-.5.04-1.13.06-1.82-.11a15.9 15.9 0 0 1-1.65-.61 12.9 12.9 0 0 1-4.94-4.37c-.37-.5-.98-1.42-.98-2.7 0-1.29.67-1.92.9-2.18a.96.96 0 0 1 .7-.33c.17 0 .35 0 .5.01.16.01.38-.06.59.45.24.58.82 2 .89 2.14.07.14.11.31.02.5-.09.19-.14.31-.27.47-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.28.72 1.18 1.55 1.92 1.06.94 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.6-.14.25.09 1.57.74 1.84.87.27.14.45.2.51.32.07.11.07.66-.17 1.33Z" />
    </svg>
  );
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function VerifiedIcon({ size = 18 }: { size?: number }) {
  return (
    <svg className="verified" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.4 1.8 3 .1 .9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3 .1L12 22l-2.4-1.8-3-.1-.9-2.9L3.3 15.4l.9-2.9-.9-2.9 2.4-1.8.9-2.9 3-.1L12 2z" />
      <path d="M10.6 14.6l-2-2-1.2 1.2 3.2 3.2 5.4-5.4-1.2-1.2-4.2 4.2z" fill="#fff" />
    </svg>
  );
}
