// FOLGA — interface: telas, calendário em canvas, bandeja de planos, salvamento,
// resultado e compartilhamento (imagem para Stories/WhatsApp, link do WhatsApp e texto).
(() => {
  'use strict';
  const E = window.FolgaEngine;
  const $ = id => document.getElementById(id);
  const KEY = 'folga-game-v2';
  const FIRST = E.FIRST_HOUR, LAST = E.LAST_HOUR, ROWS = LAST - FIRST;
  const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif";
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fresh = () => ({ version: 2, mode: 'intro', round: 0, weeks: [[], []], events: [false, false] });

  let state = fresh(), storageOK = true, resumeMode = null;
  let selected = null, history = [], statusText = '', statusTone = '';
  let pointer = null, hover = null, pop = null, geo = null, suppressClick = false, eventAfter = null;
  const share = { ready: null, file: null, url: '', text: '' };

  try {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* Save inválido: começa do zero. */ }
    state = E.validateSave(saved) || fresh();
  } catch { storageOK = false; }
  if (state.mode !== 'intro') { resumeMode = state.mode; state.mode = 'intro'; }

  const board = $('board');
  const placements = () => state.weeks[state.round];
  const activeEvent = () => state.events[state.round];
  const range = (a, b) => `${a}h–${b}h`;
  const isWide = () => window.matchMedia('(min-width: 820px)').matches;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, mode: resumeMode || state.mode })); }
    catch { storageOK = false; }
  }

  // Cores: só tokens do CSS.
  let T = null;
  function theme() {
    if (T) return T;
    const cs = getComputedStyle(document.documentElement);
    const v = name => cs.getPropertyValue(`--${name}`).trim();
    const week = r => ({ main: v(`r${r}-main`), deep: v(`r${r}-deep`), on: v(`r${r}-on`), soft: v(`r${r}-soft`), head: v(`r${r}-head`), headInk: v(`r${r}-head-ink`) });
    T = { paper: v('paper'), card: v('card'), ink: v('ink'), muted: v('muted'), line: v('line'), board: v('board'), grid: v('grid'),
      hourInk: v('hour-ink'), dayInk: v('day-ink'), work: v('work'), workInk: v('work-ink'), workHatch: v('work-hatch'),
      commute: v('commute'), routine: v('routine'), routineInk: v('routine-ink'), event: v('event'), slot: v('slot'),
      slotFill: v('slot-fill'), bad: v('bad'), badFill: v('bad-fill'), planInk: v('plan-ink'), shadow: v('shadow'),
      yellow: v('r0-yellow'), navy: v('r0-navy'), week: [week(0), week(1)],
      plan: Object.fromEntries(E.TASKS.map(t => [t.id, v(`plan-${t.id}`)])) };
    return T;
  }

  // ---------- Desenho de uma semana (tabuleiro, miniaturas e imagem de compartilhamento) ----------
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function emojiAt(g, text, x, y, size) {
    if (size < 7) return;
    g.font = `${Math.round(size)}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x, y + size * .06);
  }
  function paintWeek(g, W, H, round, list, eventActive, o = {}) {
    const C = theme(), wk = C.week[round], s = o.scale || 1;
    const gx = o.hours ? (o.gutter || 24) : 0, gy = o.headerH || 18;
    const cw = (W - gx) / 7, rh = (H - gy) / ROWS;
    const inset = Math.max(1, Math.min(2.2 * s, cw * .05)), rad = Math.min(5 * s, cw / 6);
    const off = E.offDays(round);
    const box = b => ({ x: gx + b.day * cw + inset, y: gy + (b.start - FIRST) * rh + inset, w: cw - 2 * inset, h: (b.end - b.start) * rh - 2 * inset });
    g.save();
    g.fillStyle = C.board; g.fillRect(0, 0, W, H);
    for (const d of off) { g.fillStyle = wk.soft; g.fillRect(gx + d * cw, gy, cw, ROWS * rh); }
    g.strokeStyle = C.grid; g.lineWidth = Math.max(1, s * .8);
    for (let h = 0; h <= ROWS; h++) { const y = Math.round(gy + h * rh) + .5; g.beginPath(); g.moveTo(gx, y); g.lineTo(W, y); g.stroke(); }
    if (o.hours) {
      g.fillStyle = C.hourInk; g.font = `${Math.round(9.5 * s)}px ${SANS}`; g.textAlign = 'right'; g.textBaseline = 'middle';
      const every = rh >= 14 * s ? 1 : 2;
      for (let h = 0; h < ROWS; h += every) g.fillText(`${FIRST + h}h`, gx - 4 * s, gy + (h + .5) * rh);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let d = 0; d < 7; d++) {
      const x = gx + d * cw, label = o.letters ? E.SHORT_DAYS[d][0] : E.SHORT_DAYS[d];
      if (off.includes(d)) { g.fillStyle = wk.head; rr(g, x + inset, inset, cw - 2 * inset, gy - 2 * inset, rad); g.fill(); g.fillStyle = wk.headInk; }
      else g.fillStyle = C.dayInk;
      g.font = `800 ${Math.round((o.dayFont || 9.5) * s)}px ${SANS}`;
      g.fillText(label, x + cw / 2, gy / 2 + .5);
    }
    for (const b of E.fixedBlocks(round, eventActive)) {
      const r = box(b);
      g.fillStyle = { work: C.work, commute: C.commute, routine: C.routine, event: C.event }[b.kind];
      rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
      if (b.kind === 'work') {
        g.save(); rr(g, r.x, r.y, r.w, r.h, rad); g.clip(); g.strokeStyle = C.workHatch; g.lineWidth = s;
        for (let k = -r.h; k < r.w; k += 7 * s) { g.beginPath(); g.moveTo(r.x + k, r.y + r.h); g.lineTo(r.x + k + r.h, r.y); g.stroke(); }
        g.restore();
        if (o.labels && r.h > 18 * s) {
          g.fillStyle = C.workInk; g.font = `600 ${Math.round(10 * s)}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          if (g.measureText(b.label).width < r.w - 4) g.fillText(b.label, r.x + r.w / 2, r.y + r.h / 2);
        }
      } else if (b.kind === 'commute' || b.kind === 'event') {
        emojiAt(g, b.kind === 'event' ? '⏳' : '🚌', r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .72, r.w * .5, 15 * s));
      } else if (o.labels && r.h > 12 * s) {
        g.fillStyle = C.routineInk; g.font = `600 ${Math.round(9.5 * s)}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (g.measureText(b.label).width < r.w - 4) g.fillText(b.label, r.x + r.w / 2, r.y + r.h / 2);
      }
    }
    for (const p of list) {
      const r = box(p), t = E.taskById(p.id);
      const k = o.pop && o.pop.id === p.id ? o.pop.k : 1;
      g.save();
      g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(k, k); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      g.fillStyle = C.plan[p.id]; rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
      if (o.selected === p.id) { g.lineWidth = 2.5 * s; g.strokeStyle = C.ink; g.stroke(); }
      const es = Math.min(r.h * .55, r.w * .6, (o.emoji || 20) * s);
      const named = o.labels && r.h >= es + 18 * s && r.w >= 44 * s;
      emojiAt(g, t.emoji, r.x + r.w / 2, r.y + r.h / 2 - (named ? 7 * s : 0), es);
      if (named) {
        g.fillStyle = C.planInk; g.font = `800 ${Math.round(10.5 * s)}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(t.short, r.x + r.w / 2, r.y + r.h / 2 + es / 2 + 3 * s);
      }
      g.restore();
    }
    if (o.region) {
      for (const seg of o.region) {
        const r = box(seg);
        g.fillStyle = C.slotFill; rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
        g.setLineDash([4 * s, 3 * s]); g.strokeStyle = C.slot; g.lineWidth = 1.6 * s; g.stroke(); g.setLineDash([]);
      }
    }
    if (o.preview) {
      const r = box(o.preview), t = E.taskById(o.preview.id);
      g.globalAlpha = .9; g.fillStyle = o.preview.ok ? C.plan[t.id] : C.badFill; rr(g, r.x, r.y, r.w, r.h, rad); g.fill(); g.globalAlpha = 1;
      g.setLineDash([5 * s, 3 * s]); g.lineWidth = 2 * s; g.strokeStyle = o.preview.ok ? C.ink : C.bad; g.stroke(); g.setLineDash([]);
      emojiAt(g, t.emoji, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .55, r.w * .6, 20 * s));
    }
    g.restore();
    return { gx, gy, cw, rh };
  }
  function fitCanvas(c) {
    const rect = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, W: rect.width, H: rect.height };
  }

  // ---------- Tabuleiro ----------
  function regionFor(id) {
    const t = E.taskById(id), segs = [];
    for (let d = 0; d < 7; d++) {
      let cur = null;
      for (const s of E.options(state.round, placements(), activeEvent(), id, d)) {
        if (cur && s <= cur.end) cur.end = Math.max(cur.end, s + t.hours);
        else { cur = { day: d, start: s, end: s + t.hours }; segs.push(cur); }
      }
    }
    return segs;
  }
  function centeredStart(id, hour) {
    const t = E.taskById(id);
    return Math.min(Math.max(Math.round(hour + .5 - t.hours / 2), FIRST), LAST - t.hours);
  }
  function previewFor(id, pt) {
    const t = E.taskById(id), s = E.resolveStart(state.round, placements(), activeEvent(), id, pt.day, pt.hour);
    if (s !== null) return { id, day: pt.day, start: s, end: s + t.hours, ok: true };
    const start = centeredStart(id, pt.hour);
    return { id, day: pt.day, start, end: start + t.hours, ok: false };
  }
  function drawBoard() {
    if (state.mode !== 'playing') return;
    const { g, W, H } = fitCanvas(board);
    if (W < 20 || H < 20) return;
    const big = W >= 520;
    const dragId = pointer && pointer.moved ? pointer.id : null, focusId = dragId || selected;
    let popK = null;
    if (pop) {
      const p = Math.min(1, (performance.now() - pop.t0) / 240);
      popK = { id: pop.id, k: .72 + .28 * (1 - Math.pow(1 - p, 3)) + Math.sin(p * Math.PI) * .08 };
    }
    geo = paintWeek(g, W, H, state.round, placements(), activeEvent(), {
      hours: true, gutter: big ? 36 : 24, headerH: big ? 28 : 18, labels: big, scale: big ? 1.1 : 1, emoji: big ? 22 : 18,
      dayFont: big ? 10 : 9.5, selected, region: focusId ? regionFor(focusId) : null,
      preview: focusId && hover ? previewFor(focusId, hover) : null, pop: popK });
  }
  function animatePop() {
    drawBoard();
    if (pop && performance.now() - pop.t0 < 240) requestAnimationFrame(animatePop);
    else { pop = null; drawBoard(); }
  }
  function boardPoint(clientX, clientY) {
    if (!geo) return null;
    const rect = board.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    const day = Math.floor((x - geo.gx) / geo.cw), hour = FIRST + Math.floor((y - geo.gy) / geo.rh);
    if (x > rect.width || day < 0 || day > 6 || hour < FIRST || hour >= LAST) return null;
    return { day, hour };
  }
  const planAt = pt => placements().find(p => p.day === pt.day && pt.hour >= p.start && pt.hour < p.end);
  const fixedAt = pt => E.fixedBlocks(state.round, activeEvent()).find(b => b.day === pt.day && pt.hour >= b.start && pt.hour < b.end);

  // ---------- Ações ----------
  function say(text, tone = '', animate = true) {
    statusText = text; statusTone = tone;
    const el = $('status');
    el.textContent = text;
    el.className = `status${tone ? ` ${tone}` : ''}`;
    if (animate && tone === 'error' && !reduceMotion) { void el.offsetWidth; el.classList.add('shake'); }
  }
  function select(id, fromKeyboard = false) {
    selected = id;
    const t = E.taskById(id), why = E.whyNoRoom(state.round, placements(), activeEvent(), id);
    if (why) say(why, 'error');
    else say(placements().some(p => p.id === id) ? `Para mover, toque em outro espaço verde. ${E.capitalize(E.windowText(t))}.` : `${E.capitalize(E.windowText(t))}. ${t.extra}`);
    renderGame();
    if (fromKeyboard) { const p = $('picker'); (p.querySelector('.slot') || p.querySelector('.remove-button') || p.querySelector('.picker-close'))?.focus(); }
  }
  function deselect(message = 'Escolha outro plano quando quiser.') {
    const id = selected; selected = null; say(message); renderGame();
    return id;
  }
  function remember() { history.push(placements().map(p => ({ ...p }))); if (history.length > 40) history.shift(); }
  function place(id, day, start) {
    const result = E.put(state.round, placements(), activeEvent(), id, day, start);
    if (!result.ok) { say(result.reason, 'error'); drawBoard(); return false; }
    remember();
    state.weeks[state.round] = result.placements;
    selected = null; hover = null;
    const t = E.taskById(id), n = placements().length;
    say(`${t.emoji} ${t.name}: ${E.DAYS[day].toLowerCase()}, ${range(start, start + t.hours)}.${n === 8 ? ' Coube tudo!' : ''}`, 'good');
    save(); renderGame();
    const score = $('score'); score.classList.remove('bump'); void score.offsetWidth; score.classList.add('bump');
    if (!reduceMotion) { pop = { id, t0: performance.now() }; requestAnimationFrame(animatePop); }
    if (state.round === 0 && !activeEvent() && n >= 3) activateEvent();
    return true;
  }
  function removePlan(id) {
    if (!placements().some(p => p.id === id)) return;
    remember();
    state.weeks[state.round] = placements().filter(p => p.id !== id);
    selected = null;
    const t = E.taskById(id);
    say(`${t.emoji} ${t.name} saiu da semana.`); save(); renderGame();
    document.querySelector(`[data-task="${id}"]`)?.focus({ preventScroll: true });
  }
  function undo() {
    if (!history.length) return;
    state.weeks[state.round] = history.pop(); selected = null;
    say('Desfeito.'); save(); renderGame();
  }
  function explainMiss(id, pt) {
    const check = E.checkPlacement(state.round, placements(), activeEvent(), id, pt.day, centeredStart(id, pt.hour));
    say(check.ok ? 'Solte dentro da área verde.' : check.reason, 'error'); drawBoard();
  }
  function tapBoard(pt) {
    if (!pt) return;
    const plan = planAt(pt);
    if (selected) {
      const start = E.resolveStart(state.round, placements(), activeEvent(), selected, pt.day, pt.hour);
      if (start !== null && !(plan && plan.id === selected && plan.start === start)) { place(selected, pt.day, start); return; }
      if (plan && plan.id !== selected) { select(plan.id); return; }
      if (plan) { deselect('Plano no mesmo lugar.'); return; }
      explainMiss(selected, pt); return;
    }
    if (plan) { select(plan.id); return; }
    const fixed = fixedAt(pt);
    say(fixed ? `${fixed.reason} Escolha um plano e toque num espaço livre.` : 'Escolha um plano e toque num espaço livre.');
  }
  function drop(id, pt) {
    hover = null;
    if (!pt) { say('Solte o plano dentro do calendário.', 'error'); renderGame(); return; }
    const start = E.resolveStart(state.round, placements(), activeEvent(), id, pt.day, pt.hour);
    if (start !== null) place(id, pt.day, start);
    else { selected = id; renderGame(); explainMiss(id, pt); }
  }

  function activateEvent(after = null) {
    if (activeEvent()) return false;
    const result = E.applyEvent(placements());
    state.events[state.round] = true;
    state.weeks[state.round] = result.placements;
    // Estados anteriores podem colidir com o atraso: o desfazer recomeça.
    history = []; eventAfter = after; selected = null;
    $('event-impact').textContent = result.removed.length
      ? `${result.removed.map(p => `${E.taskById(p.id).emoji} ${E.taskById(p.id).name}`).join(' e ')} perdeu o horário e voltou para a lista.`
      : 'Seus planos continuam no lugar. Só sobrou menos tempo na quarta.';
    save(); renderGame(); openDialog('event-dialog');
    return true;
  }
  function askFinish() {
    if (state.round === 0 && !activeEvent()) { activateEvent('finish'); return; }
    const n = placements().length;
    if (n === 8) { finish(); return; }
    const left = E.TASKS.filter(t => !placements().some(p => p.id === t.id)).map(t => `${t.emoji} ${t.name}`);
    $('finish-detail').textContent = `Coube ${n} de 8. Fica de fora: ${E.joinList(left)}.`;
    openDialog('finish-dialog');
  }
  function finish() {
    closeDialog($('finish-dialog'));
    state.mode = state.round ? 'results' : 'intermission';
    selected = null; history = []; save(); render(); focusHeading();
  }
  function nextWeek() {
    state.round = 1;
    state.weeks[1] = E.carryOver(state.weeks[0]);
    state.events[1] = true;
    state.mode = 'playing'; selected = null; history = [];
    say('O sábado agora é livre. Encaixe o que ficou de fora; dá para mover o que já está na semana.');
    save(); render(); focusHeading();
  }
  function start() {
    if (resumeMode) { state.mode = resumeMode; resumeMode = null; }
    else state.mode = 'playing';
    if (state.mode === 'playing' && !statusText) say(firstHint());
    save(); render(); focusHeading();
    if (!storageOK && state.mode === 'playing') say('Seu navegador não deixou salvar. Dá para jogar normalmente com a página aberta.');
  }
  const firstHint = () => (isWide()
    ? 'Escolha um plano ao lado (ou arraste) e solte num espaço verde.'
    : 'Toque num plano aqui embaixo. Os espaços verdes mostram onde ele cabe.');
  function restart() {
    closeDialog($('restart-dialog'));
    state = fresh(); state.mode = 'playing'; resumeMode = null; selected = null; history = [];
    say(firstHint()); save(); render(); focusHeading();
  }
  function goHome() {
    if (state.mode === 'intro') return;
    closeAllDialogs(); resumeMode = state.mode; state.mode = 'intro'; selected = null; render(); focusHeading();
  }

  // ---------- Telas ----------
  function render() {
    const screen = state.mode === 'playing' ? 'game' : state.mode;
    document.body.dataset.screen = screen;
    document.body.dataset.round = String(state.mode === 'intermission' ? 0 : state.round);
    for (const id of ['intro', 'game', 'intermission', 'results']) $(id).hidden = id !== screen;
    if (screen === 'intro') {
      $('start-button').innerHTML = resumeMode ? 'Continuar minha semana <span aria-hidden="true">→</span>' : 'Montar minha semana <span aria-hidden="true">→</span>';
      $('fresh-button').hidden = !resumeMode;
    } else if (screen === 'game') renderGame();
    else if (screen === 'intermission') renderIntermission();
    else renderResults();
  }
  function renderGame() {
    const sc = E.SCENARIOS[state.round], n = placements().length;
    document.body.dataset.round = String(state.round);
    $('week-scale').textContent = sc.scale;
    $('week-step').textContent = `Semana ${state.round + 1} de 2`;
    $('band-icon-use').setAttribute('href', state.round ? '#star' : '#sun');
    $('week-sub').textContent = `${sc.workHours}h de trabalho · ${state.round ? '2 folgas' : '1 folga'}`;
    $('score').textContent = String(n);
    $('undo-button').disabled = history.length === 0;
    $('tray').innerHTML = E.TASKS.map(t => {
      const p = placements().find(item => item.id === t.id);
      const where = p ? `${E.DAYS[p.day]}, ${range(p.start, p.end)}` : 'fora da semana';
      const windowShort = `${t.days.length === 7 ? 'Qualquer dia' : t.days.map(d => E.SHORT_DAYS[d]).join('/')} · ${range(t.from, t.to)}`;
      return `<button class="chip${p ? ' placed' : ''}" data-task="${t.id}" style="--c: var(--plan-${t.id})" aria-pressed="${selected === t.id}" aria-label="${t.name}, ${t.hours} horas, ${where}">` +
        `<span class="emoji" aria-hidden="true">${t.emoji}</span><span class="name short">${t.short}</span><span class="name full">${t.name}</span>` +
        `<span class="window">${windowShort}</span><span class="meta">${p ? `<span class="tick">✓ </span>${E.SHORT_DAYS[p.day]}<span class="hour"> ${p.start}h</span>` : `${t.hours}h`}</span></button>`;
    }).join('');
    renderPicker(); renderAccessible();
    say(statusText || firstHint(), statusTone, false);
    drawBoard();
  }
  function renderPicker() {
    const picker = $('picker');
    $('dock').dataset.mode = selected ? 'pick' : 'tray';
    picker.hidden = !selected;
    if (!selected) { picker.innerHTML = ''; return; }
    const t = E.taskById(selected), current = placements().find(p => p.id === selected);
    const slots = E.allOptions(state.round, placements(), activeEvent(), selected);
    const why = E.whyNoRoom(state.round, placements(), activeEvent(), selected);
    picker.style.setProperty('--c', `var(--plan-${t.id})`);
    picker.innerHTML = `<div class="picker-head"><span class="emoji" aria-hidden="true">${t.emoji}</span><b>${t.name}</b><span class="plan-hours">${t.hours}h</span><span class="spacer"></span>` +
      `<button class="picker-close" data-close-picker aria-label="Fechar ${t.name}">×</button></div>` +
      `<div class="slots" role="group" aria-label="Horários livres para ${t.name}">` +
      (current ? `<button class="remove-button" data-remove="${t.id}">Tirar da semana</button>` : '') +
      (slots.length ? slots.map(o => `<button class="slot${current && current.day === o.day && current.start === o.start ? ' current' : ''}" data-day="${o.day}" data-start="${o.start}" aria-label="${E.DAYS[o.day]}, das ${o.start} às ${o.start + t.hours} horas">${E.SHORT_DAYS[o.day]} ${range(o.start, o.start + t.hours)}</button>`).join('')
        : `<p class="no-room">${why && why.startsWith('Sem espaço') ? 'Libere espaço: toque no plano que ocupa o horário.' : state.round ? 'Sem horário possível nesta semana.' : 'Sem horário possível na 6×1. Na 5×2, ele ganha outra chance.'}</p>`) +
      '</div>';
  }
  function renderAccessible() {
    const blocks = E.fixedBlocks(state.round, activeEvent()).concat(placements().map(p => ({ ...p, label: `${E.taskById(p.id).name} (plano)` })));
    $('accessible-board').innerHTML = `<h2>Agenda da semana ${E.SCENARIOS[state.round].scale}</h2>` + E.DAYS.map((name, d) =>
      `<p>${name}: ${blocks.filter(b => b.day === d).sort((a, b) => a.start - b.start).map(b => `${range(b.start, b.end)} ${b.label.toLowerCase()}`).join('; ')}; 23h–7h sono.</p>`).join('');
    board.setAttribute('aria-label', `Calendário da semana ${E.SCENARIOS[state.round].scale}: ${placements().length} de 8 planos encaixados. A agenda em texto vem logo depois.`);
  }
  function drawThumb(id, round) {
    const c = $(id); if (!c || !c.getBoundingClientRect().width) return;
    const { g, W, H } = fitCanvas(c);
    paintWeek(g, W, H, round, state.weeks[round], state.events[round], { headerH: Math.max(14, W / 16), letters: true, dayFont: Math.max(8, W / 26), emoji: 16, scale: 1 });
    c.setAttribute('aria-label', `Semana ${E.SCENARIOS[round].scale}: ${state.weeks[round].map(p => `${E.taskById(p.id).name}, ${E.DAYS[p.day].toLowerCase()} ${range(p.start, p.end)}`).join('; ') || 'nenhum plano'}.`);
  }
  const leftList = round => E.TASKS.filter(t => !state.weeks[round].some(p => p.id === t.id)).map(t => `${t.emoji} ${t.name}`).join(' · ');
  function renderIntermission() {
    const n = state.weeks[0].length;
    $('mid-title').textContent = `Coube ${n} de 8.`;
    $('mid-left').innerHTML = n < 8 ? `<b>Ficou de fora:</b> ${leftList(0)}` : 'Coube tudo.';
    drawThumb('mid-thumb', 0);
  }
  function renderResults() {
    const a = E.stats(0, state.weeks[0]), b = E.stats(1, state.weeks[1]), max0 = E.maxPlans(0).count, max1 = E.maxPlans(1).count;
    $('results-title').innerHTML = `Na 6×1, coube ${a.count}.<br>Na 5×2, coube ${b.count}.`;
    $('score-0').innerHTML = `${a.count}/8<small>coube</small>`;
    $('score-1').innerHTML = `${b.count}/8<small>coube</small>`;
    const lines = [];
    if (a.left.length) lines.push(`<b>Na 6×1, ficou de fora:</b> ${leftList(0)}`);
    if (b.left.length) lines.push(`<b>Na 5×2, ainda ficou de fora:</b> ${leftList(1)}`);
    $('results-left').innerHTML = lines.join('<br>');
    const first = a.count >= max0
      ? `Você jogou certinho: na 6×1, ${max0} de 8 é o máximo que cabe. Não é falta de organização. É falta de tempo.`
      : `Mesmo jogando perfeito, na 6×1 cabem no máximo ${max0} de 8 planos. Não é falta de organização. É falta de tempo.`;
    const second = b.count >= max1 ? ' Na 5×2, coube tudo.' : ` Na 5×2, cabem os ${max1}. Quer tentar de novo?`;
    $('results-insight').textContent = first + second;
    $('gain-hours').textContent = `+${b.available - a.available}h`;
    $('gain-text').textContent = `livres por semana na 5×2: ${a.work - b.work}h a menos de trabalho e ${a.commute - b.commute}h a menos de ônibus. E o sábado inteiro.`;
    drawThumb('thumb-0', 0); drawThumb('thumb-1', 1);
    prepareShare();
  }
  function focusHeading() {
    const target = { intro: 'intro-title', playing: 'week-title', intermission: 'mid-title', results: 'results-title' }[state.mode];
    const el = $(target); el.tabIndex = -1; el.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ---------- Compartilhar ----------
  function shareURL() {
    const host = location.hostname;
    const local = !host || host === 'localhost' || /^(127\.|10\.|192\.168\.)/.test(host) || host.endsWith('.local');
    return /^https?:$/.test(location.protocol) && !local ? location.origin + location.pathname.replace(/index\.html$/, '') : E.SITE_URL;
  }
  // Quebra por item (emoji e nome ficam juntos).
  function wrapItems(g, items, sep, maxWidth) {
    const lines = [];
    let line = '';
    for (const item of items) {
      const next = line ? line + sep + item : item;
      if (g.measureText(next).width > maxWidth && line) { lines.push(line); line = item; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }
  async function buildShareImage() {
    try { await document.fonts.load(`80px ${DISPLAY}`); } catch { /* Sem Anton, usa a reserva. */ }
    const C = theme(), W = 1080, H = 1920, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    // Carimbo FOLGA
    g.save(); g.translate(84, 190); g.rotate(-.05);
    g.font = `92px ${DISPLAY}`; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const bw = g.measureText('FOLGA').width + 44;
    g.strokeStyle = C.ink; g.lineWidth = 8; rr(g, 0, 0, bw, 118, 14); g.stroke();
    g.fillStyle = C.ink; g.fillText('FOLGA', 22, 102);
    g.restore();
    g.fillStyle = C.muted; g.font = `700 30px ${SANS}`; g.textAlign = 'right'; g.fillText('UM JOGO SOBRE TEMPO', W - 80, 272);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = `96px ${DISPLAY}`;
    g.fillText('MINHA SEMANA', 80, 428); g.fillText('NA 6×1 E NA 5×2', 80, 530);
    // Duas semanas lado a lado, cada uma com sua identidade
    const panelY = 574, panelW = 452, boardH = 560, headH = 96, panelH = headH + boardH + 124;
    [[0, 70], [1, W - 70 - panelW]].forEach(([round, x]) => {
      const wk = C.week[round], n = state.weeks[round].length;
      g.save(); g.translate(x, panelY);
      g.fillStyle = C.card; rr(g, 0, 0, panelW, panelH, 20); g.fill();
      g.save(); rr(g, 0, 0, panelW, panelH, 20); g.clip();
      g.fillStyle = wk.main; g.fillRect(0, 0, panelW, headH);
      g.fillStyle = round ? wk.deep : C.yellow; g.fillRect(0, headH, panelW, 10);
      if (!round) { g.fillStyle = C.navy; g.fillRect(0, headH + 10, panelW, 7); }
      g.font = `76px ${DISPLAY}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = round ? wk.deep : C.navy; g.fillText(E.SCENARIOS[round].scale, 27, 83);
      g.fillStyle = round ? wk.on : C.yellow; g.fillText(E.SCENARIOS[round].scale, 22, 78);
      g.font = `800 28px ${SANS}`; g.textAlign = 'right'; g.fillStyle = wk.on;
      g.fillText(`${E.SCENARIOS[round].workHours}H`, panelW - 24, 62);
      g.restore();
      g.save(); g.translate(14, headH + 30);
      paintWeek(g, panelW - 28, boardH, round, state.weeks[round], state.events[round], { hours: true, gutter: 44, headerH: 40, scale: 2.1, emoji: 15, dayFont: 9.5, letters: true });
      g.restore();
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.font = `68px ${DISPLAY}`;
      g.fillText(`COUBE ${n}/8`, panelW / 2, headH + boardH + 104);
      g.restore();
    });
    // O que ficou de fora
    let y = panelY + panelH + 72;
    const left = E.TASKS.filter(t => !state.weeks[0].some(p => p.id === t.id));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (left.length) {
      g.fillStyle = C.muted; g.font = `800 30px ${SANS}`; g.fillText('NA 6×1, FICOU DE FORA:', 80, y);
      g.fillStyle = C.ink; g.font = `700 40px ${SANS}, ${EMOJI}`;
      let lines = wrapItems(g, left.map(t => `${t.emoji} ${t.name}`), '  ·  ', W - 160);
      if (lines.length > 2) lines = wrapItems(g, left.map(t => t.emoji), '  ', W - 160);
      for (const line of lines.slice(0, 2)) { y += 54; g.fillText(line, 80, y); }
    } else {
      g.fillStyle = C.ink; g.font = `700 40px ${SANS}`; g.fillText('Coube tudo nas duas semanas.', 80, y);
    }
    // Chamada
    const ctaY = Math.max(y + 42, 1500);
    g.fillStyle = C.ink; rr(g, 70, ctaY, W - 140, 150, 22); g.fill();
    g.fillStyle = C.paper; g.textAlign = 'center'; g.font = `60px ${DISPLAY}`;
    g.fillText('SUA VIDA CABE NA 6×1?', W / 2, ctaY + 74);
    g.font = `700 32px ${SANS}`; g.fillText(shareURL().replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, ctaY + 124);
    return c;
  }
  function prepareShare() {
    share.text = E.shareText(state.weeks, shareURL());
    $('share-text').value = share.text;
    $('share-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(share.text)}`;
    share.ready = (async () => {
      const canvas = await buildShareImage();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return false;
      if (share.url) URL.revokeObjectURL(share.url);
      share.url = URL.createObjectURL(blob);
      share.size = blob.size;
      try { share.file = new File([blob], 'folga-minha-semana.png', { type: 'image/png' }); } catch { share.file = null; }
      $('share-image').src = share.url;
      $('download-link').href = share.url;
      let canFiles = false;
      try { canFiles = Boolean(share.file && navigator.canShare && navigator.canShare({ files: [share.file] })); } catch { canFiles = false; }
      $('share-native').hidden = !canFiles;
      $('share-help').textContent = canFiles
        ? 'Instagram: toque em “Postar nos Stories ou enviar” e escolha o Instagram. WhatsApp: mande a imagem ou o texto com o link.'
        : 'Instagram: baixe a imagem e poste nos Stories pelo app. WhatsApp: o botão verde manda o texto com o link.';
      return true;
    })();
    return share.ready;
  }
  async function openShare() {
    $('share-status').textContent = '';
    openDialog('share-dialog');
    if (!share.ready) prepareShare();
    await share.ready;
  }

  // ---------- Diálogos ----------
  function openDialog(id) { const d = $(id); if (!d.open) d.showModal(); }
  function closeDialog(d) { if (d && d.open) d.close(); }
  function closeAllDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }

  // ---------- Eventos ----------
  $('start-button').addEventListener('click', start);
  $('home-button').addEventListener('click', goHome);
  document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', goHome));
  $('about-button').addEventListener('click', () => openDialog('about-dialog'));
  document.querySelectorAll('[data-about]').forEach(b => b.addEventListener('click', () => openDialog('about-dialog')));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(b.closest('dialog'))));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => {
    if (e.target !== d || d.id === 'event-dialog') return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(d);
  }));

  $('tray').addEventListener('click', e => {
    const chip = e.target.closest('[data-task]');
    if (!chip) return;
    if (suppressClick) { suppressClick = false; return; }
    const id = chip.dataset.task;
    if (selected === id) { deselect(); document.querySelector(`[data-task="${id}"]`)?.focus({ preventScroll: true }); }
    else select(id, e.detail === 0);
  });
  $('picker').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.start !== undefined) {
      if (place(selected, Number(b.dataset.day), Number(b.dataset.start)) && !$('event-dialog').open) {
        const next = E.TASKS.find(t => !placements().some(p => p.id === t.id));
        if (e.detail === 0 && next) document.querySelector(`[data-task="${next.id}"]`)?.focus({ preventScroll: true });
      }
    } else if (b.dataset.remove) removePlan(b.dataset.remove);
    else if (b.dataset.closePicker !== undefined) {
      const id = deselect();
      document.querySelector(`[data-task="${id}"]`)?.focus({ preventScroll: true });
    }
  });

  // Arrastar (mouse e toque): da bandeja para o calendário, ou um plano já encaixado.
  function beginPointer(e, source, id) {
    pointer = { source, id, x0: e.clientX, y0: e.clientY, moved: false, pointerId: e.pointerId, touch: e.pointerType !== 'mouse' };
  }
  $('tray').addEventListener('pointerdown', e => {
    const chip = e.target.closest('[data-task]');
    if (!chip || e.button > 0) return;
    beginPointer(e, 'chip', chip.dataset.task);
    try { chip.setPointerCapture(e.pointerId); } catch { /* Sem captura, segue com eventos do documento. */ }
  });
  board.addEventListener('pointerdown', e => {
    if (e.button > 0 || document.querySelector('dialog[open]')) return;
    const pt = boardPoint(e.clientX, e.clientY), plan = pt && planAt(pt);
    beginPointer(e, 'board', plan ? plan.id : null);
    pointer.pt = pt;
    try { board.setPointerCapture(e.pointerId); } catch { /* idem */ }
  });
  document.addEventListener('pointermove', e => {
    if (!pointer) {
      if (e.target === board && e.pointerType === 'mouse' && selected) { hover = boardPoint(e.clientX, e.clientY); drawBoard(); }
      return;
    }
    if (e.pointerId !== pointer.pointerId) return;
    if (!pointer.moved) {
      if (!pointer.id || Math.hypot(e.clientX - pointer.x0, e.clientY - pointer.y0) < 8) return;
      pointer.moved = true;
      const t = E.taskById(pointer.id), ghost = $('drag-ghost');
      ghost.textContent = `${t.emoji} ${t.short} · ${t.hours}h`;
      ghost.style.setProperty('--c', `var(--plan-${t.id})`);
      ghost.hidden = false;
      document.querySelector(`[data-task="${t.id}"]`)?.classList.add('dragging');
    }
    e.preventDefault();
    const lift = pointer.touch ? 54 : 0;
    $('drag-ghost').style.transform = `translate(${e.clientX}px, ${e.clientY - lift}px) translate(-50%, -50%)`;
    hover = boardPoint(e.clientX, e.clientY - lift / 2);
    drawBoard();
  }, { passive: false });
  document.addEventListener('pointerup', e => {
    if (!pointer || e.pointerId !== pointer.pointerId) return;
    const p = pointer;
    pointer = null;
    $('drag-ghost').hidden = true;
    if (p.moved) {
      if (p.source === 'chip') suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      drop(p.id, boardPoint(e.clientX, e.clientY - (p.touch ? 27 : 0)));
    } else if (p.source === 'board') tapBoard(p.pt);
  });
  document.addEventListener('pointercancel', () => { pointer = null; hover = null; $('drag-ghost').hidden = true; renderGame(); });
  board.addEventListener('pointerleave', () => { if (!pointer && hover) { hover = null; drawBoard(); } });

  $('undo-button').addEventListener('click', undo);
  $('finish-button').addEventListener('click', askFinish);
  $('confirm-finish').addEventListener('click', finish);
  $('event-ok').addEventListener('click', () => closeDialog($('event-dialog')));
  $('event-dialog').addEventListener('close', () => {
    const after = eventAfter; eventAfter = null;
    if (state.mode !== 'playing') return;
    if (after === 'finish') askFinish();
    else { say('Imprevisto anotado. Reorganize como quiser.'); renderGame(); }
  });
  $('next-button').addEventListener('click', nextWeek);
  for (const id of ['fresh-button', 'replay-button']) $(id).addEventListener('click', () => openDialog('restart-dialog'));
  $('confirm-restart').addEventListener('click', restart);
  $('share-button').addEventListener('click', openShare);
  $('share-native').addEventListener('click', async () => {
    if (!share.file) return;
    try {
      await navigator.share({ files: [share.file], text: share.text });
      $('share-status').textContent = 'Pronto!';
    } catch (err) {
      if (err && err.name !== 'AbortError') $('share-status').textContent = 'Não deu para abrir o compartilhamento. Use “Baixar imagem”.';
    }
  });
  $('copy-button').addEventListener('click', async () => {
    let copied = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(share.text); copied = true; } } catch { copied = false; }
    if (!copied) { const t = $('share-text'); t.focus(); t.select(); }
    $('share-status').textContent = copied ? 'Texto copiado. Cole no WhatsApp, no Instagram ou onde quiser.' : 'Texto selecionado: use Copiar no seu aparelho.';
  });
  document.addEventListener('keydown', e => {
    if (state.mode !== 'playing' || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape' && selected) {
      const id = deselect();
      document.querySelector(`[data-task="${id}"]`)?.focus({ preventScroll: true });
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); undo(); }
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => drawBoard()).observe($('board-wrap'));
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    drawBoard();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.mode === 'results') { drawThumb('thumb-0', 0); drawThumb('thumb-1', 1); } else if (state.mode === 'intermission') drawThumb('mid-thumb', 0); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawBoard(); });

  // Ganchos de teste: estado em texto e geometria do calendário (px CSS, origem no canto superior esquerdo do canvas).
  window.render_game_to_text = () => {
    const rect = board.getBoundingClientRect();
    return JSON.stringify({
      mode: state.mode, round: state.round + 1, scale: E.SCENARIOS[state.round].scale, selected, eventActive: activeEvent(),
      events: state.events, dialog: document.querySelector('dialog[open]')?.id || null, status: statusText, statusTone,
      resumeMode, storageAvailable: storageOK, historyLength: history.length,
      plans: E.TASKS.map(t => ({ id: t.id, name: t.name, hours: t.hours, scheduled: placements().find(p => p.id === t.id) || null })),
      options: selected ? E.allOptions(state.round, placements(), activeEvent(), selected) : [],
      weeks: state.weeks, stats: [0, 1].map(r => E.stats(r, state.weeks[r], state.events[r])),
      board: geo && state.mode === 'playing' ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, firstHour: FIRST, ...geo } : null,
      share: { text: share.text, whatsapp: $('share-whatsapp').getAttribute('href'), imageBytes: share.size || 0, nativeShare: !$('share-native').hidden }
    });
  };
  window.advanceTime = () => { drawBoard(); return Promise.resolve(); };

  render();
})();
