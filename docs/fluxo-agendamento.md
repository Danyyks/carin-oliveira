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
- `bloqueado` — a Carin fechou o horário (sem cliente); some do site como se estivesse ocupado, até ela liberar

## Depois do atendimento
O agendamento `confirmado` fica na lista do painel **o dia inteiro do atendimento** e **some na virada do dia seguinte**. É só um filtro de tela: o registro **continua no banco** (histórico) e nada é apagado. O painel recalcula o "hoje" sozinho (ao reabrir o app e a cada minuto), então funciona mesmo com o app aberto de um dia pro outro. Os pedidos `pendente` **não** somem — um pedido antigo sem resposta continua aparecendo para a Carin resolver.

## Por que "pedido → confirmação"?
- A Carin mantém o controle de quem atende (comum em manicure).
- Reservar na hora do pedido **evita dois clientes pedindo o mesmo horário**.
- A confirmação por WhatsApp sai do celular dela em **1 toque** — é o que mantém tudo **grátis** (envio automático exigiria a API paga).

## Detalhe anti-"reserva fantasma"
Se o cliente pede e some sem concluir, o horário fica `pendente`. Como não usamos função agendada (paga) para expirar sozinho, a **Carin libera no painel** num toque. Simples e suficiente para o MVP.

## Folgas e bloqueio de horários
A agenda base é por **dia da semana**. Para fechar algo numa **data pontual** (viagem, consulta, imprevisto), sem mexer nas outras semanas, a Carin usa o botão **"Bloquear horários"** (ao lado de "+ Adicionar agendamento"). Abre uma folha por cima do painel:

1. **Escolhe o dia**: fileira com hoje e os próximos 13 dias (folgas marcadas com a palavra "folga") ou o campo "Outra data".
2. **Toca nos horários** que quer fechar, ou nos atalhos **Manhã / Tarde / Noite / Dia todo**. Os atalhos só *marcam*; nada é gravado até ela tocar no botão do rodapé. Manhã é antes das 12:00, tarde vai até 17:59 e noite começa às 18:00. Horários que já têm cliente ficam apagados, com o primeiro nome, e nunca são marcados.
3. **Toca no botão**, que diz o que vai acontecer: "Bloquear 3 horários", "Liberar 1 horário", "Salvar alterações" ou "Marcar folga". Aparece o aviso **"3 horários bloqueados."** com **Desfazer** por 6 segundos.

- **Horário bloqueado** é um documento em `slots/{data_hora}` com `status: "bloqueado"` (sem motivo, porque `slots` é pública). Como o site já esconde qualquer horário que exista em `slots` e o id é único, a cliente não consegue pedir esse horário. Aparece como **"Bloqueado"** (cadeado) na folha e no formulário do agendamento manual, sem confundir com nome de cliente.
- **Liberar** apaga só documentos com `status` bloqueado. **Nunca** apaga o horário de uma cliente.
- **Dia todo** (todos os horários livres marcados) vira **folga do dia inteiro**: a data entra em `disponibilidade/regras.bloqueios` (`arrayUnion`, então dois aparelhos não se atropelam) e o dia some do site. Se o dia já tem cliente, a folha avisa que **a folga fecha só os horários livres** e as clientes continuam agendadas. Um dia que já é folga mostra o botão **"Liberar o dia"**.
- Tudo é gravado em **transação** (lê antes de escrever): se uma cliente pegou o horário no meio do caminho, ele não é bloqueado e o aviso diz quantos ficaram de fora.

## Duração do serviço (bloqueia sozinho o horário seguinte)
Na Tabela de preços, cada serviço tem um campo **Duração (minutos, opcional)**. Quando o serviço marcado é mais longo que o intervalo até o próximo horário da tabela, esse horário seguinte fica indisponível **sozinho**, sem a Carin precisar bloquear na mão. Sem duração cadastrada, nada muda — funciona como sempre funcionou.

- **Agendamento manual**: ao escolher o(s) serviço(s) e a data, os horários que a duração "comeria" aparecem como **"sem espaço"** (apagados, junto dos ocupados) mesmo que ninguém esteja marcado neles. Salvar bloqueia esse(s) horário(s) automaticamente — igual ao bloqueio manual, mas marcado por dentro como vindo desse agendamento. **Cancelar ou recusar esse agendamento libera esse bloqueio junto**, sozinho.
- **Pedido do site**: a cliente só vê os horários em que o serviço escolhido realmente cabe (some da lista o horário cujo intervalo seria "comido" por um serviço já ocupado logo depois). E, desde 02/10/2026, o pedido de um serviço longo **já fecha junto** o(s) horário(s) seguinte(s) que ele come (slot "bloqueado" com `origemAgendamento`) — antes o site só filtrava, e outra cliente conseguia marcar no meio do serviço. Se a Carin recusar ou cancelar o pedido, esses horários voltam a ficar livres.
- "Próximo horário" é sempre um horário que já está na **tabela** daquele dia — a duração nunca inventa um horário novo para bloquear.

## Agendamento manual (a dona registra)
Para clientes que marcaram **por fora** (WhatsApp, agenda de papel), a Carin usa o botão **"+ Adicionar agendamento"** no painel: preenche nome, serviço(s), data e horário (WhatsApp opcional). O agendamento entra **já como `confirmado`** (`criarAgendamentoManual`), aparece na lista dela e **trava o horário** no site. Só a dona faz isso — as regras liberam `create` para `isDono()`; o público continua só podendo criar pedido `pendente`.

**Escolha do horário.** Ao escolher a data, o formulário mostra os horários da tabela dela para aquele dia da semana como **botões**, igual ao site: os livres são clicáveis e os **ocupados ficam apagados**, sem clique, com o **primeiro nome da cliente** que já está ali (a Carin não precisa voltar à lista lá de cima para conferir). Um horário ocupado **fora da tabela** (exceção aberta antes) também aparece. O botão **"Outro horário"** libera a digitação de qualquer hora, para ela abrir exceções. Se a data é uma folga, o formulário avisa, mas deixa registrar. A trava final continua valendo: horário já ocupado não salva.

**Confirmação para a cliente.** Depois de salvar, aparece o botão **"Enviar confirmação no WhatsApp"**, que abre a conversa da cliente com a **mesma mensagem de confirmação** do "Confirmar" (nome, serviços, total, dia e hora, endereço e como chegar); a Carin só toca em "Enviar". Não é envio automático (isso exigiria a API paga do WhatsApp). É um botão tocado direto, e não uma abertura automática, porque o iPhone bloqueia janelas abertas fora do toque; e só aparece depois de gravar de verdade. Se o WhatsApp ficar vazio, aparece o aviso "Sem WhatsApp cadastrado, a cliente não recebe a confirmação" no lugar, e os botões/mensagens de WhatsApp somem para aquele agendamento.

**Botão "WhatsApp" na lista de confirmados.** Cada agendamento confirmado tem o botão verde **WhatsApp**, que abre a conversa da cliente com **essa mesma mensagem de confirmação** (serve de "reenviar" se a primeira não saiu). Vale igual para os agendamentos do site e para os lançados manualmente: tudo passa pela mesma função (`linkConfirmacao`), então o texto é sempre o mesmo. Sem WhatsApp cadastrado, o botão não aparece.
