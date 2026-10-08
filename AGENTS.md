# Instruções para assistentes de IA

Este arquivo orienta assistentes de código (Claude Code, Codex, Cursor, Copilot etc.) que trabalham neste repositório. Pessoas também podem lê-lo: é um resumo das regras que valem para todos.

## O projeto

FOLGA é um jogo estático de encaixar a semana: oito planos (feira, praia, almoço de domingo…) num calendário de 6×1 (44h, uma folga) e depois na 5×2 (40h, duas folgas). Na 6×1 cabem no máximo 6 planos; na 5×2, os 8. O resultado vira imagem para Stories/WhatsApp. Publicado pelo GitHub Pages a partir da branch `main`: https://pedroufc-source.github.io/folga/

## Comandos

```sh
npm install && npx playwright install chromium webkit   # uma vez
npm test          # regras (node:test), menos de 1 s
npm run test:ui   # Playwright: fluxos no Chromium + layout de celular no Chromium e WebKit; capturas em output/qa/
npm run images    # regenera og.png (preview do link) e apple-touch-icon.png
npm start         # servidor local em http://127.0.0.1:8781
```

Rode `npm test` e `npm run test:ui` depois de qualquer mudança. Se mexer em layout, **abra as capturas** `output/qa/celular-*.png`, `desktop-*.png` e `imagem-stories.png` e confira visualmente.

## Arquivos

- `engine.js`: regras puras (`window.FolgaEngine`): semanas, planos, janelas, encaixes, imprevisto, contas, máximo possível (`maxPlans`) e texto de compartilhamento. Testado em `tests/engine.test.cjs`.
- `app.js`: interface (calendário em canvas, bandeja de planos, arrastar/tocar, `localStorage`, diálogos, imagem 1080×1920 de compartilhamento).
- `styles.css`: visual; **todas as cores são tokens em `:root`**. `index.html`: marcação, metatags de preview e diálogo de premissas com as fontes.
- `REFERENCIAS.md`: fontes e o que é premissa do modelo. `tools/`: gerador do `og.png`.

## Identidade visual

- Marca neutra: papel e tinta, FOLGA em carimbo (fonte Anton, em `fonts/`).
- **Semana 6×1: verde, amarelo e azul-marinho** (a identidade do jogo FLÁVIO). **Semana 5×2: vermelho com estrela branca.** A cor de cada semana aparece na faixa do jogo, nas miniaturas, na imagem de compartilhamento e no texto (🟩🟨 / 🟥⭐).
- Nomes de candidatos não aparecem no jogo: a associação é só visual. Mudar isso é decisão do dono do projeto.
- O calendário em si usa as mesmas cores nas duas semanas (trabalho escuro, ônibus cinza, casa bege, planos coloridos), para a comparação ser justa.

## Regras invioláveis

### Conteúdo
1. **Nunca invente fatos, números, datas ou URLs.** As horas vêm da Constituição (44h) e da PEC do fim da 6×1 (40h, dois dias de descanso); as fontes estão no diálogo "Como funciona" e em `REFERENCIAS.md`. Antes de afirmar algo sobre a tramitação da PEC, reconfira na Agência Senado.
2. O resto é **modelo** e deve continuar dito como modelo: horários, janelas dos planos, sono, rotina, ônibus e imprevisto são escolhas do jogo, não médias da população.
3. Mudou regras ou números? Atualize juntos `engine.js`, a tabela do diálogo em `index.html`, `REFERENCIAS.md` e os testes. O teste confere que as horas fecham 168h e que o calendário mostra todo o tempo livre.
4. O placar máximo (6 na 6×1, 8 na 5×2) é calculado por `maxPlans`; se mexer em janelas ou durações, confira se a mensagem do resultado continua verdadeira.

### Código
1. **Sem build, sem framework, sem dependência em tempo de execução.** O jogo deve funcionar abrindo `index.html` via `file://` e offline. O Playwright é só dependência de desenvolvimento.
2. **Nenhuma requisição externa em tempo de execução**: sem CDN, Google Fonts, analytics ou embeds. O botão do WhatsApp é um link simples (`wa.me`). O teste falha se a página pedir algo de fora.
3. Scripts clássicos com `defer`, nesta ordem: `engine.js`, `app.js`.
4. Cores só como tokens CSS; o canvas lê os tokens com `getComputedStyle`. Não coloque cores fixas no JS.
5. **Celular primeiro:** no jogo, calendário, planos e botões cabem na tela sem rolar, de 320×460 a 430×740 (e tablet). O `test:ui` verifica; não afrouxe o teste para fazê-lo passar.
6. **Compatibilidade:** Safari 15.4+ (iOS) e Chrome/Firefox recentes. Nada de `ctx.roundRect` (use `arcTo`). Emojis no canvas: prefira os que não precisam de seletor de variação (U+FE0F), que o WebKit desalinha.
7. Acessibilidade: emoji além da cor em cada plano, agenda em texto (`#accessible-board`), alternativa por botões a todo arraste, foco visível, `prefers-reduced-motion`.
8. Salvamento em `localStorage['folga-game-v2']` (`{version:2, mode, round, weeks:[[],[]], events:[bool,bool]}`), validado por `validateSave`. Mudou o formato? Escreva a migração e não mude os `id` dos planos.
9. `window.render_game_to_text()` e os seletores (`data-task`, `.slot`, `#finish-button`…) são usados pelos testes; ao renomear, atualize `tests/ui.cjs`.
10. Compartilhamento: a imagem é gerada no navegador (canvas → PNG). `navigator.share` com arquivo precisa ser chamado direto no toque, por isso a imagem é preparada antes, quando o resultado aparece.

## Git

- Trabalhe em branch e abra pull request para `main`; `main` é o que está publicado.
- Não versione `output/` nem `node_modules/` (já estão no `.gitignore`).
- Mensagens de commit em português, no imperativo, descrevendo o porquê.
