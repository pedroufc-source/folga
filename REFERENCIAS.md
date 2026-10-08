# Referências e premissas do FOLGA

Atualizado em 8/10/2026. O jogo é um modelo: só as cargas semanais vêm de fontes. Todo o resto é escolha de desenho, e o jogo diz isso no diálogo "Como funciona".

## Fontes

### 1. Constituição Federal, art. 7º, XIII
- [Planalto: Constituição](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm).
- Uso: limite de 8h diárias e 44h semanais para o trabalho normal (com compensação e redução por acordo ou convenção coletiva).
- Limite: a Constituição não obriga a escala 6×1 nem diz que todo mundo trabalha 44h. A distribuição do jogo (cinco dias de 8h e sábado de 4h) é do modelo.

### 2. Agência Senado, 7/10/2026
- ["PEC do fim da escala 6x1 passa por 2ª sessão de discussão no Plenário"](https://www12.senado.leg.br/noticias/materias/2026/10/07/pec-do-fim-da-escala-6x1-passa-por-2a-sessao-de-discussao-no-plenario).
- Uso: a PEC 221/2019 "reduz de 44 para 40 horas a duração máxima da jornada semanal de trabalho" e "prevê dois dias de repouso por semana, sem redução salarial". O jogo diz que a PEC **propõe** isso.
- Situação na data: em discussão em primeiro turno no Plenário do Senado. Precisa de 49 votos em dois turnos. **Reconfira antes de escrever qualquer coisa sobre aprovação ou vigência.**
- Limite: a transição prevista (a notícia fala em 40h após 1 ano e 2 meses) e as exceções não entram no jogo.

### 3. Agência Câmara, 27/5/2026
- ["Plenário analisa neste momento PEC que acaba com escala 6x1; acompanhe"](https://www.camara.leg.br/noticias/1277073-plenario-analisa-neste-momento-pec-que-acaba-com-escala-6x1-acompanhe).
- Uso: o texto em discussão na Câmara fixava 40h "em cinco dias, com dois de descanso", sem redução de salário.

## O que é modelo

| Elemento | Valor no jogo | Natureza |
| --- | --- | --- |
| 6×1 | Seg a sex 9h–12h e 13h–18h; sábado 9h–13h | Distribuição escolhida para chegar a 44h |
| 5×2 | Seg a sex 9h–12h e 13h–18h; sábado e domingo livres | Distribuição escolhida para 40h; a PEC fala em dois dias de descanso, não necessariamente sábado e domingo |
| Almoço | 12h–13h, fora das horas de trabalho | Premissa |
| Ônibus | 1h na ida e 1h na volta por dia trabalhado | Premissa, não média brasileira |
| Sono | 23h–7h | Premissa |
| Casa | 3h por dia (café, almoço ou janta, casa) | Premissa |
| Imprevisto | Ônibus atrasa 1h na quarta, nas duas semanas | Desenho de jogo |
| Planos | Oito, 25h no total, com dias e janelas fixos | Conteúdo criado para o quebra-cabeça |
| Livre para os planos | 34h na 6×1 e 40h na 5×2 | Conta das premissas acima |
| Máximo possível | 6 de 8 na 6×1; 8 de 8 na 5×2 | Calculado por busca exaustiva (`maxPlans` em `engine.js`), testado |

Mudam ao mesmo tempo os dias trabalhados e a carga semanal; o jogo não separa os dois efeitos. Também não simula salário, renda, emprego ou produtividade.

## Por que na 6×1 não cabe tudo

- A feira é sábado de manhã, e na 6×1 sábado de manhã é trabalho.
- Praia (6h) e almoço de domingo (3h) disputam o único dia livre.
- As noites de semana têm no máximo 3h livres (20h–23h), então o hobby de 4h só cabe no fim de semana.

Isso é produto das janelas escolhidas, não uma estimativa sobre a população. O ponto do jogo é mostrar como um dia livre só concentra tudo o que não cabe nos outros seis.
