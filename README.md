# FOLGA — Sua vida cabe na 6×1?

**Jogue:** https://pedroufc-source.github.io/folga/

Você trabalha na escala 6×1 e vai votar no segundo turno, em 25 de outubro. **Qual é o seu candidato?**

- Escolheu **Flávio**: monte a semana **6×1**, com seis dias de trabalho e 44h.
- Escolheu **Lula**: monte a semana **5×2**, com cinco dias de trabalho e 40h.

**Tudo se move:** trabalho, almoço, faxina, karaokê, motel, salão, culto, bet. Você decide o dia e a hora. A lista começa com 13 sugestões; dá para tirar, pôr mais do catálogo ou criar o que quiser. No fim aparece **"Se arrependeu? Você ainda pode mudar seu voto"**: a mesma vida na semana do outro candidato. O resultado vira imagem para os Stories e para o WhatsApp.

Com a lista inicial, mesmo mexendo no horário do trabalho, na 6×1 cabem no máximo 12 das 13 coisas. Na 5×2, cabem todas.

## Como jogar

- **Celular:** toque num plano da lista e depois num espaço verde do calendário. Para mexer no trabalho, toque nele. A lista rola para o lado.
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
| Ônibus (2h por dia de trabalho) | 12 | 10 |
| Almoço nos dias de 8h | 5 | 5 |
| Sono (23h–7h) | 56 | 56 |
| **Livre para você** | **51** | **57** |

O limite de 44h está na Constituição (art. 7º, XIII). A PEC do fim da escala 6×1 propõe 40h com dois dias de descanso. O que Lula e Flávio disseram sobre ela está no diálogo "Como funciona", com as fontes. O resto (horários e duração dos planos) é modelo do jogo. Detalhes em [REFERENCIAS.md](REFERENCIAS.md).

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
