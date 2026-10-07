# Melhorias pendentes (débito técnico)

Resultado da revisão completa (14/09/2026) feita por subagentes de **design (UI/UX)**,
**qualidade de código** e **testes**. Abaixo, o que já foi aplicado e o que ficou como
próximo passo. Nada aqui é bloqueante para o uso atual.

## ✅ Já aplicado nesta revisão

**Segurança / código**
- Regras do Firestore agora validam o **id determinístico** (`id == data_'_'hora`) no `create` de `slots` e `agendamentos` — trava a duplicidade mesmo fora do app.
- Limites de tamanho/tipo em todos os campos de `agendamentos` (evita documentos-lixo gigantes).
- `/api/notify-owner` agora **valida no servidor** que o agendamento existe e está `pendente` antes de disparar push (evita push falso/spam) e não vaza mensagens de erro internas.
- Listeners `onSnapshot` com callback de erro (não falham mais em silêncio).
- `useAuth`: timeout de fallback cancelado quando o auth resolve antes.

**Design / acessibilidade**
- Botão principal (CTA) e chip ativo com token de cor de contraste **AA** (`--accent-cta`).
- Texto secundário (`--text-muted`) escurecido no tema claro para atingir AA.
- Campos "Nome" e "WhatsApp" do agendamento com **label visível** (não somem ao digitar).
- `aria-hidden` nas setas decorativas; alvos de toque maiores (≥40px) em botões pequenos; feedback tátil (`:active`) no botão do admin.
- Mini-mapa não "prende" mais a rolagem no celular (fica visual; "Como chegar" abre o Maps).

**Testes**
- Vitest configurado + 26 testes das funções do "motor" (`brl`, `wppUrl`, `proximosDias`).

## ✅ Aplicado depois (17/09/2026) — cards de agendamento no painel

Retoque de UI/UX (subagente ux-ui), só visual, sem tocar na lógica:
- **Fim do vazamento dos botões**: `.ag-item` empilha no mobile (info em cima ocupando a largura,
  ações embaixo com os botões em `flex:1` dividindo o espaço) + `overflow-wrap` no nome/serviço.
  Nomes longos não empurram mais os botões pra fora do card.
- **Cores de ação semânticas** (tokens escopados em `.admin`, claro e escuro):
  `--danger` / `--danger-bg` (Cancelar/Recusar/Excluir, vermelho suave já no estado normal — no
  celular não há hover) e `--success-wpp` / `--success-wpp-bg` + classe `.ag-whatsapp` (verde do
  WhatsApp). "Confirmar" segue com o roxo cheio (`.adm-btn`).
- Alvo de toque dos botões pequenos subiu para **≥44px** (`.adm-mini`).

## ✅ Aplicado depois (18/09/2026) — painel em sanfonas

O painel ficou longo (6 blocos). Agora as **seções de configuração** são colapsáveis:
- Componente `CardColapsavel` (título clicável + setinha que gira). **Fechado mostra só o título**
  — o corpo só é renderizado quando aberto (`{aberto && …}`), com um fade suave de entrada
  (`@keyframes adm-col-in`); todos os cards fechados ficam do mesmo tamanho. Classes `.adm-col*`.
- Aplicado em Notificações, Tabela de preços, Dias e horários e Folgas — **fechadas por padrão**.
- **Agendamentos** e **"+ Adicionar agendamento"** ficam **fora da sanfona**, sempre visíveis
  (é o que a dona consulta e para onde a notificação a leva).
- **Resumo no título** mesmo fechado (ex.: "8 serviços", "2 folgas", "6 dias", "ativadas").

## ✅ Aplicado depois (22/09/2026) — WhatsApp não abria no iPhone ao confirmar

Bug relatado em produção: no iPhone da Carin (app instalado), tocar em **Confirmar** marcava
o agendamento, mas **não abria o WhatsApp** — a cliente não recebia a mensagem. No desktop
funcionava.

- **Causa**: o `window.open(...)` rodava **depois** do `await` da escrita no Firestore. O iOS
  (Safari e, ainda mais, PWA instalado) só permite abrir aba nova **dentro do mesmo gesto de
  toque**; feito "depois", ele bloqueia silenciosamente.
- **Correção** (só em `admin/page.tsx`, sem tocar em banco/regras/visual): a aba do WhatsApp é
  aberta **antes do `await`** (`window.open("", "_blank")` no toque) e só recebe a URL depois
  que a confirmação grava. Helper `abrirWhatsapp(win, url)`: se o iPhone ainda bloquear a aba
  (`win` nulo), navega na **própria aba** (que o iOS nunca bloqueia). Mesma correção em
  **confirmar**, **recusar** e **cancelar**.
- **Verificação final** é no iPhone da Carin (não reproduzível no desktop): confirmar um
  agendamento de teste e ver o WhatsApp abrir com a mensagem pronta.

## ✅ Aplicado depois (23/09/2026) — confirmados antigos somem do painel

A lista de **confirmados** ia acumulando pra sempre. Agora ela se limpa sozinha: um
agendamento confirmado fica visível **o dia inteiro do atendimento** e **some na virada do
dia seguinte** (opção B).

- Helper `hojeKey()` em `utils.ts` (data de hoje "YYYY-MM-DD", mesma base de `proximosDias`).
- Filtro no `AgendamentosManager`: `confirmado && a.data >= hoje` (comparação de string
  já funciona no formato ISO). **Só esconde da lista** — o registro **continua salvo** no
  banco (histórico preservado; nada é apagado).
- Hook `useHoje()` mantém o "hoje" atualizado sozinho: ao voltar pro app (`visibilitychange`,
  `focus`, `pageshow` — o iPhone pausa o PWA em segundo plano) e a cada minuto. Assim os de
  ontem somem mesmo se o app ficar aberto de um dia pro outro.
- Publicado em 24/09/2026.
- **Pendentes** não são filtrados: um pedido antigo não confirmado continua aparecendo pra
  a dona resolver.
- +2 testes de `hojeKey` (30 no total).

## ✅ Aplicado depois (26/09/2026) — agendamento manual: horários em botões + confirmação pro WhatsApp

Pedido da Carin: ao lançar uma cliente da agenda manual, ela precisava olhar a lista lá de cima
pra ver quem já estava marcado (o formulário mostrava todos os horários iguais, num seletor
nativo), e a cliente não recebia a mensagem de confirmação (o manual entra direto como
confirmado e nunca passava pelo botão "Confirmar").

- **Confirmação (prioridade)**: depois de salvar, botão "Enviar confirmação no WhatsApp" com a
  mesma mensagem do "Confirmar" (`linkConfirmacao` em `mensagens.ts`). É um botão tocado direto
  (não uma abertura automática) por causa do bloqueio de janela do iPhone, e só aparece depois de
  gravar. Sem WhatsApp: aviso no lugar. Não é envio automático (API paga do WhatsApp fora do escopo).
- **Horários em botões**: ao escolher a data aparecem os horários da tabela daquele dia; os ocupados
  ficam apagados com o primeiro nome da cliente; "Outro horário" abre a digitação livre
  (exceções); folga avisa mas deixa registrar. Lógica pura em `lib/agendaDia.ts` (`horariosDoDia`).
- **Botão "WhatsApp" da lista de confirmados padronizado**: antes abria só a conversa em branco; agora
  abre a mesma confirmação pronta do "Confirmar" e do agendamento manual (`linkConfirmacao`), e serve
  de "reenviar". Igual para agendamentos do site e manuais. A lista saiu do `page.tsx` para
  `admin/AgendamentosManager.tsx` (testável), sem mudar o comportamento.
- **Aba em branco no iPhone**: se a gravação falhar depois de a aba do WhatsApp já ter sido aberta no
  toque, a aba é fechada (antes ficava uma aba em branco) e o WhatsApp não é aberto.
- **Correções junto**: `zap()` não confunde mais o DDD 55 (RS) com o DDI (só considera DDI se o
  número passar de 11 dígitos); o campo de data usava UTC (`toISOString`) e, depois das 21h, achava
  que "hoje" era amanhã; `agenda.dias` ausente (só folgas salvas) não quebra a tela.
- **Organização**: o formulário saiu do `page.tsx` para `admin/NovoAgendamentoManual.tsx` (assim é
  testável); `zap` foi para `utils.ts` e `detalheErro` para `admin/detalheErro.ts`.
- **Testes**: entram jsdom + Testing Library (só desenvolvimento) e o atalho `@/` no Vitest. 78 testes
  no total (eram 30): confirmação, horários, `zap`, `diaDaSemana` e as telas do formulário e da lista
  simulando a dona (inclui a abertura da aba no toque, que protege o conserto do iPhone). Os testes
  foram validados "estragando" o código de propósito (todos os defeitos foram pegos).
- **Verificação visual** com dados reais de produção (só leitura), nos temas claro e escuro.
- **A conferir no iPhone da Carin**: o botão "Enviar confirmação" abrindo o WhatsApp com a mensagem.

## ✅ Aplicado depois (28/09/2026) — painel em tema escuro único (etapa A0 do painel v2)

Primeira etapa do plano do painel v2 (ver `decisoes.md`, itens 10 a 12). Só visual, sem mudar lógica:

- **Um tema só, escuro**, também com o iPhone em modo claro: os tokens escuros passaram a ser o padrão de `.admin` (`color-scheme: dark`) e o fundo atrás da página é escuro (a rolagem elástica do iPhone não mostra mais o rosa do site).
- `theme_color`/`background_color` do manifest e `themeColor` do layout em `#14101c`; o botão "Instalar app" usa os mesmos tokens.
- **Cores por token**: erro, sucesso, tag "confirmado" e calendário de folgas deixaram de ter cor fixa clara.
- **Correções de iPhone junto**: campos do painel em 17 px e do formulário do site em 16 px (abaixo disso o iPhone dá zoom ao focar); `:hover` só onde há mouse (no iPhone o botão ficava roxo depois do toque); texto legível nos botões em hover; tracinho das folhas visível nos dois temas.
- Verificado no navegador com o sistema em modo claro: login, cartões, botões, calendário e chips ficam escuros. O tema claro do painel foi removido.
- **A conferir no aparelho da Carin**: leitura da tela ao ar livre.
- ✅ **Feito (29/09/2026)**: prints do README refeitos — site com o redesenho novo e painel novo (Agenda, Pedidos) em tema escuro, com dados fictícios. Arquivos renomeados para `docs/imagens/site-perfil.jpg`, `site-servicos.jpg`, `painel-agenda.jpg` e `painel-pedidos.jpg`.

## ✅ Aplicado depois (28/09/2026) — bloquear só alguns horários de uma data (etapa A1 do painel v2)

Pedido: a Carin queria fechar só a manhã de uma sexta específica, sem mexer nas outras sextas nem
bloquear o dia inteiro. Antes só existia folga de dia inteiro ou mudar a tabela da semana toda.

- **Botão "Bloquear horários"** ao lado de "+ Adicionar agendamento". Abre uma folha: escolhe o dia
  (fileira de 14 dias ou "Outra data"), toca nos horários ou em Manhã / Tarde / Noite / Dia todo, e o
  botão do rodapé diz o que vai acontecer ("Bloquear 3 horários"). Aviso **com Desfazer** por 6 s.
  Detalhes em `fluxo-agendamento.md`.
- **Modelo**: horário bloqueado = `slots/{data_hora}` com `status: "bloqueado"`; liberar apaga só esse
  status (nunca o horário de uma cliente). "Dia todo" vira folga (`bloqueios`, com `arrayUnion`).
  Tudo em transação. O agendamento manual mostra "Bloqueado" e não deixa salvar nesse horário.
- **Site (`BookingSheet`)**: só lê a agenda e os horários **quando a cliente abre o sheet**, e só a
  janela de amanhã a +14 dias (antes, cada visita lia a coleção `slots` inteira; ver "Filtro por data"
  abaixo). Enquanto carrega, mostra "Carregando horários…" e **não oferece horário nenhum** (o teste
  novo achou que, sem isso, o site mostraria o horário padrão do config por alguns instantes ou para
  sempre se a leitura falhasse). Mensagens de erro do pedido por tipo: horário tomado, cota do
  Firestore e falta de conexão.
- **Correção**: `agenda.dias` ausente (Carin só salvou folgas) derrubava o site; agora `ouvirAgenda`
  normaliza (`normalizarAgenda`) e o `BookingSheet` também é defensivo.
- **Base reutilizável** para as próximas etapas: `compartilhado/Folha.tsx` (bottom sheet acessível: X,
  Esc, toque no fundo, trava de rolagem, teclado do iPhone) e `compartilhado/useDesfazer.tsx`.
- **Testes**: 207 no total (eram 78). Novos: camada de dados com um Firestore falso que **exige a regra
  real das transações** (`db.test.ts`), `BookingSheet` (nunca teve teste), a folha, o aviso e a tela de
  bloqueio. Validados estragando o código de propósito: **54 defeitos plantados** (liberar apagando
  horário de cliente, bloquear por cima de reserva, folgas sobrescritas, atalho de período errado,
  site oferecendo horário antes de carregar, aviso que não pausa, transação que escreve antes de ler…),
  **todos pegos** por algum teste. Um escapou na primeira rodada (bloqueio de outro dia vazando para a
  lista) e o teste foi reforçado.
- **Fica para depois** (decisão): o `history.pushState` da folha (para o gesto de voltar do iPhone
  fechá-la) entra num teste separado na fase da Agenda, porque `pushState` errado recarrega o app.
- **Publicar**: este ciclo ainda **não** está no ar. Antes de publicar, conferir no iPhone da Carin o
  roteiro do plano (bloquear a manhã de 02/10, ver o site em outro aparelho, Desfazer, liberar).
- **Regras do Firestore**: seguem como estão; o endurecimento (etapa R) vem antes de a Agenda nova
  ir ao ar. Nesta etapa o bloqueio funciona com as regras atuais (a dona já pode escrever em `slots`).

## ✅ Aplicado depois (28/09/2026) — duração dos serviços bloqueia o horário seguinte

Pedido: quando um serviço é mais longo que o intervalo até o próximo horário, esse horário seguinte
não pode ficar disponível pra outra cliente. Antes, os serviços não tinham duração cadastrada.

- **Tabela de preços**: campo **Duração (minutos, opcional)** em cada serviço, com o resumo
  "R$ 120 · 1h30" na lista. Sem duração cadastrada, o serviço se comporta exatamente como antes.
- **Regra**: soma a duração dos serviços escolhidos; qualquer horário da tabela daquele dia que caia
  **dentro** desse intervalo (depois da hora escolhida, antes do serviço terminar) é afetado. Um
  serviço que termina bem na hora do próximo não bloqueia nada — só o que de fato invade.
- **Agendamento manual**: o horário afetado aparece como **"sem espaço"** junto dos ocupados, mesmo
  sem cliente nele; salvar bloqueia esse horário sozinho (`slots` "bloqueado" com `origemAgendamento`
  apontando pro agendamento). **Cancelar/recusar libera esse bloqueio automático junto** — a função
  `recusarAgendamento` agora também apaga qualquer `slots` marcado com a origem daquele agendamento
  (nunca um bloqueio manual da folha "Bloquear horários", que não tem essa marca).
- **Site**: filtra os horários oferecidos pela duração (nunca oferece um que já esbarraria num
  ocupado) e, desde 02/10/2026, também grava o bloqueio do horário seguinte quando a cliente pede um
  serviço longo (ver `decisoes.md #21`).
- **Retrocompatível**: nada nos agendamentos e horários já existentes foi tocado — a função só entra
  em ação quando um serviço tem duração cadastrada.
- **Testes**: 249 no total (eram 207). Novos: as regras puras de duração em `agendaDia.test.ts`, a
  transação de criar/cancelar em `db.test.ts` (incluindo o Firestore falso ganhar `getDocs`/`writeBatch`
  de verdade), e as telas do manual e do site. Estragado de propósito de novo — um mutante "escapou"
  por mirar um trecho que na verdade já era redundante (`h !== hora`, que a comparação `> inicio` já
  garantia sozinha); em vez de forçar um teste artificial, o código foi simplificado pra tirar a
  redundância.

## ✅ Aplicado depois (28/09/2026) — regras do Firestore endurecidas, testadas no emulador (Fase R)

`firestore.rules` reescrito e testado contra o **emulador de verdade** (não um banco falso):
formato exato de cada campo, `slots`/`agendamentos` sempre criados juntos (nunca um sem o
outro, vale pro público e pra dona), e `update` restrito à única transição real que o app faz.
Detalhes técnicos em `decisoes.md #15` e `arquitetura.md`.

- **Ainda não publicado** (`firebase deploy --only firestore:rules` fica pro deploy final,
  junto com a Agenda nova) — as regras em produção continuam as de antes.
- **O gap do bloqueio automático no site continua** (decisão #14): essa rodada endureceu as
  regras que já existiam, mas **não** abriu uma regra nova pra permitir o site criar um
  bloqueio "automático" — isso exigiria acoplar essa escrita pública a um cálculo de duração
  dentro da regra, o que é arriscado de validar com segurança (um cliente poderia fingir
  precisar bloquear horários que não são realmente afetados). Fica pra uma rodada futura,
  se decidirmos fechar esse gap.
- **Ferramenta**: `npm run test:regras` (sobe o emulador sozinho, `scripts/test-regras.mjs`).
  41 testes, 17 mutações nas regras testadas de propósito, todas pegas.

## ✅ Aplicado depois (28/09/2026) — fundação do painel novo + Agenda por dia somente leitura (Fase B0+B1)

Primeiras etapas da Fase B (ver `decisoes.md #11/#16`). O painel **clássico continua no ar sem
nenhuma mudança de comportamento** — tudo isso vive ao lado dele, ainda não publicado.

- **B0 (fundação, invisível)**: o conteúdo de `admin/page.tsx` foi movido, sem mudar nada, para
  `admin/classico/` (`AgendamentosManager`, `NovoAgendamentoManual`, `ServicosManager`,
  `HorariosManager`, `CalendarioFolgas`, `NotificacoesCard`, `CardColapsavel`, `DashboardClassico`)
  e para `admin/compartilhado/` (`whatsappToque.ts`, `useHoje.ts`). Novo `AdminGate.tsx` (contexto
  seguro → carregando → login → o painel escolhido) é compartilhado pelas duas versões. Nova rota
  `/admin/classico` aponta pro mesmo painel de sempre — fica como "plano B" garantido pela Fase B4.
  Cada componente extraído ganhou teste de caracterização (não tinham nenhum antes).
- **`src/lib/datas.ts`** (novo): funções de data **sempre no fuso do salão** (`America/Sao_Paulo`),
  independente do fuso do aparelho/servidor — `agoraNoSalao`, `hojeKeySalao`, `passouDoHorario`,
  `semanaDe` (semana de segunda a domingo), `gradeDoMes`. Usadas só pelo painel novo; o site e o
  painel clássico continuam com `utils.ts` (sem risco de mudar o que já funciona). Testado com
  `TZ=UTC` e `TZ=Asia/Tokyo` além do fuso local, pra garantir que o resultado não depende de onde
  o código roda.
- **`itensDoDia`/`pedidosNoDia`** (novo, em `agendaDia.ts`): o estado de cada horário do dia
  (confirmado / pedido / bloqueado / livre) a partir da grade, dos slots e dos agendamentos —
  função pura, reaproveitada pela Agenda nova.
- **`DadosProvider`** (novo): uma assinatura só por fonte (serviços, agenda, slots numa janela de
  -7 a +60 dias, agendamentos) para todo o painel novo, em vez de cada aba ler tudo de novo. Erro
  numa fonte marca só aquela fonte (`erros.slots`, etc.) sem derrubar as outras; esqueleto de
  carregamento só aparece depois de 250 ms (conexão boa nunca pisca "carregando"). `ouvirServicos`,
  `ouvirAgenda`, `ouvirSlots` e `ouvirAgendamentos` (`db.ts`) ganharam um callback de erro
  **opcional** pra isso — quem não passa nada mantém o comportamento de sempre (log no console).
- **B1 — Agenda por dia (somente leitura) + barra de abas**: tela nova em `admin/painel/`
  (`AgendaDia`, `AgendaMes`, `TabBar`, `PainelNovo`) — cabeçalho do mês com calendário pra navegar,
  faixa da semana (segunda a domingo, com bolinha de pedido e hachura de folga), banner "N pedidos
  esperando você", resumo do dia e as linhas de horário nos **5 estados** do plano (Livre,
  Confirmado com atalho de WhatsApp, Pedido, Bloqueado com "Liberar", Passado apagado — livre/
  bloqueado passados somem, cliente confirmada/pedido continua visível). O botão **Bloquear**
  reaproveita a folha já testada da Fase A1 (ganhou um `dataInicial` opcional, pra abrir direto no
  dia visível) e "Liberar" reaproveita `liberarHorarios` — nada de lógica de escrita nova. As abas
  Pedidos/Horários/Serviços/Conta por ora reaproveitam os componentes do painel clássico como
  estão (cada um com sua própria leitura — o redesenho com a leitura única fica pra Fase B3).
- **Prévia**: rota `/admin/nova` (login real, dados de verdade, só ainda não é o `/admin` de
  produção) e uma página `/dev-preview-agenda` com dados **fictícios** (sem precisar logar) pra
  revisar o visual — nenhuma das duas é linkada de lugar nenhum do app.
- **Testes**: 357 no total (eram 249). `tsc`/`eslint`/`next build` sem nenhum problema novo (os 5
  erros + 2 avisos de sempre continuam vindo de `BookingSheet.tsx` e `tests-regras/`, sem relação
  com esta etapa).
- **Ainda não publicado** — segue a decisão de 28/09/2026: nada vai ao ar até a Fase B inteira
  (B2 ações, B3 abas redesenhadas, B4 troca) estar pronta e testada.

## ✅ Aplicado depois (28/09/2026) — ações na Agenda por dia (Fase B2)

Continuação da Fase B1: agora dá para agendar e agir sobre um horário **sem sair da Agenda**.

- **Tocar num horário Livre** abre `FolhaAgendar` — mesmo formulário do "+ Adicionar agendamento"
  clássico (nome, WhatsApp, serviços, verificação de duração/espaço), só que **sem campo de data**
  (o dia e a hora já vêm da linha tocada) e lendo os dados já centralizados no `DadosProvider` (sem
  assinar o Firestore de novo). Entra `confirmado`, igual ao manual de sempre; depois de salvar,
  aparece um aviso flutuante (acima da barra de abas) com "Enviar confirmação no WhatsApp".
- **Tocar num Confirmado ou Pedido** abre `FolhaDetalhe` — nome, quando, serviços, total, e as
  ações certas pro status: Pedido ganha **Confirmar/Recusar** (mesmo padrão "abre a aba do
  WhatsApp antes do `await`" do `AgendamentosManager`, pro iPhone não bloquear); Confirmado ganha
  **reenviar a confirmação** e **Cancelar horário**. O ícone de WhatsApp da linha continua
  funcionando por cima (toque nele não abre o detalhe — `stopPropagation`).
- **"Mudar horário" continua fora do escopo** (decisão de 28/09/2026): a Carin resolve pelo
  WhatsApp e relança pelo painel; não tem botão dedicado nem em `FolhaDetalhe`.
- **Confirmação de segurança ao vivo**: testando a prévia sem estar logado, a tentativa real de
  criar um agendamento foi **recusada pelo Firestore de produção** (regras de segurança, não só
  o código) — confirma que mesmo se algo escapasse na tela, o banco não aceitaria a escrita sem
  autenticação da dona.
- **Testes**: 373 no total (eram 357). `tsc`/`eslint`/`next build` sem nenhum problema novo.
- **Ainda não publicado** — mesma decisão de sempre: só no deploy final, com B3 e B4 prontos.

## ✅ Aplicado depois (28/09/2026) — abas sem sanfona + "Meu link" com botão de copiar (Fase B3)

Pedido do Dany: um jeito fácil de ela pegar o link do site pra colar na bio do Instagram, com
botão de copiar (mesmo padrão de outros projetos do Dany). Aproveitado para fechar a Fase B3.

- **"Meu link"** (`admin/painel/MeuLink.tsx`, nova seção na aba Conta): mostra `studio.siteUrl`
  (hoje o link do Vercel, `https://carin-oliveira-z7ov.vercel.app` — sem domínio próprio ainda) e
  um botão **Copiar** (Clipboard API) que vira **Copiado!** por 2 s. Se a API falhar (sem
  permissão/HTTPS), não trava a tela — ela ainda consegue selecionar o texto e copiar na mão.
  `siteUrl` fica em `src/config/studio.ts` (dado do tenant, como já era o WhatsApp/Instagram),
  com fallback pra variável opcional `NEXT_PUBLIC_SITE_URL` — quando ela tiver domínio próprio,
  troca só ali, sem mexer em mais nada.
- **Abas sem sanfona**: dentro de uma aba dedicada (Horários, Serviços, Conta), a seção já nasce
  **aberta** — a aba já é a "sanfona", não faz sentido esconder o conteúdo de novo por trás de um
  toque a mais. `CardColapsavel` ganhou um `abertoInicial?` opcional (usado só pelo painel novo;
  o painel clássico continua fechado por padrão, sem mudar nada) e os 4 componentes que o usam
  (`ServicosManager`, `HorariosManager`, `CalendarioFolgas`, `NotificacoesCard`) ganharam um
  `semSanfona?` que repassa isso — continua colapsável se ela preferir fechar.
- **Testado ao vivo**: o botão Copiar tentou escrever na área de transferência de verdade e o
  próprio navegador de teste recusou a permissão (esperado num ambiente automatizado) — o
  componente não quebrou, só manteve "Copiar" (o mesmo comportamento coberto no teste automatizado
  de falha da Clipboard API). No iPhone da Carin, um toque de verdade tem permissão normalmente.
- **Testes**: 382 no total (eram 373). `tsc`/`eslint`/`next build` sem nenhum problema novo.
- **Ainda não publicado.**

## ✅ Aplicado depois (28/09/2026) — Fase C parte 1: Serviços e Horários redesenhados

Pedido do Dany: passar pela Fase C antes da B4, pra já deixar os acabamentos refinados. Primeira
fatia: as abas Serviços e Horários deixam de emprestar o painel clássico e ganham telas próprias.

- **Serviços** (`ServicosTab.tsx` + `FolhaServico.tsx`) e **Horários** (`HorariosTab.tsx` +
  `FolhaHorarioDia.tsx`, uma linha por dia + editor em folha com "copiar para segunda a sexta" +
  lista de próximas folgas que leva pro dia certo na Agenda) — lendo do `DadosProvider`, fechando
  a dívida de leitura duplicada que a Fase B tinha deixado registrada.
- **Modal de confirmação próprio** (`Dialogo.tsx`) — feito para as telas novas (excluir serviço,
  recusar pedido, cancelar horário); o painel clássico continua com `confirm()` nativo, intocado.
- **Erro visível nos botões** — feito nas telas novas de Serviços e Horários, com mensagem em
  português claro (`erroHumano.ts`), não o código técnico.
- **Bug corrigido**: a notificação push de novo pedido nunca mostrava o serviço (`notify-owner`
  referenciava um campo que não existe há tempos) — agora mostra o nome do serviço de verdade.
- **Testes**: 420 no total (eram 382). `tsc`/`eslint`/`next build` sem nenhum problema novo (só o
  teste pré-existente de `proximosDias`, sensível ao fuso UTC perto da meia-noite, sem relação com
  esta fase).
- **Ainda falta na Fase C**: acabamento definitivo da Conta, deep link da notificação, "Bloquear
  todas as sextas", indicador offline, gestos de arrastar.
- **Ainda não publicado.**

## ✅ Aplicado depois (29/09/2026) — Fase C parte 2: Pedidos, erros visíveis, offline e deep link

Continuação direta da parte 1. Segunda fatia: Pedidos ganha tela própria, um bug real de erros
"engolidos" é corrigido, e entram "bloquear mesmo dia da semana", aviso offline e deep link.

- **Pedidos** (`PedidosTab.tsx`) — mesmo tratamento de Serviços/Horários: tela própria lendo do
  `DadosProvider`. A bolinha do ícone do app subiu pro shell do painel (antes só funcionava com a
  aba Pedidos aberta — bug latente herdado do clássico).
- **Bug real corrigido**: os erros visíveis que a parte 1 tinha acabado de adicionar em
  `FolhaDetalhe` nunca apareciam de verdade — `gravarEAbrirWhatsapp` sempre engolia o erro em
  silêncio (só console), então o `try/catch` em volta dela nunca disparava. Corrigido com um
  `onErro?` opcional (aditivo, o clássico não muda) usado por `FolhaDetalhe` e `PedidosTab`, que
  agora mostram a mensagem **e mantêm a tela aberta** quando falha (antes fechava mesmo com erro).
- **"Bloquear todas as [dia da semana]"** — dentro de "Bloquear horários", marcar "Dia todo" agora
  oferece "Repetir nas próximas 12 [terças/sextas/o que for]" — usa o dia que ela escolheu, não é
  fixo em sexta.
- **Indicador offline** — aviso no topo do painel quando o aparelho perde conexão.
- **Deep link da notificação** — a notificação de novo pedido agora leva direto pra aba Pedidos,
  com o app fechado ou já aberto (nesse caso o service worker avisa a página, que troca de aba
  sozinha, sem recarregar).
- **Testes**: 452 no total (eram 420). `tsc`/`eslint`/`next build` sem nenhum problema novo.
  Validado ao vivo (Pedidos, diálogo de Recusar, "Repetir nas próximas 12 terças").
- **Fase C fechada**: o Dany decidiu não fazer os gestos de arrastar — nada deixa de funcionar
  sem eles (X/Esc/toque fora já fecham a folha; ‹ › já navegam a semana) e evita o risco que o
  plano original já apontava (colidir com o gesto de voltar do iPhone).
- **Ainda não publicado.**

## ✅ Aplicado depois (29/09/2026) — redesenho do site público (link na bio)

Prévia aprovada antes de qualquer código (Artifact tipo "Design", fora do projeto) — o pedido foi
deixar mais moderno, evidenciar foto/título dela e caprichar nas fontes; o Dany lembrou de manter
o espaço da lojinha.

- **Fontes**: Manrope (corpo, no lugar do Inter) + Fraunces (serifada itálica, agora também em
  preços e no título "Serviços & valores"). O painel continua só em Inter — `.admin` fixa a fonte
  explicitamente, sem depender de herdar do `body`.
- **Paleta** recalibrada pra um tom mais editorial (marfim/blush + berinjela), ainda na família
  rosa da marca — sem nenhum risco pro painel, que já redefine sua própria paleta roxa por cima.
- **Foto e nome muito mais em evidência**: avatar de 92px para 136px, com brilho suave atrás e o
  selo de verificada sobreposto na foto (antes ficava do lado do nome, texto puro).
- **Duração de cada serviço** agora aparece (pedido de 28/09/2026, finalmente entregue): selo com
  relógio ao lado do preço, só quando o serviço tem duração cadastrada.
- **Lojinha e mapa real mantidos**, sem mudança estrutural — só herdam o novo acabamento visual.
- **Bug achado e corrigido na implementação**: o selo "Mais pedido" ficou esticando a largura
  inteira do card (um seletor CSS novo pegando o span errado por engano); corrigido.
- **Testado ao vivo** com dados reais (leitura pública, nada gravado) em claro e escuro; painel
  conferido continuar intocado (mesma fonte, mesmo roxo).
- **Ainda não publicado.**

## ✅ Aplicado depois (29/09/2026) — rodada de testes e materiais pré-deploy

Pedido do Dany antes do deploy final: testar tudo, ajustar um texto, atualizar o README com
prints reais e preparar um PDF de novidades para a Carin.

- **"Meu link" (aba Conta do painel novo)**: o texto passou de "cole na bio do Instagram" para
  "cole na bio do Instagram ou de outras redes sociais" — ela usa mais de uma rede.
- **Testes**: os 452 continuam passando; `tsc --noEmit`, `eslint` (mesma baseline de antes) e
  `next build` sem nenhum problema novo.
- **Testado ao vivo** (iPhone, 375×812): fluxo completo de agendamento no site com dados reais
  (sem finalizar o pedido, pra não gravar um agendamento fake no Firestore dela); painel novo
  pela prévia `/dev-preview-agenda` — abas Agenda/Pedidos/Horários/Serviços/Conta, folha de
  horário, folha de Bloquear.
- **Achado, mas não é bug**: dentro da prévia sem login, o "Bloquear horários" mostra
  `FirebaseError: Missing or insufficient permissions` no console ao tentar ler `agendamentos`
  em tempo real — porque essa folha sempre lê dados reais (por desenho, mesmo na prévia) e a
  prévia não tem login. Na produção a dona está sempre autenticada, então isso nunca acontece;
  o efeito na prévia é só perder o nome da cliente no chip "ocupado" (o horário continua
  corretamente marcado como ocupado, via `slots`, que é público).
- **README**: seção "Telas" com 4 prints reais e atuais (`docs/imagens/site-perfil.jpg`,
  `site-servicos.jpg`, `painel-agenda.jpg`, `painel-pedidos.jpg` — as duas do painel usam a
  prévia com dados fictícios, pra não expor cliente real num repositório público);
  "Funcionalidades" e a árvore de "Arquitetura" reescritas para o estado atual (painel novo,
  bloqueio, mudar horário, tema escuro); "Roadmap" limpo dos itens já entregues.
- **PDF "Novidades do seu site e do seu painel"**: 4 páginas + capa, linguagem simples, com os
  mesmos prints do README, para o Dany enviar à Carin explicando o que mudou e como usar.
- **Fase B4 implementada na sequência, mesmo dia**: `/admin` passou a abrir o painel novo por
  padrão (`src/app/admin/page.tsx`), com o clássico preservado como plano B por aparelho — se
  precisar, `localStorage["painel-carin:versao"] = "classico"` naquele aparelho volta pro
  clássico sem novo deploy, e `/admin/classico` continua acessível direto pela URL. 3 testes
  novos (`page.test.tsx`); 455 testes no total, `tsc`/`eslint`/`next build` limpos; conferido ao
  vivo que `/admin` e `/admin/classico` continuam abrindo a tela de login normalmente.
- **Ainda não publicado** — pronto pro deploy final único.

## ✅ Aplicado depois (02/10/2026) — verificação final ponta a ponta antes do deploy

Pedido do Dany: caçar bugs, conferir todas as funções e TODAS as mensagens de WhatsApp. Pra clicar
de verdade sem tocar no banco da Carin, o app rodou contra os **emuladores** de Auth + Firestore
(dados fictícios, usuária de teste com o UID de dona das regras), com uma ligação temporária ao
emulador no `firebase.ts` desfeita no fim. A abertura do WhatsApp foi interceptada pra conferir número
e texto. Testado e OK: pedido pelo site (inclusive filtro por duração), aviso `/api/notify-owner` (4
casos), Confirmar/Recusar/Cancelar na aba Pedidos, pela Agenda e no painel clássico, reenviar
confirmação, atalho da linha, agendamento manual + "Enviar confirmação", cliente sem WhatsApp (nenhuma
aba aberta), bloquear/desfazer/liberar (site atualiza ao vivo), folga, horários + "copiar seg a sex",
serviços criar/editar/excluir, copiar link, deep link da notificação, plano B clássico, sair.

**Bugs achados e corrigidos:**
- **Diálogo com dois botões "Cancelar"** (um voltava, o outro cancelava o horário da cliente) na aba
  Pedidos. O botão de voltar de todo `Dialogo` agora é **"Voltar"** e o de ação, "Cancelar horário".
- **Cliente sumia da Agenda em dia de folga**: a tela trocava a lista inteira pelo aviso de folga. Agora
  só os livres somem; quem já estava marcada continua (resumo "Folga marcada · 1 pedido").
- **Pedido do site com serviço longo não fechava o horário seguinte** — outra cliente conseguia marcar
  no meio do serviço (só aparecia quando o serviço tem duração cadastrada; nenhum real tem ainda).
  Corrigido com regra nova (`slotPublicoBloqueioOk`, decisão 21) + 8 testes de regra no emulador (49 no
  total), conferidos com 2 mutações de propósito.
- **Preço com centavos** saía "R$ 65,5" (site, painel e mensagens de WhatsApp): `brl` agora usa sempre
  duas casas quando há centavos ("R$ 65,50"); ao editar o serviço o campo mostra "65,50", não "65.5".
- Cosméticos: título "Domingo, 4 De Outubro" → "Domingo, 4 de outubro"; data do agendamento manual
  "03/10" → "3/10" (igual à do site, inclusive na mensagem); dia de hoje com tudo já passado dizia
  "Sem horários na tabela" → "Os horários deste dia já passaram.".
- `scripts/test-regras.mjs` não rodava mais (o comando do vitest ia sem aspas pro Firebase CLI).
- `/dev-preview-agenda` (prévia interna com dados fictícios) iria ao ar no site da Carin: agora só
  existe no `next dev`; em produção responde 404.

**Testes:** 458 (eram 455) + 49 de regras. `tsc`/`next build` limpos, lint na mesma base de antes.

## ✅ Aplicado depois (07/10/2026) — clientes marcando com até 3 meses de antecedência

Clientes pediram pra garantir vaga em dezembro; o site só mostrava 14 dias. Ver `decisoes.md #22`.
- Painel, aba Horários: card "Até quando as clientes podem marcar" (2 semanas / 1 mês / 2 meses /
  3 meses) com a data-limite por extenso e, acima de 1 mês, o lembrete de marcar as folgas.
- Site: calendário do mês com setas no lugar da fileira de dias; lê só o mês na tela; "Agenda aberta
  até 5 de janeiro" embaixo.
- Painel lê `slots` até +120 dias (antes +60).
- Testado de ponta a ponta nos emuladores: padrão de 2 semanas igual a antes; trocar pra 3 meses no
  painel libera dezembro no site **ao vivo** (sem recarregar); folgas de dezembro riscadas; horário já
  ocupado em 10/12 não oferecido; pedido em 15/12 enviado, apareceu em Pedidos e na Agenda do painel,
  confirmado com a mensagem de WhatsApp certa.
- **Testes:** 475 (eram 458). `tsc`/`next build` limpos, lint na mesma base.

## ⏳ Próximos passos (por prioridade)

### Painel v2 (plano aprovado em 28/09/2026, revisado no mesmo dia) — ✅ concluído em 29/09/2026
Ordem: ~~A1 bloqueio de horários de uma data~~, ~~duração dos serviços~~, ~~R regras do Firestore
endurecidas~~, ~~B0 fundação~~, ~~B1 Agenda por dia somente leitura~~, ~~B2 ações na Agenda~~,
~~B3 abas sem sanfona + Meu link~~, ~~C acabamento do painel~~, ~~redesenho do site público~~,
~~B4 troca do `/admin` de produção pelo painel novo~~ — tudo feito. "Mudar horário" (A2) saiu do
plano: a Carin resolve pelo WhatsApp e refaz o lançamento no painel. O painel clássico fica como
plano B por aparelho (`/admin/classico` ou a chave de localStorage), não como plano B "durante a
troca" — a troca já aconteceu. Falta só o deploy final único.

### Design
- **Swipe-to-dismiss no sheet de agendamento** — o "grabber" (tracinho) sugere arrastar para fechar, mas ainda só fecha por toque fora/Esc. Implementar o gesto (ou trocar por um "X").
- **Escala tipográfica única** — hoje há 20+ tamanhos de fonte diferentes; consolidar numa escala fixa (ex.: 11/12/13/14/15/16/18/20/23/32px) para um acabamento mais "sistema".
- **Grade de espaçamento de 4px** — alinhar paddings/gaps (17→16, 11→12, 9→8…).

### Código / escala
- **Filtro por data nas consultas** — `slots` já é lido só por janela de datas (site: só o mês na tela, até o limite que a Carin abriu; painel: -7 a +120 dias). Falta `agendamentos` (lido por inteiro pelo painel) e arquivar/limpar os antigos (os `slots` de confirmados não são removidos hoje).
- **Serviço por id, não por índice** — no `BookingSheet`, guardar o id do serviço em vez do índice do array (evita agendar o serviço errado caso a lista mude com o sheet aberto).
- **Rate limiting** — proteger `criarAgendamento` e `/api/notify-owner` contra criação em massa (ex.: limite por IP na API route).
