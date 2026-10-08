'use strict';
// Testes de interface com Playwright: `npm run test:ui`.
// Sobe um servidor estático próprio (ou usa GAME_URL), roda os fluxos no Chromium e confere
// o layout de celular no Chromium e no WebKit (motor do Safari/iPhone). Capturas e relatório em output/qa/.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let playwright;
try { playwright = require('playwright'); }
catch {
  console.error('Playwright não encontrado. Rode: npm install && npx playwright install chromium webkit');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const out = path.join(root, 'output', 'qa');
fs.mkdirSync(out, { recursive: true });
const errors = [];
const checks = [];
const check = name => { checks.push(name); console.log('PASS', name); };

// Tamanhos de tela visíveis com as barras do navegador abertas (o pior caso).
const PHONES = [
  { name: 'iphone-se-1', width: 320, height: 460, scale: 2 },
  { name: 'iphone-se', width: 375, height: 548, scale: 2 },
  { name: 'android-pequeno', width: 360, height: 560, scale: 3 },
  { name: 'iphone-14', width: 390, height: 664, scale: 3 },
  { name: 'android', width: 412, height: 760, scale: 2.625 },
  { name: 'iphone-pro-max', width: 430, height: 740, scale: 3 },
  { name: 'tablet', width: 768, height: 1000, scale: 2 },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png',
};
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
function listen(page, label, base) {
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith('blob:') && !u.startsWith('data:') && !u.startsWith('file:') && !(base && u.startsWith(base))) errors.push(`${label}: requisição externa ${u}`);
  });
}
async function boardXY(page, day, hour) {
  const b = (await state(page)).board;
  return { x: b.left + b.gx + (day + .5) * b.cw, y: b.top + b.gy + (hour - b.firstHour + .5) * b.rh };
}
async function dismissEvent(page, tap) {
  if ((await state(page)).dialog === 'event-dialog') await (tap ? page.tap('#event-ok') : page.click('#event-ok'));
}
async function put(page, id, day, start, tap = false) {
  const act = sel => (tap ? page.tap(sel) : page.click(sel));
  await act(`[data-task="${id}"]`);
  await act(`.slot[data-day="${day}"][data-start="${start}"]`);
  await dismissEvent(page, tap);
  const placed = (await state(page)).plans.find(p => p.id === id).scheduled;
  assert.deepEqual([placed.day, placed.start], [day, start], `${id} encaixado em ${day}/${start}`);
}
const noScroll = page => page.evaluate(() => ({
  vertical: document.documentElement.scrollHeight <= innerHeight + 1,
  horizontal: document.documentElement.scrollWidth <= innerWidth,
}));
const insideViewport = (page, selector) => page.evaluate(sel => [...document.querySelectorAll(sel)].every(el => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1;
}), selector);

async function desktopFlows(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage(); listen(page, 'desktop', base);
  await page.goto(base + '/');
  await page.waitForFunction(() => window.render_game_to_text);
  assert.equal((await state(page)).mode, 'intro');
  await page.screenshot({ path: path.join(out, 'desktop-inicio.png') });
  await page.click('#about-button');
  assert.equal((await state(page)).dialog, 'about-dialog');
  assert.ok(await page.locator('#about-dialog a[href*="senado.leg.br"]').count(), 'fonte do Senado');
  await page.screenshot({ path: path.join(out, 'desktop-premissas.png') });
  await page.keyboard.press('Escape');
  await page.click('#start-button');
  let s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.scale, '6×1');
  assert.equal(await page.evaluate(() => document.body.dataset.round), '0');
  check('Início abre a semana 6×1, com premissas e fontes num diálogo');

  await page.click('[data-task="feira"]');
  s = await state(page);
  assert.equal(s.selected, 'feira'); assert.equal(s.options.length, 0); assert.equal(s.statusTone, 'error');
  assert.match(s.status, /Na 6×1 não cabe: sábado, entre 8h e 12h/);
  assert.equal(await page.locator('#picker .slot').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal((await state(page)).selected, null);
  check('Feira na 6×1 explica que sábado de manhã é trabalho');

  await put(page, 'sol', 6, 10);
  await page.click('[data-task="familia"]');
  assert.match((await state(page)).status, /Praia ou parque/);
  await page.keyboard.press('Escape');
  check('Plano que disputa o domingo aponta quem ocupa o espaço');

  await page.click('[data-task="curso"]');
  let p = await boardXY(page, 1, 21);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  s = await state(page);
  assert.deepEqual(s.plans.find(x => x.id === 'curso').scheduled, { id: 'curso', day: 1, start: 20, end: 23 });
  check('Clique na área verde do calendário encaixa o plano cobrindo a hora clicada');

  const chip = await page.locator('[data-task="amigos"]').boundingBox();
  p = await boardXY(page, 4, 21);
  await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.mouse.down();
  await page.mouse.move(chip.x - 40, chip.y + 10, { steps: 4 });
  await page.mouse.move(p.x, p.y, { steps: 8 });
  s = await state(page);
  assert.equal(s.selected, null);
  await page.mouse.up();
  s = await state(page);
  assert.deepEqual(s.plans.find(x => x.id === 'amigos').scheduled, { id: 'amigos', day: 4, start: 20, end: 23 });
  assert.equal(s.dialog, 'event-dialog', 'o imprevisto aparece no terceiro plano');
  assert.equal(s.eventActive, true);
  await page.screenshot({ path: path.join(out, 'desktop-imprevisto.png') });
  await page.click('#event-ok');
  check('Arrastar da lista para o calendário encaixa; o imprevisto aparece no terceiro plano');

  p = await boardXY(page, 2, 12);
  await page.mouse.click(p.x, p.y);
  assert.match((await state(page)).status, /almoço/);
  await page.click('[data-task="corpo"]');
  p = await boardXY(page, 0, 21);
  await page.mouse.move(p.x, p.y);
  await page.screenshot({ path: path.join(out, 'desktop-previa.png') });
  await page.mouse.click(p.x, p.y);
  assert.deepEqual((await state(page)).plans.find(x => x.id === 'corpo').scheduled, { id: 'corpo', day: 0, start: 20, end: 22 });
  await put(page, 'nada', 3, 20);
  const from = await boardXY(page, 3, 21), to = await boardXY(page, 6, 20);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
  s = await state(page);
  assert.deepEqual(s.plans.find(x => x.id === 'nada').scheduled, { id: 'nada', day: 6, start: 19, end: 21 });
  check('Tocar em bloco fixo explica o horário; arrastar um plano encaixado o move');
  await page.click('#undo-button');
  assert.deepEqual((await state(page)).plans.find(x => x.id === 'nada').scheduled, { id: 'nada', day: 3, start: 20, end: 22 });
  const solXY = await boardXY(page, 6, 12);
  await page.mouse.click(solXY.x, solXY.y);
  assert.equal((await state(page)).selected, 'sol');
  await page.click('[data-remove="sol"]');
  assert.equal((await state(page)).plans.find(x => x.id === 'sol').scheduled, null);
  await page.click('#undo-button');
  assert.ok((await state(page)).plans.find(x => x.id === 'sol').scheduled);
  check('Desfazer volta a jogada; tocar num plano encaixado permite tirar');

  await page.focus('[data-task="projeto"]');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('slot')), true);
  await page.keyboard.press('Enter');
  s = await state(page);
  assert.ok(s.plans.find(x => x.id === 'projeto').scheduled);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.task), 'feira');
  assert.match(await page.locator('#accessible-board').innerText(), /tempo pro hobby \(plano\)/i);
  check('Teclado: Enter escolhe o plano, o horário e devolve o foco à lista; agenda em texto acompanha');
  await page.screenshot({ path: path.join(out, 'desktop-semana-1.png') });

  const week1 = (await state(page)).weeks[0];
  await page.click('#finish-button');
  assert.equal((await state(page)).dialog, 'finish-dialog');
  await page.click('#confirm-finish');
  s = await state(page);
  assert.equal(s.mode, 'intermission');
  assert.match(await page.locator('#mid-title').innerText(), new RegExp(`Coube ${week1.length} de 8`, 'i'));
  await page.screenshot({ path: path.join(out, 'desktop-intervalo.png'), fullPage: true });
  await page.click('#next-button');
  s = await state(page);
  assert.equal(s.scale, '5×2'); assert.equal(s.round, 2); assert.equal(s.events[1], true);
  assert.deepEqual(s.weeks[1], week1, 'a 5×2 começa com os encaixes da 6×1');
  assert.equal(await page.evaluate(() => document.body.dataset.round), '1');
  check('Fechar a 6×1 mostra o que ficou de fora; a 5×2 começa com os mesmos encaixes');

  await put(page, 'feira', 5, 8);
  await put(page, 'sol', 5, 10);
  await put(page, 'familia', 6, 12);
  assert.equal((await state(page)).weeks[1].length, 8);
  await page.screenshot({ path: path.join(out, 'desktop-semana-2.png') });
  await page.click('#finish-button');
  s = await state(page);
  assert.equal(s.mode, 'results');
  assert.match(await page.locator('#results-title').innerText(), /NA 6×1, COUBE \d\.\s+NA 5×2, COUBE 8\./i);
  assert.match(await page.locator('#results-insight').innerText(), /máximo/);
  check('Com os oito planos, a 5×2 fecha sem confirmação e o resultado compara as semanas');

  await page.click('#share-button');
  await page.waitForFunction(() => document.getElementById('share-image').naturalWidth > 0);
  const img = await page.evaluate(() => [document.getElementById('share-image').naturalWidth, document.getElementById('share-image').naturalHeight]);
  assert.deepEqual(img, [1080, 1920]);
  s = await state(page);
  assert.ok(s.share.imageBytes > 20000);
  assert.ok(s.share.whatsapp.startsWith('https://wa.me/?text='));
  const wa = decodeURIComponent(s.share.whatsapp.slice('https://wa.me/?text='.length));
  assert.equal(wa, s.share.text);
  assert.match(wa, /6×1 🟩🟩🟩🟩🟩🟩🟨/); assert.match(wa, /5×2 🟥🟥🟥🟥🟥⭐⭐\ncoube 8 de 8/);
  assert.match(wa, /pedroufc-source\.github\.io\/folga\//, 'servidor local compartilha o endereço público');
  assert.equal(await page.locator('#download-link').getAttribute('download'), 'folga-minha-semana.png');
  assert.match(await page.locator('#download-link').getAttribute('href'), /^blob:/);
  await page.click('#copy-button');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), s.share.text);
  await page.screenshot({ path: path.join(out, 'desktop-compartilhar.png') });
  const story = await page.evaluate(async () => {
    const blob = await (await fetch(document.getElementById('share-image').src)).blob();
    return await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
  });
  fs.writeFileSync(path.join(out, 'imagem-stories.png'), Buffer.from(story, 'base64'));
  await page.keyboard.press('Escape');
  check('Compartilhar: imagem 1080×1920, link do WhatsApp com o texto, cópia e download');

  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text);
  assert.match(await page.locator('#start-button').innerText(), /Continuar/);
  await page.click('#start-button');
  assert.equal((await state(page)).mode, 'results');
  await page.screenshot({ path: path.join(out, 'desktop-resultado.png'), fullPage: true });
  await page.click('#home-button');
  await page.click('#fresh-button');
  await page.click('#confirm-restart');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 1); assert.deepEqual(s.weeks, [[], []]);
  check('Progresso sobrevive à recarga; recomeçar zera as duas semanas');
  await context.close();
}

async function savesAndOffline(browser, base) {
  let context = await browser.newContext();
  let page = await context.newPage(); listen(page, 'save-corrompido', base);
  await page.addInitScript(() => localStorage.setItem('folga-game-v2', '{quebrado'));
  await page.goto(base + '/');
  let s = await state(page);
  assert.equal(s.mode, 'intro'); assert.equal(s.resumeMode, null);
  await context.close();

  context = await browser.newContext();
  page = await context.newPage(); listen(page, 'sem-armazenamento', base);
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }));
  await page.goto(base + '/');
  await page.click('#start-button');
  await put(page, 'sol', 6, 10);
  s = await state(page);
  assert.equal(s.storageAvailable, false); assert.equal(s.weeks[0].length, 1);
  await context.close();
  check('Save corrompido começa do zero; sem localStorage o jogo segue');

  context = await browser.newContext({ offline: true, viewport: { width: 390, height: 664 } });
  page = await context.newPage(); listen(page, 'arquivo-local');
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.click('#start-button');
  await put(page, 'curso', 3, 20);
  assert.equal(await page.evaluate(() => document.fonts.check('30px Anton')), true, 'fonte local carregada');
  await context.close();
  check('Abre por file:// e offline, com a fonte do próprio site e nenhuma requisição externa');
}

async function mobileLayouts(browserType, base) {
  const browser = await browserType.launch();
  const label = browserType.name();
  for (const phone of PHONES) {
    const context = await browser.newContext({ viewport: { width: phone.width, height: phone.height }, deviceScaleFactor: phone.scale, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage(); listen(page, `${label}-${phone.name}`, base);
    await page.goto(base + '/');
    await page.waitForFunction(() => window.render_game_to_text);
    assert.equal((await noScroll(page)).horizontal, true, `${phone.name}: início sem rolagem lateral`);
    if (phone.name === 'iphone-14') await page.screenshot({ path: path.join(out, `celular-${label}-inicio.png`) });
    await page.tap('#start-button');
    const layout = await noScroll(page);
    assert.deepEqual(layout, { vertical: true, horizontal: true }, `${phone.name}: jogo cabe na tela sem rolar`);
    assert.equal(await insideViewport(page, '.chip, #finish-button, #undo-button, #board'), true, `${phone.name}: lista e botões visíveis`);
    const b = (await state(page)).board;
    assert.ok(b.rh >= 9 && b.cw >= 30, `${phone.name}: calendário legível (linha ${b.rh.toFixed(1)}px, coluna ${b.cw.toFixed(1)}px)`);
    await page.tap('[data-task="nada"]');
    assert.deepEqual(await noScroll(page), { vertical: true, horizontal: true }, `${phone.name}: seletor aberto sem rolar`);
    assert.equal(await insideViewport(page, '#picker, #finish-button'), true, `${phone.name}: seletor visível`);
    await page.tap('#picker .slot >> nth=0');
    await page.tap('[data-task="sol"]');
    const p = await boardXY(page, 6, 12);
    await page.touchscreen.tap(p.x, p.y);
    const s = await state(page);
    assert.deepEqual(s.plans.find(x => x.id === 'sol').scheduled, { id: 'sol', day: 6, start: 10, end: 16 }, `${phone.name}: toque no calendário encaixa`);
    await page.tap('[data-task="feira"]');
    await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}.png`) });
    if (phone.name === 'iphone-14' || phone.name === 'iphone-se-1') {
      await page.tap('#picker .picker-close');
      for (const [id, day, start] of [['curso', 1, 20], ['projeto', 5, 19], ['amigos', 4, 20], ['corpo', 2, 21]]) await put(page, id, day, start, true);
      await page.tap('#finish-button');
      if ((await state(page)).dialog === 'finish-dialog') await page.tap('#confirm-finish');
      assert.equal((await noScroll(page)).horizontal, true);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-intervalo.png`) });
      assert.equal(await insideViewport(page, '#next-button'), true, `${phone.name}: botão da 5×2 visível sem rolar`);
      await page.tap('#next-button');
      await put(page, 'feira', 5, 8, true);
      await put(page, 'sol', 5, 10, true);
      await put(page, 'familia', 6, 12, true);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-semana-2.png`) });
      await page.tap('#finish-button');
      assert.equal((await state(page)).mode, 'results');
      assert.equal((await noScroll(page)).horizontal, true, `${phone.name}: resultado sem rolagem lateral`);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-resultado.png`), fullPage: true });
      await page.tap('#share-button');
      await page.waitForFunction(() => document.getElementById('share-image').naturalWidth > 0);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-compartilhar.png`) });
    }
    await context.close();
  }
  await browser.close();
  check(`Celular (${label}): de 320×460 a 430×740 o jogo cabe sem rolar, com toque no calendário e na lista`);
}

(async () => {
  const server = process.env.GAME_URL ? null : await startServer();
  const base = process.env.GAME_URL || `http://127.0.0.1:${server.address().port}`;
  const chromium = await playwright.chromium.launch();
  try {
    await desktopFlows(chromium, base);
    await savesAndOffline(chromium, base);
    await mobileLayouts(playwright.chromium, base);
    await mobileLayouts(playwright.webkit, base);
    assert.deepEqual(errors, [], 'sem erros de console nem requisições externas');
    check('Nenhum erro de console nem requisição externa');
  } finally {
    await chromium.close();
    if (server) server.close();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ date: new Date().toISOString(), checks, errors }, null, 2));
  }
  console.log(`\n${checks.length} verificações de interface aprovadas. Capturas em output/qa/.`);
})().catch(err => { console.error(err); process.exitCode = 1; });
