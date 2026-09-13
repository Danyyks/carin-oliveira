// Service worker do "Painel Carin" (escopo /admin).
// Propositalmente SEM handler de `fetch`: interceptar requisições atrapalha o
// streaming de escrita do Firestore. O SW existe para instalabilidade e para
// receber push (Etapa 6). Cache/offline entra depois, com escopo controlado.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
