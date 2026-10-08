# Instruções para assistentes de IA

Este arquivo orienta assistentes de código (Claude Code, Codex, Cursor, Copilot etc.) que trabalham neste repositório. Pessoas também podem lê-lo: é um resumo das regras que valem para todos.

## O projeto

FOLGA é um simulador de vida dentro de uma agenda, feito para o segundo turno de 2026. Quem abre o link **cai direto na semana 6×1** de 19 a 25 de outubro (o domingo é o dia da eleição), com uma janela curta de "como jogar" na primeira visita e **3 minutos no relógio**, que só corre com a janela fechada. Trabalho de segunda a sábado (8h–12h e 13h–17h; sábado 8h–12h), com transporte de ida e volta; domingo livre.

O jogador encaixa primeiro a lista **pra sobreviver** (comida todo dia, mercado, faxina, roupa, marmita, contas e pelo menos **4h de fazer nada**). A lista **pra viver** (família, praia, culto, amigas, karaokê, motel, app de relacionamento…) só abre depois. **Na 6×1 não tem como vencer:** com a lista inicial, mesmo mexendo no trabalho, cabem no máximo 10 de 11 coisas pra viver. Quando a semana fecha ou o tempo acaba, vem o **GAME OVER**, que diz o que faltou (o básico, o descanso ou a vida) e traz um relato de quem vive a 6×1, vídeos e o que Flávio disse sobre o fim da 6×1. Os botões: **"Experimentar a escala 5×2"** (a mesma semana, sem relógio, com dois dias de folga) e **"Tentar de novo"**. O resultado compara as duas semanas e vira imagem para Stories/WhatsApp.

**O jogo não fala do Lula.** A 6×1 leva a identidade do Flávio (verde, amarelo, azul-marinho, arminha); a 5×2 é "vida além do trabalho" (vermelho com estrela), sem nome de candidato. Publicado pelo GitHub Pages a partir de `main`: https://pedroufc-source.github.io/folga/

**Ficaram para uma segunda versão:** escolha de profissão na entrada (balconista, atendente, cozinheiro, garçom; todas CLT), salário e dinheiro, e a conversa com o patrão (chatbot).

## Comandos

```sh
npm install && npx playwright install chromium webkit   # uma vez
npm test          # regras (node:test), menos de 1 s
npm run test:ui   # Playwright: fluxos no Chromium + layout de celular no Chromium e WebKit; capturas em output/qa/
npm run images    # regenera og.png (preview do link) e apple-touch-icon.png
npm start         # servidor local em http://127.0.0.1:8781
GAME_URL=https://pedroufc-source.github.io/folga node tests/ui.cjs   # testa o site publicado
```

Rode `npm test` e `npm run test:ui` depois de qualquer mudança. Se mexer em layout, **abra as capturas** `output/qa/celular-*.png`, `desktop-*.png` e `imagem-stories.png` e confira visualmente.

## Arquivos

- `engine.js`: regras puras (`window.FolgaEngine`): agenda das 6h às 23h, dia de trabalho em blocos (ida, trabalho, almoço, trabalho, volta), listas pra sobreviver e pra viver, catálogo, encaixes, diagnóstico (`verdict`), máximo possível (`maxPlans`), troca de escala (`carryOver`) e texto de compartilhamento. Testado em `tests/engine.test.cjs`.
- `content.js`: o que tem fonte (`window.FolgaContent`): um relato por motivo de game over, vídeos e a frase sobre Flávio, com links.
- `app.js`: interface ("como jogar", relógio, abas, agenda em canvas, edição dos blocos de trabalho, avisos da CLT, game over, resultado, imagem 1080×1920 de compartilhamento, `localStorage`). `window.advanceTime(ms)` avança o relógio (testes).
- `styles.css`: visual; **todas as cores são tokens em `:root`**. `index.html`: marcação, metatags de preview e o diálogo "Como funciona" com as fontes.
- `REFERENCIAS.md`: fontes e o que é premissa do modelo. `tools/`: gerador do `og.png`.

## Regras invioláveis

### Conteúdo
1. **Nunca invente fatos, números, datas, citações ou URLs.** Todo relato, vídeo e frase sobre Flávio está em `content.js` e no "Como funciona", com link, e em `REFERENCIAS.md`. Citações são trechos curtos, sem mexer nas palavras.
2. **Sobre Flávio, só o que as fontes dizem:** ele criticou a PEC do fim da 6×1 ("vai gerar desemprego em massa"), defende pagar por hora trabalhada e é um dos autores da PEC 12/2026. **Não escreva que ele votou contra** (as fontes dizem que ele evita dizer o voto) nem que a PEC 12 mantém a 6×1 (as fontes divergem). Antes de escrever algo sobre a votação no Senado, reconfira na Agência Senado.
3. **Não cite o Lula** na interface, no texto de compartilhar nem nas imagens. A 5×2 é "vida além do trabalho".
4. O resto é **modelo**: horários, divisão das tarefas, duração dos planos e as 4h de fazer nada são escolhas do jogo. O "Como funciona" diz isso.
5. Sem moralismo nem restrição: nenhum plano tem dia ou hora marcada (só a comida, uma vez por dia), e nenhuma sugestão vem com julgamento.
6. Mudou regras ou números? Atualize juntos `engine.js`, a tabela do "Como funciona", `REFERENCIAS.md` e os testes. Se mexer nas listas, confira com `maxPlans` que a 6×1 continua sem caber tudo e a 5×2 continua cabendo.

### Código
1. **Sem build, sem framework, sem dependência em tempo de execução.** O jogo deve funcionar abrindo `index.html` via `file://` e offline. O Playwright é só dependência de desenvolvimento.
2. **Nenhuma requisição externa em tempo de execução**: sem CDN, Google Fonts, analytics ou embeds. Vídeos e fontes são links simples; o WhatsApp é `wa.me`. O teste falha se a página pedir algo de fora.
3. Scripts clássicos com `defer`, nesta ordem: `engine.js`, `content.js`, `app.js`.
4. Cores só como tokens CSS; o canvas lê os tokens com `getComputedStyle`. Não coloque cores fixas no JS.
5. **Celular primeiro:** no jogo, relógio, agenda, abas, lista e botões cabem na tela sem rolar, de 320×460 a 430×740 (e tablet). No game over, os botões ficam sempre à vista. O `test:ui` verifica; não afrouxe o teste para fazê-lo passar.
6. **Compatibilidade:** Safari 15.4+ (iOS) e Chrome/Firefox recentes. Nada de `ctx.roundRect` (use `arcTo`). Emojis no canvas: só os que não precisam de seletor de variação (U+FE0F) nem junção (U+200D), que o WebKit desalinha; o teste confere o catálogo.
7. Acessibilidade: emoji além da cor em cada plano, agenda em texto (`#accessible-board`), alternativa por botões a todo arraste, foco visível, `prefers-reduced-motion`.
8. Salvamento em `localStorage['folga-v7']` (`{version:7, mode, round, clock, introSeen, items, weeks:[{work, plans}|null ×2], nextId}`), validado por `validateSave`. Mudou o formato? Escreva a migração e não mude os `id` do catálogo.
9. `window.render_game_to_text()`, `window.advanceTime(ms)` e os seletores (`data-task`, `data-tab`, `data-work`, `.slot`, `#howto-start`, `#go-52`, `#go-again`…) são usados pelos testes; ao renomear, atualize `tests/ui.cjs`.
10. Compartilhamento: a imagem é gerada no navegador (canvas → PNG). `navigator.share` com arquivo precisa ser chamado direto no toque, por isso a imagem é preparada antes, quando o resultado aparece.

## Git

- Trabalhe em branch e abra pull request para `main`; `main` é o que está publicado.
- Não versione `output/` nem `node_modules/` (já estão no `.gitignore`).
- Mensagens de commit em português, no imperativo, descrevendo o porquê.
