'use strict';
// Regras do FOLGA: `npm test`.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const items = E.starterItems();

test('Cada semana soma 168h; com Lula sobram 6h a mais e um dia inteiro', () => {
  const a = E.stats(0, E.newWeek(0), items), b = E.stats(1, E.newWeek(1), items);
  for (const s of [a, b]) assert.equal(s.work + s.commute + s.lunch + s.sleep + s.free, 168);
  assert.equal(a.free, 51); assert.equal(b.free, 57);
  assert.deepEqual(E.SCENARIOS.map(s => s.candidate), ['Flávio', 'Lula']);
  assert.deepEqual(E.offDays(E.newWeek(0)), [6]);
  assert.deepEqual(E.offDays(E.newWeek(1)), [5, 6]);
});

test('Dia de trabalho leva junto transporte e almoço; o de 4h não tem almoço', () => {
  const eight = E.workSegments(8, { day: 0, start: 8, ...E.defaultSettings(8) }), four = E.workSegments(4, { day: 5, start: 8, ...E.defaultSettings(4) });
  assert.deepEqual(eight.map(s => [s.start, s.end, s.kind]), [[8, 9, 'commute'], [9, 13, 'work'], [13, 14, 'lunch'], [14, 18, 'work'], [18, 19, 'commute']]);
  assert.deepEqual(four.map(s => [s.start, s.end, s.kind]), [[8, 9, 'commute'], [9, 13, 'work'], [13, 14, 'commute']]);
  for (const r of [0, 1]) {
    const blocks = E.blocks(r, E.newWeek(r), items);
    const sum = kind => blocks.filter(b => b.kind === kind).reduce((n, b) => n + b.end - b.start, 0);
    assert.equal(sum('work'), E.SCENARIOS[r].workHours);
    assert.equal(sum('commute'), E.SCENARIOS[r].commuteHours);
    assert.equal(sum('lunch'), 5);
  }
});

test('Lista inicial: 13 coisas, 50h, nada com dia marcado; catálogo sem emoji problemático', () => {
  assert.equal(items.length, 13);
  assert.equal(items.reduce((n, it) => n + it.hours, 0), 50);
  for (const id of ['app', 'motel', 'karaoke', 'salao', 'amigas']) assert.ok(items.some(it => it.uid === id), id);
  assert.ok(E.CATALOG.some(c => c.id === 'bet'));
  assert.ok(E.CATALOG.every(c => !/️|‍/.test(c.emoji)), 'sem seletor de variação nem junção');
  assert.ok(E.CATALOG.every(c => E.GROUPS.includes(c.group)));
});

test('Qualquer plano vai em qualquer dia e hora livres; a recusa explica o motivo', () => {
  const w = E.newWeek(0);
  assert.equal(E.check(0, w, items, 'mercado', 0, 19).ok, true, 'mercado numa segunda à noite');
  assert.equal(E.check(0, w, items, 'familia', 6, 7).ok, true);
  assert.equal(E.check(1, E.newWeek(1), items, 'mercado', 5, 9).ok, true);
  assert.equal(E.check(0, w, items, 'mercado', 5, 9).reason, 'Nesse horário você está no trabalho.');
  assert.equal(E.check(0, w, items, 'mercado', 0, 8).reason, 'Nesse horário você está no transporte, indo ou voltando do trabalho.');
  assert.equal(E.check(0, w, items, 'mercado', 0, 13).reason, 'É o seu horário de almoço.');
  assert.match(E.check(0, w, items, 'faxina', 0, 20).reason, /23h/);
  assert.equal(E.whyNotHere(0, w, items, 'praia', 1, 20), 'Aqui só tem 4h livres seguidas. Praia precisa de 6h.');
  const w2 = E.move(0, w, items, 'praia', 6, 10).week;
  assert.match(E.check(0, w2, items, 'familia', 6, 12).reason, /Praia ou parque/);
});

test('O trabalho também se move: outro horário, outro dia, e a folga vai junto', () => {
  let w = E.newWeek(0);
  const early = E.move(0, w, items, 'w0', 0, 7);
  assert.equal(early.ok, true);
  assert.deepEqual(E.freeRuns(0, early.week, items).filter(r => r.day === 0), [{ day: 0, start: 18, end: 23 }]);
  assert.equal(E.check(0, w, items, 'w0', 1, 8).reason, 'Já tem um dia de trabalho nessa data.');
  w = E.move(0, w, items, 'w5', 6, 12).week;
  assert.deepEqual(E.offDays(w), [5], 'o sábado vira a folga');
  assert.equal(E.check(0, w, items, 'w0', 0, 13).reason, 'Não cabe: são 11h e às 23h é hora de dormir.');
});

test('Hora extra até 2h e almoço móvel; a CLT barra mais de 6h seguidas', () => {
  let w = E.newWeek(0);
  const noLunch = E.editWork(0, w, items, 'w0', { lunch: false });
  assert.equal(noLunch.ok, false); assert.equal(noLunch.code, 'clt71'); assert.equal(noLunch.reason, E.CLT71);
  let r = E.editWork(0, w, items, 'w0', { extra: 1 });
  assert.equal(r.ok, true);
  assert.deepEqual(E.workSegments(8, r.work).map(s => [s.start, s.end, s.kind]), [[8, 9, 'commute'], [9, 13, 'work'], [13, 14, 'lunch'], [14, 19, 'work'], [19, 20, 'commute']]);
  assert.equal(E.stats(0, r.week, items).work, 45);
  assert.equal(E.stats(0, r.week, items).free, 50);
  r = E.editWork(0, E.editWork(0, r.week, items, 'w0', { extra: 1 }).week, items, 'w0', { extra: 1 });
  assert.equal(r.ok, false); assert.equal(r.code, 'clt59');
  assert.equal(E.editWork(0, w, items, 'w0', { extra: -1 }).code, 'contract');
  assert.equal(E.editWork(0, w, items, 'w0', { lunchAt: 2 }).ok, true, 'almoço depois de 6h de trabalho ainda vale');
  assert.equal(E.editWork(0, E.editWork(0, w, items, 'w0', { lunchAt: 2 }).week, items, 'w0', { lunchAt: 1 }).code, 'clt71');
  const four = E.editWork(0, E.editWork(0, w, items, 'w5', { extra: 1 }).week, items, 'w5', { extra: 1 });
  assert.equal(four.ok, true, 'dia de 4h com 2h extras: 6h seguidas sem intervalo ainda é permitido');
  w = E.move(0, w, items, 'faxina', 0, 19).week;
  const blocked = E.editWork(0, w, items, 'w0', { extra: 1 });
  assert.equal(blocked.ok, true, 'se não cabe para baixo, o dia de trabalho começa mais cedo');
  assert.equal(blocked.work.start, 7);
});

test('Toque no calendário escolhe o início que cobre a hora, centrado no toque', () => {
  const w = E.newWeek(0);
  assert.equal(E.resolveStart(0, w, items, 'mercado', 0, 21), 20);
  assert.equal(E.resolveStart(0, w, items, 'praia', 6, 10), 7);
  assert.equal(E.resolveStart(0, w, items, 'praia', 1, 21), null);
  assert.deepEqual(E.runStarts(0, w, items, 'praia'), [{ day: 5, start: 14 }, { day: 6, start: 7 }]);
});

test('Mesmo mexendo no trabalho, na 6×1 cabem no máximo 12 de 13; na 5×2, os 13', () => {
  assert.equal(E.maxPlans(0, items), 12);
  assert.equal(E.maxPlans(1, items), 13);
  const small = items.slice(0, 5);
  assert.equal(E.maxPlans(0, small), 5, 'lista curta cabe nas duas');
  assert.ok(E.maxPlans(0, E.CATALOG.map(E.itemFromCatalog)) < E.maxPlans(1, E.CATALOG.map(E.itemFromCatalog)));
});

test('Mudar o voto leva a semana junto; na 6×1 volta o dia de 4h e tira o que estiver no caminho', () => {
  let w = E.move(0, E.newWeek(0), items, 'praia', 6, 7).week;
  const to52 = E.carryOver(w, 1, items);
  assert.equal(to52.removed.length, 0);
  assert.equal(to52.week.work.length, 5);
  assert.deepEqual(E.offDays(to52.week), [5, 6]);
  let lula = E.move(1, E.newWeek(1), items, 'mercado', 5, 8).week;
  lula = E.move(1, lula, items, 'faxina', 5, 10).week;
  lula = E.move(1, lula, items, 'estudo', 1, 19).week;
  const to61 = E.carryOver(lula, 0, items);
  assert.deepEqual(to61.removed.map(p => p.uid), ['mercado', 'faxina']);
  assert.deepEqual(to61.week.work.find(x => x.uid === 'w5'), { uid: 'w5', day: 5, start: 8, extra: 0, lunch: false, lunchAt: 4 });
  const moved = E.move(1, E.newWeek(1), items, 'w4', 5, 8).week;
  assert.deepEqual(E.carryOver(moved, 0, items).week.work.find(x => x.uid === 'w5').day, 6, 'se o sábado já tem trabalho, o dia de 4h vai para o domingo');
});

test('Itens próprios: nome e horas validados', () => {
  assert.deepEqual(E.customItem('  Aula   de dança ', 2, 'c1', 3), { uid: 'c1', ref: null, name: 'Aula de dança', short: 'Aula de…', emoji: '✨', hours: 2, color: 3 });
  assert.equal(E.customItem('', 2, 'c1', 0), null);
  assert.equal(E.customItem('Viagem', 12, 'c1', 0), null);
});

test('Saves inválidos ou incoerentes são recusados', () => {
  const ok = { version: 5, mode: 'playing', vote: 1, round: 0, clock: 80, items, weeks: [{ work: E.defaultWork(0), plans: [{ uid: 'praia', day: 6, start: 7 }] }, null], nextId: 1 };
  assert.ok(E.validateSave(ok));
  assert.ok(E.validateSave({ ...ok, mode: 'gameover', clock: 0 }));
  assert.equal(E.validateSave({ ...ok, version: 4 }), null);
  assert.equal(E.validateSave({ ...ok, round: 1 }), null, 'a 5×2 só depois da 6×1');
  assert.equal(E.validateSave({ ...ok, clock: 999 }), null);
  const noLunch = E.defaultWork(0).map(w => (w.uid === 'w0' ? { ...w, lunch: false, lunchAt: 8 } : w));
  assert.equal(E.validateSave({ ...ok, weeks: [{ work: noLunch, plans: [] }, null] }), null, '8h seguidas não passam');
  assert.equal(E.validateSave({ ...ok, weeks: [{ work: E.defaultWork(0), plans: [{ uid: 'mercado', day: 5, start: 9 }] }, null] }), null);
  assert.equal(E.validateSave({ ...ok, weeks: [{ work: E.defaultWork(1), plans: [] }, null] }), null, 'faltou um dia de trabalho');
  assert.equal(E.validateSave({ ...ok, items: [...items, { uid: 'x', name: 'X', short: 'X', emoji: '✨', hours: 20, color: 0 }] }), null);
  assert.equal(E.validateSave({ ...ok, mode: 'results' }), null);
  assert.equal(E.validateSave(null), null);
});

test('Texto de compartilhamento com a cor de cada candidato', () => {
  const w0 = E.move(0, E.newWeek(0), items, 'praia', 6, 7).week;
  const w1 = E.move(1, E.newWeek(1), items, 'praia', 5, 7).week;
  const both = E.shareText([w0, w1], items, [0, 1], 'https://exemplo.org/folga/');
  assert.match(both, /^FOLGA · Sua vida cabe na 6×1\?/);
  assert.match(both, /Com Flávio \(6×1\) 🟩🟩🟩🟩🟩🟩🟨\ncoube 1 de 13 🌴/);
  assert.match(both, /Com Lula \(5×2\) 🟥🟥🟥🟥🟥⭐⭐\ncoube 1 de 13 🌴/);
  assert.match(both, /Com Flávio, ficaram de fora: faxina, mercado e feira/);
  assert.match(both, /Monte a sua semana: https:\/\/exemplo\.org\/folga\/$/);
  const lulaOnly = E.shareText([null, w1], items, [1]);
  assert.doesNotMatch(lulaOnly, /Flávio/);
  assert.match(lulaOnly, /pedroufc-source\.github\.io\/folga/);
});
