const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

test('Cada semana soma 168h; a diferença explícita é 4h de trabalho e 2h de trajeto', () => {
  const a = E.stats(0, [], true), b = E.stats(1, [], true);
  for (const s of [a, b]) assert.equal(s.work + s.commute + s.sleep + s.routine + s.event + s.available, 168);
  assert.equal(a.available, 34); assert.equal(b.available, 40); assert.equal(b.available - a.available, 6);
});
test('Blocos fixos nunca se sobrepõem e as folgas liberam o trabalho e o trajeto', () => {
  for (const r of [0, 1]) {
    const fixed = E.fixedBlocks(r, true);
    assert.ok(fixed.some(b => b.day === 2 && b.kind === 'event' && b.start === 19 && b.end === 20));
    assert.ok(fixed.some(b => b.day === 2 && b.kind === 'routine' && b.start === 20 && b.end === 21));
    const blocks = E.fixedBlocks(r, true);
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i].day === blocks[j].day) assert.equal(E.overlaps(blocks[i], blocks[j]), false);
    }
    assert.equal(blocks.filter(b => b.kind === 'work').reduce((n, b) => n + b.end - b.start, 0), E.SCENARIOS[r].workHours);
  }
  assert.equal(E.options(0, [], true, 'feira', 5).length, 0);
  assert.deepEqual(E.options(1, [], true, 'feira', 5), [8, 9, 10]);
});
test('Atividades respeitam suas janelas, o sono e as horas reservadas', () => {
  assert.equal(E.checkPlacement(1, [], true, 'sol', 5, 10).ok, true);
  for (const [id, day, start] of [['sol', 5, 12], ['familia', 5, 12], ['projeto', 0, 20], ['nada', 0, 6], ['nada', 0, 16]]) {
    assert.equal(E.checkPlacement(1, [], true, id, day, start).ok, false);
  }
});
test('44h são cinco dias de 8h e um de 4h; intervalo não conta como trabalho', () => {
  for (const r of [0, 1]) {
    const blocks = E.fixedBlocks(r, true);
    for (let day = 0; day < 7; day++) {
      const work = blocks.filter(b => b.day === day && b.kind === 'work');
      assert.equal(work.reduce((sum, b) => sum + b.end - b.start, 0), E.SCENARIOS[r].hoursPerDay[day]);
      assert.equal(blocks.filter(b => b.day === day && b.kind === 'routine').reduce((sum, b) => sum + b.end - b.start, 0), 3);
      if (day < 5) {
        assert.equal(work.some(b => E.overlaps(b, { start: 12, end: 13 })), false);
        assert.ok(blocks.some(b => b.day === day && b.kind === 'routine' && b.start === 12 && b.end === 13));
      }
    }
    const actualFree = 7 * 16 - blocks.reduce((sum, b) => sum + b.end - b.start, 0);
    assert.equal(actualFree, E.stats(r, [], true).available);
  }
});
test('Sobreposição é bloqueada, mas blocos encostados cabem; mover não duplica', () => {
  let w = E.put(1, [], true, 'feira', 5, 8).placements;
  assert.equal(E.checkPlacement(1, w, true, 'sol', 5, 10).ok, true);
  assert.equal(E.checkPlacement(1, w, true, 'nada', 5, 9).ok, false);
  w = E.put(1, w, true, 'feira', 5, 9).placements;
  assert.equal(w.length, 1); assert.equal(w[0].start, 9);
});
test('Mesmo imprevisto nas duas semanas remove só o plano atingido', () => {
  const p = E.put(0, [], false, 'corpo', 2, 20).placements;
  const q = E.put(0, p, false, 'curso', 1, 20).placements;
  const event = E.applyEvent(q);
  assert.deepEqual(event.removed.map(p => p.id), ['corpo']);
  assert.deepEqual(event.placements.map(p => p.id), ['curso']);
  for (const r of [0, 1]) {
    assert.equal(E.checkPlacement(r, [], true, 'corpo', 2, 20).ok, false);
    assert.equal(E.checkPlacement(r, [], true, 'corpo', 2, 21).ok, true);
  }
});
const secondSolution = [['feira', 5, 8], ['sol', 5, 10], ['familia', 6, 12], ['curso', 1, 20], ['amigos', 4, 20], ['corpo', 0, 20], ['projeto', 5, 19], ['nada', 6, 8]];
test('As oito atividades realmente cabem na segunda semana após o imprevisto', () => {
  let w = [];
  for (const [id, day, start] of secondSolution) {
    const result = E.put(1, w, true, id, day, start); assert.equal(result.ok, true); w = result.placements;
  }
  assert.equal(w.length, 8); assert.equal(E.stats(1, w).planned, 25); assert.equal(E.stats(1, w).unallocated, 15);
});
test('Na primeira semana há seis encaixes viáveis e conflitos definidos pelas janelas', () => {
  let w = [];
  for (const [id, day, start] of secondSolution.filter(([id]) => !['feira', 'sol'].includes(id))) {
    const result = E.put(0, w, true, id, day, start); assert.equal(result.ok, true); w = result.placements;
  }
  assert.equal(w.length, 6);
  assert.equal(E.options(0, w, true, 'sol', 6).length, 0);
  assert.equal(E.options(0, w.filter(p => p.id !== 'familia'), true, 'sol', 6).length, 2);
});
test('Saves inválidos, duplicados ou que sobrepõem trabalho são rejeitados', () => {
  const good = { version: 2, mode: 'playing', round: 0, weeks: [[{ id: 'curso', day: 1, start: 20, end: 23 }], []], events: [false, false] };
  assert.ok(E.validateSave(good));
  assert.equal(E.validateSave(null), null);
  assert.equal(E.validateSave({ ...good, version: 1 }), null);
  assert.equal(E.validateSave({ ...good, weeks: [[good.weeks[0][0], good.weeks[0][0]], []] }), null);
  assert.equal(E.validateSave({ ...good, mode: 'results' }), null);
  assert.equal(E.validateSave({ ...good, weeks: [[{ id: 'nada', day: 0, start: 9, end: 11 }], []] }), null);
  assert.equal(E.validateSave({ ...good, weeks: [[{ id: 'curso', day: 1, start: 20, end: 40 }], []] }), null);
});
