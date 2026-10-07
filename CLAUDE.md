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
- **Vitest** (testes; telas com jsdom + Testing Library) · **Lucide** (ícones)
- Deploy na **Vercel** (auto-deploy no `git push` para `main`)

## Comandos

```bash
npm run dev          # desenvolvimento (localhost:3000)
npm run build        # build de produção (rode antes de commitar mudanças grandes)
npm run test         # roda os testes (Vitest)
npm run test:regras  # testa firestore.rules contra o emulador (sobe/derruba sozinho)
firebase deploy --only firestore:rules   # publica as regras do Firestore
```

Deploy do app = `git push origin main` (a Vercel faz o resto).

Testes: funções puras rodam em Node (`*.test.ts`). Telas usam `// @vitest-environment jsdom` no topo do
`*.test.tsx`, com o banco trocado por `vi.mock("@/lib/db")` (exemplo: `admin/NovoAgendamentoManual.test.tsx`).
Não dá pra testar o painel logado por automação (login real da dona), então a tela é testada assim.
`firestore.rules` tem sua própria suíte (`tests-regras/`, `npm run test:regras`), rodando contra o
**emulador de verdade** (não um banco falso) — é a forma de testar as regras de segurança em si.

## Estrutura

```
src/
  app/
    page.tsx              # site público (renderiza LinkInBio)
    layout.tsx            # layout raiz
    globals.css           # DESIGN SYSTEM completo (site: paleta rosa/marfim editorial, Manrope+Fraunces, claro/escuro; painel: roxo, Inter, tema escuro único — `.admin` redefine todos os tokens, zero risco cruzado)
    admin/                # painel — PWA próprio ("Painel Carin"), só /admin é instalável
      page.tsx            # `/admin` (produção) = <AdminGate render={DashboardClassico}> — sem mudança
      AdminGate.tsx        # contexto seguro → carregando → login → o painel escolhido (`render`), compartilhado pelas duas versões
      BloquearHorarios.tsx       # botão "Bloquear horários" + folha + aviso com Desfazer (compartilhado)
      FolhaBloquear.tsx          # escolhe o dia, marca horários/atalhos e salva; `dataInicial?` opcional (tem teste de tela)
      compartilhado/             # Folha.tsx (bottom sheet), Dialogo.tsx (confirmação, substitui confirm() nas telas novas), useDesfazer.tsx (aviso), useHoje.ts, useOffline.ts, whatsappToque.ts (onErro? opcional) — têm teste
      detalheErro.ts      # diagnóstico curto de erro do Firestore, usado nos formulários
      layout.tsx          # metadata/manifest/apple do PWA
      RegisterSW.tsx      # registra o service worker (escopo /admin)
      InstallButton.tsx   # botão "instalar app" (+ dica no iOS)
      classico/            # painel de sempre (rolagem única + sanfonas), plano B (por localStorage ou direto em /admin/classico)
        DashboardClassico.tsx, AgendamentosManager.tsx, NovoAgendamentoManual.tsx,
        ServicosManager.tsx, HorariosManager.tsx, CalendarioFolgas.tsx, NotificacoesCard.tsx,
        CardColapsavel.tsx      # todos com teste de tela
        page.tsx            # rota /admin/classico (acesso direto, "plano B" da Fase B4)
      painel/               # painel NOVO (Fases B e C completas) — é o /admin de produção desde a Fase B4
        PainelNovo.tsx      # shell: DadosProvider + abas, deep link (?aba=/postMessage), badge do ícone, aviso offline
        DadosProvider.tsx   # uma assinatura por fonte (servicos/agenda/slots/agendamentos) pro painel novo inteiro; `useDados()`
        TabBar.tsx           # barra de abas inferior (Agenda/Pedidos/Horários/Serviços/Conta), badge de pedidos, `abaValida()`
        AgendaDia.tsx        # tela principal: mês/semana, resumo do dia, linhas nos 5 estados, Bloquear/Liberar; `diaInicial?` opcional
        AgendaMes.tsx        # calendário do mês, só pra navegar
        FolhaAgendar.tsx     # tocar num horário Livre: agendar sem campo de data (dia/hora já vêm da linha)
        FolhaDetalhe.tsx     # tocar num Confirmado/Pedido: Confirmar/Recusar ou reenviar confirmação/Cancelar (via Dialogo, erro visível)
        ServicosTab.tsx, FolhaServico.tsx   # aba Serviços redesenhada (Fase C): lista + folha, excluir com Dialogo
        HorariosTab.tsx, FolhaHorarioDia.tsx  # aba Horários redesenhada (Fase C): 1 linha/dia + editor + "copiar seg a sex" + próximas folgas
        PedidosTab.tsx        # aba Pedidos redesenhada (Fase C): Confirmar/Recusar/Cancelar via Dialogo, erro visível
        MeuLink.tsx          # aba Conta: link público do site (studio.siteUrl) com botão de copiar
        (todos com teste de tela)
      page.tsx             # rota /admin: lê localStorage["painel-carin:versao"] no mount (Fase B4) — "classico" abre o clássico, senão o painel novo
      nova/page.tsx        # rota /admin/nova (login real) = <AdminGate render={PainelNovo}> — igual ao /admin padrão, útil pra testar/linkar direto
    dev-preview-agenda/page.tsx  # prévia da Agenda/Serviços/Horários/Conta com dados FICTÍCIOS, sem precisar logar — só no `next dev` (em produção dá 404)
    api/notify-owner/route.ts   # API que dispara o push (firebase-admin) — runtime nodejs
  components/
    LinkInBio.tsx         # orquestrador do site público
    Profile.tsx           # nome/título/bio + chip de bairro (redesenho 29/09/2026)
    Avatar.tsx             # foto/inicial + selo de verificada sobreposto (Fase do redesenho)
    BentoGrid.tsx         # os tiles do bento: Agendar, WhatsApp/Instagram, Serviços (com duração), lojinha, mini-mapa
    BookingSheet.tsx      # bottom sheet do fluxo de agendamento; dia escolhido num calendário por mês (lê só o mês na tela)
    icons.tsx             # ícones de marca (WhatsApp, Instagram, Verified)
  lib/
    firebase.ts           # init do Firebase (client)
    db.ts                 # camada Firestore (serviços, agenda, slots, bloqueio de horários, agendamentos, pushTokens) — tem teste com Firestore falso
    push.ts               # ativar notificações, getToken, onMessage
    utils.ts              # helpers puros (brl, wppUrl, zap, proximosDias, hojeKey, diaDaSemana) — têm testes
    mensagens.ts          # textos do WhatsApp (confirmação, recusa, cancelamento) + linkConfirmacao — têm testes
    agendaDia.ts          # horários de um dia (livres, ocupados, bloqueados, exceções) + regras puras do bloqueio (períodos, atalhos, rótulos) + itensDoDia/pedidosNoDia (Agenda nova) + datasRepetidas (repetir folga toda semana) — têm testes
    datas.ts              # datas SEMPRE no fuso do salão (America/Sao_Paulo, não o do aparelho) — só o painel novo usa; utils.ts não muda — têm testes
    erroHumano.ts          # mensagem de erro em português claro (sem código técnico) pras telas novas do painel; detalheErro.ts continua servindo o clássico
  hooks/useAuth.ts        # estado de autenticação
  config/studio.ts        # DADOS DO CLIENTE (nome, whatsapp, endereço, serviços, lojinha, siteUrl)
public/
  firebase-messaging-sw.js  # service worker do FCM (push em segundo plano)
  sw.js                     # service worker do PWA (escopo /admin)
  painel.webmanifest        # manifest do "Painel Carin"
  icon-192/512.png, apple-touch-icon.png, carin.jpg, marcas/
docs/                     # documentação (escopo, arquitetura, fluxo, roadmap, decisões)
credenciais/              # 🔐 cofre local (NÃO vai pro git) — chaves, contas, checklist
firestore.rules           # regras de segurança do Firestore (endurecidas, testadas no emulador — ainda não publicadas)
tests-regras/             # testes de firestore.rules contra o emulador (npm run test:regras)
vitest.rules.config.ts    # config separada do vitest normal (o emulador é 1 processo só, sem paralelismo)
scripts/test-regras.mjs   # sobe o emulador com o Java certo, roda os testes, derruba tudo
```

## Arquitetura (o essencial)

### Dados (Firestore)
- `servicos/{id}` — serviços/combos/promoções (público lê; só a dona escreve); `duracaoMin?` opcional
  em minutos — sem ele, o serviço não bloqueia horário seguinte
- `disponibilidade/regras` — `dias` (horários por dia da semana) + `bloqueios` (folgas: datas
  `YYYY-MM-DD` em que a dona não atende). `salvarAgenda` e `salvarBloqueios` usam `merge` (um não
  apaga o outro); `bloquearDias`/`liberarDias` usam `arrayUnion`/`arrayRemove` (não regravam a lista).
  `ouvirAgenda` devolve sempre `dias` e `bloqueios` preenchidos (`normalizarAgenda`). O site
  (`BookingSheet`) esconde os dias bloqueados; o painel tem o card "Folgas" (mini-calendário —
  `CalendarioFolgas`) e o botão "Bloquear horários". `antecedenciaDias?` (14/30/60/90, escolhido na
  aba Horários — `salvarAntecedencia`; sem o campo vale 14, ver `antecedenciaDe` em `agendaDia.ts`):
  até quantos dias à frente o site deixa a cliente marcar
- `slots/{data_hora}` — horários ocupados, **público** (só data/hora/status, sem dados do cliente).
  `status`: `pendente`, `confirmado` ou `bloqueado` (a dona fechou o horário, sem cliente e sem motivo)
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
No formulário (`admin/NovoAgendamentoManual.tsx`) os horários do dia aparecem como botões: ocupados
apagados com o primeiro nome da cliente, "Outro horário" para exceções (`lib/agendaDia.ts`). Depois
de salvar, aparece o botão "Enviar confirmação no WhatsApp" (`linkConfirmacao`) — botão tocado direto,
não abertura automática, porque o iPhone bloqueia janela aberta fora do toque.

### Bloqueio de horários (a dona fecha só alguns horários de uma data)
Botão "Bloquear horários" (`admin/BloquearHorarios.tsx` → `FolhaBloquear.tsx`). Bloquear = criar
`slots/{data_hora}` com `status: "bloqueado"` (`bloquearHorarios`); liberar = apagar, **só se** o status for
bloqueado (`liberarHorarios`, nunca o horário de uma cliente). Ambas usam `runTransaction` (lê tudo antes de
escrever) e devolvem o que ficou de fora. "Dia todo" grava a data em `bloqueios` (`bloquearDias`) — com a
opção "Repetir nas próximas 12 [dia da semana]" (Fase C), grava de uma vez as 12 datas daquele mesmo dia
da semana (`datasRepetidas`, `agendaDia.ts`), não só a escolhida. O site já esconde qualquer slot existente;
o agendamento manual mostra "Bloqueado". As regras do Firestore não mudaram (a dona já escreve em `slots`);
o endurecimento é uma etapa à parte, testada no emulador.

### Duração do serviço (bloqueia sozinho o horário seguinte)
Serviço com `duracaoMin` mais longo que o intervalo até o próximo horário da tabela bloqueia esse horário
sozinho. `agendaDia.ts`: `duracaoTotal` (soma dos serviços escolhidos), `horariosAfetados` (quais horários
da tabela um serviço come a partir de uma hora) e `duracaoCabe` (nenhum deles está ocupado?). No manual
(`criarAgendamentoManual`) e no site (`criarAgendamento`), um `bloquearApos: string[]` opcional é calculado
por quem chama e vira `slots` "bloqueado" com `origemAgendamento: id` na MESMA transação. `recusarAgendamento`
consulta `slots` por `origemAgendamento == id` antes de apagar e libera junto — nunca mexe num bloqueio manual
(sem essa marca) nem no de outro agendamento. **Manual e site gravam os bloqueios** (o site desde
02/10/2026): `BookingSheet` filtra os horários oferecidos E manda `bloquearApos` no pedido. As regras
aceitam do público um slot "bloqueado" só via `slotPublicoBloqueioOk` — mesmo dia, depois do horário do
pedido, `origemAgendamento` apontando pra um agendamento que NASCE na mesma escrita (`!exists` +
`existsAfter`). Ver `docs/decisoes.md`, item 21. Sem `duracaoMin` no serviço, nada muda.

### Leitura de `slots` e cota do Firestore
O site (`BookingSheet`) só assina a agenda e os horários **depois que o sheet abre**, e só a janela de
datas que oferece (`ouvirSlotsOcupados(cb, { desde, ate })`); sem `desde`, `ouvirSlots` lê de hoje em
diante. Antes de chegarem os dados o site não oferece horário algum.

### Notificações (push)
1. Cliente finaliza um agendamento em `BookingSheet` → `criarAgendamento` (batch: slot + agendamento).
2. Em seguida, `BookingSheet` chama `POST /api/notify-owner`.
3. A API (firebase-admin) lê `pushTokens` e envia uma mensagem **"notification" (webpush)** via FCM, com
   `data: { aba: "pedidos" }` e `fcmOptions.link: "/admin?aba=pedidos"` — o corpo da mensagem monta o nome
   do serviço a partir de `dados.servicos` (bug corrigido em 28/09/2026: referenciava um campo que não existe).
4. O `firebase-messaging-sw.js` deixa o SO **exibir a notificação na tela** (funciona no Android e no **iPhone iOS 16.4+ com o app instalado**). O clique é tratado por um `notificationclick` custom: se já existe uma aba do
   painel aberta, só a foca e manda um `postMessage({type:"notification-clicked", aba})` (painel novo lê e
   troca de aba sem recarregar); sem aba aberta, abre uma nova já em `/admin?aba=pedidos`.
5. Confirmação ao cliente = link `wa.me` num toque da dona (não é automático — a API paga do WhatsApp ficou fora).

> **iPhone:** o push só funciona com o PWA **instalado na tela inicial** (Safari → Compartilhar →
> Adicionar à Tela de Início) e a permissão concedida **dentro do app instalado**. O "badge"
> (bolinha numérica no ícone) NÃO é suportado no Chrome Android nem de forma confiável no iOS —
> a notificação na tela é o aviso principal.

### Painel novo (Fases B, C e B4 completas — é o /admin de produção)
Desde a Fase B4 (29/09/2026), `/admin` abre o painel novo (barra de abas + Agenda por dia) por
padrão; o clássico é o plano B, acessível direto em `/admin/classico` ou gravando
`localStorage["painel-carin:versao"] = "classico"` naquele aparelho (lido uma vez no mount de
`admin/page.tsx`, sem precisar de outro deploy). `/admin/nova` continua existindo, igual ao
`/admin` padrão. `DadosProvider` (`admin/painel/`) centraliza uma
assinatura por fonte (serviços, agenda, slots numa janela de -7 a +120 dias — cobre os até 3 meses que o site pode abrir, agendamentos) —
`useDados()` lê esse contexto em vez de cada tela assinar o Firestore de novo; erro numa fonte
não derruba as outras (`erros.servicos/agenda/slots/agendamentos`). `AgendaDia` mostra o dia com
5 estados por horário — livre, confirmado (com atalho de WhatsApp), pedido, bloqueado (com
"Liberar"), passado (livre/bloqueado somem; cliente confirmada/pedido continua visível, só
apagado) — calculados por `itensDoDia` (`agendaDia.ts`); aceita um `diaInicial?` opcional (usado
pela navegação "ver na Agenda" a partir de uma folga). O botão "Bloquear" reaproveita a
`FolhaBloquear` da Fase A1 (ganhou um `dataInicial?` opcional). Tocar num **Livre** abre
`FolhaAgendar` (sem campo de data); tocar num **Confirmado**/**Pedido** abre `FolhaDetalhe`
(Confirmar/Recusar ou reenviar confirmação/Cancelar horário, com `Dialogo` no lugar do `confirm()`
nativo). "Mudar horário" não faz parte — saiu do plano em 28/09/2026 (a Carin resolve pelo
WhatsApp).

**Fase C** trocou cada aba, uma a uma, por uma tela própria do painel novo em
vez de reaproveitar o clássico: **Serviços** (`ServicosTab`/`FolhaServico`), **Horários**
(`HorariosTab`/`FolhaHorarioDia`, uma linha por dia + editor em folha com "copiar para segunda a
sexta" + lista de próximas folgas que leva pro dia certo na Agenda) e **Pedidos** (`PedidosTab`,
Confirmar/Recusar/Cancelar) — todas lendo do `DadosProvider` e usando `Dialogo`/`erroHumano` nas
ações de excluir/recusar/cancelar/errar (`gravarEAbrirWhatsapp` ganhou um `onErro?` opcional pra
isso, aditivo — o clássico, sem passar esse parâmetro, continua só logando o erro no console como
sempre). Só a aba **Conta** ainda reaproveita `NotificacoesCard` do clássico (sem sanfona, via
`semSanfona`/`abertoInicial` em `CardColapsavel`) — não tem a mesma dívida de leitura duplicada
das outras, então foi considerada suficiente como está; tem `MeuLink.tsx` (link público do site
com botão de copiar). O shell (`PainelNovo.tsx`) ganhou: a bolinha do ícone do app (subiu de
dentro do `PedidosTab` pra rodar sempre, não só com a aba Pedidos montada), um aviso de "sem
conexão" (`useOffline`) e o deep link da notificação (`?aba=pedidos` na URL + `postMessage` do
service worker quando o app já está aberto — ver `firebase-messaging-sw.js`). `FolhaBloquear`
ganhou "Repetir nas próximas 12 [dia da semana]" ao marcar "Dia todo". Gestos de arrastar (fechar
a folha arrastando, deslizar a semana) foram **decididos que não entram** (29/09/2026): nada
deixa de funcionar sem eles (X/Esc/toque fora já fecham; ‹ › já navegam) e evita o risco que o
plano original já citava (colidir com o gesto de voltar do iPhone). Prévia com dados fictícios
(sem login) em `/dev-preview-agenda`, útil pra testar telas sem logar como a dona (o site público
também foi redesenhado, ver abaixo).

### Site público — redesenho de 29/09/2026
Fontes **Manrope** (corpo) + **Fraunces** (serifada itálica — nome, preços, título "Serviços &
valores"). `--font-inter` segue existindo só pro painel (`.admin` fixa isso explicitamente).
Paleta rosa recalibrada pra um tom mais editorial (marfim/blush + berinjela) — sem risco pro
painel, que já redefine sua própria paleta roxa por cima de todos os tokens do `:root`. Token
`--ink`/`--on-ink`: a "âncora" escura do botão "Agendar horário", que inverte com o tema (não
reaproveita `--accent-cta`, que continua só no hover dos mini-botões "Agendar" de cada serviço).
Avatar maior com o selo de verificada sobreposto na foto. Duração de cada serviço aparece com um
selo quando cadastrada (`formatarDuracao`, reaproveitado de `utils.ts`). Lojinha e mapa real
(iframe do Google Maps) mantidos sem mudança estrutural. Sem teste automatizado ainda (só
`BookingSheet.test.tsx`).

### Quem tem acesso ao painel
A função `isDono()` em `firestore.rules` tem a lista de UIDs autorizados. Para mudar: edite a lista
e rode `firebase deploy --only firestore:rules`. UID atual da dona está no `credenciais/COFRE.md`.

## Convenções e preferências do dono (IMPORTANTE)

- **Design em primeiro lugar** — cada tela deve ter cara de app top (Apple/Google/Nubank/Spotify). É o diferencial de venda.
- **Painel em tema escuro único** — `/admin` não segue o tema do sistema (tokens escuros direto em `.admin`); só o site público alterna claro/escuro. Cores novas do painel entram como tokens, nunca fixas. Classes novas do painel levam o prefixo `pn-`. Campos de texto com fonte ≥ 16 px (o iPhone dá zoom abaixo disso) e `:hover` só dentro de `@media (hover: hover)`.
- **Sem emojis na UI** — use ícones minimalistas (Lucide). Exceção: ícones de marca (WhatsApp/Instagram). Também evite emojis no texto das mensagens de WhatsApp.
- **Commitar SÓ quando o dono pedir** — não faça commit/deploy automático.
- **Painel v2 (28/09/2026 em diante): nada vai ao ar por etapa** — o Dany pediu pra seguir o
  plano inteiro (funções + Agenda nova com abas) sendo feito e testado, e só publicar tudo
  junto num deploy final, quando ele aprovar. Ver `docs/decisoes.md #15` e `melhorias-pendentes.md`.
- **Não recriar logos de marcas** (questão de IP) — o dono fornece as imagens.
- **Segredos** nunca vão pro git (`.env.local`, chave do Admin SDK, pasta `credenciais/`).
- Comentários e textos de UI em **português (pt-BR)**, com acentuação correta.

## Segredos / credenciais

Ver `credenciais/COFRE.md` (fora do git). Config pública do Firebase fica em `.env.local`
(também fora do git); `.env.local.example` mostra o formato. A chave do Admin SDK
(`FIREBASE_SERVICE_ACCOUNT`) fica só na Vercel.
