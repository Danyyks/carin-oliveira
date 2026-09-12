# Carin Oliveira — Link na Bio + Agendamento

Link na bio profissional (estilo bento, com cara dos melhores apps) e **sistema de agendamento próprio**, para a nail designer **Carin Oliveira**.

> Este é o **primeiro projeto** de um produto maior: um **SaaS de "link na bio"** que queremos generalizar depois. O bento.me/Linktree são só inspiração — a engine é nossa. Por isso o código é pensado para ser reaproveitável: **os dados do cliente ficam separados do "motor"**.

## Status
- ✅ Escopo do MVP fechado
- ✅ Protótipo visual (link na bio) aprovado
- ⏳ Em construção — ver [`docs/roadmap.md`](docs/roadmap.md)

## Stack
- **Front:** Next.js + TypeScript + Tailwind CSS + Framer Motion
- **Back (grátis):** Firebase — Firestore + Auth + Cloud Messaging (FCM)
- **Deploy:** Vercel (+ uma API route para disparar o push)
- **Extras grátis:** `wa.me` (WhatsApp), EmailJS (e-mail)
- **Custo de operação: R$ 0/mês**

## Foco nº 1
O **agendamento**: o cliente marca dia/horário → a Carin confirma pelo painel → a confirmação chega no **WhatsApp** do cliente. Tudo sem sair do grátis.

## Princípio nº 1
**Design em primeiro lugar** — acabamento de app top (Apple, Google, Nubank, Spotify), bonito, moderno e gostoso de usar. Nada com cara de template.

## Organização do repositório
```
.
├── docs/                  # documentação do projeto
│   ├── escopo-mvp.md      # o que entra no MVP (escopo fechado)
│   ├── arquitetura.md     # stack, modelo de dados, segurança, notificações
│   ├── fluxo-agendamento.md # o passo a passo do agendamento
│   ├── roadmap.md         # etapas do build (fazemos uma de cada vez)
│   └── decisoes.md        # log de decisões e o porquê
└── (código do app entra a partir da Etapa 1)
```

## Como rodar
_A definir — será preenchido quando o scaffold do Next.js for criado (Etapa 1)._
