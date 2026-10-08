Original prompt: programe esse game

## Proposta aceita no contexto
FOLGA: jogo de navegador sobre encaixar vida e compromissos em uma semana, experimentar outra jornada e comparar o que coube. Partidas curtas, celular e computador, arrastar ou tocar, premissas explícitas.

## 2026-10-08 — início
- Projeto independente em `/Users/pedrorochadeoliveira/folga_code`.
- Público geral; sem segmentação, coleta de dados ou conexão com intenções de voto.
- Cenários fictícios: 6 × 7h = 42h e 5 × 7h = 35h. Sono de 8h/noite, rotina básica de 3h/dia e deslocamento de 2h/dia trabalhado. Não representa automaticamente uma proposta de lei.
- Quebra-cabeça por janelas de horário; mesmas oito atividades e mesmo imprevisto nas duas semanas. Tempo sem atividade continua livre; não há medidor fictício de saúde ou produtividade.
- Implementação planejada: motor puro, calendário em canvas com alternativa acessível por botões, salvamento local, comparação, compartilhamento e inicializador Mac.
- Validação: testes de conflitos/horários e comparação, cliente Playwright da skill, percursos desktop e celular com inspeção visual.

## Implementação e primeira validação
- Motor e interface implementados sem dependências em tempo de execução; inicializador servido em `127.0.0.1:8781`.
- 8 testes do motor aprovados: contabilidade de 168h, colisões, janelas, deslocamento, imprevisto, solução completa e validação de saves.
- Primeiro percurso de UI aprovado: duas semanas, arraste real, retirada, desfazer, continuidade após recarga, compartilhamento, 320px, offline e armazenamento bloqueado. Nenhum erro de console.
- Inspecionadas imagens desktop, calendário, primeira seleção mobile, resultado e 320px. A versão móvel exigia rolagem excessiva; substituída por abas de planos/calendário e controles de toque. Arraste continua no computador.
- Corrigidos foco após atualização dos botões e distinção entre save corrompido e armazenamento bloqueado. Em nova validação.

## Revisão final
- 12 cenários de UI aprovados, incluindo uso por teclado, abas mobile, comparação e compartilhamento. Screenshots refinados inspecionados.
- Revisão temporal encontrou descrição inconsistente do atraso: o retorno normal era 17h, mas o atraso aparecia às 19h. Corrigido para atraso 17h–18h e rotina deslocada para 18h–20h. Mantém 3h/dia de rotina e reduz a disponibilidade em exatamente 1h.
- Premissas de 42h/35h passaram também ao texto principal da apresentação, além do calendário e das instruções.
- Documentação com limites do modelo, execução local e verificações incluída em README.md.

## Entrega
- Após a correção do atraso: 8 testes do motor e 12 cenários de interface aprovados, sem erros de console.
- Cliente obrigatório da skill executado nas três etapas; últimas capturas em `output/skill-final`. Capturas do imprevisto e da segunda semana preenchida inspecionadas após a correção.
- Concluído localmente, com servidor em `http://127.0.0.1:8781`. Inicializador executável incluído. Nenhum deploy público realizado.
- Sem pendências para esta versão. Limite de validação: Chromium automatizado, sem aparelho físico/Safari. Possíveis versões futuras dependem de novo escopo: outras jornadas e atividades, cenários de mesma carga horária, mais imprevistos ou hospedagem pública.

## Correção solicitada — 44h como referência brasileira
- Usuário: “a carga horaria no brasil é 44”. Substituídos os cenários fictícios de 42h/35h por 44h/40h. As notas anteriores são o histórico da primeira versão.
- Referência: Constituição, art. 7º, XIII, e proposta de 40h em cinco dias descrita pela Câmara em 27/05/2026. Fontes na tela de instruções e no README.
- 44h = segunda a sexta com 8h, mais sábado com 4h. 40h = segunda a sexta com 8h. Intervalo de almoço 12h–13h separado do trabalho. Trabalho nos dias completos: 9h–12h e 13h–18h.
- Rotina total de 3h/dia preservada, distribuída de acordo com o expediente. Atraso na quarta 19h–20h desloca a rotina da noite para 20h–21h.
- Disponibilidade corrigida para 34h/40h, diferença de 6h. Cálculo do resultado e texto de compartilhamento agora derivados dos dados do motor.
- Save v2 separado, com aviso para quem tinha partida v1. Dados antigos preservados, sem misturar resultados de regras diferentes.
- Verificação concluída: 9 testes do motor e 13 cenários de UI aprovados, nenhum erro de console. Capturas do cliente da skill em `output/skill-44h`; calendário com 8h/4h, segunda semana preenchida, resultado de +6h e tela móvel inspecionados.

## Continuidade com Claude
- Usuário informou que continuará com o Claude e perguntou pelos documentos de referência.
- Criados `CLAUDE.md` (estado atual, decisões, execução, testes e pontos de atenção) e `REFERENCIAS.md` (fontes, usos e premissas). README aponta para ambos.
- Fontes externas preservadas como links comentados; não há cópias integrais ou PDFs dessas páginas no projeto. Não há pesquisa empírica específica sobre a eficácia do FOLGA.
- Nenhuma mudança no código do jogo nesta etapa. Validação anterior conferida por hashes; documentação e referências locais verificadas na entrega.
