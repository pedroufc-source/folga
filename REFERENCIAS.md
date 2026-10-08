# Referências e premissas do FOLGA

Registro organizado em 08/10/2026. As duas fontes abaixo foram consultadas na correção da versão para 44h/40h. Este documento organiza a referência já usada; não constitui uma nova revisão da tramitação legislativa.

## Fontes externas usadas

### 1. Constituição Federal — art. 7º, XIII

- Instituição: Presidência da República / Portal da Legislação.
- [Abrir Constituição](https://www4.planalto.gov.br/legislacao/legis-federal/constituicao).
- Uso no jogo: referência ao limite geral de 8h diárias e 44h semanais de trabalho normal, com possibilidade de compensação e redução.
- Limite da afirmação: isso não significa que todo brasileiro trabalhe 44h, nem que a Constituição obrigue a escala 6×1. A escolha de cinco dias de 8h e sábado de 4h é uma distribuição adotada pelo calendário do jogo.

### 2. Proposta de 40h em cinco dias e dois dias de descanso

- Instituição: Agência Câmara de Notícias.
- Publicação: 27/05/2026, “Plenário analisa neste momento PEC que acaba com escala 6x1; acompanhe”.
- [Abrir notícia da Câmara](https://www.camara.leg.br/noticias/1277073-plenario-analisa-neste-momento-pec-que-acaba-com-escala-6x1-acompanhe).
- Uso no jogo: referência para o cenário comparado de 40h em cinco dias e duas folgas. A notícia descreve o substitutivo em discussão naquela data.
- Limite da afirmação: o jogo não reproduz toda a proposta, suas transições ou exceções. A notícia não é prova de promulgação ou vigência posterior. O segundo cenário é uma simulação dessa distribuição de horas.

As referências estão disponíveis também na janela “Como funciona” do próprio jogo. **Não foram arquivados PDFs, HTML integral ou capturas dessas páginas externas nesta pasta.** Estão preservados os links e a indicação do uso de cada fonte.

## O que é escolha do modelo

| Elemento | Valor adotado | Natureza |
| --- | --- | --- |
| Semana inicial | 44h em seis dias | Limite de referência documentado; distribuição diária escolhida para o jogo |
| Semana comparada | 40h em cinco dias | Cenário proposto documentado; horários diários escolhidos para o jogo |
| Sono | 8h por noite | Premissa, não medida de uma amostra nem recomendação clínica |
| Rotina | 3h por dia | Premissa simplificada para cuidados, refeições e casa |
| Trajeto | 2h por dia trabalhado | Premissa, não média brasileira |
| Imprevisto | Um atraso de 1h na quarta | Evento de game design, igual nas duas rodadas |
| Atividades | Oito planos, 25h no total | Conteúdo criado para o quebra-cabeça |
| Janelas das atividades | Dias e horas fixos | Restrições autorais, não resultado de pesquisa de hábitos |
| Disponibilidade após o imprevisto | 34h e 40h | Resultado aritmético das premissas, não estimativa populacional |
| Diferença | 6h: 4h de trabalho + 2h de trajeto | Resultado do modelo |

O jogo modifica dias trabalhados e carga semanal ao mesmo tempo. Logo, não isola o efeito de mudar a escala mantendo a mesma carga horária. Também não estima salário, renda, produtividade, saúde, emprego ou efeitos econômicos.

## Evidência sobre o próprio jogo

A validação existente é funcional: regras de horário, colisões, totais, controles, salvamento, telas e comparação. Os registros estão em [output/VERIFICACAO.json](output/VERIFICACAO.json) e [output/qa/report.json](output/qa/report.json).

Não há estudo com jogadores nem levantamento científico específico sobre alcance, retenção, aprendizado ou mudança de opinião causados pelo FOLGA. A duração de 2–3 minutos apareceu como intenção inicial de design, não como duração medida. As seis atividades possíveis na primeira semana e oito na segunda derivam das regras deste quebra-cabeça.

## Referências internas e histórico

- [README.md](README.md): documentação operacional e cálculo das horas.
- [CLAUDE.md](CLAUDE.md): guia de continuidade, arquivos e decisões.
- [engine.js](engine.js): regras efetivamente implementadas.
- [tests/engine.test.cjs](tests/engine.test.cjs): exemplos verificáveis de encaixe e consistência.
- [progress.md](progress.md): registro da evolução. As seções iniciais de 42h/35h são históricas e foram substituídas por 44h/40h.
- [output/VERIFICACAO-42-35.json](output/VERIFICACAO-42-35.json): validação histórica da versão anterior; não usar como descrição da versão atual.
