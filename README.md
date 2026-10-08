# FOLGA — Sua vida cabe na 6×1?

**Jogue:** https://pedroufc-source.github.io/folga/

Você trabalha na escala 6×1. Abriu o link, caiu na semana.

1. **A semana 6×1 do Flávio:** seis dias de trabalho, 44h e **2 minutos no relógio** para encaixar a vida. Na primeira visita, uma janela curta explica como jogar; o relógio só anda depois que ela fecha.
2. O tempo acaba, a semana acaba: **GAME OVER**. "Tá cansado? Você é a favor da escala 6×1?"
3. **Não:** "Se arrependeu? Você ainda pode mudar seu voto." A mesma vida na **5×2 do Lula**, com cinco dias de trabalho, sem relógio e com os planos no lugar. **Sim:** segunda-feira começa tudo de novo.
4. O resultado compara as duas semanas e vira imagem para os Stories e o WhatsApp.

**Tudo se move:** trabalho, almoço, faxina, karaokê, motel, salão, culto, bet. No dia de trabalho dá para fazer hora extra e mudar o almoço, mas a CLT barra trabalho acima de 6h seguidas sem intervalo, e o jogo mostra o que diz a proposta que o Flávio apoia. A lista começa com 13 sugestões; dá para tirar, pôr mais do catálogo ou criar o que quiser.

Com a lista inicial, mesmo mexendo no horário do trabalho e sem relógio, na 6×1 cabem no máximo 12 das 13 coisas. Na 5×2, cabem todas.

## Como jogar

- **Celular:** toque num plano da lista e depois num espaço verde do calendário. Para mexer no trabalho (horário, dia, hora extra, almoço), toque nele. A lista rola para o lado.
- **Computador:** clique como no celular ou arraste.
- "＋ Mais coisas" abre as sugestões e o campo para criar um item. "Desfazer" volta a última jogada.

O progresso fica só no navegador (`localStorage`). Sem cadastro, sem coleta de dados, sem nenhuma requisição externa.

## Compartilhar

Nas telas de resultado, "Compartilhar minha semana" abre quatro opções:

- **Postar nos Stories ou enviar:** no celular, abre o menu do aparelho com a imagem 1080×1920 (Instagram, WhatsApp e outros).
- **WhatsApp:** abre o WhatsApp com um texto pronto e o link do jogo.
- **Copiar texto.**
- **Baixar imagem**, para quando o aparelho não compartilha arquivos.

O link tem imagem de preview (`og.png`), que aparece quando é colado no WhatsApp ou nas redes.

## Números e fontes

| Horas por semana | 6×1 (Flávio) | 5×2 (Lula) |
| --- | ---: | ---: |
| Trabalho | 44 | 40 |
| Dias de trabalho | 6 | 5 |
| Transporte (2h por dia de trabalho) | 12 | 10 |
| Almoço nos dias de 8h | 5 | 5 |
| Sono (23h–7h) | 56 | 56 |
| **Livre para você** | **51** | **57** |

O limite de 44h está na Constituição (art. 7º, XIII); hora extra e intervalo, na CLT (arts. 59 e 71). A PEC do fim da escala 6×1 propõe 40h com dois dias de descanso. O que Lula e Flávio disseram, a PEC 12/2026 e o movimento Vida Além do Trabalho estão no diálogo "Como funciona", com as fontes. O resto (horários e duração dos planos) é modelo do jogo. Detalhes em [REFERENCIAS.md](REFERENCIAS.md).

## Rodar e testar

```sh
npm install && npx playwright install chromium webkit   # uma vez
npm start          # http://127.0.0.1:8781
npm test           # regras
npm run test:ui    # navegador: fluxos, celular (Chromium e WebKit), offline; capturas em output/qa/
```

Também funciona abrindo `index.html` direto, sem servidor e sem internet. No Mac, dá para abrir com dois cliques em **Abrir Folga.command**.

Para colaborar, leia [AGENTS.md](AGENTS.md): regras de conteúdo, identidade visual e código.

## Créditos

Fonte Anton (SIL Open Font License), servida pelo próprio site. Veja [THIRD_PARTY.md](THIRD_PARTY.md).
