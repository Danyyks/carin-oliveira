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
  nome, descricao, preco, duracao(min), tipo(servico|combo|promocao),
  ativo, ordem

disponibilidade/regras       # dias/horários + folgas (doc único)
  dias: { "1": ["09:00","10:30",...], "2": [...], ... }  # por dia da semana (0=dom..6=sáb)
  bloqueios: ["2026-09-22", "2026-10-05"]                # folgas: datas específicas sem atendimento
  # o painel edita dias e bloqueios de forma independente (salvarAgenda/salvarBloqueios com merge)

agendamentos/{data_hora}     # id determinístico = `${data}_${hora}` (ex: 2026-09-14_14:30)
  servicoId, clienteNome, clienteWhatsapp, data, hora,
  status(pendente|confirmado), criadoEm
```

## Anti-agendamento-duplicado (grátis, sem transação)
O id do agendamento é **determinístico**: `${data}_${hora}`. As regras de segurança permitem **apenas `create`** (nunca `update`) para o público. Se duas pessoas tentam o mesmo horário, o **segundo `create` falha** porque o documento já existe → **impossível marcar em dobro**. Recusar/cancelar = **apagar** o documento (só a Carin pode), liberando o id.

## Regras de segurança (resumo)
- `config`, `servicos`, `disponibilidade`: **leitura pública**, **escrita só da Carin** (UID dela).
- `agendamentos`:
  - **create** público, com validação de campos e só em horário válido/livre;
  - **update** proibido para o público (garante o anti-duplicidade);
  - **read / update(status) / delete** só da Carin.

## Notificações
1. **Push (principal):** ao criar o agendamento, o cliente chama `POST /api/notify-owner` (API route na Vercel) → servidor envia FCM para os `fcmTokens` da Carin → **notificação na tela** do celular mesmo com o app fechado.
2. **Bolinha (badge) no ícone:** o painel observa os pendentes em tempo real e usa a Badge API (`navigator.setAppBadge(n)` / `clearAppBadge()`) pra mostrar o número no ícone do app, igual app nativo.
3. **Confirmação ao cliente:** ao confirmar no painel, monta um link `wa.me/<numero>` com a mensagem pronta — a Carin toca enviar.

## PWA
`manifest.json` + service worker → painel instalável na tela, **sempre logado** (Firebase Auth com persistência local). O service worker também recebe o push do FCM em segundo plano.
