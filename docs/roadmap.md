# Roadmap do build

Fazemos **uma etapa de cada vez**, juntos. Cada etapa entrega algo testável.

| # | Etapa | Entrega | Status |
|---|---|---|---|
| 0 | **Fundação / docs** | Repositório + documentação organizada | ✅ feito |
| 1 | **Scaffold Next.js** | Projeto Next.js 16 + TS + Tailwind + estrutura de pastas; build verde | ✅ feito |
| 2 | **Link na bio (visual)** | Bento portado em componentes (Profile, BentoGrid, Gallery, BookingSheet); mobile-first; claro/escuro; dados via `src/config/studio.ts` | ✅ feito |
| 3 | **Firebase** | Projeto Firestore + Auth; modelo de dados; regras de segurança | ✅ feito |
| 4 | **Serviços & disponibilidade** | Login do painel + CRUD de serviços/combos/promoções + definição de dias/horários; site lê serviços reais | ⏳ próxima |
| 5 | **Agendamento** | Fluxo pedido → pendente → confirma/recusa; anti-duplicidade; tempo real | ✅ feito |
| 6 | **Notificações** | `wa.me` de confirmação ✅ + **push (FCM): notificação na tela** ✅ testada. Badge no ícone só onde a plataforma suporta (Chrome Android não suporta — descartado) | ✅ feito |
| 7 | **PWA do admin** | "Painel Carin" instalável (manifest/ícone/SW só em /admin); público não instalável | ✅ feito (adiantado) |
| 8 | **Mapa + polish + go-live** | Mini-mapa; dados e fotos reais da Carin; domínio; deploy final | ⬜ |

## Como trabalhamos cada etapa
1. Eu explico o que a etapa faz e o que vou criar.
2. Construo.
3. A gente testa/valida juntos.
4. Só então seguimos para a próxima.

## Regra de ouro em todas as etapas
**Design em primeiro lugar** — cada tela com cara de app top (Apple/Google/Nubank/Spotify).
