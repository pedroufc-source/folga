# Instruções para assistentes de IA

Este arquivo orienta assistentes de código (Claude Code, Codex, Cursor, Copilot etc.) que trabalham neste repositório. Pessoas também podem lê-lo: é um resumo das regras que valem para todos.

## O projeto

FOLGA é um jogo estático para o segundo turno de 2026. A primeira página diz: "Você trabalha na escala 6×1 e vai votar. Qual é o seu candidato?". Quem escolhe **Flávio** monta a semana **6×1** (44h, seis dias de trabalho); quem escolhe **Lula**, a **5×2** (40h, cinco dias). No fim aparece "Se arrependeu? Você ainda pode mudar seu voto", que leva à semana do outro, com os mesmos planos. O resultado vira imagem para Stories/WhatsApp. Publicado pelo GitHub Pages a partir de `main`: https://pedroufc-source.github.io/folga/

**Tudo se move.** Os dias de trabalho (com ônibus e almoço), os planos e o dia de folga vão para qualquer dia e hora, das 7h às 23h. A escala só define quantos dias de trabalho existem. A lista de planos é do jogador: começa com 13 sugestões (50h), há um catálogo com mais e dá para criar itens próprios. O tom é **sem moralismo**: app de relacionamento, motel, bet, karaokê e culto entram do mesmo jeito que faxina e mercado.

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

- `engine.js`: regras puras (`window.FolgaEngine`): escalas, dias de trabalho, catálogo e lista inicial, encaixes, trocas de escala (`carryOver`), contas, máximo possível (`maxPlans`) e texto de compartilhamento. Testado em `tests/engine.test.cjs`.
- `app.js`: interface (escolha do candidato, calendário em canvas, lista de planos, diálogo de sugestões, `localStorage`, imagem 1080×1920 de compartilhamento).
- `styles.css`: visual; **todas as cores são tokens em `:root`**. `index.html`: marcação, metatags de preview e diálogo "Como funciona" com as fontes.
- `REFERENCIAS.md`: fontes e o que é premissa do modelo. `tools/`: gerador do `og.png`.

## Identidade visual

- Marca neutra: papel e tinta, FOLGA em carimbo (fonte Anton, em `fonts/`).
- **Flávio / 6×1: verde, amarelo e azul-marinho** (a identidade do jogo FLÁVIO). **Lula / 5×2: vermelho com estrela branca.** A cor aparece nos botões da primeira página, na faixa do jogo, nas miniaturas, na imagem de compartilhamento e no texto (🟩🟨 / 🟥⭐).
- O calendário usa as mesmas cores nas duas semanas (trabalho escuro, ônibus cinza, almoço bege, planos coloridos) para a comparação ser justa.

## Regras invioláveis

### Conteúdo
1. **Nunca invente fatos, números, datas, citações ou URLs.** O que o jogo diz sobre os candidatos e a PEC está no diálogo "Como funciona", com fonte, e em `REFERENCIAS.md`. Não escreva que Flávio votou contra o fim da 6×1: as fontes dizem que ele evitou dizer como vota. Antes de afirmar algo sobre a tramitação da PEC, reconfira na Agência Senado.
2. Ligar Flávio à 6×1 e Lula à 5×2 é a premissa do jogo, decidida pelo dono do projeto; as frases que a sustentam ficam no diálogo, com fonte.
3. O resto é **modelo**: horários, duração dos planos e sono são escolhas do jogo, não médias da população.
4. Sem moralismo nem restrição: nenhum plano tem dia ou hora marcada, e nenhuma sugestão vem com julgamento.
5. Mudou regras ou números? Atualize juntos `engine.js`, a tabela do diálogo em `index.html`, `REFERENCIAS.md` e os testes. Se mexer na lista inicial, confira com `maxPlans` que a 6×1 continua sem caber tudo e a 5×2 continua cabendo.

### Código
1. **Sem build, sem framework, sem dependência em tempo de execução.** O jogo deve funcionar abrindo `index.html` via `file://` e offline. O Playwright é só dependência de desenvolvimento.
2. **Nenhuma requisição externa em tempo de execução**: sem CDN, Google Fonts, analytics ou embeds. O botão do WhatsApp é um link simples (`wa.me`). O teste falha se a página pedir algo de fora.
3. Scripts clássicos com `defer`, nesta ordem: `engine.js`, `app.js`.
4. Cores só como tokens CSS; o canvas lê os tokens com `getComputedStyle`. Não coloque cores fixas no JS.
5. **Celular primeiro:** os dois candidatos aparecem sem rolar e, no jogo, calendário, lista e botões cabem na tela, de 320×460 a 430×740 (e tablet). A lista rola para o lado. O `test:ui` verifica; não afrouxe o teste para fazê-lo passar.
6. **Compatibilidade:** Safari 15.4+ (iOS) e Chrome/Firefox recentes. Nada de `ctx.roundRect` (use `arcTo`). Emojis no canvas: só os que não precisam de seletor de variação (U+FE0F) nem junção (U+200D), que o WebKit desalinha; o teste confere o catálogo.
7. Acessibilidade: emoji além da cor em cada plano, agenda em texto (`#accessible-board`), alternativa por botões a todo arraste, foco visível, `prefers-reduced-motion`.
8. Salvamento em `localStorage['folga-v4']` (`{version:4, mode, first, step, round, items, weeks:[{work, plans}|null ×2], nextId}`), validado por `validateSave`. Mudou o formato? Escreva a migração e não mude os `id` do catálogo.
9. `window.render_game_to_text()` e os seletores (`data-choose`, `data-task`, `data-cat`, `.slot`, `#switch-button`…) são usados pelos testes; ao renomear, atualize `tests/ui.cjs`.
10. Compartilhamento: a imagem é gerada no navegador (canvas → PNG). `navigator.share` com arquivo precisa ser chamado direto no toque, por isso a imagem é preparada antes, quando o resultado aparece.

## Git

- Trabalhe em branch e abra pull request para `main`; `main` é o que está publicado.
- Não versione `output/` nem `node_modules/` (já estão no `.gitignore`).
- Mensagens de commit em português, no imperativo, descrevendo o porquê.
