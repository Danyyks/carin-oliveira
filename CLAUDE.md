# CLAUDE.md — Guia do projeto

Guia para o Claude Code (e para qualquer dev) trabalhar neste repositório. Leia antes de mexer.

## O que é

**Link na bio (estilo bento) + sistema de agendamento real** para a nail designer **Carin Oliveira**.
- Site público (`/`): perfil + bento com Agendar, WhatsApp, Instagram, Serviços, lojinha (O Boticário), mini-mapa.
- Painel (`/admin`): a dona faz login, gerencia serviços/horários, confirma/recusa agendamentos e ativa notificações push. É um **PWA instalável** próprio ("Painel Carin").

É o 1º projeto de um futuro **SaaS de "link na bio"** — por isso o "motor" (lógica) é separado dos dados do cliente (`src/config/studio.ts`).

## Stack

- **Next.js 16** (App Router, TypeScript, `src/`, Turbopack) + **React 19**
- **Tailwind v4** (CSS-first) — todo o design system está em `src/app/globals.css`
- **Firebase**: Firestore (dados em tempo real), Auth (e-mail/senha), Cloud Messaging/FCM (push)
- **firebase-admin** na API route (envio de push server-side)
- **Vitest** (testes) · **Lucide** (ícones)
- Deploy na **Vercel** (auto-deploy no `git push` para `main`)

## Comandos

```bash
npm run dev          # desenvolvimento (localhost:3000)
npm run build        # build de produção (rode antes de commitar mudanças grandes)
npm run test         # roda os testes (Vitest)
firebase deploy --only firestore:rules   # publica as regras do Firestore
```

Deploy do app = `git push origin main` (a Vercel faz o resto).

## Estrutura

```
src/
  app/
    page.tsx              # site público (renderiza LinkInBio)
    layout.tsx            # layout raiz
    globals.css           # DESIGN SYSTEM completo (paleta rosa, claro/escuro, todos os estilos)
    admin/                # painel — PWA próprio ("Painel Carin"), só /admin é instalável
      page.tsx            # login + Dashboard (Agendamentos, Notificações, Serviços, Horários)
      layout.tsx          # metadata/manifest/apple do PWA
      RegisterSW.tsx      # registra o service worker (escopo /admin)
      InstallButton.tsx   # botão "instalar app" (+ dica no iOS)
    api/notify-owner/route.ts   # API que dispara o push (firebase-admin) — runtime nodejs
  components/
    LinkInBio.tsx         # orquestrador do site público
    Profile.tsx, Avatar.tsx
    BentoGrid.tsx         # os tiles do bento (inclui o mini-mapa)
    BookingSheet.tsx      # bottom sheet do fluxo de agendamento
    icons.tsx             # ícones de marca (WhatsApp, Instagram, Verified)
  lib/
    firebase.ts           # init do Firebase (client)
    db.ts                 # camada Firestore (serviços, agenda, agendamentos, pushTokens)
    push.ts               # ativar notificações, getToken, onMessage
    utils.ts              # helpers puros (brl, wppUrl, proximosDias) — têm testes
  hooks/useAuth.ts        # estado de autenticação
  config/studio.ts        # DADOS DO CLIENTE (nome, whatsapp, endereço, serviços, lojinha)
public/
  firebase-messaging-sw.js  # service worker do FCM (push em segundo plano)
  sw.js                     # service worker do PWA (escopo /admin)
  painel.webmanifest        # manifest do "Painel Carin"
  icon-192/512.png, apple-touch-icon.png, carin.jpg, marcas/
docs/                     # documentação (escopo, arquitetura, fluxo, roadmap, decisões)
credenciais/              # 🔐 cofre local (NÃO vai pro git) — chaves, contas, checklist
firestore.rules           # regras de segurança do Firestore
```

## Arquitetura (o essencial)

### Dados (Firestore)
- `servicos/{id}` — serviços/combos/promoções (público lê; só a dona escreve)
- `disponibilidade/regras` — `dias` (horários por dia da semana) + `bloqueios` (folgas: datas
  `YYYY-MM-DD` em que a dona não atende). `salvarAgenda` e `salvarBloqueios` usam `merge` (um não
  apaga o outro). O site (`BookingSheet`) esconde os dias bloqueados; o painel tem o card "Folgas"
  (mini-calendário — `CalendarioFolgas`)
- `slots/{data_hora}` — horários ocupados, **público** (só data/hora/status, sem dados do cliente)
- `agendamentos/{data_hora}` — pedido com dados do cliente (só a dona lê/gerencia)
- `pushTokens/{token}` — tokens de push da dona (só a dona)

### Anti-double-booking (sem Cloud Functions)
O id do agendamento é **determinístico**: `` `${data}_${hora}` ``. As regras só permitem `create`
(nunca `update`) para o público → um 2º `create` no mesmo horário falha. Simples e grátis.

### Agendamento manual (a dona)
Além dos pedidos do cliente, a dona pode registrar agendamentos da agenda dela pelo painel
(botão "+ Adicionar agendamento" → `criarAgendamentoManual`), que entram já `confirmado`. As
regras liberam `create` de `slots`/`agendamentos` para `isDono()` (o público segue só `pendente`).
O `clienteWhatsapp` é opcional nesse caso — a UI esconde o botão/mensagem de WhatsApp quando vazio.

### Notificações (push)
1. Cliente finaliza um agendamento em `BookingSheet` → `criarAgendamento` (batch: slot + agendamento).
2. Em seguida, `BookingSheet` chama `POST /api/notify-owner`.
3. A API (firebase-admin) lê `pushTokens` e envia uma mensagem **"notification" (webpush)** via FCM.
4. O `firebase-messaging-sw.js` deixa o SO **exibir a notificação na tela** (funciona no Android e no **iPhone iOS 16.4+ com o app instalado**).
5. Confirmação ao cliente = link `wa.me` num toque da dona (não é automático — a API paga do WhatsApp ficou fora).

> **iPhone:** o push só funciona com o PWA **instalado na tela inicial** (Safari → Compartilhar →
> Adicionar à Tela de Início) e a permissão concedida **dentro do app instalado**. O "badge"
> (bolinha numérica no ícone) NÃO é suportado no Chrome Android nem de forma confiável no iOS —
> a notificação na tela é o aviso principal.

### Quem tem acesso ao painel
A função `isDono()` em `firestore.rules` tem a lista de UIDs autorizados. Para mudar: edite a lista
e rode `firebase deploy --only firestore:rules`. UID atual da dona está no `credenciais/COFRE.md`.

## Convenções e preferências do dono (IMPORTANTE)

- **Design em primeiro lugar** — cada tela deve ter cara de app top (Apple/Google/Nubank/Spotify). É o diferencial de venda.
- **Sem emojis na UI** — use ícones minimalistas (Lucide). Exceção: ícones de marca (WhatsApp/Instagram). Também evite emojis no texto das mensagens de WhatsApp.
- **Commitar SÓ quando o dono pedir** — não faça commit/deploy automático.
- **Não recriar logos de marcas** (questão de IP) — o dono fornece as imagens.
- **Segredos** nunca vão pro git (`.env.local`, chave do Admin SDK, pasta `credenciais/`).
- Comentários e textos de UI em **português (pt-BR)**, com acentuação correta.

## Segredos / credenciais

Ver `credenciais/COFRE.md` (fora do git). Config pública do Firebase fica em `.env.local`
(também fora do git); `.env.local.example` mostra o formato. A chave do Admin SDK
(`FIREBASE_SERVICE_ACCOUNT`) fica só na Vercel.
