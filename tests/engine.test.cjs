'use strict';
// Regras do FOLGA: `npm test`.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

test('Cada semana soma 168h; a diferença é 4h de trabalho e 2h de ônibus', () => {
  const a = E.stats(0, [], true), b = E.stats(1, [], true);
  for (const s of [a, b]) assert.equal(s.work + s.commute + s.sleep + s.routine + s.event + s.available, 168);
  assert.equal(a.available, 34); assert.equal(b.available, 40); assert.equal(b.available - a.available, 6);
});

test('Blocos fixos não se sobrepõem e batem com as horas declaradas', () => {
  for (const r of [0, 1]) {
    const blocks = E.fixedBlocks(r, true);
    assert.ok(blocks.some(b => b.day === 2 && b.kind === 'event' && b.start === 19 && b.end === 20));
    assert.ok(blocks.some(b => b.day === 2 && b.kind === 'routine' && b.start === 20 && b.end === 21));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i].day === blocks[j].day) assert.equal(E.overlaps(blocks[i], blocks[j]), false);
    }
    const sum = kind => blocks.filter(b => b.kind === kind).reduce((n, b) => n + b.end - b.start, 0);
    assert.equal(sum('work'), E.SCENARIOS[r].workHours);
    assert.equal(sum('commute'), E.SCENARIOS[r].commuteHours);
    assert.equal(sum('routine'), 21);
    for (let day = 0; day < 7; day++) {
      const work = blocks.filter(b => b.day === day && b.kind === 'work').reduce((n, b) => n + b.end - b.start, 0);
      assert.equal(work, E.SCENARIOS[r].hoursPerDay[day]);
      if (day < 5) assert.ok(blocks.some(b => b.day === day && b.kind === 'routine' && b.start === 12 && b.end === 13), 'almoço fora do trabalho');
    }
    const free = 7 * (E.LAST_HOUR - E.FIRST_HOUR) - blocks.reduce((n, b) => n + b.end - b.start, 0);
    assert.equal(free, E.stats(r, [], true).available, 'o calendário de 7h a 23h mostra todo o tempo livre');
    assert.ok(blocks.every(b => b.reason && b.label), 'todo bloco fixo explica por que ocupa o horário');
  }
  assert.deepEqual(E.offDays(0), [6]);
  assert.deepEqual(E.offDays(1), [5, 6]);
});

test('Planos respeitam janelas e dizem por que não cabem', () => {
  assert.equal(E.checkPlacement(1, [], true, 'sol', 5, 10).ok, true);
  for (const [id, day, start] of [['sol', 5, 12], ['familia', 5, 12], ['projeto', 0, 20], ['nada', 0, 6], ['nada', 0, 16]]) {
    assert.equal(E.checkPlacement(1, [], true, id, day, start).ok, false);
  }
  assert.match(E.checkPlacement(0, [], true, 'feira', 5, 9).reason, /trabalho/);
  assert.match(E.checkPlacement(0, [], true, 'feira', 5, 8).reason, /ônibus/);
  assert.match(E.checkPlacement(0, [], true, 'curso', 0, 20).reason, /terça ou quinta/);
  const w = E.put(0, [], true, 'sol', 6, 10).placements;
  assert.match(E.checkPlacement(0, w, true, 'familia', 6, 12).reason, /Praia ou parque/);
});

test('Sem nenhum horário, a explicação aponta a escala ou o plano que ocupa o espaço', () => {
  assert.match(E.whyNoRoom(0, [], true, 'feira'), /^Na 6×1 não cabe: sábado, entre 8h e 12h/);
  assert.equal(E.whyNoRoom(1, [], true, 'feira'), null);
  const w = E.put(0, [], true, 'sol', 6, 10).placements;
  assert.match(E.whyNoRoom(0, w, true, 'familia'), /Praia ou parque/);
});

test('Encostar cabe, sobrepor não; mover não duplica', () => {
  let w = E.put(1, [], true, 'feira', 5, 8).placements;
  assert.equal(E.checkPlacement(1, w, true, 'sol', 5, 10).ok, true);
  assert.equal(E.checkPlacement(1, w, true, 'nada', 5, 9).ok, false);
  w = E.put(1, w, true, 'feira', 5, 9).placements;
  assert.equal(w.length, 1); assert.equal(w[0].start, 9);
});

test('Toque no calendário escolhe o início que cobre a hora, centrado no toque', () => {
  assert.equal(E.resolveStart(1, [], true, 'sol', 6, 10), 10);
  assert.equal(E.resolveStart(1, [], true, 'sol', 6, 15), 11);
  assert.equal(E.resolveStart(1, [], true, 'feira', 5, 11), 10);
  assert.equal(E.resolveStart(0, [], true, 'feira', 5, 9), null);
  assert.equal(E.resolveStart(1, [], true, 'curso', 1, 12), null);
});

test('O mesmo imprevisto tira só o plano atingido', () => {
  const p = E.put(0, [], false, 'corpo', 2, 20).placements;
  const q = E.put(0, p, false, 'curso', 1, 20).placements;
  const event = E.applyEvent(q);
  assert.deepEqual(event.removed.map(x => x.id), ['corpo']);
  assert.deepEqual(event.placements.map(x => x.id), ['curso']);
  for (const r of [0, 1]) {
    assert.equal(E.checkPlacement(r, [], true, 'corpo', 2, 20).ok, false);
    assert.equal(E.checkPlacement(r, [], true, 'corpo', 2, 21).ok, true);
  }
});

const secondSolution = [['feira', 5, 8], ['sol', 5, 10], ['familia', 6, 12], ['curso', 1, 20], ['amigos', 4, 20], ['corpo', 0, 20], ['projeto', 5, 19], ['nada', 6, 8]];
test('Na 5×2 cabem os oito planos; na 6×1, no máximo seis', () => {
  let w = [];
  for (const [id, day, start] of secondSolution) {
    const result = E.put(1, w, true, id, day, start); assert.equal(result.ok, true); w = result.placements;
  }
  assert.equal(w.length, 8); assert.equal(E.stats(1, w).planned, 25);
  assert.equal(E.maxPlans(0).count, 6);
  assert.equal(E.maxPlans(1).count, 8);
  const best = E.maxPlans(0).placements;
  let check = [];
  for (const p of best) { const r = E.put(0, check, true, p.id, p.day, p.start); assert.equal(r.ok, true); check = r.placements; }
  assert.ok(!best.some(p => p.id === 'feira'), 'a feira nunca cabe na 6×1');
  assert.ok(!(best.some(p => p.id === 'sol') && best.some(p => p.id === 'familia')), 'praia e almoço de domingo disputam o domingo');
});

test('A semana 2 herda todos os encaixes da semana 1', () => {
  const week1 = E.maxPlans(0).placements;
  const week2 = E.carryOver(week1);
  assert.deepEqual(week2.map(p => p.id).sort(), week1.map(p => p.id).sort());
});

test('Saves inválidos ou incoerentes são recusados', () => {
  const ok = { version: 2, mode: 'playing', round: 0, weeks: [[{ id: 'sol', day: 6, start: 10, end: 16 }], []], events: [false, false] };
  assert.ok(E.validateSave(ok));
  assert.equal(E.validateSave({ ...ok, version: 1 }), null);
  assert.equal(E.validateSave({ ...ok, weeks: [[{ id: 'feira', day: 5, start: 8, end: 10 }], []] }), null);
  assert.equal(E.validateSave({ ...ok, weeks: [[{ id: 'sol', day: 6, start: 10, end: 17 }], []] }), null);
  assert.equal(E.validateSave({ ...ok, mode: 'results' }), null);
  assert.equal(E.validateSave(null), null);
});

test('Texto de compartilhamento: linha verde-amarela na 6×1, vermelha com estrelas na 5×2', () => {
  const week1 = E.maxPlans(0).placements, week2 = E.maxPlans(1).placements;
  const text = E.shareText([week1, week2], 'https://exemplo.org/folga/');
  assert.match(text, /^FOLGA · Sua vida cabe na 6×1\?/);
  assert.match(text, /6×1 🟩🟩🟩🟩🟩🟩🟨\ncoube 6 de 8/);
  assert.match(text, /5×2 🟥🟥🟥🟥🟥⭐⭐\ncoube 8 de 8/);
  assert.match(text, /Na 6×1, ficaram de fora a feira e o almoço de domingo\./);
  assert.match(text, /https:\/\/exemplo\.org\/folga\/$/);
  assert.match(E.shareText([[], []]), /pedroufc-source\.github\.io\/folga/);
  assert.equal(E.leftOutSentence(1, week2), '');
});
