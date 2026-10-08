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
  const base = uid.split('.')[0];
  const s = await state(page);
  if (s.selected !== uid) await act(page, tap)(`[data-task="${base}"]`);
  assert.equal((await state(page)).selected, uid, `${uid} selecionado`);
  await act(page, tap)(`.slot[data-day="${day}"][data-start="${start}"]`);
  const placed = (await state(page)).week.plans.find(p => p.uid === uid);
  assert.deepEqual([placed.day, placed.start], [day, start], `${uid} encaixado em ${day}/${start}`);
}
// Encaixa cada item de uma aba no primeiro espaço sugerido, quantas vezes ele se repetir.
async function fillTab(page, which, tap = false) {
  const a = act(page, tap);
  await a(`#tab-${which}`);
  assert.equal((await state(page)).tab, which);
  const kind = which === 'survive' ? 'survive' : 'live';
  for (const it of (await state(page)).items.filter(i => i.kind === kind)) {
    for (let k = 0; k < it.times; k++) {
      const s = await state(page);
      if (s.week.plans.filter(p => p.uid.split('.')[0] === it.uid).length >= it.times) break;
      if (!s.selected || s.selected.split('.')[0] !== it.uid) await a(`[data-task="${it.uid}"]`);
      if (await page.locator('#picker .slot').count()) await a('#picker .slot');
      else { await a('#picker .picker-close'); break; }
    }
  }
  if ((await state(page)).selected) await a('#picker .picker-close');
  return (await state(page)).stats[(await state(page)).round];
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
const content = page => page.evaluate(() => window.FolgaContent);

async function desktopFlows(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage(); listen(page, 'desktop', base);
  await page.goto(base + '/');
  await page.waitForFunction(() => window.render_game_to_text);
  let s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 0); assert.equal(s.scale, '6×1');
  assert.equal(s.dialog, 'howto-dialog', 'primeira visita: cai na semana com o "como jogar" por cima');
  await page.waitForTimeout(1300);
  assert.equal((await state(page)).clock, 180, 'o relógio espera o "como jogar" fechar');
  await page.screenshot({ path: path.join(out, 'desktop-inicio.png') });
  await page.click('#howto-dialog [data-about]');
  for (const host of ['diariodocomercio.com.br', 'jornaldebrasilia.com.br', 'senado.leg.br', 'del5452.htm', 'brasildefato.com.br', 'cnnbrasil.com.br']) {
    assert.ok(await page.locator(`#about-dialog a[href*="${host}"]`).count(), `fonte ${host}`);
  }
  assert.equal(await page.locator('#about-dialog').innerText().then(t => /Lula/.test(t)), false, 'o "como funciona" não fala do Lula');
  await page.screenshot({ path: path.join(out, 'desktop-premissas.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1300);
  assert.ok((await state(page)).clock < 179.2, 'o relógio anda');
  check('Abre direto na semana 6×1 (19 a 25 de outubro) com "como jogar"; relógio de 3 minutos; fontes sem falar do Lula');

  s = await state(page);
  assert.equal(s.tab, 'survive');
  await page.click('#tab-live');
  s = await state(page);
  assert.equal(s.tab, 'survive', 'a lista pra viver só abre depois do básico');
  assert.match(s.status, /^Primeiro, o que é pra sobreviver\./);
  check('Lista "pra viver" trancada até encaixar tudo "pra sobreviver"');

  let p = await boardXY(page, 0, 7);
  await page.mouse.click(p.x, p.y);
  s = await state(page);
  assert.equal(s.selected, 'w0'); assert.equal(s.part, 'tin');
  await page.click('[data-work="tin2"]');
  assert.equal((await state(page)).week.work.find(w => w.uid === 'w0').tin, 2);
  await page.click('[data-work="all1"]');
  assert.ok((await state(page)).week.work.every(w => w.tin === 1 && w.tout === 1));
  p = await boardXY(page, 0, 12);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).part, 'lunch');
  await page.click('[data-work="len2"]');
  assert.equal((await state(page)).week.work.find(w => w.uid === 'w0').lunchLen, 2);
  await page.click('[data-work="lunch-off"]');
  assert.equal((await state(page)).dialog, 'law-dialog');
  assert.match(await page.locator('#law-text').innerText(), /mais de 6 horas seguidas .* 1 hora de intervalo \(art\. 71\)/);
  assert.match(await page.locator('#law-flavio').innerText(), /PEC 12\/2026, que Flávio assina/);
  await page.screenshot({ path: path.join(out, 'desktop-clt.png') });
  await page.click('#law-dialog .primary');
  await page.click('[data-work="len1"]');
  p = await boardXY(page, 0, 9);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).part, 'work');
  await page.click('[data-work="extra+"]'); await page.click('[data-work="extra+"]'); await page.click('[data-work="extra+"]');
  assert.match(await page.locator('#law-text').innerText(), /2 horas por dia \(art\. 59\)/);
  await page.click('#law-dialog .primary');
  await page.click('[data-work="extra-"]'); await page.click('[data-work="extra-"]');
  await page.screenshot({ path: path.join(out, 'desktop-blocos.png') });
  await page.keyboard.press('Escape');
  assert.deepEqual((await state(page)).week.work.find(w => w.uid === 'w0'), { uid: 'w0', day: 0, start: 7, extra: 0, lunch: true, lunchAt: 4, lunchLen: 1, tin: 1, tout: 1 });
  check('Blocos independentes: ida e volta de 1h ou 2h (num dia ou em todos), almoço de 1h ou 2h; a CLT barra 6h seguidas e mais de 2h extras');

  await page.click('[data-task="comida"]');
  assert.equal((await state(page)).selected, 'comida.0');
  p = await boardXY(page, 0, 18);
  await page.mouse.click(p.x, p.y);
  s = await state(page);
  assert.deepEqual(s.week.plans.find(x => x.uid === 'comida.0'), { uid: 'comida.0', day: 0, start: 18 });
  assert.equal(s.selected, 'comida.1', 'plano de todo dia segue para a próxima vez');
  p = await boardXY(page, 0, 20);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).status, 'Comida é uma vez por dia: segunda já tem.');
  p = await boardXY(page, 1, 18);
  await page.mouse.click(p.x, p.y);
  assert.equal((await state(page)).selected, 'comida.2');
  await page.keyboard.press('Escape');
  const st0 = await fillTab(page, 'survive');
  assert.equal(st0.survivalDone, true, 'o básico cabe na 6×1');
  s = await state(page);
  assert.equal(s.tab, 'live', 'ao terminar o básico, a lista pra viver abre');
  assert.match(s.status, /Sobreviveu\. Agora, viver: sobraram \d+h livres/);
  await page.screenshot({ path: path.join(out, 'desktop-sobreviveu.png') });
  check('Pra sobreviver: comida uma vez por dia, sete dias; ao completar, abre "pra viver"');

  await page.click('#add-chip');
  await page.click('[data-cat="bet"]');
  await page.fill('#custom-name', 'Aula de dança');
  await page.click('#custom-form button[type="submit"]');
  s = await state(page);
  assert.ok(s.items.some(it => it.uid === 'bet')); assert.ok(s.items.some(it => it.custom));
  await page.screenshot({ path: path.join(out, 'desktop-sugestoes.png') });
  await page.click('[data-cat="bet"]');
  await page.click('#add-dialog .primary.full');
  const custom = (await state(page)).items.find(it => it.custom);
  await page.click(`[data-task="${custom.uid}"]`);
  await page.click(`[data-delete="${custom.uid}"]`);
  assert.equal((await state(page)).items.filter(it => it.kind === 'live').length, 11);
  const stLive = await fillTab(page, 'live');
  assert.ok(stLive.liveCount <= 10, 'na 6×1 não cabe tudo');
  await page.screenshot({ path: path.join(out, 'desktop-semana-6x1.png') });
  check('Pra viver: sugestões e itens próprios; na 6×1 a lista inteira não cabe');

  await page.click('#finish-button');
  s = await state(page);
  assert.equal(s.mode, 'gameover'); assert.equal(s.dialog, 'gameover-dialog');
  assert.match(await page.locator('#go-why').innerText(), /^Você fechou a semana\. (Sobreviveu\. Viver, não deu\.|Faltou descanso\.)/);
  await page.keyboard.press('Escape');
  assert.equal((await state(page)).dialog, 'gameover-dialog', 'o game over não fecha com Esc');
  const c = await content(page);
  const code = (await page.locator('#go-why').innerText()).includes('descanso') ? 'rest' : 'live';
  assert.equal(await page.locator('#go-quote').innerText(), `“${c.relatos[code].quote}”`, 'relato de quem vive a 6×1, conforme o motivo');
  assert.equal(await page.locator(`#go-who a[href="${c.relatos[code].url}"]`).count(), 1, 'relato com fonte');
  assert.equal(await page.locator('#go-videos a').count(), c.videos.length, 'vídeos de Rick Azevedo e Erika Hilton');
  assert.match(await page.locator('#go-videos').innerText(), /Rick Azevedo[\s\S]*Erika Hilton/);
  assert.match(await page.locator('#go-flavio').innerText(), /^Flávio criticou a PEC do fim da 6×1/);
  assert.equal(await page.locator('#go-flavio a[href*="infomoney.com.br"], #go-flavio a[href*="senado.leg.br"]').count(), 2, 'Flávio com fontes');
  for (const a of await page.locator('#gameover-dialog a').all()) assert.equal(await a.getAttribute('target'), '_blank');
  assert.match(await page.locator('#go-52').innerText(), /Experimentar a escala 5×2/);
  assert.doesNotMatch(await page.locator('#gameover-dialog').innerText(), /Lula/);
  await page.screenshot({ path: path.join(out, 'desktop-game-over.png') });
  check('GAME OVER explica o que faltou, traz relato e Flávio, e oferece "Experimentar a escala 5×2" ou "Tentar de novo"');

  const plans61 = s.weeks[0].plans;
  await page.click('#go-52');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 1); assert.equal(s.scale, '5×2');
  assert.deepEqual(s.week.plans, plans61, 'a semana vai junto');
  assert.equal(await page.locator('#clock').isVisible(), false, 'na 5×2 não tem relógio');
  await page.evaluate(() => window.advanceTime(900000));
  assert.equal((await state(page)).mode, 'playing');
  await fillTab(page, 'live');
  await page.screenshot({ path: path.join(out, 'desktop-semana-5x2.png') });
  await finishWeek(page);
  s = await state(page);
  assert.equal(s.mode, 'results');
  assert.ok(s.stats[1].liveCount >= s.stats[0].liveCount);
  assert.match(await page.locator('#results-title').innerText(), /NA 6×1, .*\.\s+NA 5×2, .*\./i);
  assert.match(await page.locator('#results-insight').innerText(), /no máximo 10 de 11/);
  check('"Experimentar a escala 5×2": sem relógio, com a mesma semana; o resultado compara as duas');

  await page.click('#results .share-cta');
  await page.waitForFunction(() => document.getElementById('share-image').naturalWidth > 0);
  assert.deepEqual(await page.evaluate(() => [document.getElementById('share-image').naturalWidth, document.getElementById('share-image').naturalHeight]), [1080, 1920]);
  s = await state(page);
  assert.ok(s.share.imageBytes > 20000);
  const wa = decodeURIComponent(s.share.whatsapp.slice('https://wa.me/?text='.length));
  assert.ok(s.share.whatsapp.startsWith('https://wa.me/?text='));
  assert.equal(wa, s.share.text);
  assert.match(wa, /6×1 🟩🟩🟩🟩🟩🟩🟨\n/); assert.match(wa, /5×2 🟥🟥🟥🟥🟥⭐⭐\n/);
  assert.match(wa, /pedroufc-source\.github\.io\/folga\//); assert.doesNotMatch(wa, /Lula/);
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
  assert.equal((await state(page)).mode, 'results');
  await page.screenshot({ path: path.join(out, 'desktop-resultado.png'), fullPage: true });
  await page.click('#replay-button');
  await page.click('#confirm-restart');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.round, 0); assert.equal(s.dialog, null); assert.equal(s.clock, 180);
  await page.evaluate(() => window.advanceTime(200000));
  s = await state(page);
  assert.equal(s.mode, 'gameover');
  assert.match(await page.locator('#go-why').innerText(), /^O tempo acabou\. Faltou o básico\./);
  assert.match(await page.locator('#go-quote').innerText(), /larga tudo de lado/, 'sem o básico, o relato da Darlen');
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text);
  assert.equal((await state(page)).dialog, 'gameover-dialog', 'o game over volta depois de recarregar');
  await page.click('#go-again');
  s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.clock, 180); assert.equal(s.week.plans.length, 0);
  check('Tempo esgotado sem o básico: game over "Faltou o básico"; "Tentar de novo" recomeça a 6×1');
  await context.close();
}

async function savesAndOffline(browser, base) {
  let context = await browser.newContext();
  let page = await context.newPage(); listen(page, 'save-corrompido', base);
  await page.addInitScript(() => localStorage.setItem('folga-v7', '{quebrado'));
  await page.goto(base + '/');
  let s = await state(page);
  assert.equal(s.mode, 'playing'); assert.equal(s.dialog, 'howto-dialog'); assert.equal(s.week.plans.length, 0);
  await context.close();

  context = await browser.newContext();
  page = await context.newPage(); listen(page, 'sem-armazenamento', base);
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }));
  await page.goto(base + '/');
  await page.click('#howto-start');
  await put(page, 'mercado.0', 6, 6);
  s = await state(page);
  assert.equal(s.storageAvailable, false); assert.equal(s.week.plans.length, 1);
  await context.close();
  check('Save corrompido começa do zero; sem localStorage o jogo segue');

  context = await browser.newContext({ offline: true, viewport: { width: 390, height: 664 } });
  page = await context.newPage(); listen(page, 'arquivo-local');
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.click('#howto-start');
  await put(page, 'faxina.0', 6, 6);
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
    assert.equal(await insideViewport(page, '#tray, .tabs, #finish-button, #undo-button, #board, #clock, #score'), true, `${phone.name}: relógio, abas, lista e botões visíveis`);
    const b = (await state(page)).board;
    assert.ok(b.rh >= 8.5 && b.cw >= 30, `${phone.name}: agenda legível (linha ${b.rh.toFixed(1)}px, coluna ${b.cw.toFixed(1)}px)`);
    await page.tap('[data-task="comida"]');
    assert.deepEqual(await noScroll(page), { vertical: true, horizontal: true }, `${phone.name}: seletor aberto sem rolar`);
    assert.equal(await insideViewport(page, '#picker, #finish-button'), true, `${phone.name}: seletor visível`);
    await page.tap('#picker .slot >> nth=0');
    assert.equal((await state(page)).selected, 'comida.1');
    const p = await boardXY(page, 2, 19);
    await page.touchscreen.tap(p.x, p.y);
    assert.deepEqual((await state(page)).week.plans.find(x => x.uid === 'comida.1'), { uid: 'comida.1', day: 2, start: 19 }, `${phone.name}: toque na agenda encaixa`);
    await page.tap('#picker .picker-close');
    const w = await boardXY(page, 3, 7);
    await page.touchscreen.tap(w.x, w.y);
    let s = await state(page);
    assert.equal(s.selected, 'w3'); assert.equal(s.part, 'tin', `${phone.name}: tocar no transporte abre o transporte`);
    assert.equal(await insideViewport(page, '#picker [data-work="tin2"]'), true, `${phone.name}: botões do transporte visíveis`);
    await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}.png`) });
    await page.tap('#picker .picker-close');
    if (phone.name === 'iphone-14' || phone.name === 'iphone-se-1') {
      await fillTab(page, 'survive', true);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-sobreviveu.png`) });
      await fillTab(page, 'live', true);
      await page.evaluate(() => window.advanceTime(900000));
      assert.equal((await state(page)).mode, 'gameover');
      assert.equal(await insideViewport(page, '#go-52, #go-again'), true, `${phone.name}: botões do game over visíveis`);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-game-over.png`) });
      await page.tap('#go-52');
      assert.deepEqual(await noScroll(page), { vertical: true, horizontal: true }, `${phone.name}: semana 5×2 sem rolar`);
      await fillTab(page, 'live', true);
      await page.screenshot({ path: path.join(out, `celular-${label}-${phone.name}-semana-5x2.png`) });
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
  check(`Celular (${label}): de 320×460 a 430×740 o jogo cabe sem rolar; game over e 5×2 cabem na tela`);
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
