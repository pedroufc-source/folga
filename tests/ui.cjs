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
const act = (page, tap) => sel => (tap ? page.locator(sel).first().tap() : page.locator(sel).first().click());
async function put(page, uid, day, start, tap = false) {
  await act(page, tap)(`[data-task="${uid}"]`);
  await act(page, tap)(`.slot[data-day="${day}"][data-start="${start}"]`);
  const placed = (await state(page)).week.plans.find(p => p.uid === uid);
  assert.deepEqual([placed.day, placed.start], [day, start], `${uid} encaixado em ${day}/${start}`);
}
// Encaixa cada item da lista no primeiro espaço sugerido, se houver.
async function fillGreedy(page, tap = false) {
  for (const it of (await state(page)).items) {
    const s = await state(page);
    if (s.week.plans.some(p => p.uid === it.uid)) continue;
    await act(page, tap)(`[data-task="${it.uid}"]`);
    if (await page.locator('#picker .slot').count()) await act(page, tap)('#picker .slot');
    else await act(page, tap)('#picker .picker-close');
  }
  return (await state(page)).stats;
}
async function finishWeek(page, tap = false) {
  await act(page, tap)('#finish-button');
  if ((await state(page)).dialog === 'finish-dialog') await act(page, tap)('#confirm-finish');
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
  let s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 0); assert.equal(s.scale, '6×1');
  assert.equal(s.dialog, 'howto-dialog', 'primeira visita: cai na semana com o "como jogar" por cima');
  assert.equal(await page.locator('[data-choose]').count(), 0, 'não pergunta candidato');
  await page.waitForTimeout(1300);
  assert.equal((await state(page)).clock, 120, 'o relógio espera o "como jogar" fechar');
  await page.screenshot({ path: path.join(out, 'desktop-inicio.png') });
  await page.click('#howto-dialog [data-about]');
  assert.equal((await state(page)).dialog, 'about-dialog');
  for (const host of ['folhape.com.br', 'diariodocomercio.com.br', 'jornaldebrasilia.com.br', 'senado.leg.br', 'del5452.htm', 'brasildefato.com.br', 'cnnbrasil.com.br']) {
    assert.ok(await page.locator(`#about-dialog a[href*="${host}"]`).count(), `fonte ${host}`);
  }
  await page.screenshot({ path: path.join(out, 'desktop-premissas.png') });
  await page.keyboard.press('Escape');
  s = await state(page);
  assert.equal(s.introSeen, true);
  assert.equal(s.items.length, 13); assert.equal(s.week.work.length, 6); assert.deepEqual(s.maxPlans, [12, 13]);
  await page.waitForTimeout(1300);
  assert.ok((await state(page)).clock < 119.2, 'o relógio anda');
  await page.click('#help-button');
  assert.equal((await state(page)).dialog, 'howto-dialog');
  const paused = (await state(page)).clock;
  await page.waitForTimeout(1300);
  assert.equal((await state(page)).clock, paused, 'o relógio para com um diálogo aberto');
  await page.click('#howto-start');
  check('Abre direto na semana 6×1, sem perguntar candidato; "como jogar" na primeira visita; relógio de 2 minutos que para nos diálogos; fontes no "Como funciona"');

  await page.click('[data-task="mercado"]');
  let p = await boardXY(page, 0, 21);
  await page.mouse.move(p.x, p.y);
  await page.screenshot({ path: path.join(out, 'desktop-previa.png') });
  await page.mouse.click(p.x, p.y);
  assert.deepEqual((await state(page)).week.plans.find(x => x.uid === 'mercado'), { uid: 'mercado', day: 0, start: 20 });
  await page.click('[data-task="praia"]');
  p = await boardXY(page, 5, 10);
  await page.mouse.click(p.x, p.y);
  assert.match((await state(page)).status, /^Nesse horário você está no trabalho\. Para mexer no trabalho, toque nele de novo\.$/);
  p = await boardXY(page, 1, 20);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).status, 'Aqui só tem 4h livres seguidas. Praia precisa de 6h.');
  await page.keyboard.press('Escape');
  await page.locator('[data-task="praia"]').scrollIntoViewIfNeeded();
  const chip = await page.locator('[data-task="praia"]').boundingBox();
  p = await boardXY(page, 6, 10);
  await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.mouse.down();
  await page.mouse.move(chip.x - 40, chip.y + 10, { steps: 4 });
  await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual((await state(page)).week.plans.find(x => x.uid === 'praia'), { uid: 'praia', day: 6, start: 7 });
  check('Nada tem dia marcado; recusas explicam o motivo; arrastar da lista encaixa');

  p = await boardXY(page, 0, 10);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).selected, 'w0');
  await page.screenshot({ path: path.join(out, 'desktop-dia-de-trabalho.png') });
  await page.click('[data-work="lunch-off"]');
  s = await state(page);
  assert.equal(s.dialog, 'law-dialog');
  assert.match(await page.locator('#law-text').innerText(), /mais de 6 horas seguidas .* 1 hora de intervalo \(art\. 71\)/);
  assert.match(await page.locator('#law-flavio').innerText(), /PEC 12\/2026, que Flávio apoia/);
  await page.screenshot({ path: path.join(out, 'desktop-clt.png') });
  await page.click('#law-dialog .primary');
  await page.click('[data-work="extra+"]'); await page.click('[data-work="extra+"]');
  assert.equal((await state(page)).week.work.find(w => w.uid === 'w0').extra, 2);
  await page.click('[data-work="extra+"]');
  assert.match(await page.locator('#law-text').innerText(), /2 horas por dia \(art\. 59\)/);
  await page.click('#law-dialog .primary');
  await page.click('[data-work="extra-"]'); await page.click('[data-work="extra-"]');
  await page.click('[data-work="lunch+"]');
  assert.deepEqual((await state(page)).week.work.find(w => w.uid === 'w0'), { uid: 'w0', day: 0, start: 7, extra: 0, lunch: true, lunchAt: 5 }, 'com 2h extras o dia começou às 7h para não bater no mercado');
  p = await boardXY(page, 0, 7);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).week.work.find(w => w.uid === 'w0').start, 7);
  const from = await boardXY(page, 5, 10), to = await boardXY(page, 6, 17);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
  assert.deepEqual((await state(page)).week.work.find(w => w.uid === 'w5'), { uid: 'w5', day: 6, start: 14, extra: 0, lunch: false, lunchAt: 4 });
  await page.click('#undo-button');
  assert.equal((await state(page)).week.work.find(w => w.uid === 'w5').day, 5);
  check('Dia de trabalho: hora extra até 2h, almoço móvel; a CLT barra 6h seguidas e mais de 2h extras; o dia muda de lugar');

  await page.click('#add-chip');
  await page.click('[data-cat="bet"]');
  await page.fill('#custom-name', 'Aula de dança');
  await page.selectOption('#custom-hours', '2');
  await page.click('#custom-form button[type="submit"]');
  s = await state(page);
  assert.equal(s.items.length, 15);
  assert.ok(s.items.some(it => it.custom && it.name === 'Aula de dança'));
  await page.screenshot({ path: path.join(out, 'desktop-sugestoes.png') });
  await page.click('[data-cat="bet"]');
  await page.click('#add-dialog .primary.full');
  const custom = (await state(page)).items.find(it => it.custom);
  await page.click(`[data-task="${custom.uid}"]`);
  await page.click(`[data-delete="${custom.uid}"]`);
  assert.equal((await state(page)).items.length, 13);
  await page.focus('[data-task="nada"]');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('slot')), true);
  await page.keyboard.press('Enter');
  assert.ok((await state(page)).week.plans.some(x => x.uid === 'nada'));
  check('A lista é do jogador (sugestões e itens próprios); teclado funciona');

  const st0 = (await fillGreedy(page))[0];
  assert.ok(st0.count <= 12);
  await page.screenshot({ path: path.join(out, 'desktop-semana-flavio.png') });
  await page.click('#finish-button');
  s = await state(page);
  assert.equal(s.mode, 'gameover'); assert.equal(s.dialog, 'gameover-dialog');
  assert.match(await page.locator('#go-why').innerText(), /Você fechou a semana/);
  await page.keyboard.press('Escape');
  assert.equal((await state(page)).dialog, 'gameover-dialog', 'o game over não fecha com Esc');
  await page.click('#go-yes');
  assert.match(await page.locator('#go-reply').innerText(), /segunda-feira começa tudo de novo/i);
  await page.click('#go-again');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 0); assert.equal(s.clock, 120);
  await page.evaluate(() => window.advanceTime(125000));
  s = await state(page);
  assert.equal(s.mode, 'gameover'); assert.equal(s.clock, 0);
  assert.match(await page.locator('#go-why').innerText(), /O tempo acabou/);
  assert.match(await page.locator('#go-score').innerText(), /Coube \d+ de 13/);
  await page.screenshot({ path: path.join(out, 'desktop-game-over.png') });
  await page.click('#go-no');
  assert.match(await page.locator('#go-reply').innerText(), /Se arrependeu\? Você ainda pode mudar seu voto/i);
  assert.match(await page.locator('#go-lula').innerText(), /Mudar meu voto para Lula/);
  check('GAME OVER quando o tempo acaba ou a semana fecha: "Tá cansado? Você é a favor da escala 6×1?"; Sim recomeça a 6×1');

  const plans61 = s.weeks[0].plans, w0 = s.weeks[0].work.find(w => w.uid === 'w0');
  await page.click('#go-lula');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 1); assert.equal(s.scale, '5×2'); assert.equal(s.candidate, 'Lula');
  assert.equal(s.week.work.length, 5);
  assert.deepEqual(s.week.plans, plans61, 'a semana vai junto');
  assert.deepEqual(s.week.work.find(w => w.uid === 'w0'), w0, 'o dia de trabalho vai do jeito que estava');
  assert.equal(await page.locator('#clock').isVisible(), false, 'na 5×2 não tem relógio');
  await page.evaluate(() => window.advanceTime(500000));
  assert.equal((await state(page)).mode, 'playing');
  await fillGreedy(page);
  await page.screenshot({ path: path.join(out, 'desktop-semana-lula.png') });
  await finishWeek(page);
  s = await state(page);
  assert.equal(s.mode, 'results');
  assert.ok(s.stats[1].count > s.stats[0].count, 'com Lula coube mais');
  assert.match(await page.locator('#results-title').innerText(), new RegExp(`COM FLÁVIO, COUBE ${s.stats[0].count}\\.\\s+COM LULA, COUBE ${s.stats[1].count}\\.`, 'i'));
  assert.match(await page.locator('#results-insight').innerText(), /no máximo 12 de 13/);
  check('"Não" leva à 5×2 do Lula, sem relógio, com a mesma semana; o resultado compara as duas');

  await page.click('#results .share-cta');
  await page.waitForFunction(() => document.getElementById('share-image').naturalWidth > 0);
  assert.deepEqual(await page.evaluate(() => [document.getElementById('share-image').naturalWidth, document.getElementById('share-image').naturalHeight]), [1080, 1920]);
  s = await state(page);
  assert.ok(s.share.imageBytes > 20000);
  const wa = decodeURIComponent(s.share.whatsapp.slice('https://wa.me/?text='.length));
  assert.ok(s.share.whatsapp.startsWith('https://wa.me/?text='));
  assert.equal(wa, s.share.text);
  assert.match(wa, /Com Flávio \(6×1\) 🟩🟩🟩🟩🟩🟩🟨\ncoube \d+ de 13/); assert.match(wa, /Com Lula \(5×2\) 🟥🟥🟥🟥🟥⭐⭐\ncoube \d+ de 13/);
  assert.match(wa, /pedroufc-source\.github\.io\/folga\//);
  assert.equal(await page.locator('#download-link').getAttribute('download'), 'folga-minha-semana.png');
  await page.click('#copy-button');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), s.share.text);
  await page.screenshot({ path: path.join(out, 'desktop-compartilhar.png') });
  const story = await page.evaluate(async () => {
    const blob = await (await fetch(document.getElementById('share-image').src)).blob();
    return await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
  });
  fs.writeFileSync(path.join(out, 'imagem-stories.png'), Buffer.from(story, 'base64'));
  await page.keyboard.press('Escape');
  check('Compartilhar: imagem 1080×1920 com as duas semanas, WhatsApp com o texto, cópia e download');

  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text);
  s = await state(page);
  assert.equal(s.mode, 'results'); assert.equal(s.dialog, null);
  await page.screenshot({ path: path.join(out, 'desktop-resultado.png'), fullPage: true });
  await page.click('#replay-button');
  await page.click('#confirm-restart');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 0); assert.equal(s.weeks[1], null); assert.equal(s.dialog, null);
  assert.equal(s.clock, 120);
  check('Progresso sobrevive à recarga; jogar de novo começa outra semana 6×1 direto');

  await page.evaluate(() => window.advanceTime(125000));
  assert.equal((await state(page)).mode, 'gameover');
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text);
  assert.equal((await state(page)).dialog, 'gameover-dialog', 'o game over volta depois de recarregar');
  await page.click('#go-no');
  assert.match(await page.locator('#go-text').innerText(), /Existe vida além do trabalho/);
  await page.click('#go-lula');
  assert.equal((await state(page)).round, 1);
  check('O game over volta depois de recarregar e leva ao Lula');
  await context.close();
}

async function savesAndOffline(browser, base) {
  let context = await browser.newContext();
  let page = await context.newPage(); listen(page, 'save-corrompido', base);
  await page.addInitScript(() => localStorage.setItem('folga-v6', '{quebrado'));
  await page.goto(base + '/');
  let s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.dialog, 'howto-dialog'); assert.equal(s.week.plans.length, 0);
  await context.close();

  context = await browser.newContext();
  page = await context.newPage(); listen(page, 'sem-armazenamento', base);
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }));
  await page.goto(base + '/');
  await page.click('#howto-start');
  await put(page, 'praia', 6, 7);
  s = await state(page);
  assert.equal(s.storageAvailable, false); assert.equal(s.week.plans.length, 1);
  await context.close();
  check('Save corrompido começa do zero; sem localStorage o jogo segue');

  context = await browser.newContext({ offline: true, viewport: { width: 390, height: 664 } });
  page = await context.newPage(); listen(page, 'arquivo-local');
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.click('#howto-start');
  await put(page, 'estudo', 3, 19);
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
    assert.equal((await state(page)).dialog, 'howto-dialog');
    assert.equal(await insideViewport(page, '#howto-start'), true, `${phone.name}: "Começar a semana" visível sem rolar`);
    assert.equal((await noScroll(page)).horizontal, true, `${phone.name}: início sem rolagem lateral`);
    await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-inicio.png`) });
    await page.tap('#howto-start');
    assert.deepEqual(await noScroll(page), { vertical: true, horizontal: true }, `${phone.name}: jogo cabe na tela sem rolar`);
    assert.equal(await insideViewport(page, '#tray, #add-chip, #finish-button, #undo-button, #board, #clock, #score'), true, `${phone.name}: relógio, lista e botões visíveis`);
    const b = (await state(page)).board;
    assert.ok(b.rh >= 9 && b.cw >= 30, `${phone.name}: calendário legível (linha ${b.rh.toFixed(1)}px, coluna ${b.cw.toFixed(1)}px)`);
    await page.tap('[data-task="nada"]');
    assert.deepEqual(await noScroll(page), { vertical: true, horizontal: true }, `${phone.name}: seletor aberto sem rolar`);
    assert.equal(await insideViewport(page, '#picker, #finish-button'), true, `${phone.name}: seletor visível`);
    await page.tap('#picker .slot >> nth=0');
    await page.locator('[data-task="praia"]').tap();
    const p = await boardXY(page, 6, 12);
    await page.touchscreen.tap(p.x, p.y);
    assert.deepEqual((await state(page)).week.plans.find(x => x.uid === 'praia'), { uid: 'praia', day: 6, start: 9 }, `${phone.name}: toque no calendário encaixa`);
    const w = await boardXY(page, 2, 10);
    await page.touchscreen.tap(w.x, w.y);
    assert.equal((await state(page)).selected, 'w2', `${phone.name}: tocar no trabalho seleciona o dia de trabalho`);
    assert.equal(await insideViewport(page, '#picker [data-work="extra+"]'), true, `${phone.name}: botões do dia de trabalho visíveis`);
    await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}.png`) });
    await page.tap('#picker [data-work="lunch-off"]');
    assert.equal((await state(page)).dialog, 'law-dialog');
    assert.equal(await insideViewport(page, '#law-dialog .primary'), true, `${phone.name}: aviso da CLT cabe na tela`);
    if (phone.name === 'iphone-14') await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-clt.png`) });
    await page.tap('#law-dialog .primary');
    await page.tap('#picker .picker-close');
    if (phone.name === 'iphone-14' || phone.name === 'iphone-se-1') {
      await page.tap('#add-chip');
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-sugestoes.png`) });
      await page.tap('#add-dialog .primary.full');
      await fillGreedy(page, true);
      await page.evaluate(() => window.advanceTime(125000));
      assert.equal((await state(page)).mode, 'gameover');
      assert.equal(await insideViewport(page, '#go-yes, #go-no'), true, `${phone.name}: Sim e Não visíveis no game over`);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-game-over.png`) });
      await page.tap('#go-no');
      assert.equal(await insideViewport(page, '#go-lula'), true, `${phone.name}: botão do Lula visível`);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-mudar-voto.png`) });
      await page.tap('#go-lula');
      assert.deepEqual(await noScroll(page), { vertical: true, horizontal: true }, `${phone.name}: semana 5×2 sem rolar`);
      await fillGreedy(page, true);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-semana-lula.png`) });
      await finishWeek(page, true);
      assert.equal((await state(page)).mode, 'results');
      assert.equal((await noScroll(page)).horizontal, true, `${phone.name}: resultado sem rolagem lateral`);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-resultado.png`), fullPage: true });
      await page.locator('#results .share-cta').tap();
      await page.waitForFunction(() => document.getElementById('share-image').naturalWidth > 0);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-compartilhar.png`) });
    }
    await context.close();
  }
  await browser.close();
  check(`Celular (${label}): de 320×460 a 430×740 o jogo cabe sem rolar; game over, aviso da CLT e 5×2 cabem na tela`);
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
