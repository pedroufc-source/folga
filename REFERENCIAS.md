# Referências e premissas do FOLGA

Atualizado em 8/10/2026. Só as cargas semanais e as posições dos candidatos vêm de fontes. O resto é escolha do jogo, e o diálogo "Como funciona" diz isso.

## Fontes

### 1. Lula — Folha de Pernambuco, 28/5/2026
- ["Fim da escala 6x1 é 'conquista civilizatória', diz Lula"](https://www.folhape.com.br/economia/fim-da-escala-6x1-e/490321/).
- Uso: Lula chamou a aprovação na Câmara de "uma conquista histórica e civilizatória" e de "um compromisso assumido pelo Governo do Brasil", e disse que o governo vai trabalhar pela aprovação no Senado.

### 2. Flávio — Folhapress/Diário do Comércio, 6/10/2026
- [Reportagem da Folhapress publicada pelo Diário do Comércio](https://diariodocomercio.com.br/politica/flavio-bolsonaro-fim-6x1/).
- Uso: Flávio chamou a discussão de oportunista ("Lula, em quatro anos de governo, não fez"), defendeu a proposta do PL de que o trabalhador "monte a sua jornada de trabalho" e receba por hora, e "tem evitado responder se vai votar contra ou a favor da proposta do governo".
- Limite: **não escrever que ele votou contra**. A fonte registra que ele evita dizer o voto. O jogo do FLÁVIO usa ainda uma entrevista à Record/R7 de 30/8/2026 com o mesmo teor; ela não foi reaberta nesta revisão e não é citada aqui.

### 3. Agência Senado, 7/10/2026
- ["PEC do fim da escala 6x1 passa por 2ª sessão de discussão no Plenário"](https://www12.senado.leg.br/noticias/materias/2026/10/07/pec-do-fim-da-escala-6x1-passa-por-2a-sessao-de-discussao-no-plenario).
- Uso: a PEC 221/2019 "reduz de 44 para 40 horas a duração máxima da jornada semanal de trabalho" e "prevê dois dias de repouso por semana, sem redução salarial". O jogo diz que a PEC **propõe** isso.
- Situação na data: em discussão em primeiro turno no Plenário do Senado. Precisa de 49 votos em dois turnos. **Reconfira antes de escrever algo sobre aprovação ou vigência.** Por ser emenda constitucional, a PEC é promulgada pelo Congresso, sem sanção do presidente.

### 4. Constituição Federal, art. 7º, XIII
- [Planalto: Constituição](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm).
- Uso: limite de 8h diárias e 44h semanais.

### 5. Agência Câmara, 27/5/2026
- ["Plenário analisa neste momento PEC que acaba com escala 6x1; acompanhe"](https://www.camara.leg.br/noticias/1277073-plenario-analisa-neste-momento-pec-que-acaba-com-escala-6x1-acompanhe).
- Uso (histórico): o texto na Câmara fixava 40h "em cinco dias, com dois de descanso", sem redução de salário.

## O que é modelo

| Elemento | No jogo | Natureza |
| --- | --- | --- |
| Quem escolhe Flávio joga a 6×1; quem escolhe Lula, a 5×2 | Premissa do jogo | Decisão do dono do projeto, apoiada nas posições acima |
| Dias de trabalho | 6×1: cinco de 8h e um de 4h; 5×2: cinco de 8h | Distribuição escolhida para chegar a 44h e 40h |
| Dia de trabalho | 1h de ônibus, trabalho, 1h de almoço (nos dias de 8h), trabalho, 1h de ônibus | Premissa; o jogador escolhe o horário e o dia |
| Sono | 23h–7h, fora do calendário | Premissa |
| Planos | 13 sugestões iniciais (50h), catálogo com 31 e itens próprios de 1h a 8h | Durações sugeridas pelo jogo |
| Livre para você | 51h na 6×1 e 57h na 5×2 | Conta das premissas |
| Máximo possível | Com a lista inicial: 12 de 13 na 6×1, 13 de 13 na 5×2 | Calculado por `maxPlans` (busca exaustiva, mexendo também no trabalho), testado |

Mudam ao mesmo tempo os dias de trabalho e a carga semanal; o jogo não separa os dois efeitos. Também não simula salário, renda, emprego ou produtividade.

## Por que na 6×1 nem tudo cabe

- São 6h a menos por semana (4h de trabalho e 2h de ônibus).
- Cada dia de 8h ocupa 11h com ônibus e almoço. Sobram no máximo 5h seguidas nesse dia.
- Só existe um dia inteiro livre. Programas longos (praia, churrasco, almoço em família) disputam esse dia.
