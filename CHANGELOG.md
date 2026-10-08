# Histórico

## 5.1.0 — em teste

Navegação de agenda no celular, inspirada no Google Agenda.

- **Foco no dia:** tocar no dia (SEG 19, TER 20…) abre aquele dia na largura toda, com nome e horário em cada bloco. No topo, a faixa da semana mostra quanto cada dia está ocupado; tocar em outro dia ou deslizar para o lado troca o dia; tocar no dia em foco (ou no ícone do canto) volta para a semana.
- **Horário primeiro:** tocar num horário livre mostra só o que cabe ali, primeiro o básico. O jeito antigo (escolher na lista e depois o lugar) continua valendo.
- Na visão do dia, arrastar um bloco para cima ou para baixo muda o horário; para o lado, troca o dia.
- O toque na agenda não dispara mais o clique "fantasma" que podia cair num botão.
- O link compartilhado é sempre o do site oficial, mesmo jogando no endereço de teste.
- `npm run deploy:teste` publica uma versão de teste na Cloudflare Pages, sem mexer no site principal.

## 5.0.0 — 8/10/2026

Simulador de vida dentro de uma agenda.

- **Cai direto na agenda** da semana de 19 a 25 de outubro, no estilo de um calendário de celular, com o domingo da eleição marcado. Trabalho de segunda a sábado (8h–12h e 13h–17h; sábado até o meio-dia), domingo livre. Relógio de 3 minutos.
- **Blocos independentes:** transporte de 1h ou 2h em cada trecho (num dia ou em todos), almoço de 1h ou 2h e em outro horário, hora extra até 2h. A CLT barra mais de 6h seguidas.
- **Duas listas:** "pra sobreviver" (comida uma vez por dia, mercado, faxina, roupa, marmita, contas e 4h de fazer nada) vem primeiro; "pra viver" (11 sugestões, catálogo e itens próprios) só abre depois.
- **Não tem como vencer:** na 6×1 cabem no máximo 10 de 11 coisas pra viver. O game over diz o que faltou (o básico, o descanso ou a vida), traz o relato de quem vive a 6×1 (Agência Brasil, Agência Mural, UOL, TVT), vídeos de Rick Azevedo e Erika Hilton e o que Flávio disse sobre o fim da 6×1, com fontes. Os botões ficam sempre à vista.
- **"Experimentar a escala 5×2" ou "Tentar de novo".** Sai a pergunta "você é a favor da escala 6×1?". **O jogo não fala do Lula:** a 5×2 é "vida além do trabalho".
- **Números com fonte** no "Como funciona": jornada (DIEESE), transporte (Censo 2022, Nossa São Paulo), afazeres (IBGE), sono (CDC), alcance da PEC (só carteira assinada).
- Save novo (`folga-v7`): o progresso das versões anteriores não é aproveitado.

## 4.1.0 — 8/10/2026

- Sai a pergunta do candidato. Como no FLÁVIO, quem abre o link cai direto na semana 6×1, com uma janela curta de "como jogar" na primeira visita; o relógio só anda depois que ela fecha. "Jogar de novo" começa outra semana 6×1.
- No game over, "Não" traz para todos "Se arrependeu? Você ainda pode mudar seu voto".
- Preview do link: "Sua vida cabe na 6×1? 2 minutos pra encaixar a semana".

## 4.0.0 — 8/10/2026

- **Todo mundo vive a 6×1 primeiro**, com 2 minutos no relógio. Fim do tempo (ou da semana): **GAME OVER**, com "Tá cansado? Você é a favor da escala 6×1?". "Não" leva à 5×2 do Lula, sem relógio; para quem escolheu Flávio, "Se arrependeu? Você ainda pode mudar seu voto". "Sim" recomeça a 6×1.
- **Dia de trabalho editável:** hora extra até 2h (CLT art. 59), almoço mais cedo, mais tarde ou fora, com a CLT barrando trabalho acima de 6h seguidas (art. 71) e o contraponto da PEC 12/2026, apoiada por Flávio. "Ônibus" vira "transporte".
- **Visual:** grade e lista dentro do mesmo cartão no computador; planos da lista desenhados como os blocos do calendário (tracejado = falta encaixar).
- **Vida Além do Trabalho:** o movimento e a eleição de Rick Azevedo no "Como funciona"; a expressão na semana 5×2 e na imagem de compartilhamento.

## 3.0.0 — 8/10/2026

Versão do segundo turno.

- **Primeira página:** "Você trabalha na escala 6×1. Qual é o seu candidato?" Quem escolhe Flávio monta a 6×1; quem escolhe Lula, a 5×2. No fim aparece "Se arrependeu? Você ainda pode mudar seu voto", que leva à semana do outro, com os mesmos planos.
- **Tudo se move:** nenhum plano tem dia ou hora marcada. Os dias de trabalho (com ônibus e almoço) também mudam de horário e de dia, e a folga vai junto. Sai o atraso do ônibus.
- **A lista é do jogador:** 13 sugestões iniciais, catálogo com 31 (casa, cuidar de si, amor, rolê, família e fé, telas, estudo e grana, descanso) e itens próprios. Sem moralismo.
- O resultado compara as duas semanas e diz o máximo que cabe com a lista do jogador, mesmo mexendo no trabalho.
- Fontes sobre a posição de cada candidato no diálogo "Como funciona".

## 2.0.0 — 8/10/2026

Redesenho para publicar e compartilhar.

- **Conceito:** "Sua vida cabe na 6×1?". A semana 2 começa com os encaixes da semana 1: na 5×2 o jogador só encaixa o que ficou de fora. O resultado mostra o máximo possível em cada escala (6 de 8 na 6×1, 8 de 8 na 5×2): não é falta de organização, é falta de tempo.
- **Jogabilidade:** no celular, tela única com o calendário da semana inteira e os planos embaixo, sem abas nem rolagem. Toque no plano, depois no espaço verde. No computador também dá para arrastar, inclusive planos já encaixados. Cada recusa explica o motivo ("sábado de manhã você está no trabalho"; "o domingo já tem a praia").
- **Identidade:** marca FOLGA em carimbo, fonte Anton. A 6×1 em verde, amarelo e azul-marinho; a 5×2 em vermelho com estrela.
- **Compartilhar:** imagem 1080×1920 para Stories e WhatsApp (menu nativo do celular, download como alternativa), botão do WhatsApp com texto pronto, cópia do texto e imagem de preview do link (`og.png`).
- Testes de interface no Chromium e no WebKit, de 320×460 a tablet; offline por `file://`; nenhuma requisição externa.

## 1.1.0 — 8/10/2026

Protótipo feito com o Codex: quebra-cabeça de calendário com 6×1 (44h) e 5×2 (40h), oito planos, um imprevisto, abas no celular e cópia do resultado em texto. Está no primeiro commit do repositório.
