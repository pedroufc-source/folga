# FOLGA — Sua vida cabe na 6×1?

**Jogue:** https://pedroufc-source.github.io/folga/

Um jogo de dois minutos para celular e computador. Você tem oito planos para a semana: feira, praia, almoço de domingo, estudar, sair com os amigos, treino, um hobby e não fazer nada. Encaixe o que der numa semana de **6×1** (44h de trabalho, uma folga). Depois, a mesma vida na **5×2** (40h, duas folgas): os planos continuam onde estavam e o que ficou de fora ganha outra chance.

No fim, o jogo mostra o que coube em cada semana e gera uma imagem para os Stories do Instagram ou o WhatsApp. Na 6×1 deste modelo, nem jogando perfeito cabem mais de 6 planos. Na 5×2, cabem os 8.

## Como jogar

- **Celular:** toque num plano na parte de baixo. Os espaços verdes no calendário mostram onde ele cabe. Toque num deles, ou num dos horários listados.
- **Computador:** clique e toque como no celular, ou arraste o plano até o calendário.
- Para mover, toque no plano já encaixado. Para tirar, use "Tirar da semana". "Desfazer" volta a última jogada.
- Na quarta, o ônibus atrasa uma hora. Acontece nas duas semanas.

O progresso fica só no navegador (`localStorage`). Sem cadastro, sem coleta de dados, sem nenhuma requisição externa.

## Compartilhar

Na tela de resultado, "Compartilhar minha semana" abre:

- **Postar nos Stories ou enviar:** no celular, abre o menu de compartilhamento do aparelho com a imagem 1080×1920 (Instagram, WhatsApp e outros).
- **WhatsApp:** abre o WhatsApp com um texto pronto e o link do jogo.
- **Copiar texto** e **Baixar imagem**, para quando o aparelho não compartilha arquivos.

O link do jogo tem imagem de preview (`og.png`), que aparece quando ele é colado no WhatsApp ou nas redes.

## Números e fontes

| Horas por semana | 6×1 | 5×2 |
| --- | ---: | ---: |
| Trabalho | 44 | 40 |
| Ônibus (2h por dia de trabalho) | 12 | 10 |
| Sono (23h–7h) | 56 | 56 |
| Casa, café e janta (3h por dia) | 21 | 21 |
| Atraso do ônibus na quarta | 1 | 1 |
| **Livre para os planos** | **34** | **40** |

As 44h são o limite da Constituição (art. 7º, XIII). As 40h com dois dias de descanso são o que propõe a PEC do fim da escala 6×1. O resto (horários, janelas dos planos, sono, ônibus) é modelo do jogo, não média da população. Detalhes e links em [REFERENCIAS.md](REFERENCIAS.md).

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
