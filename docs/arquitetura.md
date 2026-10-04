# Arquitetura

## Princípio: engine separada dos dados do cliente
Pensando no futuro SaaS, separamos:
- **Motor** (engine): componentes do link na bio, fluxo de agendamento, painel — reutilizável.
- **Dados do cliente** (tenant): tudo da Carin (nome, cores, serviços, horários) vem de **config no banco**, não fica "chumbado" no código.

Para a Carin há **um único tenant**. Multi-tenant (por slug/subdomínio) fica para quando virar SaaS — mas já projetamos os dados nesse formato.

## Stack
| Camada | Ferramenta | Custo |
|---|---|---|
| Front | Next.js + TypeScript + Tailwind + Framer Motion | grátis |
| Banco (tempo real) | Firebase Firestore | grátis (Spark) |
| Login | Firebase Auth | grátis |
| Push | Firebase Cloud Messaging (FCM) | grátis |
| Envio do push | API route no Next.js (Vercel) | grátis (sem cartão) |
| Hospedagem | Vercel | grátis (Hobby) |
| WhatsApp | link `wa.me` | grátis |

> **Sem Cloud Functions** (exigem plano pago). A lógica roda no cliente com **regras de segurança** do Firestore; o push é disparado por uma **API route na Vercel** usando o Firebase Admin SDK (service account em variável de ambiente do servidor).

## Modelo de dados (Firestore)
```
config/studio                # doc único com os dados da Carin (tenant)
  nome, whatsapp, instagram, enderecoTexto, lat, lng,
  horarioFuncionamento, chavePix?, fcmTokens[]

servicos/{id}
  nome, desc, preco, destaque(bool, "Mais pedido"), duracaoMin?
  # duracaoMin é opcional: sem ele, o serviço não bloqueia horário seguinte (ver mais abaixo)

disponibilidade/regras       # dias/horários + folgas (doc único)
  dias: { "1": ["09:00","10:30",...], "2": [...], ... }  # por dia da semana (0=dom..6=sáb)
  bloqueios: ["2026-09-22", "2026-10-05"]                # folgas: datas específicas sem atendimento
  # o painel edita dias e bloqueios de forma independente (merge). Folga de dia inteiro entra e sai com
  # arrayUnion/arrayRemove (bloquearDias/liberarDias), sem regravar a lista toda.
  # normalizarAgenda() garante dias e bloqueios sempre preenchidos (o doc pode ter só um dos dois).

slots/{data_hora}            # PÚBLICO (só data/hora/status, sem dados da cliente): é o que o site lê
  data, hora, status(pendente|confirmado|bloqueado), criadoEm, origemAgendamento?
  # bloqueado = a dona fechou o horário (sem cliente, sem motivo). O site esconde qualquer slot existente.
  # origemAgendamento só existe no bloqueio AUTOMÁTICO (duração de serviço comendo o horário seguinte):
  # id do agendamento que causou o bloqueio, pra liberar sozinho se ele for cancelado.

agendamentos/{data_hora}     # id determinístico = `${data}_${hora}` (ex: 2026-09-14_14:30)
  servicos: {nome,preco}[], total, clienteNome, clienteWhatsapp, data, hora, diaLabel,
  status(pendente|confirmado), criadoEm
  # servicos é uma cópia (nome+preço) de cada serviço escolhido, não uma referência — preço
  # mudar depois não altera um agendamento já feito. Pode ter mais de um serviço no mesmo horário.
```

## Anti-agendamento-duplicado (grátis, sem transação)
O id do agendamento é **determinístico**: `${data}_${hora}`. As regras de segurança permitem **apenas `create`** (nunca `update`) para o público. Se duas pessoas tentam o mesmo horário, o **segundo `create` falha** porque o documento já existe → **impossível marcar em dobro**. Recusar/cancelar = **apagar** o documento (só a Carin pode), liberando o id.

### Leitura de `slots` e cota gratuita
O Firestore grátis (Spark) tem cota de **leituras por dia**. O site lê `slots` **só quando a cliente abre o sheet de agendamento** e **só a janela que ele oferece** (de amanhã a +14 dias, `where("data", ">=", …)`); o painel lê de hoje em diante. Antes, cada visita lia a coleção inteira. Enquanto a agenda e os horários não chegam, o site mostra "Carregando horários…" e **não oferece horário nenhum** (o horário padrão do config só vale quando a agenda chegou e está vazia).

### Escritas em transação
Bloquear, liberar e o agendamento manual usam `runTransaction` (todas as leituras antes das escritas): a dona nunca sobrescreve, sem querer, o horário que uma cliente acabou de pegar. Liberar só apaga `slots` com `status` bloqueado.

### Duração do serviço → bloqueio automático do horário seguinte
`agendaDia.ts` tem as funções puras: `duracaoTotal` (soma a duração dos serviços escolhidos), `horariosAfetados` (quais horários da tabela um serviço "come", a partir de uma hora) e `duracaoCabe` (algum deles já está ocupado?). `criarAgendamento`/`criarAgendamentoManual` recebem um `bloquearApos: string[]` opcional (calculado por quem chama) e, na mesma transação, criam um `slots` "bloqueado" pra cada horário afetado, com `origemAgendamento`. `recusarAgendamento` consulta `slots` por `origemAgendamento == id` antes de apagar, e libera junto. O manual e o site gravam esses bloqueios extras; do público, as regras só aceitam via `slotPublicoBloqueioOk` (mesmo dia, depois do horário do pedido, junto de um pedido novo — ver decisão 21 em `decisoes.md`).

## Regras de segurança
`firestore.rules` foi endurecido e testado no emulador em 28/09/2026 (`decisoes.md #15`), mas
**ainda não publicado** — a versão em produção é a anterior (menos restrita), até o deploy final.

- `servicos`, `disponibilidade`: **leitura pública**, **escrita só da Carin**. `config`:
  leitura e escrita só da Carin (não é lido pelo app hoje; antes a leitura era pública à toa).
- `slots` / `agendamentos`: **sempre criados juntos** (nunca um sem o outro — `existsAfter`
  do outro documento na mesma escrita), com o formato de cada campo validado (`hasOnly` das
  chaves certas, regex de `data`/`hora`, id determinístico, `criadoEm == request.time`).
  - Público: só cria pedido `pendente`.
  - Dona (`isDono()`): cria em qualquer status, incluindo bloqueios (`bloqueado`, manual ou
    automático via `origemAgendamento` — que também precisa existir na mesma escrita).
  - **update**: só a transição real que o app faz, `pendente → confirmado`, mudando só o
    `status` (confere campo a campo que nada mais mudou). Público nunca dá update/delete.
- Testado com `@firebase/rules-unit-testing` contra o emulador (`npm run test:regras`), não um
  banco falso — 41 testes, incluindo os payloads exatos que `src/lib/db.ts` grava. Duas
  pegadinhas da linguagem das regras (CEL) documentadas direto no `firestore.rules`: o ternário
  `?:` avalia os dois ramos (campo opcional precisa de `.get(chave, padrão)`, nunca acesso
  direto) e o `id` do `match` só é capturado por funções chamadas num nível só a partir dele
  (por isso vai sempre como parâmetro explícito).

## Painel (`/admin`)
Tema **escuro único** (o site público continua rosa, claro/escuro pelo sistema). Telas que sobem de baixo usam a `Folha` (`src/app/admin/compartilhado/Folha.tsx`: diálogo modal com X, Esc, toque no fundo, trava de rolagem e acompanhamento do teclado do iPhone) e o aviso com "Desfazer" (`useDesfazer`). Classes novas do painel levam o prefixo `pn-` em `globals.css`.

### Duas versões, lado a lado (Fase B em andamento)
- `src/app/admin/AdminGate.tsx`: contexto seguro → carregando → login → o painel escolhido
  (`render`), compartilhado pelas duas versões.
- **Clássico** (`src/app/admin/classico/`): o painel de sempre (rolagem única com sanfonas),
  servido em `/admin` (produção, sem mudança) e também em `/admin/classico` (acesso direto,
  "plano B" garantido pela Fase B4).
- **Novo** (`src/app/admin/painel/`): barra de abas + Agenda por dia, servido só em `/admin/nova`
  por enquanto (login real, ainda não é produção). `DadosProvider` centraliza uma assinatura por
  fonte (serviços, agenda, slots numa janela de -7 a +60 dias, agendamentos) para todo o painel
  novo — `useDados()` lê esse contexto; `carregando` só vira `true` depois de 250 ms sem os dados
  terem chegado, e um erro numa fonte (`erros.slots`, etc.) não derruba as outras. `AgendaDia`
  mostra o dia com 5 estados por horário (livre, confirmado, pedido, bloqueado, passado — via
  `itensDoDia`/`pedidosNoDia` em `agendaDia.ts`) e reaproveita `FolhaBloquear`/`liberarHorarios`
  (Fase A1) para bloquear/liberar. Tocar num horário **Livre** abre `FolhaAgendar` (mesmo
  formulário do manual clássico, sem campo de data — dia/hora já vêm da linha); tocar num
  **Confirmado** ou **Pedido** abre `FolhaDetalhe` (Confirmar/Recusar para pedido; reenviar
  confirmação/Cancelar horário para confirmado — mesmo padrão de WhatsApp aberto no toque do
  `AgendamentosManager`). "Mudar horário" não entra (decisão de 28/09/2026: a Carin resolve pelo
  WhatsApp). Serviços, Horários e Pedidos já têm telas próprias (Fase C, ver abaixo); só a aba
  Conta ainda reaproveita `NotificacoesCard` do clássico, já **sem a sanfona**: `CardColapsavel`
  ganhou um `abertoInicial?` opcional e `NotificacoesCard` um `semSanfona?` que repassa isso —
  dentro de uma aba dedicada, a seção já nasce aberta (a aba já é a sanfona). A aba Conta também
  tem `MeuLink.tsx`: o link público do site (`studio.siteUrl`, com fallback pra
  `NEXT_PUBLIC_SITE_URL`) com botão de copiar (Clipboard API, com fallback silencioso se a API
  falhar).
- `src/lib/datas.ts`: funções de data **sempre no fuso do salão** (`America/Sao_Paulo`,
  independente de onde o código roda), usadas só pelo painel novo — `utils.ts` (site + painel
  clássico) não foi tocado.
- `src/app/dev-preview-agenda/page.tsx`: prévia da Agenda com dados **fictícios**, sem precisar
  logar — não faz parte do fluxo real, só para revisão visual. Já mostra também Serviços e
  Horários com o redesenho da Fase C (Conta e Agenda também).

### Fase C (concluída, sem gestos de arrastar): acabamento definitivo do painel novo
Diferente da Fase B (que reaproveitava os componentes do clássico por trás das abas), a Fase C
troca cada aba por uma tela **própria do painel novo**, lendo do `DadosProvider`:
- **Serviços** (`painel/ServicosTab.tsx` + `FolhaServico.tsx`): lista + folha de criar/editar,
  com preço e duração visíveis em cada linha, excluir com diálogo de confirmação.
- **Horários** (`painel/HorariosTab.tsx` + `FolhaHorarioDia.tsx`): uma linha por dia da semana
  (resumo "09:00 às 18:00 · 8 horários" ou "Sem atendimento") + editor em folha por dia, com
  "Salvar e copiar para segunda a sexta"; lista "Próximas folgas" cujo toque leva ao dia certo na
  Agenda (`AgendaDia` ganhou um `diaInicial?` opcional para isso).
- **Pedidos** (`painel/PedidosTab.tsx`): Confirmar/Recusar (pendentes) e WhatsApp/Cancelar
  (confirmados de hoje em diante), mesmo padrão de toque-abre-aba-antes-do-await do clássico.
- **`src/app/admin/compartilhado/Dialogo.tsx`**: diálogo de confirmação próprio (substitui o
  `confirm()` nativo) usado por `FolhaServico` (excluir), `FolhaDetalhe` e `PedidosTab` (recusar
  pedido, cancelar horário) — o botão de ação do diálogo é quem chama `window.open` no toque,
  mantendo o padrão anti-bloqueio de popup do iPhone.
- **`src/lib/erroHumano.ts`**: mensagem de erro em português claro (sem código técnico) para as
  telas novas — separado do `detalheErro` do clássico, que é diagnóstico técnico. Em
  `FolhaDetalhe`/`PedidosTab` esse erro só aparece de verdade porque `gravarEAbrirWhatsapp`
  (`compartilhado/whatsappToque.ts`) ganhou um `onErro?` opcional — sem ele (uso do clássico,
  intocado) o erro continua só indo pro console, como sempre.
- **`src/app/admin/compartilhado/useOffline.ts`**: indicador de "sem conexão" no topo do painel
  (`navigator.onLine` + eventos `online`/`offline`).
- **Deep link de notificação**: `?aba=pedidos` na URL (lido na montagem do `PainelNovo`, depois
  limpo da URL) e, com o app já aberto, um `postMessage` do service worker (`notificationclick`
  em `firebase-messaging-sw.js`) — o clique numa aba já aberta só a foca, não recarrega a página.
  `TabBar.abaValida()` valida o texto antes de usar, dos dois jeitos.
- **"Bloquear todas as [dia da semana]"**: dentro de `FolhaBloquear`, "Dia todo" oferece repetir
  a folga nas próximas 12 semanas do mesmo dia (`datasRepetidas` em `agendaDia.ts`).
- Conta reaproveita `NotificacoesCard` do clássico (não lê o Firestore por conta própria, então
  não carrega a mesma dívida de performance das outras abas — considerada suficiente como está).
- **Gestos de arrastar (fechar a folha arrastando, deslizar a faixa da semana) — decidido não
  fazer** (29/09/2026): sem eles nada deixa de funcionar (a folha já fecha por X/Esc/toque fora;
  a semana já navega pelas setas ‹ ›) e evita o risco que o próprio plano original apontava —
  esse gesto no iPhone pode colidir com o gesto de voltar do sistema (borda esquerda).

## Site público (link na bio) — redesenho de 29/09/2026
Fontes **Manrope** (corpo, trocou o Inter) + **Fraunces** (serifada itálica — nome, preços,
título "Serviços & valores"); `--font-inter` segue existindo só para o painel (`.admin` fixa
essa fonte explicitamente, para não herdar a troca do `body`). Paleta rosa recalibrada para um
tom mais editorial (marfim/blush + berinjela profundo); **zero risco para o painel** porque
`.admin` já redefine sua própria paleta roxa por cima de todos esses tokens. Token novo
`--ink`/`--on-ink`: a "âncora" escura do botão "Agendar horário" **inverte com o tema** (escura
no claro, clara no escuro) — não reaproveita `--accent-cta` (que continua só no hover dos botões
pequenos de cada serviço). Avatar maior (136px) com o selo de verificada sobreposto na foto
(antes ficava do lado do nome). Duração de cada serviço agora aparece com um selo (`formatarDuracao`,
reaproveitado de `utils.ts`) quando o serviço tem `duracaoMin`. Lojinha (`t-loja`) e mapa real
(`<iframe>` do Google Maps) mantidos sem mudança estrutural. Nenhum componente do site tem teste
automatizado ainda (só `BookingSheet.test.tsx`).

## Notificações
1. **Push (principal):** ao criar o agendamento, o cliente chama `POST /api/notify-owner` (API route na Vercel) → servidor envia FCM para os `fcmTokens` da Carin → **notificação na tela** do celular mesmo com o app fechado.
2. **Bolinha (badge) no ícone:** o painel observa os pendentes em tempo real e usa a Badge API (`navigator.setAppBadge(n)` / `clearAppBadge()`) pra mostrar o número no ícone do app, igual app nativo.
3. **Confirmação ao cliente:** ao confirmar no painel, monta um link `wa.me/<numero>` com a mensagem pronta — a Carin toca enviar.

## PWA
`manifest.json` + service worker → painel instalável na tela, **sempre logado** (Firebase Auth com persistência local). O service worker também recebe o push do FCM em segundo plano.
