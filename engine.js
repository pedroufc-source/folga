// FOLGA — regras puras: semanas, dias de trabalho, listas "pra sobreviver" e "pra viver", encaixes,
// diagnóstico do fim da semana, contas e texto de compartilhamento.
// Sem DOM. Exporta window.FolgaEngine no navegador e module.exports no Node (testes).
//
// O calendário vai das 6h às 23h (o sono, das 23h às 6h, fica fora). A escala só diz quantos dias de
// trabalho existem: seis na 6×1 (cinco de 8h e um de 4h) e cinco na 5×2. Cada dia de trabalho tem
// blocos próprios: transporte de ida (1h ou 2h), trabalho, almoço (1h ou 2h, móvel, ou nenhum) e
// transporte de volta (1h ou 2h). Hora extra até 2h (CLT art. 59); nenhum trecho de trabalho passa
// de 6h seguidas (CLT art. 71). Os planos têm instâncias: "Cozinhar e comer" aparece 7 vezes.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FolgaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const SHORT_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  // A semana do jogo é a do segundo turno: segunda 19 a domingo 25 de outubro de 2026.
  const DATES = [19, 20, 21, 22, 23, 24, 25], ELECTION_DAY = 6;
  const FIRST_HOUR = 6, LAST_HOUR = 23, DAY_HOURS = LAST_HOUR - FIRST_HOUR;
  const SITE_URL = 'https://pedroufc-source.github.io/folga/';
  const CLOCK_SECONDS = 180;
  const COLORS = 12;
  const REST_MIN = 4;

  // Rodada 0: a 6×1. Rodada 1: a 5×2.
  const SCENARIOS = [
    { scale: '6×1', workHours: 44, work: [8, 8, 8, 8, 8, 4] },
    { scale: '5×2', workHours: 40, work: [8, 8, 8, 8, 8] }
  ];

  // Pra sobreviver: não sai da lista. `times` é quantas vezes na semana.
  const SURVIVAL = [
    ['comida', 'Cozinhar e comer', 'Comida', '🍳', 1, 7],
    ['mercado', 'Mercado e feira', 'Mercado', '🛒', 2, 1],
    ['faxina', 'Faxina', 'Faxina', '🧹', 3, 1],
    ['roupa', 'Lavar e passar roupa', 'Roupa', '🧺', 2, 1],
    ['marmita', 'Marmitas da semana', 'Marmita', '🥡', 2, 1],
    ['contas', 'Resolver a vida (contas, banco, médico)', 'Contas', '🧾', 2, 1],
    ['nada', 'Fazer nada', 'Nada', '😴', 2, 2]
  ].map(([id, name, short, emoji, hours, times], i) => ({ id, name, short, emoji, hours, times, kind: 'survive', group: 'Pra sobreviver', color: [0, 10, 2, 7, 6, 11, 5][i] }));
  // Planos de todo dia: no máximo uma vez por dia.
  const isDaily = it => it.times === 7;

  // Pra viver: sugestões, sem moralismo. O jogador põe e tira o que quiser.
  const GROUPS = ['Família e fé', 'Rolê', 'Amor', 'Cuidar de si', 'Telas', 'Estudo e grana', 'Descanso'];
  const LIVING = [
    ['familia', 'Almoço em família', 'Família', '🍲', 5, 'Família e fé'],
    ['culto', 'Igreja ou culto', 'Culto', '🙏', 3, 'Família e fé'],
    ['criancas', 'Brincar com as crianças', 'Crianças', '🧒', 3, 'Família e fé'],
    ['vo', 'Visitar a vó', 'Vó', '👵', 3, 'Família e fé'],
    ['amigas', 'Encontro com as amigas', 'Amigas', '👯', 4, 'Rolê'],
    ['karaoke', 'Karaokê', 'Karaokê', '🎤', 4, 'Rolê'],
    ['churrasco', 'Churrasco', 'Churras', '🍖', 5, 'Rolê'],
    ['bar', 'Bar com os amigos', 'Bar', '🍻', 4, 'Rolê'],
    ['baile', 'Baile ou balada', 'Baile', '💃', 5, 'Rolê'],
    ['show', 'Show', 'Show', '🎶', 4, 'Rolê'],
    ['app', 'App de relacionamento', 'App', '📱', 2, 'Amor'],
    ['encontro', 'Encontro', 'Encontro', '💘', 4, 'Amor'],
    ['motel', 'Motel', 'Motel', '🏩', 3, 'Amor'],
    ['salao', 'Salão de beleza', 'Salão', '💇', 3, 'Cuidar de si'],
    ['unha', 'Fazer a unha', 'Unha', '💅', 2, 'Cuidar de si'],
    ['academia', 'Academia', 'Academia', '💪', 2, 'Cuidar de si'],
    ['futebol', 'Futebol', 'Futebol', '⚽', 3, 'Cuidar de si'],
    ['bet', 'Jogar na bet', 'Bet', '🎰', 2, 'Telas'],
    ['videogame', 'Videogame', 'Game', '🎮', 3, 'Telas'],
    ['serie', 'Maratonar série', 'Série', '📺', 4, 'Telas'],
    ['estudo', 'Estudar', 'Estudo', '📚', 4, 'Estudo e grana'],
    ['curso', 'Curso online', 'Curso', '💻', 2, 'Estudo e grana'],
    ['bico', 'Bico de entregas', 'Bico', '🛵', 4, 'Estudo e grana'],
    ['praia', 'Praia ou parque', 'Praia', '🌴', 6, 'Descanso'],
    ['cochilo', 'Dormir a tarde inteira', 'Soneca', '🛌', 4, 'Descanso']
  ].map(([id, name, short, emoji, hours, group], i) => ({ id, name, short, emoji, hours, times: 1, kind: 'live', group, color: i % COLORS }));
  const CATALOG = SURVIVAL.concat(LIVING);
  const STARTER_LIVE = ['familia', 'praia', 'churrasco', 'culto', 'amigas', 'karaoke', 'estudo', 'academia', 'app', 'salao', 'motel'];
  const catalogById = id => CATALOG.find(c => c.id === id);
  const itemFromCatalog = c => ({ uid: c.id, ref: c.id, name: c.name, short: c.short, emoji: c.emoji, hours: c.hours, times: c.times, kind: c.kind, color: c.color });
  const starterItems = () => SURVIVAL.map(itemFromCatalog).concat(STARTER_LIVE.map(id => itemFromCatalog(catalogById(id))));
  function customItem(name, hours, uid, color) {
    const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    const h = Math.round(Number(hours));
    if (!clean || !(h >= 1 && h <= 8)) return null;
    return { uid, ref: null, name: clean, short: clean.length > 9 ? `${clean.slice(0, 8).trimEnd()}…` : clean, emoji: '✨', hours: h, times: 1, kind: 'live', color };
  }

  // Instâncias: cada vez que um plano acontece na semana tem um id próprio, "comida.3".
  const iuid = (uid, k) => `${uid}.${k}`;
  const baseOf = id => id.split('.')[0];
  const instancesOf = items => items.flatMap(it => Array.from({ length: it.times }, (_, k) => ({ iuid: iuid(it.uid, k), item: it })));

  // ---------- Dia de trabalho ----------
  const MAX_EXTRA = 2, MAX_STRETCH = 6;
  const defaultSettings = hours => ({ extra: 0, lunch: hours > MAX_STRETCH, lunchAt: hours > MAX_STRETCH ? hours / 2 : hours, lunchLen: 1, tin: 1, tout: 1 });
  const workSpan = (hours, w = defaultSettings(hours)) => w.tin + hours + w.extra + (w.lunch ? w.lunchLen : 0) + w.tout;
  function workSegments(hours, w) {
    const total = hours + w.extra, parts = [];
    let t = w.start;
    const push = (len, kind) => { parts.push({ day: w.day, start: t, end: t + len, kind }); t += len; };
    push(w.tin, 'commute');
    if (w.lunch) { push(w.lunchAt, 'work'); push(w.lunchLen, 'lunch'); push(total - w.lunchAt, 'work'); }
    else push(total, 'work');
    push(w.tout, 'commute');
    parts[0].part = 'tin'; parts[parts.length - 1].part = 'tout';
    return parts;
  }
  const stretches = (hours, w) => (w.lunch ? [w.lunchAt, hours + w.extra - w.lunchAt] : [hours + w.extra]);
  // Padrão: segunda a sexta 7h–18h (ida 7h, trabalho 8h–12h e 13h–17h, volta 17h); sábado 7h–13h.
  const defaultWork = round => SCENARIOS[round].work.map((h, i) => ({ uid: `w${i}`, day: i, start: 7, ...defaultSettings(h) }));
  const newWeek = round => ({ work: defaultWork(round), plans: [] });
  const isWork = uid => /^w\d$/.test(uid);
  const workHoursOf = (round, uid) => SCENARIOS[round].work[Number(uid.slice(1))];

  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  const itemOf = (items, id) => items.find(it => it.uid === baseOf(id));
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
    if (start < FIRST_HOUR) return { ok: false, code: 'sleep', reason: 'Antes das 6h você está dormindo.' };
    if (start + span > LAST_HOUR) return { ok: false, code: 'sleep', reason: `Não cabe: são ${span}h e às 23h é hora de dormir.` };
    const item = { day, start, end: start + span };
    const it = isWork(uid) ? null : itemOf(items, uid);
    if (it && isDaily(it) && week.plans.some(p => p.uid !== uid && baseOf(p.uid) === it.uid && p.day === day)) {
      return { ok: false, code: 'daily', reason: `${it.short} é uma vez por dia: ${DAYS[day].toLowerCase()} já tem.` };
    }
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
    const at = check(round, week, items, uid, day, Math.min(Math.max(hour, FIRST_HOUR), LAST_HOUR - span));
    if (at.code === 'daily') return at.reason;
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
  const unplace = (week, uid) => ({ work: week.work, plans: week.plans.filter(p => p.uid !== uid) });
  const unplaceItem = (week, uid) => ({ work: week.work, plans: week.plans.filter(p => baseOf(p.uid) !== uid) });
  // Próxima instância ainda fora da semana: "comida.4".
  function nextInstance(week, item) {
    for (let k = 0; k < item.times; k++) if (!week.plans.some(p => p.uid === iuid(item.uid, k))) return iuid(item.uid, k);
    return null;
  }
  const placedCount = (week, item) => week.plans.filter(p => baseOf(p.uid) === item.uid).length;

  // Mexe num dia de trabalho. Mudanças: extra ±1, lunch on/off, lunchAt ±1, lunchLen 1|2, tin 1|2, tout 1|2.
  const CLT71 = 'Pela CLT, quem trabalha mais de 6 horas seguidas tem direito a pelo menos 1 hora de intervalo (art. 71).';
  const CLT59 = 'Pela CLT, a hora extra tem limite de 2 horas por dia (art. 59).';
  function editWork(round, week, items, uid, change) {
    const hours = workHoursOf(round, uid), cur = week.work.find(w => w.uid === uid);
    if (!hours || !cur) return { ok: false, code: 'invalid', reason: 'Escolha um dia de trabalho.' };
    const next = { ...cur };
    if (change.extra) next.extra = cur.extra + change.extra;
    if (change.lunch !== undefined) { next.lunch = change.lunch; next.lunchAt = change.lunch ? Math.min(Math.ceil((hours + next.extra) / 2), MAX_STRETCH) : hours + next.extra; }
    if (change.lunchAt) next.lunchAt = cur.lunchAt + change.lunchAt;
    if (change.lunchLen) next.lunchLen = change.lunchLen;
    if (change.tin) next.tin = change.tin;
    if (change.tout) next.tout = change.tout;
    if (!next.lunch) next.lunchAt = hours + next.extra;
    if (next.extra < 0) return { ok: false, code: 'contract', reason: `Seu contrato é de ${hours}h nesse dia. Menos que isso, só mudando a lei.` };
    if (next.extra > MAX_EXTRA) return { ok: false, code: 'clt59', reason: CLT59 };
    if (![1, 2].includes(next.lunchLen) || ![1, 2].includes(next.tin) || ![1, 2].includes(next.tout)) return { ok: false, code: 'range', reason: 'Transporte e almoço vão de 1h a 2h.' };
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
  // O mesmo transporte em todos os dias de trabalho.
  function editAllTransport(round, week, items, tin, tout) {
    let cur = week;
    for (const w of week.work) {
      const r = editWork(round, cur, items, w.uid, { tin, tout });
      if (!r.ok) return { ok: false, code: r.code, reason: `${DAYS[w.day]}: ${r.reason}` };
      cur = r.week;
    }
    return { ok: true, week: cur };
  }

  // Leva a semana para a outra escala. Para a 5×2, o dia de 4h some. Para a 6×1, ele volta,
  // de preferência no sábado de manhã, e o que estiver no caminho sai da semana.
  function carryOver(week, toRound, items) {
    const removed = [];
    let work = week.work.filter(w => workHoursOf(toRound, w.uid)).map(w => ({ ...w }));
    if (work.length < SCENARIOS[toRound].work.length) {
      const free = [5, 6, 0, 1, 2, 3, 4].filter(d => !work.some(w => w.day === d));
      for (let i = work.length; i < SCENARIOS[toRound].work.length; i++) work = [...work, { uid: `w${i}`, day: free[0], start: 7, ...defaultSettings(SCENARIOS[toRound].work[i]) }];
    }
    const next = { work, plans: [] };
    for (const p of week.plans) {
      const r = check(toRound, next, items, p.uid, p.day, p.start);
      if (r.ok) next.plans.push({ ...p }); else removed.push(p);
    }
    return { week: next, removed };
  }

  // ---------- Contas e diagnóstico ----------
  function stats(round, week, items) {
    const ws = week.work.map(w => ({ w, h: workHoursOf(round, w.uid) }));
    const extra = ws.reduce((n, x) => n + x.w.extra, 0), lunch = ws.reduce((n, x) => n + (x.w.lunch ? x.w.lunchLen : 0), 0);
    const commute = ws.reduce((n, x) => n + x.w.tin + x.w.tout, 0);
    const busy = ws.reduce((n, x) => n + workSpan(x.h, x.w), 0);
    const free = 7 * DAY_HOURS - busy;
    const placed = week.plans.filter(p => itemOf(items, p.uid));
    const planned = placed.reduce((n, p) => n + itemOf(items, p.uid).hours, 0);
    const survive = items.filter(it => it.kind === 'survive'), live = items.filter(it => it.kind === 'live');
    const missing = survive.map(it => ({ item: it, placed: placedCount(week, it), times: it.times })).filter(x => x.placed < x.times);
    const restItem = items.find(it => it.uid === 'nada');
    const rest = restItem ? placedCount(week, restItem) * restItem.hours : 0;
    const liveDone = live.filter(it => placedCount(week, it) >= it.times);
    return { work: SCENARIOS[round].workHours + extra, extra, commute, lunch, sleep: 7 * (24 - DAY_HOURS), free, planned,
      unplanned: free - planned, survivalDone: missing.length === 0, missing, rest, restOk: rest >= REST_MIN,
      liveCount: liveDone.length, liveTotal: live.length, liveLeft: live.filter(it => !liveDone.includes(it)).map(it => it.uid) };
  }
  // Por que a semana acabou mal (ou não). Ordem: sobreviver, descansar, viver.
  function verdict(round, week, items) {
    const s = stats(round, week, items);
    if (s.missing.some(x => x.item.uid !== 'nada')) return { code: 'survival', stats: s };
    if (!s.restOk) return { code: 'rest', stats: s };
    if (s.liveLeft.length) return { code: 'live', stats: s };
    return { code: 'all', stats: s };
  }

  // Quanto da lista cabe, no máximo, mexendo também no horário do trabalho (transporte de 1h e almoço de
  // 1h). Tudo "pra sobreviver" entra primeiro; depois, o máximo de planos "pra viver".
  // O melhor é encostar cada dia de trabalho numa ponta do dia: sobra um trecho livre por dia.
  function maxPlans(round, items) {
    const s = SCENARIOS[round];
    let caps = s.work.map(h => DAY_HOURS - workSpan(h)).concat(Array(7 - s.work.length).fill(DAY_HOURS));
    // Os planos de todo dia ocupam um pedaço de cada dia.
    for (const it of items.filter(isDaily)) caps = caps.map(c => c - it.hours);
    if (caps.some(c => c < 0)) return -1;
    const must = instancesOf(items.filter(it => it.kind === 'survive' && !isDaily(it))).map(x => x.item.hours).sort((a, b) => b - a);
    const may = items.filter(it => it.kind === 'live').map(it => it.hours).sort((a, b) => b - a);
    const seq = must.map(h => ({ h, must: true })).concat(may.map(h => ({ h, must: false })));
    let best = -1;
    const seen = new Set();
    (function search(i, caps, n) {
      const rest = seq.length - i;
      if (best === may.length) return;
      if (i >= must.length && n + rest <= best) return;
      if (i === seq.length) { best = Math.max(best, n); return; }
      const key = `${i}|${n}|${[...caps].sort((a, b) => a - b).join(',')}`;
      if (seen.has(key)) return;
      seen.add(key);
      const tried = new Set();
      for (let k = 0; k < caps.length; k++) {
        if (caps[k] < seq[i].h || tried.has(caps[k])) continue;
        tried.add(caps[k]);
        const next = caps.slice(); next[k] -= seq[i].h;
        search(i + 1, next, n + (seq[i].must ? 0 : 1));
      }
      if (!seq[i].must) search(i + 1, caps, n);
    })(0, caps, 0);
    return best;
  }

  // ---------- Salvamento ----------
  function validItem(it) {
    return it && typeof it.uid === 'string' && /^[a-z0-9-]{1,24}$/.test(it.uid) && !isWork(it.uid) && typeof it.name === 'string' &&
      it.name.length >= 1 && it.name.length <= 48 && typeof it.short === 'string' && it.short.length <= 16 && typeof it.emoji === 'string' &&
      it.emoji.length <= 8 && Number.isInteger(it.hours) && it.hours >= 1 && it.hours <= 8 && Number.isInteger(it.times) && it.times >= 1 &&
      it.times <= 7 && ['survive', 'live'].includes(it.kind) && Number.isInteger(it.color) && it.color >= 0 && it.color < COLORS;
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
      if (![1, 2].includes(w.lunchLen) || ![1, 2].includes(w.tin) || ![1, 2].includes(w.tout)) return false;
      if (w.lunch ? (w.lunchAt < 1 || w.lunchAt > h + w.extra - 1) : w.lunchAt !== h + w.extra) return false;
      if (stretches(h, w).some(x => x > MAX_STRETCH)) return false;
      const entry = { uid: w.uid, day: w.day, start: w.start, extra: w.extra, lunch: w.lunch, lunchAt: w.lunchAt, lunchLen: w.lunchLen, tin: w.tin, tout: w.tout };
      if (!check(round, { work: [...built.work, entry], plans: [] }, items, w.uid, w.day, w.start).ok) return false;
      built.work.push(entry);
    }
    const valid = new Set(instancesOf(items).map(x => x.iuid));
    for (const p of week.plans) {
      if (!valid.has(p.uid) || built.plans.some(q => q.uid === p.uid)) return false;
      if (!check(round, built, items, p.uid, p.day, p.start).ok) return false;
      built.plans.push({ uid: p.uid, day: p.day, start: p.start });
    }
    return true;
  }
  // Todo mundo cai direto na 6×1 (rodada 0) e depois pode ir para a 5×2 (rodada 1).
  function validateSave(data) {
    if (!data || data.version !== 7 || !['playing', 'gameover', 'results'].includes(data.mode)) return null;
    if (![0, 1].includes(data.round) || typeof data.introSeen !== 'boolean') return null;
    if ((data.mode === 'gameover' && data.round !== 0) || (data.mode === 'results' && data.round !== 1)) return null;
    if (typeof data.clock !== 'number' || !(data.clock >= 0 && data.clock <= CLOCK_SECONDS)) return null;
    if (!Array.isArray(data.items) || data.items.length > 50 || !data.items.every(validItem)) return null;
    if (new Set(data.items.map(it => it.uid)).size !== data.items.length) return null;
    if (!SURVIVAL.every(s => data.items.some(it => it.uid === s.id && it.kind === 'survive' && it.times === s.times && it.hours === s.hours))) return null;
    if (!Array.isArray(data.weeks) || data.weeks.length !== 2 || !Number.isInteger(data.nextId)) return null;
    if (!data.weeks[0] || (data.round === 1 && !data.weeks[1])) return null;
    if (![0, 1].every(r => validWeek(r, data.weeks[r], data.items))) return null;
    return JSON.parse(JSON.stringify({ version: 7, mode: data.mode, round: data.round, clock: data.clock, introSeen: data.introSeen,
      items: data.items, weeks: data.weeks, nextId: data.nextId }));
  }

  // ---------- Compartilhar ----------
  // Linha de dias com as cores de cada semana: verde e amarelo na 6×1; vermelho e estrela na 5×2.
  const STRIP = [['🟩', '🟨'], ['🟥', '⭐']];
  const dayStrip = (round, week) => [0, 1, 2, 3, 4, 5, 6].map(d => STRIP[round][workDays(week).includes(d) ? 0 : 1]).join('');
  function weekLine(round, week, items) {
    const v = verdict(round, week, items), s = v.stats;
    const head = v.code === 'survival' ? 'não deu pra sobreviver' : v.code === 'rest' ? `sobrevivi, mas descansei ${s.rest}h` : `sobrevivi e vivi ${s.liveCount} de ${s.liveTotal}`;
    return `${SCENARIOS[round].scale} ${dayStrip(round, week)}\n${head}`;
  }
  function shareText(weeks, items, rounds, url = SITE_URL) {
    const lines = ['FOLGA · Sua vida cabe na 6×1?', ''];
    for (const round of rounds) lines.push(weekLine(round, weeks[round], items), '');
    lines.push(`Monte a sua semana: ${url}`);
    return lines.join('\n');
  }

  return { isDaily, DAYS, SHORT_DAYS, DATES, ELECTION_DAY, FIRST_HOUR, LAST_HOUR, DAY_HOURS, SITE_URL, CLOCK_SECONDS, COLORS, REST_MIN,
    SCENARIOS, SURVIVAL, LIVING, GROUPS, CATALOG, STARTER_LIVE, MAX_EXTRA, MAX_STRETCH, CLT71, CLT59,
    catalogById, itemFromCatalog, starterItems, customItem, iuid, baseOf, instancesOf, defaultSettings, workSpan, workSegments,
    stretches, editWork, editAllTransport, defaultWork, newWeek, isWork, workHoursOf, overlaps, itemOf, spanOf, joinList,
    capitalize, label, blocks, workDays, offDays, check, options, allOptions, runStarts, freeRuns, resolveStart, whyNotHere,
    whyNoRoom, move, unplace, unplaceItem, nextInstance, placedCount, carryOver, stats, verdict, maxPlans, validateSave,
    dayStrip, weekLine, shareText };
});
