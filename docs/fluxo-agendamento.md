# Fluxo do agendamento

Modelo **pedido → confirmação**. O cliente pede, o horário fica reservado, e a Carin confirma.

```
1. Cliente escolhe serviço, dia e horário          (link na bio)
              │  vê só horários realmente livres, em tempo real
              ▼
2. Digita nome + WhatsApp (validado) e "Finalizar" (cliente)
              │  o horário vira PENDENTE e some da tabela na hora
              ▼
3. Carin é avisada                                 (🔔 push na tela + bolinha no ícone + 🖥️ painel)
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

## Depois do atendimento
O agendamento `confirmado` fica na lista do painel **o dia inteiro do atendimento** e **some na virada do dia seguinte**. É só um filtro de tela: o registro **continua no banco** (histórico) e nada é apagado. O painel recalcula o "hoje" sozinho (ao reabrir o app e a cada minuto), então funciona mesmo com o app aberto de um dia pro outro. Os pedidos `pendente` **não** somem — um pedido antigo sem resposta continua aparecendo para a Carin resolver.

## Por que "pedido → confirmação"?
- A Carin mantém o controle de quem atende (comum em manicure).
- Reservar na hora do pedido **evita dois clientes pedindo o mesmo horário**.
- A confirmação por WhatsApp sai do celular dela em **1 toque** — é o que mantém tudo **grátis** (envio automático exigiria a API paga).

## Detalhe anti-"reserva fantasma"
Se o cliente pede e some sem concluir, o horário fica `pendente`. Como não usamos função agendada (paga) para expirar sozinho, a **Carin libera no painel** num toque. Simples e suficiente para o MVP.

## Folgas (bloqueio de datas específicas)
A agenda base é por **dia da semana**. Para folgar numa **data pontual** (viagem, imprevisto), a Carin usa o card **"Folgas"** no painel: um mini-calendário onde ela toca no dia para bloquear/liberar. Um dia bloqueado (`disponibilidade/regras.bloqueios`) **some do agendamento** no site, sem afetar os outros dias da mesma semana. É dia inteiro e reversível.

## Agendamento manual (a dona registra)
Para clientes que marcaram **por fora** (WhatsApp, agenda de papel), a Carin usa o botão **"+ Adicionar agendamento"** no painel: preenche nome, serviço(s), data e hora (WhatsApp opcional). O agendamento entra **já como `confirmado`** (`criarAgendamentoManual`), aparece na lista dela e **trava o horário** no site. Só a dona faz isso — as regras liberam `create` para `isDono()`; o público continua só podendo criar pedido `pendente`. Se o WhatsApp ficar vazio, os botões/mensagens de WhatsApp somem para aquele agendamento.
