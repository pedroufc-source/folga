(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FolgaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const SHORT_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const SCENARIOS = [
    { name: 'Uma folga', scale: '6×1', workDays: 6, workHours: 44, commuteHours: 12, hoursPerDay: [8, 8, 8, 8, 8, 4, 0] },
    { name: 'Duas folgas', scale: '5×2', workDays: 5, workHours: 40, commuteHours: 10, hoursPerDay: [8, 8, 8, 8, 8, 0, 0] }
  ];
  const TASKS = [
    { id: 'feira', name: 'Feira da semana', short: 'Feira', hours: 2, days: [5], from: 8, to: 12, color: '#e9b481', icon: '◈', note: 'Sábado, entre 8h e 12h.' },
    { id: 'sol', name: 'Uma tarde ao sol', short: 'Ao sol', hours: 6, days: [5, 6], from: 10, to: 17, color: '#e9d36e', icon: '☼', note: 'Sábado ou domingo, entre 10h e 17h. Inclui ida e volta.' },
    { id: 'familia', name: 'Almoço em família', short: 'Família', hours: 3, days: [6], from: 12, to: 16, color: '#dfa3aa', icon: '♡', note: 'Domingo, entre 12h e 16h. Inclui o trajeto.' },
    { id: 'curso', name: 'Retomar os estudos', short: 'Estudos', hours: 3, days: [1, 3], from: 19, to: 23, color: '#b9aedb', icon: '▧', note: 'Terça ou quinta, entre 19h e 23h. Estudo em casa.' },
    { id: 'amigos', name: 'Encontrar os amigos', short: 'Amigos', hours: 3, days: [4, 5], from: 19, to: 23, color: '#9ebfd7', icon: '✳', note: 'Sexta ou sábado, entre 19h e 23h. Inclui o trajeto.' },
    { id: 'corpo', name: 'Mexer o corpo', short: 'Movimento', hours: 2, days: [0, 2], from: 19, to: 23, color: '#aad1bb', icon: '↗', note: 'Segunda ou quarta, entre 19h e 23h. Inclui o trajeto.' },
    { id: 'projeto', name: 'Tocar meu projeto', short: 'Meu projeto', hours: 4, days: [0, 1, 2, 3, 4, 5, 6], from: 19, to: 23, color: '#c8ce8f', icon: '✦', note: 'Qualquer noite, entre 19h e 23h. Quatro horas seguidas, em casa.' },
    { id: 'nada', name: 'Não fazer nada', short: 'Pausa', hours: 2, days: [0, 1, 2, 3, 4, 5, 6], from: 8, to: 23, color: '#a7c9c9', icon: '≈', note: 'Qualquer dia, entre 8h e 23h. Um tempo sem obrigação.' }
  ];
  const EVENT = { day: 2, start: 19, end: 20, kind: 'event', label: 'Atraso no ônibus' };
  const taskById = id => TASKS.find(task => task.id === id);
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  function fixedBlocks(round, eventActive = false) {
    const blocks = [];
    for (let day = 0; day < 7; day++) {
      blocks.push({ day, start: 7, end: 8, kind: 'routine', label: 'Rotina' });
      const hours = SCENARIOS[round].hoursPerDay[day];
      const late = eventActive && day === EVENT.day;
      if (hours === 8) {
        // The lunch break is routine time, never paid work in this model.
        blocks.push({ day, start: 12, end: 13, kind: 'routine', label: 'Almoço / intervalo' });
        blocks.push({ day, start: late ? 20 : 19, end: late ? 21 : 20, kind: 'routine', label: late ? 'Rotina adiada' : 'Casa e refeições' });
        blocks.push({ day, start: 8, end: 9, kind: 'commute', label: 'Trajeto' });
        blocks.push({ day, start: 9, end: 12, kind: 'work', label: 'Trabalho' });
        blocks.push({ day, start: 13, end: 18, kind: 'work', label: 'Trabalho' });
        blocks.push({ day, start: 18, end: 19, kind: 'commute', label: 'Trajeto' });
      } else {
        blocks.push({ day, start: 17, end: 19, kind: 'routine', label: 'Casa e refeições' });
        if (hours === 4) {
          blocks.push({ day, start: 8, end: 9, kind: 'commute', label: 'Trajeto' });
          blocks.push({ day, start: 9, end: 13, kind: 'work', label: 'Trabalho' });
          blocks.push({ day, start: 13, end: 14, kind: 'commute', label: 'Trajeto' });
        }
      }
    }
    if (eventActive) blocks.push({ ...EVENT });
    return blocks;
  }
  function checkPlacement(round, placements, eventActive, id, day, start) {
    const task = taskById(id);
    if (!task || !Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(start)) {
      return { ok: false, reason: 'Escolha uma atividade, um dia e um horário.' };
    }
    const item = { id, day, start, end: start + task.hours };
    if (!task.days.includes(day) || start < task.from || item.end > task.to) {
      return { ok: false, reason: task.note };
    }
    const blocks = fixedBlocks(round, eventActive).concat(placements.filter(p => p.id !== id));
    const conflict = blocks.find(b => b.day === day && overlaps(item, b));
    if (conflict) {
      const label = conflict.id ? taskById(conflict.id).name : conflict.label;
      return { ok: false, reason: `Esse horário coincide com ${label.toLowerCase()}.` };
    }
    return { ok: true, placement: item };
  }
  function options(round, placements, eventActive, id, day) {
    const task = taskById(id);
    if (!task) return [];
    const starts = [];
    for (let start = task.from; start <= task.to - task.hours; start++) {
      if (checkPlacement(round, placements, eventActive, id, day, start).ok) starts.push(start);
    }
    return starts;
  }
  function put(round, placements, eventActive, id, day, start) {
    const result = checkPlacement(round, placements, eventActive, id, day, start);
    return result.ok ? { ...result, placements: [...placements.filter(p => p.id !== id), result.placement] } : result;
  }
  function applyEvent(placements) {
    // Arriving at 20h shifts the one-hour evening routine to 20h–21h.
    const displacedRoutine = { start: 20, end: 21 };
    const removed = placements.filter(p => p.day === EVENT.day && overlaps(p, displacedRoutine));
    return { removed, placements: placements.filter(p => !removed.includes(p)) };
  }
  function stats(round, placements, eventActive = true) {
    const scenario = SCENARIOS[round];
    const available = 168 - 56 - 21 - scenario.workHours - scenario.commuteHours - Number(eventActive);
    const planned = placements.reduce((sum, p) => sum + (p.end - p.start), 0);
    return { work: scenario.workHours, commute: scenario.commuteHours, sleep: 56, routine: 21,
      event: Number(eventActive), available, planned, unallocated: available - planned, count: placements.length,
      left: TASKS.filter(t => !placements.some(p => p.id === t.id)).map(t => t.id) };
  }
  function validateSave(data) {
    if (!data || data.version !== 2 || !['intro', 'playing', 'intermission', 'results'].includes(data.mode)) return null;
    if (![0, 1].includes(data.round) || !Array.isArray(data.weeks) || data.weeks.length !== 2 ||
      !Array.isArray(data.events) || data.events.length !== 2 || !data.events.every(v => typeof v === 'boolean')) return null;
    if ((data.mode === 'intermission' && data.round !== 0) || (data.mode === 'results' && data.round !== 1)) return null;
    if (data.round === 1 && !data.events[0]) return null;
    if (['intermission', 'results'].includes(data.mode) && !data.events[data.round]) return null;
    for (let round = 0; round < 2; round++) {
      if (!Array.isArray(data.weeks[round]) || data.weeks[round].length > TASKS.length) return null;
      const clean = [];
      for (const p of data.weeks[round]) {
        if (!p || clean.some(c => c.id === p.id)) return null;
        const result = checkPlacement(round, clean, data.events[round], p.id, p.day, p.start);
        if (!result.ok || result.placement.end !== p.end) return null;
        clean.push(result.placement);
      }
    }
    return { version: 2, mode: data.mode, round: data.round, weeks: data.weeks.map(w => w.map(p => ({ id: p.id, day: p.day, start: p.start, end: p.end }))), events: [...data.events] };
  }
  return { DAYS, SHORT_DAYS, SCENARIOS, TASKS, EVENT, taskById, overlaps, fixedBlocks, checkPlacement, options, put, applyEvent, stats, validateSave };
});
