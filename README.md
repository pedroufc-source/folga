# FOLGA

Um pequeno jogo de navegador sobre encaixar vida e compromissos em uma semana.

Projeto independente: `/Users/pedrorochadeoliveira/folga_code`.

Para continuar o desenvolvimento, comece por [CLAUDE.md](CLAUDE.md). As fontes externas e a distinção entre evidência e premissas estão em [REFERENCIAS.md](REFERENCIAS.md).

## Abrir

- No Mac, dê dois cliques em **Abrir Folga.command**. O inicializador usa Python 3, abre o navegador e procura uma porta livre entre 8781 e 8790.
- URL padrão: **http://127.0.0.1:8781**. O servidor fica limitado ao próprio Mac.
- Também funciona abrindo `index.html` diretamente, sem servidor e sem internet.
- Não precisa de instalação de pacotes, cadastro, chave de API ou assinatura.
- Para jogar em outro aparelho, é necessário levar os arquivos a ele ou publicar a pasta. O link local do Mac não abre em outros aparelhos. Esta entrega não foi publicada.

## Jogar

Escolha um plano, um dia e um horário. No computador, também é possível arrastar pela alça ou clicar no calendário. No celular, as abas alternam os planos e o calendário de um dia. Os horários disponíveis aparecem em botões e no calendário.

Selecione novamente um plano para mover ou retirar. O botão Desfazer volta um encaixe. Após o imprevisto, começa um novo histórico de desfazer, para não restaurar horários incompatíveis com o atraso.

Você decide quando fechar a primeira semana, experimenta a segunda e compara os resultados. Nenhuma atividade é obrigatória para avançar. Não há cronômetro nem penalidade por deixar horas sem plano.

O progresso é salvo em `localStorage`, chave `folga-game-v2`. A apresentação oferece continuar ou começar outra partida. Saves inválidos são ignorados; armazenamento bloqueado não impede jogar durante a sessão. Não há telemetria nem requisições externas. A mudança para 44h/40h usa uma nova partida, pois os horários mudaram. O save da versão anterior permanece intacto na chave `folga-game-v1`.

## Premissas

Os horários são ilustrativos e explícitos. O cenário de partida usa o limite geral de 44h da Constituição; o segundo usa 40h e duas folgas, conforme a proposta descrita pela Câmara. Não são médias estatísticas nem uma previsão do efeito de uma lei. A Constituição não obriga todos os contratos a adotar 44h ou a escala 6×1.

| Horas por semana | 6×1 | 5×2 |
| --- | ---: | ---: |
| Trabalho | 44 | 40 |
| Deslocamento normal, 2h por dia trabalhado | 12 | 10 |
| Sono, 23h–7h | 56 | 56 |
| Rotina básica, 3h por dia | 21 | 21 |
| Atraso no ônibus na quarta | 1 | 1 |
| Disponíveis para os planos | 34 | 40 |
| Total | 168 | 168 |

De segunda a sexta, o trabalho ocupa 9h–12h e 13h–18h: 8h efetivas, com almoço de 12h–13h fora da carga de trabalho. O trajeto ocupa 8h–9h e 18h–19h. A rotina é distribuída entre 7h–8h, 12h–13h e 19h–20h. Na primeira semana, o sábado tem 4h de trabalho, 9h–13h, com trajeto de 8h–9h e 13h–14h. No sábado e no domingo, a rotina ocupa 7h–8h e 17h–19h. O sono permanece 23h–7h.

Na quarta, o atraso estende a chegada de 19h até 20h. A rotina da noite é deslocada para 20h–21h, mantendo uma hora. Planos que ocupavam 20h–21h voltam à lista sem horário. O evento aparece depois do terceiro plano encaixado ou ao tentar fechar uma semana antes disso. É o mesmo evento nas duas rodadas.

Na primeira semana, apenas domingo é folga; na segunda, sábado e domingo. Aqui mudam **tanto a escala quanto a carga horária**. A diferença de disponibilidade é **6h: 4h de trabalho + 2h de deslocamento**. O jogo não calcula renda, salário, saúde ou produtividade.

As oito atividades são as mesmas e somam 25h. Suas janelas são uma escolha de desenho do quebra-cabeça. Há um arranjo de seis atividades na primeira semana e de oito na segunda. Na primeira, a feira coincide com o trabalho e o passeio ao sol disputa o domingo com o almoço em família. Essa limitação é produzida por essas premissas específicas; não é uma estimativa populacional. Resultados individuais também dependem das escolhas de encaixe.

Referências consultadas em 08/10/2026:

- [Constituição, art. 7º, XIII](https://www4.planalto.gov.br/legislacao/legis-federal/constituicao): limite geral de 8h diárias e 44h semanais, com possibilidades de compensação e redução.
- [Agência Câmara, 27/05/2026](https://www.camara.leg.br/noticias/1277073-plenario-analisa-neste-momento-pec-que-acaba-com-escala-6x1-acompanhe): cenário proposto de 40h em cinco dias e dois dias de descanso. Essa referência não é apresentada no jogo como regra já em vigor.

## Arquivos

- `engine.js`: regras puras, janelas, colisões, contabilidade e validação de saves.
- `app.js`: interação, canvas, acessibilidade, progresso e comparação.
- `index.html`, `styles.css`, `icon.svg`: apresentação e interface.
- `launch.py`, `Abrir Folga.command`: inicializador local.
- `tests/`: testes do motor e percursos de navegador.
- `output/qa/`: imagens de verificação e relatório da última execução.
- `output/VERIFICACAO.json`: registro consolidado da entrega.

## Verificação

```sh
node --test tests/engine.test.cjs
node tests/ui.cjs
```

O teste visual usa Playwright instalado junto à skill `develop-web-game`. Em outro computador, passe o caminho do módulo na variável `PLAYWRIGHT_MODULE`. Pode-se substituir a URL com `GAME_URL`.

O jogo expõe `window.render_game_to_text()` com estado, planos, horários disponíveis e geometria do calendário, além de `window.advanceTime()` para o cliente da skill. É um jogo por turnos: não depende de relógio ou animação para determinar resultados.

Verificado em Chromium automatizado, com telas de computador, 390px e 320px. Fluxo completo, arraste, toque, teclado, tela cheia, salvamento, corrupção de save, armazenamento bloqueado e arquivo local offline. Não houve teste em aparelho físico ou Safari.
