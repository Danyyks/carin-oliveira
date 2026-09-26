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
