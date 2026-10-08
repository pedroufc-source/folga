# FOLGA — Sua vida cabe na 6×1?

**Jogue:** https://pedroufc-source.github.io/folga/

Um simulador de vida dentro de uma agenda. Você trabalha na escala 6×1: abriu o link, caiu na semana de 19 a 25 de outubro de 2026.

1. **Segunda a sábado é trabalho:** 8h–12h e 13h–17h, sábado até o meio-dia, com 1h de transporte na ida e 1h na volta. Domingo é livre. Você tem **3 minutos**.
2. **Primeiro, sobreviver:** comida todo dia, mercado, faxina, roupa, marmita, contas e pelo menos **4h de fazer nada**.
3. **Depois, viver:** família, praia, churrasco, culto, amigas, karaokê, estudo, academia, app de relacionamento, salão, motel. A lista só abre quando o básico estiver na agenda.
4. **Tudo se move:** cada bloco do dia de trabalho é independente. Transporte de 1h ou 2h, almoço de 1h ou 2h e em outro horário, até 2h de hora extra. A CLT barra mais de 6h seguidas de trabalho, e o jogo mostra o que diz a proposta que Flávio assina.
5. **Não tem como vencer.** Com a lista inicial, mesmo mexendo no trabalho, na 6×1 cabem no máximo 10 das 11 coisas pra viver. Quando a semana fecha ou o tempo acaba, vem o **GAME OVER**: o que faltou (o básico, o descanso ou a vida), o relato de quem vive a 6×1, vídeos e o que Flávio disse sobre o fim da 6×1.
6. **"Experimentar a escala 5×2"** traz a mesma semana com dois dias de folga, sem relógio. **"Tentar de novo"** começa outra 6×1. O resultado compara as duas e vira imagem para os Stories e o WhatsApp.

Sem moralismo: dá para tirar sugestões, pôr mais do catálogo (bet, bar, baile, videogame, bico de entregas…) ou criar o que quiser.

## Como jogar

- **Celular:** toque num item da lista e depois num espaço livre da agenda. Para mexer no trabalho, no almoço ou no transporte, toque no bloco.
- **Computador:** clique como no celular ou arraste.
- "＋ Mais coisas" abre as sugestões e o campo para criar um item. "Desfazer" volta a última jogada.

O progresso fica só no navegador (`localStorage`). Sem cadastro, sem coleta de dados, sem nenhuma requisição externa.

## Compartilhar

No resultado, "Compartilhar minha semana" abre quatro opções:

- **Postar nos Stories ou enviar:** no celular, abre o menu do aparelho com a imagem 1080×1920 (Instagram, WhatsApp e outros).
- **WhatsApp:** abre o WhatsApp com um texto pronto e o link do jogo.
- **Copiar texto.**
- **Baixar imagem**, para quando o aparelho não compartilha arquivos.

O link tem imagem de preview (`og.png`), que aparece quando é colado no WhatsApp ou nas redes.

## Números e fontes

| Horas por semana | 6×1 | 5×2 |
| --- | ---: | ---: |
| Trabalho | 44 | 40 |
| Dias de trabalho | 6 | 5 |
| Transporte (1h na ida e 1h na volta) | 12 | 10 |
| Almoço nos dias de 8h | 5 | 5 |
| Sono (23h–6h) | 49 | 49 |
| Livre | 58 | 64 |
| Pra sobreviver (casa, comida e 4h de fazer nada) | 22 | 22 |
| **Sobra pra viver** | **36** | **42** |

Os arranjos da jornada vêm do DIEESE, o tempo de transporte do Censo 2022 e da Rede Nossa São Paulo, as horas de casa do IBGE e o sono do CDC. A CLT e a Constituição dão os limites. Os relatos (Agência Brasil, Agência Mural, UOL, TVT, BBC, Brasil de Fato) e a posição de Flávio (InfoMoney, Senado, Folhapress) estão no "Como funciona", com links. A divisão das tarefas, a duração dos planos e as 4h de fazer nada são escolhas do jogo. Detalhes em [REFERENCIAS.md](REFERENCIAS.md).

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
