// FOLGA — regras puras: semanas, dias de trabalho, planos, encaixes, contas e texto de compartilhamento.
// Sem DOM. Exporta window.FolgaEngine no navegador e module.exports no Node (testes).
//
// Tudo se move, em qualquer dia, das 7h às 23h (o sono fica fora do calendário). A escala só diz
// quantos dias de trabalho existem: seis na 6×1 (cinco de 8h e um de 4h) e cinco na 5×2. Cada dia
// de trabalho é um bloco com o transporte de ida, o trabalho, o almoço e o transporte de volta.
// O jogador pode fazer hora extra (até 2h, CLT art. 59), mudar o almoço de lugar ou tirá-lo, desde
// que nenhum trecho de trabalho passe de 6h seguidas (CLT art. 71).
// Os planos saem de uma lista que o jogador monta (sugestões ou itens próprios).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FolgaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const SHORT_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const FIRST_HOUR = 7, LAST_HOUR = 23, DAY_HOURS = LAST_HOUR - FIRST_HOUR;
  const SITE_URL = 'https://pedroufc-source.github.io/folga/';
  const CLOCK_SECONDS = 120;
  const COLORS = 12;

  // Rodada 0: semana de quem escolhe Flávio (6×1). Rodada 1: de quem escolhe Lula (5×2).
  const SCENARIOS = [
    { scale: '6×1', candidate: 'Flávio', workHours: 44, commuteHours: 12, work: [8, 8, 8, 8, 8, 4] },
    { scale: '5×2', candidate: 'Lula', workHours: 40, commuteHours: 10, work: [8, 8, 8, 8, 8] }
  ];

  // Sugestões, sem moralismo: o jogador põe na lista o que quiser. Emojis sem seletor de variação
  // nem junções (o WebKit desalinha no canvas).
  const GROUPS = ['Casa', 'Cuidar de si', 'Amor', 'Rolê', 'Família e fé', 'Telas', 'Estudo e grana', 'Descanso'];
  const CATALOG = [
    ['faxina', 'Faxina', 'Faxina', '🧹', 4, 'Casa'],
    ['roupa', 'Lavar roupa', 'Roupa', '🧺', 3, 'Casa'],
    ['mercado', 'Mercado e feira', 'Mercado', '🛒', 2, 'Casa'],
    ['cozinhar', 'Cozinhar a semana', 'Cozinhar', '🍳', 3, 'Casa'],
    ['pet', 'Passear com o cachorro', 'Cachorro', '🐶', 1, 'Casa'],
    ['salao', 'Salão de beleza', 'Salão', '💇', 3, 'Cuidar de si'],
    ['unha', 'Fazer a unha', 'Unha', '💅', 2, 'Cuidar de si'],
    ['academia', 'Academia', 'Academia', '💪', 2, 'Cuidar de si'],
    ['futebol', 'Futebol', 'Futebol', '⚽', 3, 'Cuidar de si'],
    ['medico', 'Consulta médica', 'Médico', '🩺', 3, 'Cuidar de si'],
    ['app', 'App de relacionamento', 'App', '📱', 2, 'Amor'],
    ['encontro', 'Encontro', 'Encontro', '💘', 4, 'Amor'],
    ['motel', 'Motel', 'Motel', '🏩', 3, 'Amor'],
    ['karaoke', 'Karaokê', 'Karaokê', '🎤', 4, 'Rolê'],
    ['amigas', 'Encontro com as amigas', 'Amigas', '👯', 4, 'Rolê'],
    ['bar', 'Bar com os amigos', 'Bar', '🍻', 4, 'Rolê'],
    ['churrasco', 'Churrasco', 'Churras', '🍖', 6, 'Rolê'],
    ['baile', 'Baile ou balada', 'Baile', '💃', 5, 'Rolê'],
    ['show', 'Show', 'Show', '🎶', 4, 'Rolê'],
    ['familia', 'Almoço em família', 'Família', '🍲', 5, 'Família e fé'],
    ['criancas', 'Brincar com as crianças', 'Crianças', '🧒', 3, 'Família e fé'],
    ['vo', 'Visitar a vó', 'Vó', '👵', 3, 'Família e fé'],
    ['culto', 'Igreja ou culto', 'Culto', '🙏', 3, 'Família e fé'],
    ['bet', 'Jogar na bet', 'Bet', '🎰', 2, 'Telas'],
    ['videogame', 'Videogame', 'Game', '🎮', 3, 'Telas'],
    ['serie', 'Maratonar série', 'Série', '📺', 4, 'Telas'],
    ['estudo', 'Estudar', 'Estudo', '📚', 4, 'Estudo e grana'],
    ['curso', 'Curso online', 'Curso', '💻', 2, 'Estudo e grana'],
    ['bico', 'Bico de entregas', 'Bico', '🛵', 4, 'Estudo e grana'],
    ['nada', 'Não fazer nada', 'Nada', '😴', 4, 'Descanso'],
    ['praia', 'Praia ou parque', 'Praia', '🌴', 6, 'Descanso']
  ].map(([id, name, short, emoji, hours, group], i) => ({ id, name, short, emoji, hours, group, color: i % COLORS }));
  const STARTER = ['faxina', 'mercado', 'salao', 'amigas', 'app', 'karaoke', 'familia', 'praia', 'nada', 'estudo', 'churrasco', 'futebol', 'motel'];
  const catalogById = id => CATALOG.find(c => c.id === id);
  const itemFromCatalog = c => ({ uid: c.id, ref: c.id, name: c.name, short: c.short, emoji: c.emoji, hours: c.hours, color: c.color });
  const starterItems = () => STARTER.map(id => itemFromCatalog(catalogById(id)));
  function customItem(name, hours, uid, color) {
    const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    const h = Math.round(Number(hours));
    if (!clean || !(h >= 1 && h <= 8)) return null;
    return { uid, ref: null, name: clean, short: clean.length > 9 ? `${clean.slice(0, 8).trimEnd()}…` : clean, emoji: '✨', hours: h, color };
  }

  // Dia de trabalho: [transporte 1h][trabalho][almoço 1h][trabalho][transporte 1h].
  // `extra`: horas extras (0 a 2). `lunch`: tem almoço. `lunchAt`: horas de trabalho antes do almoço.
  const MAX_EXTRA = 2, MAX_STRETCH = 6;
  const defaultSettings = hours => ({ extra: 0, lunch: hours > MAX_STRETCH, lunchAt: hours > MAX_STRETCH ? hours / 2 : hours });
  const workSpan = (hours, w = defaultSettings(hours)) => 2 + hours + w.extra + (w.lunch ? 1 : 0);
  function workSegments(hours, w) {
    const total = hours + w.extra, parts = [[0, 1, 'commute']];
    if (w.lunch) parts.push([1, 1 + w.lunchAt, 'work'], [1 + w.lunchAt, 2 + w.lunchAt, 'lunch'], [2 + w.lunchAt, 2 + total, 'work'], [2 + total, 3 + total, 'commute']);
    else parts.push([1, 1 + total, 'work'], [1 + total, 2 + total, 'commute']);
    return parts.map(([a, b, kind]) => ({ day: w.day, start: w.start + a, end: w.start + b, kind }));
  }
  // Trechos de trabalho contínuo, em horas.
  const stretches = (hours, w) => (w.lunch ? [w.lunchAt, hours + w.extra - w.lunchAt] : [hours + w.extra]);
  const defaultWork = round => SCENARIOS[round].work.map((h, i) => ({ uid: `w${i}`, day: i, start: 8, ...defaultSettings(h) }));
  const newWeek = round => ({ work: defaultWork(round), plans: [] });
  const isWork = uid => /^w\d$/.test(uid);
  const workHoursOf = (round, uid) => SCENARIOS[round].work[Number(uid.slice(1))];

  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  const itemOf = (items, uid) => items.find(it => it.uid === uid);
  function spanOf(round, week, items, uid) {
    if (isWork(uid)) {
      const h = workHoursOf(round, uid), w = week.work.find(x => x.uid === uid);
      return h ? workSpan(h, w || defaultSettings(h)) : 0;
    }
    const it = itemOf(items, uid);
    return it ? it.hours : 0;
  }
  function joinList(list) {
    if (list.length < 2) return list.join('');
    return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
  }
  const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);
  const label = it => `${it.emoji} ${it.name}`;

  const REASONS = {
    commute: 'Nesse horário você está no transporte, indo ou voltando do trabalho.',
    work: 'Nesse horário você está no trabalho.',
    lunch: 'É o seu horário de almoço.',
  };
  // Tudo o que ocupa a semana, com o tipo de cada pedaço.
  function blocks(round, week, items, exceptUid = null) {
    const out = [];
    for (const w of week.work) {
      if (w.uid === exceptUid) continue;
      for (const seg of workSegments(workHoursOf(round, w.uid), w)) out.push({ ...seg, uid: w.uid, reason: REASONS[seg.kind] });
    }
    for (const p of week.plans) {
      if (p.uid === exceptUid) continue;
      const it = itemOf(items, p.uid);
      if (it) out.push({ day: p.day, start: p.start, end: p.start + it.hours, kind: 'plan', uid: p.uid, reason: `Já tem ${label(it)} nesse horário.` });
    }
    return out;
  }
  const workDays = week => week.work.map(w => w.day);
  const offDays = week => [0, 1, 2, 3, 4, 5, 6].filter(d => !workDays(week).includes(d));

  function check(round, week, items, uid, day, start, span = spanOf(round, week, items, uid)) {
    if (!span || !Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(start)) {
      return { ok: false, code: 'invalid', reason: 'Escolha um plano, um dia e um horário.' };
    }
    if (start < FIRST_HOUR) return { ok: false, code: 'sleep', reason: 'Antes das 7h você está dormindo.' };
    if (start + span > LAST_HOUR) return { ok: false, code: 'sleep', reason: `Não cabe: são ${span}h e às 23h é hora de dormir.` };
    const item = { day, start, end: start + span };
    const hit = blocks(round, week, items, uid).find(b => b.day === day && overlaps(item, b));
    if (hit) {
      const reason = isWork(uid) && isWork(hit.uid) ? 'Já tem um dia de trabalho nessa data.' : hit.reason;
      return { ok: false, code: hit.kind, blocker: hit, reason };
    }
    return { ok: true, placement: { uid, day, start } };
  }
  function options(round, week, items, uid, day) {
    const span = spanOf(round, week, items, uid), starts = [];
    for (let s = FIRST_HOUR; s <= LAST_HOUR - span; s++) if (check(round, week, items, uid, day, s).ok) starts.push(s);
    return starts;
  }
  const allOptions = (round, week, items, uid) =>
    [0, 1, 2, 3, 4, 5, 6].flatMap(day => options(round, week, items, uid, day).map(start => ({ day, start })));
  // Uma sugestão por espaço livre: o primeiro início de cada sequência.
  const runStarts = (round, week, items, uid) =>
    allOptions(round, week, items, uid).filter((o, i, list) => !(i && list[i - 1].day === o.day && list[i - 1].start === o.start - 1));

  function freeRuns(round, week, items, exceptUid = null) {
    const busy = blocks(round, week, items, exceptUid), runs = [];
    for (let day = 0; day < 7; day++) {
      let start = null;
      for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
        const free = h < LAST_HOUR && !busy.some(b => b.day === day && h >= b.start && h < b.end);
        if (free && start === null) start = h;
        if (!free && start !== null) { runs.push({ day, start, end: h }); start = null; }
      }
    }
    return runs;
  }
  function resolveStart(round, week, items, uid, day, hour) {
    const span = spanOf(round, week, items, uid);
    const covering = options(round, week, items, uid, day).filter(s => s <= hour && hour < s + span);
    if (!covering.length) return null;
    const target = hour + 0.5 - span / 2;
    return covering.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best));
  }
  function whyNotHere(round, week, items, uid, day, hour) {
    const span = spanOf(round, week, items, uid);
    const run = freeRuns(round, week, items, uid).find(r => r.day === day && hour >= r.start && hour < r.end);
    const what = isWork(uid) ? 'O dia de trabalho' : itemOf(items, uid).short;
    if (run) {
      const n = run.end - run.start;
      return `Aqui só tem ${n}h livre${n > 1 ? 's' : ''} seguida${n > 1 ? 's' : ''}. ${what} precisa de ${span}h.`;
    }
    const hit = blocks(round, week, items, uid).find(b => b.day === day && hour >= b.start && hour < b.end);
    if (hit) return isWork(uid) && isWork(hit.uid) ? 'Já tem um dia de trabalho nessa data.' : hit.reason;
    return 'Escolha um espaço livre do calendário.';
  }
  function whyNoRoom(round, week, items, uid) {
    if (allOptions(round, week, items, uid).length) return null;
    const span = spanOf(round, week, items, uid);
    const longest = Math.max(0, ...freeRuns(round, week, items, uid).map(r => r.end - r.start));
    return `Não sobra nenhum espaço de ${span}h seguidas: o maior tem ${longest}h. Mova ou tire alguma coisa.`;
  }

  function move(round, week, items, uid, day, start) {
    const result = check(round, week, items, uid, day, start);
    if (!result.ok) return result;
    const key = isWork(uid) ? 'work' : 'plans';
    const old = week[key].find(p => p.uid === uid) || {};
    const next = { work: week.work.slice(), plans: week.plans.slice() };
    next[key] = [...next[key].filter(p => p.uid !== uid), { ...old, uid, day, start }];
    return { ...result, week: next };
  }

  // Mexe no dia de trabalho: hora extra, almoço sim ou não, almoço mais cedo ou mais tarde.
  // `code` 'clt71' e 'clt59' marcam o que a CLT não deixa.
  const CLT71 = 'Pela CLT, quem trabalha mais de 6 horas seguidas tem direito a pelo menos 1 hora de intervalo (art. 71).';
  const CLT59 = 'Pela CLT, a hora extra tem limite de 2 horas por dia (art. 59).';
  function editWork(round, week, items, uid, change) {
    const hours = workHoursOf(round, uid), cur = week.work.find(w => w.uid === uid);
    if (!hours || !cur) return { ok: false, code: 'invalid', reason: 'Escolha um dia de trabalho.' };
    const next = { ...cur };
    if (change.extra) next.extra = cur.extra + change.extra;
    if (change.lunch !== undefined) { next.lunch = change.lunch; next.lunchAt = change.lunch ? Math.min(Math.ceil((hours + next.extra) / 2), MAX_STRETCH) : hours + next.extra; }
    if (change.lunchAt) next.lunchAt = cur.lunchAt + change.lunchAt;
    if (!next.lunch) next.lunchAt = hours + next.extra;
    if (next.extra < 0) return { ok: false, code: 'contract', reason: `Seu contrato é de ${hours}h nesse dia. Menos que isso, só mudando a lei.` };
    if (next.extra > MAX_EXTRA) return { ok: false, code: 'clt59', reason: CLT59 };
    if (next.lunch && (next.lunchAt < 1 || next.lunchAt > hours + next.extra - 1)) return { ok: false, code: 'lunch', reason: 'O almoço fica entre um trecho de trabalho e outro.' };
    if (stretches(hours, next).some(h => h > MAX_STRETCH)) return { ok: false, code: 'clt71', reason: CLT71 };
    const span = workSpan(hours, next), trial = { work: week.work.map(w => (w.uid === uid ? next : w)), plans: week.plans };
    const fit = check(round, trial, items, uid, next.day, next.start, span);
    if (!fit.ok) {
      // Se não cabe para baixo, tenta começar mais cedo no mesmo dia.
      const earlier = options(round, trial, items, uid, next.day).filter(s => s <= next.start).pop();
      if (earlier === undefined) return { ok: false, code: 'fit', reason: `Não cabe nesse dia: ${fit.reason.charAt(0).toLowerCase()}${fit.reason.slice(1)}` };
      next.start = earlier; trial.work = week.work.map(w => (w.uid === uid ? next : w));
    }
    return { ok: true, week: trial, work: next };
  }
  const unplace = (week, uid) => ({ work: week.work, plans: week.plans.filter(p => p.uid !== uid) });

  // Leva a semana para a outra escala. Para a 5×2, o dia de 4h some. Para a 6×1, ele volta,
  // de preferência no sábado de manhã, e o que estiver no caminho sai da semana.
  function carryOver(week, toRound, items) {
    const removed = [];
    let work = week.work.filter(w => workHoursOf(toRound, w.uid)).map(w => ({ ...w }));
    if (work.length < SCENARIOS[toRound].work.length) {
      const free = [5, 6, 0, 1, 2, 3, 4].filter(d => !work.some(w => w.day === d));
      const day = free[0];
      for (let i = work.length; i < SCENARIOS[toRound].work.length; i++) work = [...work, { uid: `w${i}`, day, start: 8, ...defaultSettings(SCENARIOS[toRound].work[i]) }];
    }
    const next = { work, plans: [] };
    for (const p of week.plans) {
      const r = check(toRound, next, items, p.uid, p.day, p.start);
      if (r.ok) next.plans.push({ ...p }); else removed.push(p);
    }
    return { week: next, removed };
  }

  function stats(round, week, items) {
    const s = SCENARIOS[round], ws = week.work.map(w => ({ w, h: workHoursOf(round, w.uid) }));
    const extra = ws.reduce((n, x) => n + x.w.extra, 0), lunch = ws.filter(x => x.w.lunch).length;
    const busy = ws.reduce((n, x) => n + workSpan(x.h, x.w), 0);
    const free = 7 * DAY_HOURS - busy;
    const placed = week.plans.filter(p => itemOf(items, p.uid));
    const planned = placed.reduce((n, p) => n + itemOf(items, p.uid).hours, 0);
    return { work: s.workHours + extra, extra, commute: s.commuteHours, lunch, sleep: 7 * 24 - 7 * DAY_HOURS, free, planned,
      count: placed.length, total: items.length, left: items.filter(it => !placed.some(p => p.uid === it.uid)).map(it => it.uid) };
  }

  // Quantos planos da lista cabem, no máximo, mexendo também no horário do trabalho.
  // O melhor é encostar cada dia de trabalho numa ponta do dia: sobra um trecho livre por dia.
  function maxPlans(round, items) {
    const s = SCENARIOS[round];
    const caps = s.work.map(h => DAY_HOURS - workSpan(h)).concat(Array(7 - s.work.length).fill(DAY_HOURS));
    const sizes = items.map(it => it.hours).sort((a, b) => b - a);
    let best = 0;
    const seen = new Set();
    (function search(i, caps, n) {
      if (best === sizes.length || n + sizes.length - i <= best) return;
      if (i === sizes.length) { best = n; return; }
      const key = `${i}|${n}|${[...caps].sort((a, b) => a - b).join(',')}`;
      if (seen.has(key)) return;
      seen.add(key);
      const tried = new Set();
      for (let k = 0; k < caps.length; k++) {
        if (caps[k] < sizes[i] || tried.has(caps[k])) continue;
        tried.add(caps[k]);
        const next = caps.slice(); next[k] -= sizes[i];
        search(i + 1, next, n + 1);
      }
      search(i + 1, caps, n);
    })(0, caps, 0);
    return best;
  }

  function validItem(it) {
    return it && typeof it.uid === 'string' && /^[a-z0-9-]{1,24}$/.test(it.uid) && !isWork(it.uid) && typeof it.name === 'string' &&
      it.name.length >= 1 && it.name.length <= 40 && typeof it.short === 'string' && it.short.length <= 16 && typeof it.emoji === 'string' &&
      it.emoji.length <= 8 && Number.isInteger(it.hours) && it.hours >= 1 && it.hours <= 8 && Number.isInteger(it.color) && it.color >= 0 && it.color < COLORS;
  }
  function validWeek(round, week, items) {
    if (week === null) return true;
    if (!week || !Array.isArray(week.work) || !Array.isArray(week.plans)) return false;
    const uids = SCENARIOS[round].work.map((_, i) => `w${i}`);
    if (week.work.length !== uids.length || !uids.every(u => week.work.some(w => w.uid === u))) return false;
    const built = { work: [], plans: [] };
    for (const w of week.work) {
      const h = workHoursOf(round, w.uid);
      if (!Number.isInteger(w.extra) || w.extra < 0 || w.extra > MAX_EXTRA || typeof w.lunch !== 'boolean' || !Number.isInteger(w.lunchAt)) return false;
      if (w.lunch ? (w.lunchAt < 1 || w.lunchAt > h + w.extra - 1) : w.lunchAt !== h + w.extra) return false;
      if (stretches(h, w).some(x => x > MAX_STRETCH)) return false;
      const entry = { uid: w.uid, day: w.day, start: w.start, extra: w.extra, lunch: w.lunch, lunchAt: w.lunchAt };
      const r = check(round, { work: [...built.work, entry], plans: [] }, items, w.uid, w.day, w.start);
      if (!r.ok) return false;
      built.work.push(entry);
    }
    for (const p of week.plans) {
      if (!itemOf(items, p.uid) || built.plans.some(q => q.uid === p.uid)) return false;
      const r = check(round, built, items, p.uid, p.day, p.start);
      if (!r.ok) return false;
      built.plans.push({ uid: p.uid, day: p.day, start: p.start });
    }
    return true;
  }
  // Todo mundo cai direto na 6×1 (rodada 0) e depois vai para a 5×2 (rodada 1). `clock` guarda os
  // segundos que restam na semana 6×1; `introSeen`, se a janela de "como jogar" já foi vista.
  function validateSave(data) {
    if (!data || data.version !== 6 || !['playing', 'gameover', 'results'].includes(data.mode)) return null;
    if (![0, 1].includes(data.round) || typeof data.introSeen !== 'boolean') return null;
    if ((data.mode === 'gameover' && data.round !== 0) || (data.mode === 'results' && data.round !== 1)) return null;
    if (typeof data.clock !== 'number' || !(data.clock >= 0 && data.clock <= CLOCK_SECONDS)) return null;
    if (!Array.isArray(data.items) || data.items.length > 40 || !data.items.every(validItem)) return null;
    if (new Set(data.items.map(it => it.uid)).size !== data.items.length) return null;
    if (!Array.isArray(data.weeks) || data.weeks.length !== 2 || !Number.isInteger(data.nextId)) return null;
    if (!data.weeks[0] || (data.round === 1 && !data.weeks[1])) return null;
    if (![0, 1].every(r => validWeek(r, data.weeks[r], data.items))) return null;
    return JSON.parse(JSON.stringify({ version: 6, mode: data.mode, round: data.round, clock: data.clock, introSeen: data.introSeen,
      items: data.items, weeks: data.weeks, nextId: data.nextId }));
  }

  // Linha de dias com as cores de cada semana: verde e amarelo na 6×1; vermelho e estrela na 5×2.
  const STRIP = [['🟩', '🟨'], ['🟥', '⭐']];
  const dayStrip = (round, week) => [0, 1, 2, 3, 4, 5, 6].map(d => STRIP[round][workDays(week).includes(d) ? 0 : 1]).join('');
  function leftOutSentence(round, week, items) {
    const left = items.filter(it => !week.plans.some(p => p.uid === it.uid));
    if (!left.length) return '';
    return `Com ${SCENARIOS[round].candidate}, ${left.length === 1 ? 'ficou' : 'ficaram'} de fora: ${joinList(left.map(it => it.name.toLowerCase()))}.`;
  }
  // `rounds`: as semanas jogadas, na ordem em que aparecem (Flávio antes de Lula).
  function shareText(weeks, items, rounds, url = SITE_URL) {
    const lines = ['FOLGA · Sua vida cabe na 6×1?', ''];
    for (const round of rounds) {
      const week = weeks[round];
      const fit = items.filter(it => week.plans.some(p => p.uid === it.uid)).map(it => it.emoji).join('');
      lines.push(`Com ${SCENARIOS[round].candidate} (${SCENARIOS[round].scale}) ${dayStrip(round, week)}`);
      lines.push(`coube ${stats(round, week, items).count} de ${items.length}${fit ? ` ${fit}` : ''}`, '');
    }
    const focus = rounds.includes(0) ? 0 : rounds[0];
    const out = leftOutSentence(focus, weeks[focus], items);
    if (out) lines.push(out);
    lines.push(`Monte a sua semana: ${url}`);
    return lines.join('\n');
  }

  return { DAYS, SHORT_DAYS, FIRST_HOUR, LAST_HOUR, DAY_HOURS, SITE_URL, CLOCK_SECONDS, COLORS, SCENARIOS, GROUPS, CATALOG, STARTER,
    MAX_EXTRA, MAX_STRETCH, CLT71, CLT59, catalogById, itemFromCatalog, starterItems, customItem, defaultSettings, workSpan,
    workSegments, stretches, editWork, defaultWork, newWeek, isWork, workHoursOf,
    overlaps, itemOf, spanOf, joinList, capitalize, label, blocks, workDays, offDays, check, options, allOptions, runStarts,
    freeRuns, resolveStart, whyNotHere, whyNoRoom, move, unplace, carryOver, stats, maxPlans, validateSave, dayStrip,
    leftOutSentence, shareText };
});
