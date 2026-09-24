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

## ⏳ Próximos passos (por prioridade)

### Design
- **Swipe-to-dismiss no sheet de agendamento** — o "grabber" (tracinho) sugere arrastar para fechar, mas ainda só fecha por toque fora/Esc. Implementar o gesto (ou trocar por um "X").
- **Escala tipográfica única** — hoje há 20+ tamanhos de fonte diferentes; consolidar numa escala fixa (ex.: 11/12/13/14/15/16/18/20/23/32px) para um acabamento mais "sistema".
- **Modal de confirmação próprio** — trocar o `confirm()` nativo do navegador (usado em excluir serviço / recusar agendamento) por um diálogo com a identidade visual do app.
- **Grade de espaçamento de 4px** — alinhar paddings/gaps (17→16, 11→12, 9→8…).
- **Painel de horários** — accordion por dia + botão "usar o mesmo horário em todos os dias".

### Código / escala
- **Filtro por data nas consultas** — `slots` e `agendamentos` são lidos por inteiro; ao crescer, filtrar por `data >= hoje` e arquivar/limpar os antigos (os `slots` de confirmados não são removidos hoje).
- **Serviço por id, não por índice** — no `BookingSheet`, guardar o id do serviço em vez do índice do array (evita agendar o serviço errado caso a lista mude com o sheet aberto).
- **Rate limiting** — proteger `criarAgendamento` e `/api/notify-owner` contra criação em massa (ex.: limite por IP na API route).
