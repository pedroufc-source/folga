'use strict';
// Regras do FOLGA: `npm test`.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const items = E.starterItems();
const survive = items.filter(it => it.kind === 'survive'), live = items.filter(it => it.kind === 'live');

test('Cada semana soma 168h; a 5×2 tem 6h livres a mais e um dia inteiro', () => {
  const a = E.stats(0, E.newWeek(0), items), b = E.stats(1, E.newWeek(1), items);
  for (const s of [a, b]) assert.equal(s.work + s.commute + s.lunch + s.sleep + s.free, 168);
  assert.equal(a.free, 58); assert.equal(b.free, 64); assert.equal(a.sleep, 49);
  assert.deepEqual(E.offDays(E.newWeek(0)), [6]);
  assert.deepEqual(E.offDays(E.newWeek(1)), [5, 6]);
  assert.deepEqual(E.DATES, [19, 20, 21, 22, 23, 24, 25]);
});

test('Dia de trabalho padrão: ida 7h, 8h–12h, almoço, 13h–17h, volta; sábado 7h–13h', () => {
  const w = E.newWeek(0).work;
  assert.deepEqual(E.workSegments(8, w[0]).map(s => [s.start, s.end, s.kind]), [[7, 8, 'commute'], [8, 12, 'work'], [12, 13, 'lunch'], [13, 17, 'work'], [17, 18, 'commute']]);
  assert.deepEqual(E.workSegments(4, w[5]).map(s => [s.start, s.end, s.kind]), [[7, 8, 'commute'], [8, 12, 'work'], [12, 13, 'commute']]);
});

test('Duas listas: pra sobreviver (fixa, 22h, com 4h de fazer nada) e pra viver (11 sugestões, 41h)', () => {
  assert.equal(survive.reduce((n, it) => n + it.hours * it.times, 0), 22);
  assert.equal(survive.find(it => it.uid === 'comida').times, 7);
  const nada = survive.find(it => it.uid === 'nada');
  assert.equal(nada.hours * nada.times, E.REST_MIN);
  assert.equal(live.length, 11); assert.equal(live.reduce((n, it) => n + it.hours, 0), 41);
  for (const id of ['app', 'motel', 'karaoke', 'salao', 'amigas', 'culto']) assert.ok(live.some(it => it.uid === id), id);
  assert.ok(E.CATALOG.some(c => c.id === 'bet'));
  assert.ok(E.CATALOG.every(c => !/️|‍/.test(c.emoji)), 'sem seletor de variação nem junção');
});

test('Comida é uma vez por dia; o resto vai em qualquer dia e hora livres', () => {
  const w = E.move(0, E.newWeek(0), items, 'comida.0', 0, 18).week;
  assert.equal(E.check(0, w, items, 'comida.1', 0, 20).reason, 'Comida é uma vez por dia: segunda já tem.');
  assert.equal(E.check(0, w, items, 'comida.1', 1, 6).ok, true);
  assert.equal(E.check(0, w, items, 'mercado.0', 0, 19).ok, true);
  assert.equal(E.check(0, w, items, 'mercado.0', 5, 9).reason, 'Nesse horário você está no trabalho.');
  assert.match(E.check(0, w, items, 'mercado.0', 0, 7).reason, /transporte/);
  assert.equal(E.whyNotHere(0, w, items, 'praia.0', 1, 20), 'Aqui só tem 5h livres seguidas. Praia precisa de 6h.');
  assert.equal(E.nextInstance(w, E.itemOf(items, 'comida')), 'comida.1');
});

test('Blocos do dia de trabalho: transporte e almoço de 1h ou 2h, hora extra até 2h, CLT barra 6h seguidas', () => {
  const w = E.newWeek(0);
  let r = E.editWork(0, w, items, 'w0', { tin: 2 });
  assert.equal(r.ok, true); assert.equal(r.work.tin, 2); assert.equal(E.stats(0, r.week, items).commute, 13);
  assert.equal(E.editWork(0, w, items, 'w0', { tin: 3 }).code, 'range');
  r = E.editWork(0, w, items, 'w0', { lunchLen: 2 });
  assert.deepEqual(E.workSegments(8, r.work).map(s => [s.start, s.end, s.kind]), [[7, 8, 'commute'], [8, 12, 'work'], [12, 14, 'lunch'], [14, 18, 'work'], [18, 19, 'commute']]);
  assert.equal(E.editWork(0, w, items, 'w0', { lunch: false }).code, 'clt71');
  r = E.editWork(0, E.editWork(0, w, items, 'w0', { extra: 1 }).week, items, 'w0', { extra: 1 });
  assert.equal(r.ok, true);
  assert.equal(E.editWork(0, r.week, items, 'w0', { extra: 1 }).code, 'clt59');
  assert.equal(E.editWork(0, w, items, 'w0', { extra: -1 }).code, 'contract');
  const all = E.editAllTransport(0, w, items, 2, 2);
  assert.equal(all.ok, true); assert.equal(E.stats(0, all.week, items).free, 46);
  const tight = E.move(0, E.move(0, w, items, 'comida.0', 1, 6).week, items, 'roupa.0', 1, 18).week;
  assert.match(E.editAllTransport(0, tight, items, 2, 2).reason, /^Terça: Não cabe/);
});

test('Diagnóstico da semana: primeiro sobreviver, depois descansar, depois viver', () => {
  let w = E.newWeek(0);
  assert.equal(E.verdict(0, w, items).code, 'survival');
  const plan = [['comida.0', 0, 18], ['comida.1', 1, 18], ['comida.2', 2, 18], ['comida.3', 3, 18], ['comida.4', 4, 18], ['comida.5', 5, 13], ['comida.6', 6, 12],
    ['mercado.0', 6, 7], ['faxina.0', 6, 9], ['roupa.0', 5, 14], ['marmita.0', 5, 16], ['contas.0', 0, 19]];
  for (const [uid, d, h] of plan) { const r = E.move(0, w, items, uid, d, h); assert.equal(r.ok, true, `${uid} ${d} ${h}: ${r.reason}`); w = r.week; }
  assert.equal(E.verdict(0, w, items).code, 'rest');
  w = E.move(0, w, items, 'nada.0', 1, 19).week; w = E.move(0, w, items, 'nada.1', 2, 19).week;
  const v = E.verdict(0, w, items);
  assert.equal(v.code, 'live'); assert.equal(v.stats.rest, 4); assert.equal(v.stats.survivalDone, true);
});

test('Mesmo mexendo no trabalho, a 6×1 não fecha: no máximo 10 de 11; na 5×2, os 11', () => {
  assert.equal(E.maxPlans(0, items), 10);
  assert.equal(E.maxPlans(1, items), 11);
  assert.equal(E.maxPlans(0, survive), 0, 'o básico cabe na 6×1');
});

test('Experimentar a 5×2 leva a semana junto; voltar à 6×1 devolve o dia de 4h', () => {
  const w = E.move(0, E.newWeek(0), items, 'praia.0', 6, 7).week;
  const to52 = E.carryOver(w, 1, items);
  assert.equal(to52.removed.length, 0); assert.equal(to52.week.work.length, 5);
  let five = E.move(1, E.newWeek(1), items, 'mercado.0', 5, 8).week;
  five = E.move(1, five, items, 'faxina.0', 5, 10).week;
  assert.deepEqual(E.carryOver(five, 0, items).removed.map(p => p.uid), ['mercado.0', 'faxina.0']);
});

test('Itens próprios entram na lista pra viver', () => {
  assert.deepEqual(E.customItem('  Aula   de dança ', 2, 'c1', 3), { uid: 'c1', ref: null, name: 'Aula de dança', short: 'Aula de…', emoji: '✨', hours: 2, times: 1, kind: 'live', color: 3 });
  assert.equal(E.customItem('', 2, 'c1', 0), null);
  assert.equal(E.customItem('Viagem', 12, 'c1', 0), null);
});

test('Saves inválidos ou incoerentes são recusados', () => {
  const ok = { version: 7, mode: 'playing', round: 0, clock: 80, introSeen: true, items, weeks: [{ work: E.defaultWork(0), plans: [{ uid: 'praia.0', day: 6, start: 7 }] }, null], nextId: 1 };
  assert.ok(E.validateSave(ok));
  assert.ok(E.validateSave({ ...ok, mode: 'gameover', clock: 0 }));
  assert.equal(E.validateSave({ ...ok, version: 6 }), null);
  assert.equal(E.validateSave({ ...ok, round: 1 }), null);
  assert.equal(E.validateSave({ ...ok, items: items.filter(it => it.uid !== 'comida') }), null, 'a lista pra sobreviver não sai');
  assert.equal(E.validateSave({ ...ok, weeks: [{ work: E.defaultWork(0), plans: [{ uid: 'comida.0', day: 0, start: 18 }, { uid: 'comida.1', day: 0, start: 20 }] }, null] }), null, 'comida duas vezes no mesmo dia');
  const noLunch = E.defaultWork(0).map(w => (w.uid === 'w0' ? { ...w, lunch: false, lunchAt: 8 } : w));
  assert.equal(E.validateSave({ ...ok, weeks: [{ work: noLunch, plans: [] }, null] }), null, '8h seguidas não passam');
  assert.equal(E.validateSave(null), null);
});

test('Texto de compartilhamento com a cor de cada escala, sem citar o Lula', () => {
  const w0 = E.move(0, E.newWeek(0), items, 'praia.0', 6, 7).week;
  const w1 = E.move(1, E.newWeek(1), items, 'praia.0', 5, 7).week;
  const text = E.shareText([w0, w1], items, [0, 1], 'https://exemplo.org/folga/');
  assert.match(text, /^FOLGA · Sua vida cabe na 6×1\?/);
  assert.match(text, /6×1 🟩🟩🟩🟩🟩🟩🟨\nnão deu pra sobreviver/);
  assert.match(text, /5×2 🟥🟥🟥🟥🟥⭐⭐\nnão deu pra sobreviver/);
  assert.match(text, /Monte a sua semana: https:\/\/exemplo\.org\/folga\/$/);
  assert.doesNotMatch(text, /Lula/);
});
