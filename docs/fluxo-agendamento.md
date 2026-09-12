# Fluxo do agendamento

Modelo **pedido → confirmação**. O cliente pede, o horário fica reservado, e a Carin confirma.

```
1. Cliente escolhe serviço, dia e horário          (link na bio)
              │  vê só horários realmente livres, em tempo real
              ▼
2. Digita nome + WhatsApp (validado) e "Finalizar" (cliente)
              │  o horário vira PENDENTE e some da tabela na hora
              ▼
3. Carin é avisada                                 (🔔 push + 📧 e-mail + 🖥️ painel)
              ▼
4. Carin abre o painel (já logada) e Confirma      (painel /admin)
              │  ou Recusa → o horário volta a ficar livre
              ▼
5. Confirmação chega no WhatsApp do cliente        (💬 wa.me, 1 toque da Carin)
              ▼
6. Horário fica OCUPADO de vez                     (some para todos)
```

## Estados de um horário/agendamento
- `livre` — aparece na tabela pública, pode ser pedido
- `pendente` — alguém pediu; sai da tabela; aguarda a Carin
- `confirmado` — Carin aceitou; ocupado de vez
- `recusado` / `cancelado` — libera o horário de volta (o registro é removido)

## Por que "pedido → confirmação"?
- A Carin mantém o controle de quem atende (comum em manicure).
- Reservar na hora do pedido **evita dois clientes pedindo o mesmo horário**.
- A confirmação por WhatsApp sai do celular dela em **1 toque** — é o que mantém tudo **grátis** (envio automático exigiria a API paga).

## Detalhe anti-"reserva fantasma"
Se o cliente pede e some sem concluir, o horário fica `pendente`. Como não usamos função agendada (paga) para expirar sozinho, a **Carin libera no painel** num toque. Simples e suficiente para o MVP.
