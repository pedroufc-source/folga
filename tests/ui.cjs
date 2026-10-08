const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/pedrorochadeoliveira/.codex/skills/develop-web-game/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'output', 'qa'); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.GAME_URL || 'http://127.0.0.1:8781';
const errors = [], passed = [];
let browser;
const state = async page => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
async function screenshot(page, name) { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); }
async function clean(viewport = { width: 1440, height: 1000 }, init) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...(viewport.width < 761 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(BASE); await page.waitForFunction(() => window.render_game_to_text);
  return { context, page };
}
async function place(page, id, day, start) {
  await page.locator(`[data-task="${id}"]`).click();
  await page.locator(`[data-picker-day="${day}"]`).click();
  await page.locator(`[data-start="${start}"]`).click();
}
async function dismissEvent(page) {
  if ((await state(page)).dialog === 'event-dialog') await page.locator('#event-ok').click();
  await page.waitForFunction(() => !document.getElementById('event-dialog').open);
}
async function finish(page) {
  await page.locator('#finish-button').click();
  if ((await state(page)).dialog === 'event-dialog') await dismissEvent(page);
  await page.locator('#confirm-finish').click();
}
async function mark(name) { passed.push(name); process.stdout.write(`PASS ${name}\n`); }
async function canvasTarget(page, day, hour) {
  const s = await state(page), rect = await page.locator('canvas').boundingBox(), b = s.board;
  return { x: rect.x + b.left + (b.shownDays.indexOf(day) + .5) * b.col, y: rect.y + b.top + (hour - 7 + .4) * b.row };
}
(async () => {
  browser = await chromium.launch({ headless: true });
  try {
    {
      const { context, page } = await clean();
      assert.equal((await state(page)).mode, 'intro');
      await screenshot(page, 'desktop-inicio');
      await page.locator('#about-button').click(); assert.equal((await state(page)).dialog, 'about-dialog');
      await page.keyboard.press('Escape');
      await page.locator('#start-button').click();
      assert.equal((await state(page)).scenario.workHours, 44);
      assert.deepEqual((await state(page)).scenario.hoursPerDay, [8, 8, 8, 8, 8, 4, 0]);
      assert.ok((await page.locator('#agenda-text').textContent()).includes('12h–13h: Almoço / intervalo'));
      await screenshot(page, 'desktop-semana-1');
      await mark('Apresentação, instruções, Escape e início');

      await page.locator('[data-task="feira"]').click();
      assert.equal((await state(page)).choices.every(d => d.starts.length === 0), true);
      assert.ok((await page.locator('#placement-picker').textContent()).includes('Sem encaixe'));
      await place(page, 'corpo', 2, 20);
      await place(page, 'curso', 1, 20);
      await place(page, 'familia', 6, 12);
      assert.equal((await state(page)).dialog, 'event-dialog');
      assert.equal((await state(page)).weeks[0].some(p => p.id === 'corpo'), false);
      await screenshot(page, 'desktop-imprevisto');
      await dismissEvent(page);
      await mark('Janelas impossíveis e imprevisto devolvendo atividade afetada');

      await place(page, 'corpo', 0, 20);
      await page.locator('#undo-button').click();
      assert.equal((await state(page)).weeks[0].some(p => p.id === 'corpo'), false);
      await place(page, 'corpo', 0, 20);
      await page.locator('[data-task="corpo"]').click();
      await page.locator('[data-remove="corpo"]').click();
      assert.equal((await state(page)).weeks[0].some(p => p.id === 'corpo'), false);
      await place(page, 'corpo', 0, 20);
      await place(page, 'amigos', 4, 20);
      await place(page, 'projeto', 5, 19);
      await place(page, 'nada', 6, 8);
      assert.equal((await state(page)).weeks[0].length, 6);
      await page.locator('[data-task="sol"]').click();
      const target = await canvasTarget(page, 6, 10);
      await page.mouse.click(target.x, target.y);
      assert.equal((await state(page)).weeks[0].length, 6);
      assert.ok((await state(page)).message.includes('coincide'));
      await page.locator('#cancel-selection').click();
      await mark('Colisão, desfazer, retirar e recolocar sem duplicatas');

      await page.reload(); await page.locator('#start-button').click();
      assert.equal((await state(page)).weeks[0].length, 6);
      await page.locator('#home-button').click(); await page.locator('#start-button').click();
      assert.equal((await state(page)).mode, 'playing');
      await screenshot(page, 'desktop-primeira-preenchida');
      await finish(page); assert.equal((await state(page)).mode, 'intermission');
      await screenshot(page, 'desktop-intervalo');
      await page.locator('#next-button').click();
      assert.equal((await state(page)).round, 2); assert.equal((await state(page)).weeks[1].length, 0);
      await mark('Salvar, retomar e avançar entre semanas');

      for (const [id, day, hour] of [['feira', 5, 8], ['sol', 5, 10], ['familia', 6, 12], ['curso', 1, 20], ['amigos', 4, 20], ['corpo', 0, 20], ['projeto', 5, 19], ['nada', 6, 8]]) {
        await place(page, id, day, hour); await dismissEvent(page);
      }
      assert.equal((await state(page)).weeks[1].length, 8);
      await screenshot(page, 'desktop-segunda-preenchida');
      await finish(page);
      const s = await state(page); assert.equal(s.mode, 'results'); assert.equal(s.stats[1].available - s.stats[0].available, 6);
      assert.equal(await page.locator('#time-gain').textContent(), '+6h');
      assert.ok((await page.locator('#time-gain-description').textContent()).includes('4h a menos de trabalho + 2h a menos de trajeto'));
      assert.equal(await page.locator('.plan-table .included').count(), 14);
      await screenshot(page, 'desktop-resultado');
      await page.locator('.premises-result summary').click(); assert.ok((await page.locator('#hours-table').textContent()).includes('168h'));
      await page.locator('#share-button').click();
      const text = await page.locator('#share-text').inputValue();
      assert.ok(text.includes('44h → 40h')); assert.ok(!text.includes('127.0.0.1'));
      await page.locator('#copy-button').click(); assert.ok((await page.locator('#copy-status').textContent()).length > 0);
      await page.keyboard.press('Escape');
      await page.reload(); await page.locator('#start-button').click(); assert.equal((await state(page)).mode, 'results');
      await page.locator('#replay-button').click(); await page.locator('#confirm-restart').click();
      assert.equal((await state(page)).weeks[0].length, 0); assert.equal((await state(page)).round, 1);
      await mark('Oito planos, comparação, copiar resultado, retomar resultado e reiniciar');
      await context.close();
    }
    {
      const { context, page } = await clean(); await page.locator('#start-button').click();
      const handle = page.locator('[data-drag="corpo"]'); await handle.scrollIntoViewIfNeeded();
      const r = await handle.boundingBox(), target = await canvasTarget(page, 0, 20);
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 15 }); await page.mouse.up();
      assert.equal((await state(page)).weeks[0].find(p => p.id === 'corpo').start, 20);
      await page.locator('[data-task="corpo"]').click(); await page.locator('[data-picker-day="0"]').click(); await page.locator('[data-start="21"]').click();
      assert.equal((await state(page)).weeks[0].length, 1); assert.equal((await state(page)).weeks[0][0].start, 21);
      await page.locator('canvas').focus(); await page.keyboard.press('f');
      await page.waitForTimeout(100); assert.ok(await page.evaluate(() => !!document.fullscreenElement));
      await page.keyboard.press('f');
      await mark('Arraste real, mover plano e tela cheia'); await context.close();
    }
    {
      const { context, page } = await clean({ width: 390, height: 844 });
      await screenshot(page, 'celular-inicio'); await page.locator('#start-button').tap();
      await page.locator('#show-calendar').tap();
      assert.equal((await state(page)).board.mobile, true); assert.equal((await state(page)).board.shownDays.length, 1);
      await page.locator('#show-plans').tap();
      await page.locator('[data-task="familia"]').tap();
      await screenshot(page, 'celular-selecao');
      await page.locator('[data-start="12"]').tap();
      await page.locator('#show-calendar').tap();
      await page.locator('[data-day="6"]').tap();
      await screenshot(page, 'celular-calendario');
      assert.equal((await state(page)).weeks[0][0].day, 6);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.locator('#show-plans').tap();
      await finish(page); await page.locator('#next-button').tap();
      await place(page, 'feira', 5, 8); await place(page, 'sol', 5, 10); await place(page, 'familia', 6, 12); await dismissEvent(page);
      await finish(page); await screenshot(page, 'celular-resultado');
      await mark('Celular: toque, calendário por dia, rodada completa e sem rolagem lateral'); await context.close();
    }
    {
      const { context, page } = await clean({ width: 320, height: 740 });
      await screenshot(page, 'celular-320-inicio'); await page.locator('#start-button').click();
      await page.locator('[data-task="corpo"]').click(); await screenshot(page, 'celular-320-jogo');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await mark('Tela de 320px sem conteúdo cortado na horizontal'); await context.close();
    }
    {
      const { context, page } = await clean();
      await page.locator('#start-button').focus(); await page.keyboard.press('Enter');
      await page.locator('[data-task="corpo"]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.pickerDay), '0');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.pickerDay), '0');
      for (let i = 0; i < 7; i++) await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.start), '20');
      await page.keyboard.press('Enter');
      assert.equal((await state(page)).weeks[0][0].id, 'corpo');
      assert.ok(await page.evaluate(() => !!document.activeElement.dataset.task));
      await mark('Fluxo de encaixe por teclado com foco preservado'); await context.close();
    }
    {
      const { context, page } = await clean(undefined, () => {
        localStorage.setItem('folga-game-v1', JSON.stringify({ version: 1, mode: 'playing', round: 0, weeks: [[], []], events: [false, false] }));
      });
      assert.equal(await page.locator('#schedule-update').isVisible(), true);
      await page.locator('#start-button').click();
      assert.equal((await state(page)).scenario.workHours, 44);
      assert.equal((await state(page)).weeks[0].length, 0);
      assert.ok(await page.evaluate(() => localStorage.getItem('folga-game-v1')));
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('folga-game-v2')).version), 2);
      await mark('Nova regra usa save separado e preserva a partida antiga'); await context.close();
    }
    {
      const { context, page } = await clean(undefined, () => { localStorage.setItem('folga-game-v2', '{quebrado'); });
      await page.locator('#start-button').click(); assert.equal((await state(page)).mode, 'playing');
      assert.equal((await state(page)).storageAvailable, true);
      await mark('Recuperação de salvamento corrompido'); await context.close();
    }
    {
      const { context, page } = await clean(undefined, () => {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('Armazenamento bloqueado'); } });
      });
      await page.locator('#start-button').click(); assert.equal((await state(page)).storageAvailable, false);
      await place(page, 'curso', 1, 20); assert.equal((await state(page)).weeks[0].length, 1);
      await mark('Jogo funcional com armazenamento bloqueado'); await context.close();
    }
    {
      const { context, page } = await clean();
      await context.setOffline(true); await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
      await page.locator('#start-button').click(); await place(page, 'curso', 1, 20);
      assert.equal((await state(page)).weeks[0].length, 1);
      await mark('HTML local sem internet e sem servidor'); await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ date: '2026-10-08', passed, consoleErrors: errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
