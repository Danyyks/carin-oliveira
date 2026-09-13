// Service worker do "Painel Carin" (escopo /admin).
// Minimalista por enquanto: garante instalabilidade do PWA.
// Cache/offline e push (Etapa 6) serão adicionados aqui depois.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Handler de fetch (passthrough) — requisito de instalabilidade em alguns navegadores.
self.addEventListener("fetch", () => {});
