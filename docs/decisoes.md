# Log de decisões

Registro curto das decisões e o **porquê** — para não reabrir discussão depois.

### 1. Formato: link na bio (não landing page longa)
O uso real é o link na bio do Instagram. Referências: bento.me, Linktree, atom.bio — mas a engine é **nossa** (visão de SaaS próprio).

### 2. Tudo no plano gratuito
Firebase Spark + Vercel + `wa.me` + EmailJS + FCM. **Sem Cloud Functions** (exigem plano pago) — lógica no cliente + regras de segurança; push por API route na Vercel.

### 3. Agendamento: modelo pedido → confirmação
O cliente pede, a Carin confirma. Mantém ela no controle e evita choque de horário. Ver [`fluxo-agendamento.md`](fluxo-agendamento.md).

### 4. Confirmação por WhatsApp = `wa.me` (1 toque da Carin)
Envio 100% automático exigiria a **API oficial paga** do WhatsApp. No grátis, quem envia é a Carin, num toque, ao confirmar. Fica como upgrade futuro.

### 5. Anti-duplicidade sem transação
Id do agendamento determinístico (`data_hora`) + regra `create`-only. Segundo `create` no mesmo horário falha. Simples e grátis.

### 6. Aviso da Carin: push como principal, e-mail de backup
Push (FCM) dá a sensação de app nativo. E-mail (EmailJS) garante o aviso mesmo com tudo fechado. Painel em tempo real quando aberto.

### 7. Painel como PWA, sempre logado
Firebase Auth com persistência local + instalação na tela. Também destrava o push no iPhone (iOS 16.4+ exige app instalado).

### 8. Avaliações de clientes fora do MVP
Retiradas a pedido do Dany (10/2026) — movidas para Fase 2+.

### 9. Design é prioridade
Não é detalhe: é o diferencial de venda do Dany. Toda tela deve ter acabamento dos melhores apps.
