# Escopo do MVP

> Status: **fechado** (12/09/2026). Referência visual publicada: protótipo do link na bio (bento) aprovado pelo Dany.

## Visão
Link na bio estilo bento, mobile-first, com cara de app top, cujo **foco principal é o agendamento**. Operação **100% no plano gratuito**.

## O que o cliente vê (link na bio)
- **Agendar horário** — ação principal
- **Serviços, valores, combos e promoções**
- **Galeria de trabalhos** (fotos passando)
- Botão de **WhatsApp** e **Instagram**
- **Mini-mapa** — toca e abre a rota no Google Maps

## O que a Carin controla (painel `/admin`)
- **Sempre logada**, painel instalável como app (PWA)
- Define os **dias e horários** que atende
- Cadastra **serviços, valores, combos e promoções**
- Recebe **push** de pedido pendente
- **Confirma ou recusa** cada pedido (recusar libera o horário)
- Vê a **agenda do dia**

## Como a Carin é avisada (todos grátis)
| Canal | Papel |
|---|---|
| 🔔 Push no app (FCM) | **Principal** — instantâneo, app fechado |
| 📧 E-mail (EmailJS) | Backup — chega mesmo com tudo fechado |
| 🖥️ Painel em tempo real | Ao vivo, com o app aberto |
| 💬 WhatsApp (`wa.me`) | Confirmação pro cliente (1 toque da Carin) |

## Fora do MVP (fases seguintes)
- **Grátis, dá pra incluir se quiser:** sinal via PIX (chave manual) contra faltas; reagendar/cancelar; duração + intervalo por serviço.
- **Fase 2+:** avaliações de clientes; lembrete automático 24h/1h; WhatsApp 100% automático (API paga); fidelidade; lista de espera; múltiplos profissionais; relatórios.

## Ressalvas honestas
- A confirmação pro cliente é **1 toque da Carin**, não envio automático (isso exigiria a API paga do WhatsApp).
- O horário **trava quando o cliente pede**; se ele some, a Carin libera no painel.
- No **iPhone**, o push exige o **app instalado na tela** (iOS 16.4+) e permissão. No Android funciona sempre.
- O primeiro e-mail pode cair no spam — marcar "não é spam" uma vez resolve.
