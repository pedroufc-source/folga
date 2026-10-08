// FOLGA — regras puras: semanas, planos, encaixes, imprevisto, contas e texto de compartilhamento.
// Sem DOM. Exporta window.FolgaEngine no navegador e module.exports no Node (testes).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FolgaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const SHORT_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const FIRST_HOUR = 7, LAST_HOUR = 23;
  const SITE_URL = 'https://pedroufc-source.github.io/folga/';

  const SCENARIOS = [
    { scale: '6×1', workHours: 44, commuteHours: 12, hoursPerDay: [8, 8, 8, 8, 8, 4, 0] },
    { scale: '5×2', workHours: 40, commuteHours: 10, hoursPerDay: [8, 8, 8, 8, 8, 0, 0] }
  ];
  const offDays = round => SCENARIOS[round].hoursPerDay.map((h, d) => (h ? -1 : d)).filter(d => d >= 0);

  // Janelas e durações são escolhas de desenho do quebra-cabeça (veja REFERENCIAS.md).
  // `out` é a forma usada em "ficou de fora …".
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  const TASKS = [
    { id: 'feira', name: 'Fazer a feira', short: 'Feira', emoji: '🍅', hours: 2, days: [5], from: 8, to: 12, out: 'a feira', extra: 'A feira é de manhã.' },
    { id: 'sol', name: 'Praia ou parque', short: 'Praia', emoji: '🌴', hours: 6, days: [5, 6], from: 10, to: 17, out: 'a praia', extra: 'Seis horas, com ida e volta.' },
    { id: 'familia', name: 'Almoço de domingo', short: 'Almoço', emoji: '🍲', hours: 3, days: [6], from: 12, to: 16, out: 'o almoço de domingo', extra: 'Três horas, com a família.' },
    { id: 'curso', name: 'Estudar', short: 'Estudo', emoji: '📚', hours: 3, days: [1, 3], from: 19, to: 23, out: 'o estudo', extra: 'Curso ou estudo em casa.' },
    { id: 'amigos', name: 'Sair com os amigos', short: 'Amigos', emoji: '🍻', hours: 3, days: [4, 5], from: 19, to: 23, out: 'os amigos', extra: 'Com a volta para casa.' },
    { id: 'corpo', name: 'Academia ou futebol', short: 'Treino', emoji: '⚽', hours: 2, days: [0, 2], from: 19, to: 23, out: 'o treino', extra: 'Com o trajeto.' },
    { id: 'projeto', name: 'Tempo pro hobby', short: 'Hobby', emoji: '🎸', hours: 4, days: ALL, from: 19, to: 23, out: 'o hobby', extra: 'Quatro horas seguidas: música, costura, videogame…' },
    { id: 'nada', name: 'Não fazer nada', short: 'Nada', emoji: '😴', hours: 2, days: ALL, from: 8, to: 23, out: 'o descanso', extra: 'Duas horas sem obrigação nenhuma.' }
  ];
  const EVENT = { day: 2, start: 19, end: 20, kind: 'event', label: 'Ônibus atrasado', reason: 'O ônibus atrasou: você ainda está chegando.' };
  const taskById = id => TASKS.find(task => task.id === id);
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;

  function joinList(items) {
    if (items.length < 2) return items.join('');
    return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
  }
  function daysText(task) {
    if (task.days.length === 7) return 'qualquer dia';
    return joinList(task.days.map(d => DAYS[d].toLowerCase())).replace(/ e (?=[^,]*$)/, ' ou ');
  }
  // "sábado, entre 8h e 12h"
  const windowText = task => `${daysText(task)}, entre ${task.from}h e ${task.to}h`;
  const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

  function fixedBlocks(round, eventActive = false) {
    const blocks = [];
    const add = (day, start, end, kind, label, reason) => blocks.push({ day, start, end, kind, label, reason });
    for (let day = 0; day < 7; day++) {
      const hours = SCENARIOS[round].hoursPerDay[day];
      const late = eventActive && day === EVENT.day;
      add(day, 7, 8, 'routine', 'Café', 'É a hora do café e de se arrumar.');
      if (hours === 8) {
        // O almoço é intervalo, fora das 8h trabalhadas.
        add(day, 8, 9, 'commute', 'Ônibus', 'Nesse horário você está no ônibus.');
        add(day, 9, 12, 'work', 'Trabalho', 'Nesse horário você está no trabalho.');
        add(day, 12, 13, 'routine', 'Almoço', 'É o intervalo de almoço do trabalho.');
        add(day, 13, 18, 'work', 'Trabalho', 'Nesse horário você está no trabalho.');
        add(day, 18, 19, 'commute', 'Ônibus', 'Nesse horário você está no ônibus.');
        if (late) add(day, 20, 21, 'routine', 'Janta', 'Com o atraso, a janta e a casa passaram para as 20h.');
        else add(day, 19, 20, 'routine', 'Janta', 'É a hora da janta e das coisas de casa.');
      } else {
        if (hours === 4) {
          add(day, 8, 9, 'commute', 'Ônibus', 'Nesse horário você está no ônibus.');
          add(day, 9, 13, 'work', 'Trabalho', 'Nesse horário você está no trabalho.');
          add(day, 13, 14, 'commute', 'Ônibus', 'Nesse horário você está no ônibus.');
        }
        add(day, 17, 19, 'routine', 'Casa', 'É a hora de cuidar da casa e da janta.');
      }
    }
    if (eventActive) blocks.push({ ...EVENT });
    return blocks;
  }

  function checkPlacement(round, placements, eventActive, id, day, start) {
    const task = taskById(id);
    if (!task || !Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(start)) {
      return { ok: false, code: 'invalid', reason: 'Escolha um plano, um dia e um horário.' };
    }
    const item = { id, day, start, end: start + task.hours };
    if (!task.days.includes(day) || start < task.from || item.end > task.to) {
      return { ok: false, code: 'window', reason: `${task.short}: só ${windowText(task)}.` };
    }
    const fixed = fixedBlocks(round, eventActive).find(b => b.day === day && overlaps(item, b));
    if (fixed) return { ok: false, code: fixed.kind, blocker: fixed, reason: fixed.reason };
    const plan = placements.find(p => p.id !== id && p.day === day && overlaps(item, p));
    if (plan) {
      const other = taskById(plan.id);
      return { ok: false, code: 'plan', blocker: plan, reason: `Já tem ${other.emoji} ${other.name} nesse horário.` };
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
  const allOptions = (round, placements, eventActive, id) =>
    ALL.flatMap(day => options(round, placements, eventActive, id, day).map(start => ({ day, start })));

  // Início que cobre a hora tocada, com o bloco o mais centrado possível no toque.
  function resolveStart(round, placements, eventActive, id, day, hour) {
    const task = taskById(id);
    if (!task) return null;
    const covering = options(round, placements, eventActive, id, day).filter(s => s <= hour && hour < s + task.hours);
    if (!covering.length) return null;
    const target = hour + 0.5 - task.hours / 2;
    return covering.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best));
  }

  // Por que um plano não tem nenhum horário na semana inteira.
  function whyNoRoom(round, placements, eventActive, id) {
    const task = taskById(id);
    if (!task || allOptions(round, placements, eventActive, id).length) return null;
    const others = placements.filter(p => p.id !== id);
    if (allOptions(round, [], eventActive, id).length) {
      const blockers = new Set();
      for (const day of task.days) for (let s = task.from; s <= task.to - task.hours; s++) {
        const check = checkPlacement(round, others, eventActive, id, day, s);
        if (check.code === 'plan') blockers.add(check.blocker.id);
      }
      const names = [...blockers].map(b => `${taskById(b).emoji} ${taskById(b).name}`);
      return `Sem espaço: ${daysText(task)} já tem ${joinList(names)}. Mova ou tire um plano.`;
    }
    return `Na ${SCENARIOS[round].scale} não cabe: ${windowText(task)}, você está no trabalho ou no ônibus.`;
  }

  function put(round, placements, eventActive, id, day, start) {
    const result = checkPlacement(round, placements, eventActive, id, day, start);
    return result.ok ? { ...result, placements: [...placements.filter(p => p.id !== id), result.placement] } : result;
  }

  function applyEvent(placements) {
    // Chegando às 20h, a hora de janta e casa passa para 20h–21h.
    const displaced = { start: 20, end: 21 };
    const removed = placements.filter(p => p.day === EVENT.day && overlaps(p, displaced));
    return { removed, placements: placements.filter(p => !removed.includes(p)) };
  }

  // A semana 2 começa com os encaixes da semana 1 (a 5×2 só libera horas; nada da 6×1 deixa de caber).
  function carryOver(placements) {
    const kept = [];
    for (const p of placements) {
      const result = checkPlacement(1, kept, true, p.id, p.day, p.start);
      if (result.ok) kept.push(result.placement);
    }
    return kept;
  }

  function stats(round, placements, eventActive = true) {
    const scenario = SCENARIOS[round];
    const available = 168 - 56 - 21 - scenario.workHours - scenario.commuteHours - Number(eventActive);
    const planned = placements.reduce((sum, p) => sum + (p.end - p.start), 0);
    return { work: scenario.workHours, commute: scenario.commuteHours, sleep: 56, routine: 21,
      event: Number(eventActive), available, planned, unallocated: available - planned, count: placements.length,
      left: TASKS.filter(t => !placements.some(p => p.id === t.id)).map(t => t.id) };
  }

  // Maior número de planos que cabem juntos (busca exaustiva com poda; o espaço é pequeno).
  const maxCache = {};
  function maxPlans(round, eventActive = true) {
    const key = `${round}:${eventActive}`;
    if (maxCache[key]) return maxCache[key];
    const lists = TASKS.map(t => allOptions(round, [], eventActive, t.id).map(o => ({ id: t.id, day: o.day, start: o.start, end: o.start + t.hours })))
      .sort((a, b) => a.length - b.length);
    let best = [];
    const chosen = [];
    (function search(i) {
      if (best.length === TASKS.length || chosen.length + (lists.length - i) <= best.length) return;
      if (i === lists.length) { best = chosen.slice(); return; }
      for (const p of lists[i]) {
        if (chosen.some(c => c.day === p.day && overlaps(c, p))) continue;
        chosen.push(p); search(i + 1); chosen.pop();
      }
      search(i + 1);
    })(0);
    maxCache[key] = { count: best.length, placements: best };
    return maxCache[key];
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

  // Linha de dias com as cores de cada semana: verde e amarelo na 6×1; vermelho e estrela na 5×2.
  const STRIP = [['🟩', '🟨'], ['🟥', '⭐']];
  const dayStrip = round => SCENARIOS[round].hoursPerDay.map(h => STRIP[round][h ? 0 : 1]).join('');
  function leftOutSentence(round, placements) {
    const left = TASKS.filter(t => !placements.some(p => p.id === t.id));
    if (!left.length) return '';
    return `Na ${SCENARIOS[round].scale}, ${left.length === 1 ? 'ficou' : 'ficaram'} de fora ${joinList(left.map(t => t.out))}.`;
  }
  function shareText(weeks, url = SITE_URL) {
    const fit = round => TASKS.filter(t => weeks[round].some(p => p.id === t.id)).map(t => t.emoji).join('');
    const lines = ['FOLGA · Sua vida cabe na 6×1?', ''];
    for (const round of [0, 1]) {
      lines.push(`${SCENARIOS[round].scale} ${dayStrip(round)}`);
      lines.push(`coube ${weeks[round].length} de 8 ${fit(round)}`.trim(), '');
    }
    const out = leftOutSentence(0, weeks[0]);
    if (out) lines.push(out);
    lines.push(`E a sua semana? ${url}`);
    return lines.join('\n');
  }

  return { DAYS, SHORT_DAYS, FIRST_HOUR, LAST_HOUR, SITE_URL, SCENARIOS, TASKS, EVENT, offDays, taskById, overlaps,
    joinList, daysText, windowText, capitalize, fixedBlocks, checkPlacement, options, allOptions, resolveStart, whyNoRoom,
    put, applyEvent, carryOver, stats, maxPlans, validateSave, dayStrip, leftOutSentence, shareText };
});
