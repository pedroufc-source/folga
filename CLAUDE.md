# FOLGA — continuidade do projeto

Atualizado em 08/10/2026 para Pedro continuar o trabalho com o Claude. Este arquivo descreve o estado entregue; novas orientações de Pedro prevalecem sobre as escolhas do protótipo.

## Leia primeiro

1. [README.md](README.md): execução, mecânica, horários e arquitetura.
2. [REFERENCIAS.md](REFERENCIAS.md): fontes externas, premissas e limites da evidência.
3. [progress.md](progress.md): histórico cronológico. Os primeiros registros de 42h/35h estão superados.
4. [output/VERIFICACAO.json](output/VERIFICACAO.json): versão, hashes e última validação.

## Objetivo e decisões

Pedro pediu um jogo de navegador sobre encaixar compromissos na semana, experimentar outra jornada e comparar o que coube. No contexto do projeto, ele é favorável ao fim da escala 6×1. O protótipo é destinado ao público geral, com premissas visíveis, sem cadastro ou coleta de dados.

O jogo é um quebra-cabeça de calendário: oito atividades, duas semanas, mesmo imprevisto, seleção de dia/horário e arraste no computador. No celular, abas alternam planos e calendário. O usuário pode encerrar uma semana sem encaixar tudo. Horas não preenchidas continuam livres; não há cronômetro ou medidor de produtividade/saúde.

Correção explícita de Pedro: **“a carga horaria no brasil é 44”**. A versão atual usa:

- **6×1 / 44h:** segunda a sexta, 8h por dia; sábado, 4h; domingo livre do trabalho.
- **5×2 / 40h:** segunda a sexta, 8h por dia; sábado e domingo livres do trabalho.

As 40h foram adotadas na implementação com referência à proposta descrita pela Câmara; não são uma carga que Pedro tenha especificado expressamente nem são apresentadas como regra já vigente. Neste modelo mudam tanto a distribuição de dias quanto a carga semanal.

Trabalho em dias completos: 9h–12h e 13h–18h. Almoço fora das horas trabalhadas. Sono de 8h/noite, rotina de 3h/dia e trajeto de 2h por dia trabalhado são escolhas do modelo. Depois do atraso de uma hora na quarta: **34h disponíveis na primeira semana, 40h na segunda; diferença de 6h**. Os detalhes e o cálculo estão no README.

## Estado técnico

- Pasta independente: `/Users/pedrorochadeoliveira/folga_code`. O projeto Flávio é outro, em `/Users/pedrorochadeoliveira/flavio_code`.
- HTML, CSS e JavaScript sem framework, build, IA ou dependências de execução.
- `engine.js`: cenários, atividades, janelas, colisões, imprevisto, totais e validação de saves. Exporta para navegador e CommonJS.
- `app.js`: estado, canvas, controles, dialogs, salvamento, comparação e cópia do resultado.
- `index.html` e `styles.css`: textos, estrutura e visual responsivo. `icon.svg`: ícone.
- `launch.py` e `Abrir Folga.command`: servidor Python limitado a `127.0.0.1`, portas 8781–8790; verifica `project.json` antes de reutilizar servidor.
- `package.json`: versão 1.1.0. Esquema dos saves: versão 2. O identificador estável `folga-calendar-game-v1` do projeto/servidor não é a versão do save.
- Sem repositório Git inicializado nesta pasta na conferência de entrega. Não há publicação pública.

## Abrir e testar

Na pasta do projeto:

```sh
python3 launch.py
node --test tests/engine.test.cjs
node tests/ui.cjs
```

URL padrão: `http://127.0.0.1:8781`. Também funciona por `file://` abrindo `index.html`.

`tests/ui.cjs` usa Playwright instalado em `/Users/pedrorochadeoliveira/.codex/skills/develop-web-game/node_modules/playwright`. Isso é dependência do teste, não do jogo. Fora desse Mac, configure `PLAYWRIGHT_MODULE` com o caminho absoluto do módulo disponível. `GAME_URL` muda a URL do teste quando o inicializador usa outra porta.

Última execução registrada: **9 testes do motor e 13 cenários de interface aprovados, zero erros de console**, em Chromium automatizado, incluindo 1440px, 390px e 320px. Há screenshots em `output/qa/` e relatório em `output/qa/report.json`. Não houve teste em Safari ou aparelho físico.

O hook `window.render_game_to_text()` expõe estado e geometria; `window.advanceTime()` redesenha o jogo por turnos. O cliente da skill usado anteriormente está em `/Users/pedrorochadeoliveira/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js`; sua última captura é `output/skill-44h/`. Para alterações visuais, confira também screenshots da página inteira, não apenas do canvas.

## Pontos de atenção ao alterar

- Regras novas usam `folga-game-v2` no localStorage. A chave v1 foi preservada, com aviso na abertura; resultados de regras diferentes não são mesclados.
- `fixedBlocks()` foi implementado para dias de 8h, 4h ou folga. Alterar apenas `workHours` ou `hoursPerDay` para outras jornadas não cria automaticamente um calendário correto. Atualize os blocos e confirme que trabalho + trajeto + sono + rotina + evento + tempo disponível = 168h.
- O atraso de quarta ocupa 19h–20h, adiando a rotina da noite para 20h–21h. Planos atingidos voltam à lista. O histórico de desfazer é reiniciado para não restaurar conflitos com o evento.
- As oito atividades somam 25h. Há solução com seis na primeira rodada e oito na segunda; essas possibilidades decorrem das janelas escolhidas, não de pesquisa estatística. Soluções de referência estão nos testes do motor.
- Atualize juntos motor, textos de instruções, documentação, saves quando incompatíveis e testes. Resultado e compartilhamento calculam a diferença a partir do motor, mas há textos estáticos de 44h/40h no HTML.
- As fontes são links, não cópias integrais dos documentos. Reconfira o andamento legislativo antes de fazer afirmações sobre vigência ou aprovação.

Não ficou implementação obrigatória pendente. Novas atividades, outras jornadas, testes com pessoas, publicação ou outra direção de game design dependem da próxima orientação de Pedro. A meta inicial de partidas de 2–3 minutos ainda não foi medida com jogadores.
