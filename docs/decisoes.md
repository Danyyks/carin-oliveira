# Log de decisões

Registro curto das decisões e o **porquê** — para não reabrir discussão depois.

### 1. Formato: link na bio (não landing page longa)
O uso real é o link na bio do Instagram. Referências: bento.me, Linktree, atom.bio — mas a engine é **nossa** (visão de SaaS próprio).

### 2. Tudo no plano gratuito
Firebase Spark + Vercel + `wa.me` + FCM. **Sem Cloud Functions** (exigem plano pago) — lógica no cliente + regras de segurança; push por API route na Vercel.

### 3. Agendamento: modelo pedido → confirmação
O cliente pede, a Carin confirma. Mantém ela no controle e evita choque de horário. Ver [`fluxo-agendamento.md`](fluxo-agendamento.md).

### 4. Confirmação por WhatsApp = `wa.me` (1 toque da Carin)
Envio 100% automático exigiria a **API oficial paga** do WhatsApp. No grátis, quem envia é a Carin, num toque, ao confirmar. Fica como upgrade futuro.

**Envio automático — o que foi levantado em 26/09/2026** (a pergunta foi: "e se a Carin usar o WhatsApp Business?"):
- Trocar para o **aplicativo** WhatsApp Business **não basta**: ele tem respostas automáticas (saudação, ausência, respostas rápidas), mas não deixa o nosso sistema enviar mensagens. Para isso é preciso a **API oficial da Meta** (WhatsApp Business Platform / Cloud API).
- Com a API, a confirmação sairia sozinha do servidor (rota na Vercel) ao confirmar ou lançar, sem abrir o WhatsApp (e sem o problema do iPhone).
- **Custo**: a Meta cobra por **mensagem de modelo entregue** (desde 01/07/2025); a categoria "utility" (confirmação de agendamento) fica em torno de **R$ 0,31 a R$ 0,38** no Brasil, segundo guias de terceiros (conferir na tabela oficial da Meta, publicada em planilha). É grátis quando a cliente escreveu primeiro nas últimas 24 h. Deixa de ser custo zero.
- **Exigências**: mensagens em **modelo pré-aprovado** pela Meta (texto com campos variáveis, sem a liberdade de hoje); **consentimento** da cliente para receber no WhatsApp (aviso no formulário); conta Meta Business; token guardado na Vercel.
- **Número da Carin**: pelo modo tradicional, o número passa a ser da API e deixa de funcionar no aplicativo. O **coexistence** permite manter o aplicativo Business e a API no **mesmo número** (app na versão 2.24.17 ou mais nova; deixam de funcionar recursos como lista de transmissão e mensagens temporárias), mas o cadastro é feito por um provedor ou Tech Provider.
- **Não usar** serviços "não oficiais" que ligam pelo WhatsApp Web: violam os termos e podem **banir o número** dela, que é o canal de trabalho.
- **Recomendação**: manter o envio em 1 toque (grátis, já padronizado) e só considerar a API se o volume crescer ou como recurso pago do futuro SaaS.
- **Decisão (26/09/2026)**: o Dany decidiu **manter como está** (envio em 1 toque). A API fica como possibilidade futura.

### 5. Anti-duplicidade sem transação
Id do agendamento determinístico (`data_hora`) + regra `create`-only. Segundo `create` no mesmo horário falha. Simples e grátis.

### 6. Aviso da Carin: push nativo (tela + bolinha no ícone)
Push (FCM) dá a sensação de app nativo: notificação na tela do celular mesmo com o app fechado + bolinha (badge) no ícone com o número de pendentes. Painel em tempo real quando aberto. O e-mail foi descartado — o push cobre o caso "app fechado" com muito mais cara de app nativo.

### 7. Painel como PWA, sempre logado
Firebase Auth com persistência local + instalação na tela. Também destrava o push no iPhone (iOS 16.4+ exige app instalado).

### 8. Avaliações de clientes fora do MVP
Retiradas a pedido do Dany (10/2026) — movidas para Fase 2+.

### 9. Design é prioridade
Não é detalhe: é o diferencial de venda do Dany. Toda tela deve ter acabamento dos melhores apps.

### 10. Painel: tema escuro único (28/09/2026)
O painel (`/admin`) passa a ter **um único tema, escuro**, independente do tema do sistema (o site público continua rosa, claro/escuro). Motivos: um só visual para projetar, testar e manter; combina com o relógio branco do iPhone no app instalado; o destaque de seleção fica legível (lavanda clara no escuro; o roxo escuro do tema anterior tinha contraste de só 2,1:1). Risco conhecido: tela escura sob sol forte, então o texto mantém contraste alto e vale conferir no aparelho da Carin ao ar livre. Implementação: tokens escuros direto em `.admin` (`globals.css`), `color-scheme: dark`, `theme_color` e `background_color` do manifest em `#14101c`.

### 11. Painel v2: Agenda por dia + barra de abas (planejado, 28/09/2026)
Direção aprovada, ainda não construída: tela principal **Agenda por dia** e **barra de navegação inferior** com 5 abas (Agenda, Pedidos, Horários, Serviços, Conta), no lugar da rolagem única com sanfonas. *Agenda = as datas; as outras abas = o que se repete ou se configura.* Entregas em fases pequenas, cada uma publicável: tema escuro, **bloqueio de horários de uma data**, endurecimento das regras do Firestore (testado no emulador), Agenda + abas, acabamento.

**Revisão (28/09/2026):** "Mudar horário" (A2) **retirada do plano** — quando um serviço não cabe no horário, a Carin já resolve pelo WhatsApp e refaz o lançamento no painel (cancelar + "+ Adicionar agendamento" no horário novo); não compensa construir uma tela própria pra isso. Fase D (busca por nome, horário extra visível no site) fica só como lista de ideias para o futuro, sem entrar no cronograma agora.

**Combinado à noite de 28/09/2026:** nada vai ao ar até o pacote inteiro (funções + a Agenda nova com abas) estar pronto e testado — um **deploy final único**, não uma publicação por etapa. Até lá, cada fase segue sendo feita e testada normalmente (é só a publicação que espera).

**Atualização (29/09/2026):** plano inteiro construído e testado (A, R, B0-B4, C) — ver decisões 18-20. `/admin` já abre o painel novo; falta só o deploy final único.

### 19. Redesenho do site público — link na bio (29/09/2026)

Depois de fechar a Fase C do painel (sem os gestos de arrastar — decisão do Dany: "podemos não
usar isso?", aceito porque nada quebra sem eles e evita o risco de colidir com o gesto de voltar
do iPhone), o Dany pediu pra modernizar o site que a cliente final vê (o link na bio), com uma
condição: **ver uma prévia antes de qualquer código**, focando em evidenciar foto/título dela e
em fontes mais bonitas. A prévia foi feita num Artifact tipo "Design" (mockup visual, zero código
do projeto tocado) e aprovada com uma observação (não esquecer o espaço da lojinha).

- **Fontes**: o site sai do par Inter+Fraunces pra **Manrope+Fraunces**. Fraunces (serifada
  variável, itálico) continua pro nome dela e agora também nos preços e no título "Serviços &
  valores" — mais presença editorial. Manrope troca o Inter no corpo do texto — mais quente e
  autoral, sem "cara de app genérico". **O painel continua 100% em Inter** — `--font-inter`
  segue existindo só pra ele; `.admin` ganhou `font-family: var(--font-inter)` explícito pra não
  herdar a troca do `body` (que virou Manrope, a fonte do site).
- **Paleta**: do rosa mais "candy" pra um tom marfim/blush (`--bg`) com berinjela profundo como
  cor de destaque (`--accent`/`--accent-deep` recalibrados) — mais editorial, ainda dentro da
  família rosa que já era a marca dela (decisão 1). **Zero risco pro painel**: `.admin` já
  redefinia sua própria paleta roxa por cima de TODOS esses tokens (confirmado lendo o CSS antes
  de mexer) — mudar os tokens do `:root` não toca uma cor sequer do painel.
- **Novo token `--ink`/`--on-ink`**: uma "âncora" escura pro botão principal "Agendar horário",
  que **inverte com o tema** — escura sobre fundo claro, clara sobre fundo escuro — em vez de
  usar `--accent-cta` (que continua servindo só o hover dos botões pequenos "Agendar" de cada
  serviço, sem mudar de papel).
- **Foto e nome evidenciados**: avatar de 92px foi pra 136px, com um brilho suave atrás e o selo
  de verificada (`VerifiedIcon`, já existia) migrou de "do lado do nome" pra sobreposto na foto —
  outro padrão comum em apps de rede social. Nome bem maior em itálico serifado.
- **Duração de cada serviço, visível** (pedido de 28/09/2026, ainda pendente até aqui): cada
  card de serviço agora mostra um selo com relógio e a duração (`formatarDuracao`, já existia,
  reaproveitado de `utils.ts`) quando o serviço tem `duracaoMin` cadastrado; sem duração, o selo
  simplesmente não aparece (nada quebra pros serviços antigos sem essa informação).
- **Lojinha mantida** (observação do Dany): o tile `t-loja` (banner com imagem de fundo, link pra
  loja de revendedora) não foi tocado na estrutura, só herda o novo raio/sombra dos outros tiles.
- **Mapa real mantido**: o card de localização parece com o mockup, mas o `<iframe>` de verdade
  do Google Maps continua funcionando (o formato de mockup usado na prévia não permite iframe,
  então lá foi só um placeholder visual — na implementação real o mapa funcional foi preservado).
- **Bug achado e corrigido durante a implementação**: o selo "Mais pedido" ficou esticando a
  largura inteira do card — o seletor novo `.svc-row .info span` (pra estilizar a descrição do
  serviço) sem querer também pegava o `<span class="svc-selo">` aninhado dentro do `<b>` do nome,
  porque `.info span` combina qualquer `span` descendente, não só filho direto. Corrigido trocando
  pra `.info > span` (filho direto), que pega só a descrição.
- **Testado ao vivo** com dados reais da cliente (leitura pública de `servicos`, sem gravar nada):
  claro e escuro, painel confirmado intocado (mesma fonte Inter, mesmo roxo `--accent-cta:
  #6d28b8`) via inspeção do DOM.
- **Testes**: 452 (sem mudança — os componentes do site não têm teste automatizado ainda, só
  `BookingSheet.test.tsx`, que continuou passando). `tsc`/`eslint`/`next build` sem nada novo.
- **Ainda não publicado.**

### 20. Fase B4: `/admin` passa a abrir o painel novo, testes finais e materiais pré-deploy (29/09/2026)

Pedido do Dany antes do deploy final: testar tudo, ajustar o texto do link da bio ("cole na bio
do Instagram" → "...ou de outras redes sociais"), atualizar o README com prints reais e preparar
um PDF de novidades pra Carin entender o fluxo. Depois de tudo pronto, perguntei se ele queria
aproveitar e já fazer a Fase B4 (o único passo que faltava do plano do painel v2) — ele confirmou.

- **B4 implementada**: `admin/page.tsx` passou a decidir qual painel mostrar, lido uma vez no
  mount — `localStorage["painel-carin:versao"] === "classico"` abre `DashboardClassico`,
  qualquer outro valor (incluindo nunca ter sido definido) abre `PainelNovo`. `/admin/classico`
  continua fixo no clássico e `/admin/nova` fixo no novo, então o plano B por aparelho não
  depende de decorar uma URL nem de outro deploy.
- **Prints reais do README**: como o repositório é **público**, os prints da Agenda e dos
  Pedidos usam a prévia com dados fictícios (`/dev-preview-agenda`) em vez de uma cliente real
  logada — o site (foto e nome da Carin) já é público por natureza (é o link da bio dela), então
  usar print real dele não expõe nada de novo.
- **Achado, não é bug**: testando a prévia sem login, `FolhaBloquear` sempre lê `agendamentos` de
  verdade (por desenho, mesmo dentro da prévia) e isso falha com `permission-denied` sem
  autenticação — na produção a dona está sempre logada, então nunca acontece; o efeito na prévia
  é só não mostrar o nome da cliente no horário ocupado.
- **Testes**: 455 no total (3 novos em `admin/page.test.tsx`, cobrindo os três casos da troca).
  `tsc`/`eslint`/`next build` sem nada novo. Testado ao vivo que `/admin` e `/admin/classico`
  continuam abrindo a tela de login normalmente, sem regressão.
- **Ainda não publicado** — pronto pro deploy final único.

### 22. Agenda aberta até 3 meses à frente, escolhida pela Carin (07/10/2026)

Clientes queriam garantir vaga em dezembro e o site só mostrava os próximos 14 dias (fixo no
código, por economia de leituras). Prévia visual aprovada pelo Dany antes do código.
- **Quem decide é a Carin**, na aba Horários: "Até quando as clientes podem marcar" — 2 semanas, 1
  mês, 2 meses ou 3 meses (`disponibilidade/regras.antecedenciaDias` = 14/30/60/90). Sem escolha
  salva, continua 14 (nada muda pra quem não mexer). Mais que 3 meses ficou de fora: quanto mais
  longe, maior a chance de esquecimento e de mudar preço/horário antes.
- **Site troca a fileira de dias por um calendário do mês** com setas: 90 botões numa fileira não
  cabem no celular. Dia tocável = tem horário livre; apagado = sem horário/fora do limite; riscado =
  folga. As setas param no mês de amanhã e no mês do limite.
- **Leitura por mês**: o site lê os `slots` só do mês que está na tela (não os 3 meses de uma vez),
  então abrir mais a agenda não multiplica o custo de cada visita. Ao trocar de mês, os dias só ficam
  tocáveis quando os ocupados daquele mês chegaram (nunca "livre" por engano).
- **Painel acompanha**: a janela de leitura do `DadosProvider` foi de +60 pra +120 dias — senão um
  horário já marcado lá na frente apareceria "Livre" na Agenda.
- Lembrete na própria opção (acima de 1 mês): marcar as folgas do período antes de abrir.
- Sem mudança nas regras do Firestore (`disponibilidade` já é escrita só pela dona, leitura pública).

### 21. Pedido do site também fecha o horário seguinte do serviço longo (02/10/2026)

Achado no teste ponta a ponta antes do deploy: com duração cadastrada, um pedido do site às 11:00 de um
serviço de 2h deixava as 12:00 livres pra outra cliente (o site só filtrava o que oferecia, nunca gravava
o bloqueio — a decisão 14 tinha deixado isso pra depois do endurecimento das regras). Corrigido agora que
as regras estão endurecidas e testadas no emulador:
- `BookingSheet` manda `bloquearApos` (os horários que a duração come) e `criarAgendamento` grava os
  slots "bloqueado" com `origemAgendamento` na mesma transação do pedido.
- Regra nova `slotPublicoBloqueioOk`: o público só cria um slot "bloqueado" no **mesmo dia**, **depois** do
  horário do pedido, sem campo extra, e com `origemAgendamento` apontando pra um agendamento que **não
  existia antes e existe depois** desta escrita (nasce junto). Não dá pra pendurar bloqueio em pedido
  antigo ou de outra pessoa. Abuso possível (alguém criar um pedido falso + bloqueios no resto do dia)
  não é maior do que já era (pedidos falsos em todos os horários); recusar o pedido apaga tudo junto.
- Deploy: publicar o app ANTES das regras novas (o app novo funciona com as regras antigas — só o
  bloqueio automático do site fica recusado nesse intervalo; o contrário poderia recusar pedidos do app
  antigo), e logo depois `firebase deploy --only firestore:rules`.

### 18. Fase C (parte 2): Pedidos, erros visíveis, "bloquear mesmo dia da semana", offline e deep link (29/09/2026)

Continuação direta da parte 1, no dia seguinte ("vamos continuar de onde paramos").

- **Pedidos** (`PedidosTab.tsx`) ganhou o mesmo tratamento de Serviços/Horários: tela própria
  lendo do `DadosProvider`, sem assinatura extra do Firestore. A bolinha do ícone do app
  (`setAppBadge`) subiu do componente da aba pro shell (`PainelNovo.tsx`) — antes só existia
  enquanto a aba Pedidos estava montada (bug latente herdado do clássico: se ela abrisse o
  painel direto na Agenda, a bolinha nunca era limpa/atualizada até tocar em Pedidos).
- **Bug real encontrado e corrigido**: `gravarEAbrirWhatsapp` (usada por `FolhaDetalhe` e agora
  por `PedidosTab`) sempre engoliu o erro de gravação em silêncio (só `console.error`) — os
  `try/catch` com `erroHumano` que a Fase C parte 1 tinha acabado de adicionar em volta dela
  **nunca disparavam de verdade**, porque a função nunca relança o erro. Corrigido com um 4º
  parâmetro opcional `onErro?` (aditivo — sem ele, comportamento idêntico ao de sempre, o painel
  clássico não muda nada) que `PedidosTab` e `FolhaDetalhe` agora usam para mostrar
  `erroHumano(e)` na tela **e manter a folha/o pedido aberto** (antes fechava mesmo com falha).
- **"Bloquear todas as [mesmo dia da semana]"**: dentro de `FolhaBloquear`, marcar "Dia todo"
  agora oferece "Repetir nas próximas 12 [terças/sextas/...]" — usa o dia da semana que ela
  escolheu (não é fixo em sexta; "sextas" no plano original era só o exemplo mais comum). Nova
  função pura `datasRepetidas(dataInicial, semanas)` em `agendaDia.ts` (mesma data, de 7 em 7
  dias) grava tudo com um único `bloquearDias([...])` — mesmo padrão de "juntar tudo numa
  escrita e não regravar a lista inteira" das outras folgas. Desfazer libera as mesmas datas.
- **Indicador offline** (`useOffline.ts` + banner no shell): olha `navigator.onLine` e os
  eventos `online`/`offline`; um aviso aparece no topo do painel quando cai a conexão, coerente
  com o padrão "erro em português, sem código técnico" da Fase C.
- **Deep link da notificação** (`?aba=pedidos` na URL): a notificação de novo pedido agora leva
  direto pra aba Pedidos, dos dois jeitos possíveis — app fechado (a URL já vem com `?aba=` e
  `PainelNovo` lê na montagem, depois limpa a URL) e app já aberto numa aba (o clique só *foca*
  a janela existente, não recarrega — por isso o `notificationclick` do service worker manda um
  `postMessage`, e `PainelNovo` ouve e troca de aba sozinho). `abaValida()` (`TabBar.tsx`) valida
  o texto que vem da URL/mensagem antes de usar. O mecanismo aceita `?dia=` também (genérico,
  pronto pra um futuro tipo de notificação que aponte pra um dia específico — hoje só existe a
  notificação de "novo pedido").
- **Testes**: 452 no total (eram 420). `tsc`/`eslint`/`next build` sem nada novo. Validado ao
  vivo: Pedidos (lista, Confirmar, diálogo de Recusar), e "Repetir nas próximas 12 terças" (hoje
  é terça) mudando o texto do botão pra "Marcar 12 terças" corretamente.
- **Ainda falta na Fase C**: gestos de arrastar (fechar a folha arrastando, deslizar a faixa da
  semana) — deixado por último de propósito: é o item mais delicado (o próprio plano original já
  avisava do risco do gesto de borda do iOS) e pede teste num aparelho de verdade, não só no
  navegador. Conta foi considerada suficiente como está (não tem leitura duplicada do Firestore
  como as outras abas tinham, então não carregava a mesma dívida técnica).

### 17. Fase C (parte 1): Serviços e Horários com redesenho definitivo (28/09/2026)

Depois de fechar a Fase B inteira, o Dany pediu para passar pela Fase C **antes** da B4 (virada de
produção), "pra já deixarmos refinado os acabamentos geral" — e junto, avisou que quer atualizar o
design do link na bio (site da cliente) depois da Fase C, com prévia aprovada antes de mexer em
código (fica registrado como próximo passo, não começado ainda).

- **Serviços e Horários deixam de reaproveitar o painel clássico**: `ServicosTab.tsx` e
  `HorariosTab.tsx` (+ `FolhaServico.tsx`, `FolhaHorarioDia.tsx`) são telas novas, próprias do
  painel novo, lendo do `DadosProvider` (`useDados()`) em vez de abrir uma assinatura própria do
  Firestore — fecha a dívida que a Fase B tinha deixado registrada ("a leitura única... é trabalho
  da Fase C"). O painel clássico (`classico/ServicosManager.tsx`, `HorariosManager.tsx`,
  `CalendarioFolgas.tsx`) continua existindo do jeito que está, intocado — plano B garantido.
- **Horários vira "uma linha por dia" + editor em folha**, com o botão "Salvar e copiar para
  segunda a sexta" (só aparece editando um dia útil) — em vez da grade fixa de 7 linhas x 23
  colunas do clássico. "Próximas folgas" veio para dentro da mesma aba (antes vivia dentro de
  "Horários" também no clássico, mas como sanfona separada) e agora **o toque leva pro dia na
  Agenda** (a folga só se desfaz pelo fluxo de Bloquear/Liberar da Agenda, que já sabe transformar
  "Bloquear" em "Liberar o dia" quando ele já está de folga — decisão 12). Isso exigiu dar à
  `AgendaDia` um `diaInicial?` opcional (о dia de abertura, lido só na montagem — cada troca de
  aba já desmonta e remonta o componente, então não precisou de mecanismo novo de navegação).
- **Diálogo de confirmação próprio (`Dialogo.tsx`)** substitui o `confirm()` nativo do navegador
  nas telas novas que fazem exclusão/recusa/cancelamento (`FolhaServico` ao excluir serviço,
  `FolhaDetalhe` ao recusar pedido ou cancelar horário) — o `confirm()` do iPhone sai feio, fora do
  tema escuro, e trava a aba. O botão de ação do próprio diálogo é quem abre a aba do WhatsApp
  **dentro do toque** (mesmo padrão de sempre), então o diálogo não quebra a regra do iPhone contra
  popup bloqueado. O painel clássico continua usando `confirm()` nativo (intocado).
- **`erroHumano(e)`** (`src/lib/erroHumano.ts`) é a mensagem de erro em português claro que as
  telas novas mostram (ex.: "Sem conexão com a internet agora. Tente de novo."), separado do
  `detalheErro` do clássico (que mostra o código técnico + uid, pensado pra debug, não pra Carin
  ler). Mapeia os códigos mais comuns do Firestore e cai num "Algo deu errado" genérico pro resto.
- **Corrigido bug real em `notify-owner/route.ts:47`**: o corpo da notificação push referenciava
  `dados.servicoNome`, um campo que nunca existiu (o schema real é `dados.servicos` — array de
  `{nome, preco}`) — a notificação de novo pedido mostrava só o nome da cliente, nunca o serviço.
  Corrigido para montar o resumo a partir do array de verdade (primeiro serviço + "+N" quando há
  mais de um, igual ao padrão já usado nas mensagens de WhatsApp).
- **Ainda dentro da Fase C, não feito nesta parte**: redesenho definitivo da aba Conta (hoje
  reaproveita `NotificacoesCard` do clássico, que não tem leitura própria do Firestore então não
  é dívida de performance — só falta o acabamento visual), deep link da notificação, "Bloquear
  todas as sextas", indicador offline, gestos de arrastar.

### 16. Fase B0 + B1: fundação do painel novo e Agenda por dia (28/09/2026)

Depois da Fase R, seguiu direto para a Fase B (Agenda por dia + barra de abas), por pedido do
Dany ("pode prosseguir com a próxima etapa do plano"). Decisões tomadas na execução:

- **Nada muda no `/admin` de produção ainda.** B0 moveu o painel clássico para `classico/` sem
  alterar seu comportamento (mesmo teste de caracterização criado antes de mover); o painel novo
  vive só em `/admin/nova` (login real) e numa página de prévia com dados fictícios, nenhuma das
  duas linkada de lugar nenhum. A troca de verdade é a Fase B4, só depois de tudo pronto.
- **Fuso do salão isolado em `datas.ts`**: em vez de mudar `utils.ts` (usado pelo site e pelo
  painel clássico, já testado e funcionando), as funções de data do painel novo (fuso
  `America/Sao_Paulo` explícito, não o do aparelho) ficam num arquivo à parte. Reduz o risco de
  quebrar algo que já funciona só para dar suporte a uma tela nova.
- **Abas Pedidos/Horários/Serviços/Conta reaproveitam os componentes do painel clássico como
  estão** (cada uma com sua própria leitura do Firestore, redundante com o `DadosProvider` da
  Agenda) — decisão consciente para entregar uma prévia completa e funcional agora, com o
  redesenho + leitura única ficando para a Fase B3 (já estava assim no plano original).
  Sem isso, a prévia teria abas em branco por mais duas semanas de trabalho.
- **"Bloquear" e "Liberar" já entram funcionando na Agenda nova**, reaproveitando
  `FolhaBloquear`/`liberarHorarios` (Fase A1, já testados) — não é lógica de escrita nova, só a
  mesma função tocada de um lugar novo. `FolhaBloquear` ganhou um `dataInicial` opcional
  (aditivo, testado, não muda quem já a chama sem essa prop).
- **`ouvirServicos`/`ouvirAgenda`/`ouvirSlots`/`ouvirAgendamentos`** ganharam um callback de erro
  opcional (`onErro?`) para o `DadosProvider` degradar por fonte — aditivo, quem não passa nada
  mantém o comportamento de sempre (só loga no console), confirmado pelos 41 testes de `db.test.ts`
  continuando 100% verdes sem alteração.
- **B2 (mesmo dia)**: `FolhaAgendar` (tocar num Livre) e `FolhaDetalhe` (tocar num Confirmado ou
  Pedido) — ambas lendo do `DadosProvider`, sem assinar o Firestore de novo. "Mudar horário" **não**
  entrou em `FolhaDetalhe`, coerente com a decisão que já tinha tirado essa função do plano (a Carin
  resolve pelo WhatsApp). Testado ao vivo (sem login) contra o Firestore de produção: a tentativa de
  criar um agendamento de teste foi recusada pelas regras de segurança reais — confirma que a
  proteção não depende só do código da tela.
- **B3 (mesmo dia) + pedido novo do Dany**: junto de fechar a B3 (abas sem sanfona), o Dany pediu
  um link copiável do site no painel dela, "igual ao que criamos no nosso projeto de link na bio"
  (Linkaê — ainda em fase de ideias, mas o padrão de UI copy-to-clipboard é conhecido). Implementado
  como `studio.siteUrl` (novo campo de config do tenant, com fallback pra `NEXT_PUBLIC_SITE_URL`)
  + `MeuLink.tsx` na aba Conta. O "redesenho definitivo" de Horários/Serviços/Conta que o plano
  original chamava de "Fase B3" na verdade é trabalho da **Fase C** (o texto do plano já dizia
  isso: "redesenho definitivo na Fase C") — o que a Fase B3 realmente entrega é só hospedar os
  blocos clássicos sem a sanfona, o que já está pronto.

### 15. Regras do Firestore endurecidas (Fase R, testado no emulador — 28/09/2026)
`firestore.rules` reescrito: formato exato de cada campo, id sempre `data_hora`, `criadoEm` sempre do servidor, `slots` e `agendamentos` sempre criados **juntos** (nunca um sem o outro — vale pro público e pra dona), e `update` restrito à única transição real que o app faz (`pendente` → `confirmado`, mudando só o `status`). Ainda não publicado — fica pro deploy final, junto com a Agenda nova.

- **Ferramentas**: `@firebase/rules-unit-testing`, emulador do Firestore local (`firebase.json` ganhou o bloco `emulators`), `vitest.rules.config.ts` separado, `npm run test:regras` (`scripts/test-regras.mjs` sobe o emulador com o Java certo). O Java 25 padrão do sistema não foi testado; o script usa o JDK 21 de `~/.jdks/jbr-21.0.11` quando existe.
- **41 testes** contra o emulador de verdade (não um banco falso): leitura pública x da dona, todos os payloads reais das funções de `db.ts`, o acoplamento slot↔agendamento, e o bloqueio automático da duração (`origemAgendamento`). Estragado de propósito depois (17 mutações nas regras) — todas pegas, incluindo 3 que escaparam na primeira rodada por bugs nos MEUS testes (não nas regras), corrigidos.
- **Duas pegadinhas da linguagem das regras (CEL), aprendidas testando no emulador** (documentadas direto no `firestore.rules`): (1) o operador ternário `cond ? a : b` avalia os DOIS ramos — acessar um campo opcional que não existe (`d.origemAgendamento` sem ele estar lá) lança um erro de verdade, não `false`, e quebra a regra inteira; a correção é `d.get('campo', valorPadrão)`. (2) o `id` de um `match /colecao/{id}` só é capturado direito por funções chamadas **num nível só** a partir do match; numa cadeia de 2+ funções, o motor de regras não resolve `id` e quebra com erro. Por isso todas as funções agora recebem `id` como **parâmetro explícito**, nunca por escopo léxico.
- **Sem mudança de comportamento pro app hoje**: as regras atuais (menos restritas) continuam publicadas; isso é só o preparo testado, aguardando o deploy final.

### 12. Bloqueio de horários = documento em `slots` com status "bloqueado" (feito em 28/09/2026)
Bloquear um horário cria `slots/{data_hora}` com `status: "bloqueado"`, sem motivo (a coleção é pública); liberar apaga. O site já esconde qualquer doc de `slots`, e a colisão de id impede pedido público no mesmo horário. Folga de dia inteiro continua em `disponibilidade/regras.bloqueios`. Escritas novas em transação, para a dona nunca sobrescrever uma reserva sem querer.
Decisões junto: os atalhos Manhã / Tarde / Noite / Dia todo **só marcam** (nada é gravado até o botão do rodapé), para a dona sempre ver antes o que vai acontecer; marcar todos os horários livres vira folga do dia inteiro; a folga de um dia com cliente **fecha só os horários livres** (as clientes ficam); liberar nunca apaga o horário de uma cliente.

### 13. Site só lê a agenda quando a cliente abre o agendamento (28/09/2026)
A cota grátis do Firestore é de leituras por dia, e cada visita ao link na bio lia a coleção `slots` inteira. Agora a agenda e os horários só são assinados quando o sheet abre, e só a janela que ele oferece (amanhã a +14 dias). Enquanto não chegam (ou se a leitura falhar), **nenhum horário é oferecido**: melhor mostrar "Carregando horários…" do que um horário que talvez esteja ocupado.

### 14. Duração dos serviços bloqueia sozinho o horário seguinte (28/09/2026)
Pedido do Dany: cada serviço ganha uma **duração opcional** (minutos); se ela for maior que o intervalo até o próximo horário da tabela, esse horário seguinte fica indisponível sozinho — ninguém marca em cima de um serviço que ainda não terminou. Decisões:
- **Sem duração cadastrada, nada muda** — serviço antigo continua se comportando exatamente como antes (retrocompatível, nenhum agendamento existente é tocado).
- **"Próximo horário"** = o próximo da **tabela da Carin** naquele dia (não um horário qualquer). Serviço que termina bem na hora do próximo não bloqueia nada (só o que passa da hora).
- Vários serviços no mesmo agendamento **somam** a duração.
- **Agendamento manual (Carin)**: bloqueio automático completo — grava o(s) horário(s) seguinte(s) como `slots` "bloqueado" com `origemAgendamento` apontando pro agendamento; **cancelar/recusar libera esse bloqueio junto**, automaticamente.
- **Pedido do site (cliente)**: por ora só **filtra** os horários oferecidos (não mostra um horário cuja duração bateria em algo já ocupado) — ainda **não escreve** um bloqueio novo pro horário seguinte. Motivo: as regras públicas do Firestore hoje só permitem o público criar `slots` com `status: "pendente"`; deixar o público criar também um `"bloqueado"` amarrado por `origemAgendamento` exige acoplar essa escrita à existência do agendamento nas regras (o mesmo trabalho já previsto como **R2** na Fase R), e isso **não vai pra produção sem passar pelo emulador** primeiro (decisão já tomada no item 11). Até lá, o site protege pelo lado da leitura (nunca oferece o horário problemático) — o risco que sobra é só a janela entre duas clientes pedindo quase ao mesmo tempo, do jeito que já era antes desta função existir.
