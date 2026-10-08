// FOLGA — interface: quem abre cai direto na semana 6×1 (com relógio e game over), depois na 5×2;
// calendário em canvas, lista de planos, salvamento, resultado e compartilhamento (Stories/WhatsApp).
(() => {
  'use strict';
  const E = window.FolgaEngine;
  const $ = id => document.getElementById(id);
  const KEY = 'folga-v6';
  const FIRST = E.FIRST_HOUR, LAST = E.LAST_HOUR, ROWS = LAST - FIRST;
  const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif";
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fresh = () => ({ version: 6, mode: 'playing', round: 0, clock: E.CLOCK_SECONDS, introSeen: false, items: E.starterItems(), weeks: [E.newWeek(0), null], nextId: 1 });

  let state = fresh(), storageOK = true;
  let selected = null, history = [], statusText = '', statusTone = '';
  let pointer = null, hover = null, pop = null, geo = null, suppressClick = false, workTap = null, lastTick = 0;
  const share = { ready: null, file: null, url: '', text: '', size: 0 };

  try {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* Save inválido: começa do zero. */ }
    const valid = E.validateSave(saved);
    if (valid) state = valid;
  } catch { storageOK = false; }

  const board = $('board');
  const week = () => state.weeks[state.round];
  const items = () => state.items;
  const N = () => state.items.length;
  const who = round => E.SCENARIOS[round].candidate;
  const range = (a, b) => `${a}h–${b}h`;
  const isWide = () => window.matchMedia('(min-width: 820px)').matches;
  const timed = () => state.mode === 'playing' && state.round === 0;
  const itemLabel = it => `${it.emoji} ${it.name}`;
  const placedOf = uid => (E.isWork(uid) ? week().work : week().plans).find(p => p.uid === uid);
  const spanOf = uid => E.spanOf(state.round, week(), items(), uid);

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, clock: Math.max(0, Math.round(state.clock)) })); }
    catch { storageOK = false; }
  }

  // Cores: só tokens do CSS.
  let T = null;
  function theme() {
    if (T) return T;
    const cs = getComputedStyle(document.documentElement);
    const v = name => cs.getPropertyValue(`--${name}`).trim();
    const id = r => ({ main: v(`r${r}-main`), deep: v(`r${r}-deep`), on: v(`r${r}-on`), soft: v(`r${r}-soft`), head: v(`r${r}-head`), headInk: v(`r${r}-head-ink`) });
    T = { paper: v('paper'), card: v('card'), ink: v('ink'), muted: v('muted'), board: v('board'), grid: v('grid'),
      hourInk: v('hour-ink'), dayInk: v('day-ink'), work: v('work'), workInk: v('work-ink'), workHatch: v('work-hatch'),
      extra: v('extra'), commute: v('commute'), lunch: v('routine'), lunchInk: v('routine-ink'), slot: v('slot'), slotFill: v('slot-fill'),
      bad: v('bad'), badFill: v('bad-fill'), planInk: v('plan-ink'), yellow: v('r0-yellow'), navy: v('r0-navy'),
      week: [id(0), id(1)], plan: Array.from({ length: E.COLORS }, (_, i) => v(`plan-${i}`)) };
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
  function textAt(g, text, x, y, size, weight, color, maxW) {
    g.font = `${weight} ${Math.round(size)}px ${SANS}`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (g.measureText(text).width < maxW) g.fillText(text, x, y);
  }
  function paintWeek(g, W, H, round, wk, list, o = {}) {
    const C = theme(), id = C.week[round], s = o.scale || 1;
    const gx = o.hours ? (o.gutter || 24) : 0, gy = o.headerH || 18;
    const cw = (W - gx) / 7, rh = (H - gy) / ROWS;
    const inset = Math.max(1, Math.min(2.2 * s, cw * .05)), rad = Math.min(5 * s, cw / 6);
    const off = E.offDays(wk);
    const box = (day, start, end) => ({ x: gx + day * cw + inset, y: gy + (start - FIRST) * rh + inset, w: cw - 2 * inset, h: (end - start) * rh - 2 * inset });
    g.save();
    g.fillStyle = C.board; g.fillRect(0, 0, W, H);
    for (const d of off) { g.fillStyle = id.soft; g.fillRect(gx + d * cw, gy, cw, ROWS * rh); }
    g.strokeStyle = C.grid; g.lineWidth = Math.max(1, s * .8);
    for (let h = 0; h <= ROWS; h++) { const y = Math.round(gy + h * rh) + .5; g.beginPath(); g.moveTo(gx, y); g.lineTo(W, y); g.stroke(); }
    if (o.hours) {
      g.fillStyle = C.hourInk; g.font = `${Math.round(9.5 * s)}px ${SANS}`; g.textAlign = 'right'; g.textBaseline = 'middle';
      const every = rh >= 14 * s ? 1 : 2;
      for (let h = 0; h < ROWS; h += every) g.fillText(`${FIRST + h}h`, gx - 4 * s, gy + (h + .5) * rh);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let d = 0; d < 7; d++) {
      const x = gx + d * cw, text = o.letters ? E.SHORT_DAYS[d][0] : E.SHORT_DAYS[d];
      if (off.includes(d)) { g.fillStyle = id.head; rr(g, x + inset, inset, cw - 2 * inset, gy - 2 * inset, rad); g.fill(); g.fillStyle = id.headInk; }
      else g.fillStyle = C.dayInk;
      g.font = `800 ${Math.round((o.dayFont || 9.5) * s)}px ${SANS}`;
      g.fillText(text, x + cw / 2, gy / 2 + .5);
    }
    const lift = (uid, r) => {
      if (!(o.pop && o.pop.uid === uid)) return;
      const k = o.pop.k;
      g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(k, k); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    };
    for (const w of wk.work) {
      const hours = E.workHoursOf(round, w.uid), whole = box(w.day, w.start, w.start + E.workSpan(hours, w));
      g.save(); lift(w.uid, whole);
      for (const seg of E.workSegments(hours, w)) {
        const r = box(seg.day, seg.start, seg.end);
        g.fillStyle = { work: C.work, commute: C.commute, lunch: C.lunch }[seg.kind];
        rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
        if (seg.kind === 'work') {
          g.save(); rr(g, r.x, r.y, r.w, r.h, rad); g.clip(); g.strokeStyle = C.workHatch; g.lineWidth = s;
          for (let k = -r.h; k < r.w; k += 7 * s) { g.beginPath(); g.moveTo(r.x + k, r.y + r.h); g.lineTo(r.x + k + r.h, r.y); g.stroke(); }
          g.restore();
          if (o.labels && r.h > 18 * s) textAt(g, 'Trabalho', r.x + r.w / 2, r.y + r.h / 2, 10 * s, 600, C.workInk, r.w - 4);
        } else if (seg.kind === 'commute') {
          emojiAt(g, '🚌', r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .72, r.w * .5, 15 * s));
        } else if (o.labels && r.h > 12 * s) {
          textAt(g, 'Almoço', r.x + r.w / 2, r.y + r.h / 2, 9.5 * s, 600, C.lunchInk, r.w - 4);
        }
      }
      // Hora extra: as últimas horas de trabalho ganham uma faixa de alerta.
      if (w.extra) {
        const segs = E.workSegments(hours, w).filter(x => x.kind === 'work'), last = segs[segs.length - 1];
        const r = box(w.day, last.end - w.extra, last.end);
        g.fillStyle = C.extra; rr(g, r.x, r.y, r.w, Math.max(3 * s, r.h * .18), rad); g.fill();
        if (o.labels && r.h > 14 * s) textAt(g, `+${w.extra}h extra`, r.x + r.w / 2, r.y + r.h / 2 + 3 * s, 9 * s, 800, C.extra, r.w - 4);
      }
      if (o.selected === w.uid) { g.lineWidth = 3 * s; g.strokeStyle = C.yellow; rr(g, whole.x - 1, whole.y - 1, whole.w + 2, whole.h + 2, rad); g.stroke(); g.lineWidth = 1.5 * s; g.strokeStyle = C.ink; g.stroke(); }
      g.restore();
    }
    for (const p of wk.plans) {
      const it = E.itemOf(list, p.uid);
      if (!it) continue;
      const r = box(p.day, p.start, p.start + it.hours);
      g.save(); lift(p.uid, r);
      g.fillStyle = C.plan[it.color]; rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
      if (o.selected === p.uid) { g.lineWidth = 2.5 * s; g.strokeStyle = C.ink; g.stroke(); }
      const es = Math.min(r.h * .55, r.w * .6, (o.emoji || 20) * s);
      const named = o.labels && r.h >= es + 18 * s && r.w >= 44 * s;
      emojiAt(g, it.emoji, r.x + r.w / 2, r.y + r.h / 2 - (named ? 7 * s : 0), es);
      if (named) {
        g.font = `800 ${Math.round(10.5 * s)}px ${SANS}`;
        let t = it.short;
        while (t.length > 1 && g.measureText(t).width > r.w - 6) t = t.slice(0, -1);
        textAt(g, t, r.x + r.w / 2, r.y + r.h / 2 + es / 2 + 3 * s, 10.5 * s, 800, C.planInk, r.w);
      }
      g.restore();
    }
    if (o.region) {
      for (const seg of o.region) {
        const r = box(seg.day, seg.start, seg.end);
        g.fillStyle = C.slotFill; rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
        g.setLineDash([4 * s, 3 * s]); g.strokeStyle = C.slot; g.lineWidth = 1.6 * s; g.stroke(); g.setLineDash([]);
      }
    }
    if (o.preview) {
      const pv = o.preview, r = box(pv.day, pv.start, pv.end);
      g.globalAlpha = .88;
      g.fillStyle = !pv.ok ? C.badFill : E.isWork(pv.uid) ? C.work : C.plan[E.itemOf(list, pv.uid).color];
      rr(g, r.x, r.y, r.w, r.h, rad); g.fill(); g.globalAlpha = 1;
      g.setLineDash([5 * s, 3 * s]); g.lineWidth = 2 * s; g.strokeStyle = pv.ok ? C.ink : C.bad; g.stroke(); g.setLineDash([]);
      emojiAt(g, E.isWork(pv.uid) ? '💼' : E.itemOf(list, pv.uid).emoji, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .5, r.w * .6, 20 * s));
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
  function regionFor(uid) {
    const span = spanOf(uid), segs = [];
    for (let d = 0; d < 7; d++) {
      let cur = null;
      for (const s of E.options(state.round, week(), items(), uid, d)) {
        if (cur && s <= cur.end) cur.end = Math.max(cur.end, s + span);
        else { cur = { day: d, start: s, end: s + span }; segs.push(cur); }
      }
    }
    return segs;
  }
  function previewFor(uid, pt) {
    const span = spanOf(uid);
    const s = E.resolveStart(state.round, week(), items(), uid, pt.day, pt.hour);
    if (s !== null) return { uid, day: pt.day, start: s, end: s + span, ok: true };
    const start = Math.min(Math.max(Math.round(pt.hour + .5 - span / 2), FIRST), LAST - span);
    return { uid, day: pt.day, start, end: start + span, ok: false };
  }
  function drawBoard() {
    if (state.mode !== 'playing' && state.mode !== 'gameover') return;
    const { g, W, H } = fitCanvas(board);
    if (W < 20 || H < 20) return;
    const big = W >= 520;
    const dragId = pointer && pointer.moved ? pointer.id : null, focusId = dragId || selected;
    let popK = null;
    if (pop) {
      const p = Math.min(1, (performance.now() - pop.t0) / 240);
      popK = { uid: pop.uid, k: .72 + .28 * (1 - Math.pow(1 - p, 3)) + Math.sin(p * Math.PI) * .08 };
    }
    geo = paintWeek(g, W, H, state.round, week(), items(), {
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
  const blockAt = pt => E.blocks(state.round, week(), items()).find(b => b.day === pt.day && pt.hour >= b.start && pt.hour < b.end);

  // ---------- Relógio da semana 6×1 ----------
  const fmtClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function renderClock() {
    const on = state.round === 0 && state.mode !== 'results';
    $('clock').hidden = !on;
    document.querySelector('.clock-bar').hidden = !on;
    if (!on) return;
    const left = Math.max(0, Math.ceil(state.clock));
    $('clock-text').textContent = fmtClock(left);
    $('clock').classList.toggle('low', left <= 20);
    $('clock-bar').style.transform = `scaleX(${Math.max(0, state.clock / E.CLOCK_SECONDS)})`;
  }
  function spend(seconds) {
    if (!timed()) return;
    state.clock = Math.max(0, state.clock - seconds);
    renderClock();
    if (state.clock <= 0) gameOver('time');
  }
  function tick() {
    const now = performance.now(), dt = (now - lastTick) / 1000;
    lastTick = now;
    // O relógio para enquanto há um diálogo aberto ou a aba está escondida.
    if (!timed() || document.hidden || document.querySelector('dialog[open]')) return;
    spend(Math.min(dt, 1));
    if (Math.floor(state.clock) % 5 === 0) save();
  }

  // ---------- Ações ----------
  function say(text, tone = '', animate = true) {
    statusText = text; statusTone = tone;
    const el = $('status');
    el.textContent = text;
    el.className = `status${tone ? ` ${tone}` : ''}`;
    if (animate && tone === 'error' && !reduceMotion) { void el.offsetWidth; el.classList.add('shake'); }
  }
  function select(uid, fromKeyboard = false) {
    selected = uid; workTap = null;
    const why = E.whyNoRoom(state.round, week(), items(), uid);
    if (E.isWork(uid)) say('Dia de trabalho: mova para outro horário ou dia, faça hora extra ou mude o almoço. O trabalho não sai da semana.');
    else if (why) say(why, 'error');
    else {
      const it = E.itemOf(items(), uid);
      say(placedOf(uid) ? `Para mover, toque em outro espaço verde. ${it.name}: ${it.hours}h seguidas.` : `${itemLabel(it)}: ${it.hours}h seguidas. Toque num espaço verde, no dia e na hora que quiser.`);
    }
    renderGame();
    if (fromKeyboard) { const p = $('picker'); (p.querySelector('.slot') || p.querySelector('.remove-button') || p.querySelector('.picker-close'))?.focus(); }
  }
  function deselect(message = 'Escolha outra coisa quando quiser.') {
    const uid = selected; selected = null; say(message); renderGame();
    return uid;
  }
  function remember() { history.push(JSON.parse(JSON.stringify(week()))); if (history.length > 40) history.shift(); }
  function bump() { const score = $('score'); score.classList.remove('bump'); void score.offsetWidth; score.classList.add('bump'); }
  function place(uid, day, start) {
    const result = E.move(state.round, week(), items(), uid, day, start);
    if (!result.ok) { say(result.reason, 'error'); drawBoard(); return false; }
    remember();
    state.weeks[state.round] = result.week;
    selected = null; hover = null;
    const span = spanOf(uid), n = E.stats(state.round, week(), items()).count;
    if (E.isWork(uid)) say(`Trabalho: ${E.DAYS[day].toLowerCase()}, ${range(start, start + span)}, com transporte.`, 'good');
    else say(`${itemLabel(E.itemOf(items(), uid))}: ${E.DAYS[day].toLowerCase()}, ${range(start, start + span)}.${n === N() ? ' Coube tudo!' : ''}`, 'good');
    save(); renderGame();
    if (!E.isWork(uid)) bump();
    if (!reduceMotion) { pop = { uid, t0: performance.now() }; requestAnimationFrame(animatePop); }
    return true;
  }
  const LAW_SOURCE = '<a href="https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm" target="_blank" rel="noopener noreferrer">CLT no Planalto</a>';
  function law(text, withFlavio) {
    $('law-text').textContent = text;
    $('law-flavio').textContent = withFlavio ? 'Na PEC 12/2026, que Flávio apoia, o contrato individual pode valer mais que a convenção coletiva.' : '';
    $('law-source').innerHTML = `Fonte: ${LAW_SOURCE}${withFlavio ? ' · <a href="https://jornaldebrasilia.com.br/noticias/economia/entenda-as-propostas-pelo-fim-da-escala-6x1-de-flavio-bolsonaro-e-lula/" target="_blank" rel="noopener noreferrer">Jornal de Brasília, 7/10/2026</a>' : ''}.`;
    openDialog('law-dialog');
  }
  function editWork(change) {
    const uid = selected, r = E.editWork(state.round, week(), items(), uid, change);
    if (!r.ok) {
      if (r.code === 'clt71') { law(r.reason, true); say('A CLT não deixa: mais de 6h seguidas pede intervalo.', 'error', false); }
      else if (r.code === 'clt59') { law(r.reason, false); say('A CLT não deixa mais de 2h extras por dia.', 'error', false); }
      else say(r.reason, 'error');
      return;
    }
    remember();
    state.weeks[state.round] = r.week;
    const w = r.work, h = E.workHoursOf(state.round, uid);
    say(`Trabalho de ${E.DAYS[w.day].toLowerCase()}: ${h + w.extra}h${w.extra ? ` (${w.extra}h extra)` : ''}, ${w.lunch ? `almoço depois de ${w.lunchAt}h de trabalho` : 'sem almoço'}.`, 'good');
    save(); renderGame();
  }
  function removePlan(uid) {
    if (!week().plans.some(p => p.uid === uid)) return;
    remember();
    state.weeks[state.round] = E.unplace(week(), uid);
    selected = null;
    say(`${itemLabel(E.itemOf(items(), uid))} saiu da semana.`); save(); renderGame();
    document.querySelector(`[data-task="${uid}"]`)?.focus({ preventScroll: true });
  }
  function deleteItem(uid) {
    const it = E.itemOf(items(), uid);
    if (!it || state.round !== 0) return;
    state.items = items().filter(x => x.uid !== uid);
    state.weeks = state.weeks.map(w => (w ? E.unplace(w, uid) : w));
    history = []; if (selected === uid) selected = null;
    say(`${itemLabel(it)} saiu da sua lista.`); save(); renderGame(); renderCatalog();
  }
  function addItem(it) {
    if (!it || items().length >= 40 || items().some(x => x.uid === it.uid)) return false;
    state.items = [...items(), it]; history = [];
    say(`${itemLabel(it)} entrou na lista. Toque nele e escolha onde encaixar.`); save(); renderGame(); renderCatalog();
    return true;
  }
  function undo() {
    if (!history.length) return;
    state.weeks[state.round] = history.pop(); selected = null;
    say('Desfeito.'); save(); renderGame();
  }
  function tapBoard(pt) {
    if (!pt) return;
    const hit = blockAt(pt);
    if (selected) {
      const start = E.resolveStart(state.round, week(), items(), selected, pt.day, pt.hour);
      const cur = placedOf(selected);
      if (start !== null && !(hit && hit.uid === selected && cur && cur.day === pt.day && cur.start === start)) { place(selected, pt.day, start); return; }
      if (hit && E.isWork(hit.uid) && !E.isWork(selected) && workTap !== hit.uid) {
        // Primeiro toque no trabalho explica; o segundo seleciona o dia de trabalho para mexer.
        workTap = hit.uid; say(`${hit.reason} Para mexer no trabalho, toque nele de novo.`, 'error'); drawBoard(); return;
      }
      if (hit && hit.uid !== selected) { select(hit.uid); return; }
      if (hit) { deselect('Ficou no mesmo lugar.'); return; }
      say(E.whyNotHere(state.round, week(), items(), selected, pt.day, pt.hour), 'error'); drawBoard(); return;
    }
    if (hit) { select(hit.uid); return; }
    say('Escolha um plano na lista e toque num espaço livre. Para mexer no trabalho, toque nele.');
  }
  function drop(uid, pt) {
    hover = null;
    if (!pt) { say('Solte dentro do calendário.', 'error'); renderGame(); return; }
    const start = E.resolveStart(state.round, week(), items(), uid, pt.day, pt.hour);
    if (start !== null) place(uid, pt.day, start);
    else { selected = uid; renderGame(); say(E.whyNotHere(state.round, week(), items(), uid, pt.day, pt.hour), 'error'); drawBoard(); }
  }
  function askFinish() {
    if (state.round === 0) { gameOver('closed'); return; }
    const st = E.stats(state.round, week(), items());
    if (st.count === N()) { finish(); return; }
    $('finish-detail').textContent = `Coube ${st.count} de ${N()}. Fica de fora: ${E.joinList(st.left.map(uid => itemLabel(E.itemOf(items(), uid))))}.`;
    openDialog('finish-dialog');
  }
  function finish() {
    closeDialog($('finish-dialog'));
    state.mode = 'results'; selected = null; history = []; share.ready = null; save(); render(); focusHeading();
  }

  // ---------- Game over da 6×1 ----------
  function gameOver(why) {
    if (state.mode !== 'playing' || state.round !== 0) return;
    state.mode = 'gameover'; selected = null; pointer = null; hover = null;
    save(); renderGame(); showGameOver(why);
  }
  function showGameOver(why = 'time') {
    const st = E.stats(0, state.weeks[0], items());
    $('go-why').textContent = why === 'closed' ? 'Você fechou a semana. A 6×1 fecha você.' : 'O tempo acabou. A semana também.';
    $('go-score').innerHTML = st.count === N()
      ? `Coube tudo, mas sobraram ${st.free - st.planned}h livres na semana inteira.`
      : st.left.length > 4
        ? `Coube ${st.count} de ${N()}. <b>Ficaram de fora ${st.left.length} coisas:</b> ${st.left.map(uid => E.itemOf(items(), uid).emoji).join(' ')}`
        : `Coube ${st.count} de ${N()}. <b>Ficou de fora:</b> ${E.joinList(st.left.map(uid => itemLabel(E.itemOf(items(), uid))))}.`;
    $('go-ask').hidden = false; $('go-answer').hidden = true;
    openDialog('gameover-dialog');
    // Foco no título, para nenhuma resposta parecer marcada de antemão.
    $('go-title').focus({ preventScroll: true });
  }
  function answer(yes) {
    $('go-ask').hidden = true; $('go-answer').hidden = false;
    $('go-again').hidden = !yes;
    if (yes) {
      $('go-reply').textContent = 'Então segunda-feira começa tudo de novo.';
      $('go-text').textContent = 'Seis dias de trabalho, um de folga. E o relógio volta a correr.';
      $('go-lula').innerHTML = `Ver como seria com ${who(1)} <span aria-hidden="true">→</span>`;
    } else {
      $('go-reply').textContent = 'Se arrependeu? Você ainda pode mudar seu voto.';
      $('go-text').textContent = `Existe vida além do trabalho. Com ${who(1)}, a mesma vida na 5×2: 40h de trabalho, um dia inteiro a mais de folga e sem relógio. Seus planos vão junto.`;
      $('go-lula').innerHTML = `Mudar meu voto para ${who(1)} <span aria-hidden="true">→</span>`;
    }
    $('go-lula').focus();
  }
  function againSixOne() {
    closeDialog($('gameover-dialog'));
    state.mode = 'playing'; state.clock = E.CLOCK_SECONDS; history = [];
    say('Mais uma semana na 6×1. O relógio voltou a correr.', 'error', false);
    save(); render(); focusHeading();
  }
  function toLula() {
    closeDialog($('gameover-dialog'));
    const carried = E.carryOver(state.weeks[0], 1, items());
    state.round = 1; state.weeks[1] = carried.week; state.mode = 'playing'; selected = null; history = []; share.ready = null;
    say(`Com ${who(1)}, são 5 dias de trabalho e um dia inteiro a mais pra você. Sem relógio. Encaixe o que ficou de fora.`);
    save(); render(); focusHeading();
  }
  const firstHint = () => (isWide()
    ? 'Escolha um plano na lista (ou arraste) e solte num espaço livre. Tudo se move, até o trabalho.'
    : 'Toque num plano e depois num espaço livre. Tudo se move, até o trabalho.');
  function restart() {
    closeDialog($('restart-dialog'));
    state = fresh(); state.introSeen = true; selected = null; history = []; statusText = ''; share.ready = null;
    lastTick = performance.now(); save(); render(); focusHeading();
  }
  // Primeira visita: a janela curta de "como jogar" abre por cima da semana; o relógio só anda depois.
  function showHowto() {
    openDialog('howto-dialog');
    $('howto-start').focus({ preventScroll: true });
  }

  // ---------- Telas ----------
  function render() {
    const screen = state.mode === 'results' ? 'results' : 'game';
    document.body.dataset.screen = screen;
    document.body.dataset.round = String(state.round);
    for (const id of ['game', 'results']) $(id).hidden = id !== screen;
    if (screen === 'game') renderGame();
    else renderResults();
  }
  function renderGame() {
    const sc = E.SCENARIOS[state.round], st = E.stats(state.round, week(), items());
    document.body.dataset.round = String(state.round);
    $('week-scale').textContent = sc.scale;
    $('week-step').textContent = `Com ${who(state.round)}`;
    $('band-icon-use').setAttribute('href', state.round ? '#star' : '#arminha');
    $('week-sub').textContent = state.round ? `${sc.work.length} dias de trabalho · vida além do trabalho` : `${sc.work.length} dias de trabalho · ${st.work}h`;
    $('score').textContent = String(st.count);
    $('score-total').textContent = `/${N()}`;
    $('list-count').textContent = `${N()} coisas · ${items().reduce((n, it) => n + it.hours, 0)}h`;
    $('undo-button').disabled = history.length === 0;
    renderClock();
    const add = state.round === 0 ? '<button class="chip add-chip" id="add-chip" aria-label="Pôr mais coisas na lista"><span class="emoji" aria-hidden="true">＋</span><span class="name short">Mais coisas</span><span class="name full">Pôr mais coisas na lista</span></button>' : '';
    $('tray').innerHTML = add + items().map(it => {
      const p = week().plans.find(x => x.uid === it.uid);
      const where = p ? `${E.DAYS[p.day]}, ${range(p.start, p.start + it.hours)}` : 'fora da semana';
      return `<button class="chip${p ? ' placed' : ''}" data-task="${it.uid}" style="--c: var(--plan-${it.color})" aria-pressed="${selected === it.uid}" aria-label="${it.name}, ${it.hours} horas, ${where}">` +
        `<span class="emoji" aria-hidden="true">${it.emoji}</span><span class="name short">${it.short}</span><span class="name full">${it.name}</span>` +
        `<span class="meta">${p ? `<span class="tick">✓ </span>${E.SHORT_DAYS[p.day]}<span class="hour"> ${p.start}h</span>` : `${it.hours}h`}</span></button>`;
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
    const work = E.isWork(selected), it = work ? null : E.itemOf(items(), selected);
    const span = spanOf(selected), cur = placedOf(selected);
    const slots = E.runStarts(state.round, week(), items(), selected);
    picker.style.setProperty('--c', work ? 'var(--work)' : `var(--plan-${it.color})`);
    let title = work ? `Trabalho · ${E.workHoursOf(state.round, selected) + cur.extra}h` : it.name;
    let tools = '';
    if (work) {
      tools = `<button class="tool" data-work="extra-" aria-label="Menos hora extra">− 1h</button><button class="tool" data-work="extra+" aria-label="Mais uma hora extra">+ 1h extra</button>` +
        (cur.lunch
          ? `<button class="tool" data-work="lunch-off">Tirar almoço</button><button class="tool" data-work="lunch-" aria-label="Almoço mais cedo">◀ Almoço</button><button class="tool" data-work="lunch+" aria-label="Almoço mais tarde">Almoço ▶</button>`
          : `<button class="tool" data-work="lunch-on">Pôr almoço</button>`);
    }
    picker.innerHTML = `<div class="picker-head"><span class="emoji" aria-hidden="true">${work ? '💼' : it.emoji}</span><b>${title}</b><span class="plan-hours">${span}h</span><span class="spacer"></span>` +
      `<button class="picker-close" data-close-picker aria-label="Fechar">×</button></div>` +
      `<div class="slots" role="group" aria-label="${work ? 'Mexer no dia de trabalho' : 'Espaços livres'}">` + tools +
      (!work && cur ? `<button class="remove-button" data-remove="${selected}">Tirar da semana</button>` : '') +
      slots.map(o => `<button class="slot${cur && cur.day === o.day && cur.start === o.start ? ' current' : ''}" data-day="${o.day}" data-start="${o.start}" aria-label="${E.DAYS[o.day]}, das ${o.start} às ${o.start + span} horas">${E.SHORT_DAYS[o.day]} ${range(o.start, o.start + span)}</button>`).join('') +
      (!slots.length && !cur ? '<p class="no-room">Libere espaço: toque em algo encaixado para mover ou tirar.</p>' : '') +
      (!work && state.round === 0 ? `<button class="remove-button ghost" data-delete="${selected}">Excluir da lista</button>` : '') +
      '</div>';
  }
  function renderAccessible() {
    const all = E.blocks(state.round, week(), items()).map(b => ({ ...b, text: b.kind === 'plan' ? `${E.itemOf(items(), b.uid).name} (plano)` : { work: 'trabalho', commute: 'transporte', lunch: 'almoço' }[b.kind] }));
    $('accessible-board').innerHTML = `<h2>Agenda da semana ${E.SCENARIOS[state.round].scale}</h2>` + E.DAYS.map((name, d) => {
      const list = all.filter(b => b.day === d).sort((a, b) => a.start - b.start).map(b => `${range(b.start, b.end)} ${b.text.toLowerCase()}`);
      return `<p>${name}: ${list.length ? list.join('; ') : 'livre'}; 23h–7h sono.</p>`;
    }).join('');
    board.setAttribute('aria-label', `Calendário da semana ${E.SCENARIOS[state.round].scale}: ${E.stats(state.round, week(), items()).count} de ${N()} planos encaixados. A agenda em texto vem logo depois.`);
  }
  function renderCatalog() {
    const has = new Set(items().map(it => it.uid));
    $('catalog').innerHTML = E.GROUPS.map(group => `<h3>${group}</h3><div class="cat-row">` + E.CATALOG.filter(c => c.group === group).map(c =>
      `<button class="cat-chip" data-cat="${c.id}" aria-pressed="${has.has(c.id)}" style="--c: var(--plan-${c.color})"><span aria-hidden="true">${c.emoji}</span> ${c.name} <small>${c.hours}h</small></button>`).join('') + '</div>').join('') +
      (items().some(it => !it.ref) ? `<h3>Seus itens</h3><div class="cat-row">${items().filter(it => !it.ref).map(it =>
        `<button class="cat-chip" data-cat="${it.uid}" aria-pressed="true" style="--c: var(--plan-${it.color})"><span aria-hidden="true">${it.emoji}</span> ${it.name} <small>${it.hours}h</small></button>`).join('')}</div>` : '');
    $('catalog-count').textContent = `${N()} na lista · ${items().reduce((n, it) => n + it.hours, 0)}h`;
  }
  function drawThumb(id, round) {
    const c = $(id); if (!c || !c.getBoundingClientRect().width || !state.weeks[round]) return;
    const { g, W, H } = fitCanvas(c);
    paintWeek(g, W, H, round, state.weeks[round], items(), { headerH: Math.max(14, W / 16), letters: true, dayFont: Math.max(8, W / 26), emoji: 16, scale: 1 });
    c.setAttribute('aria-label', `Semana ${E.SCENARIOS[round].scale}: ${state.weeks[round].plans.map(p => `${E.itemOf(items(), p.uid).name}, ${E.DAYS[p.day].toLowerCase()} ${p.start}h`).join('; ') || 'nenhum plano'}.`);
  }
  const leftList = round => items().filter(it => !state.weeks[round].plans.some(p => p.uid === it.uid)).map(itemLabel).join(' · ');
  function renderResults() {
    const a = E.stats(0, state.weeks[0], items()), b = E.stats(1, state.weeks[1], items());
    const max0 = E.maxPlans(0, items()), max1 = E.maxPlans(1, items());
    $('results-title').innerHTML = `Com ${who(0)}, coube ${a.count}.<br>Com ${who(1)}, coube ${b.count}.`;
    $('score-0').innerHTML = `${a.count}/${N()}<small>coube</small>`;
    $('score-1').innerHTML = `${b.count}/${N()}<small>coube</small>`;
    const lines = [];
    if (a.left.length) lines.push(`<b>Com ${who(0)}, ficou de fora:</b> ${leftList(0)}`);
    if (b.left.length) lines.push(`<b>Com ${who(1)}, ainda ficou de fora:</b> ${leftList(1)}`);
    $('results-left').innerHTML = lines.join('<br>');
    let insight;
    if (max0 < N()) {
      insight = `Com a sua lista, na 6×1 cabem no máximo ${max0} de ${N()}, mesmo mexendo no horário do trabalho e sem relógio.`;
      insight += max1 === N() ? ' Na 5×2, cabe tudo. Não é falta de organização. É falta de tempo.' : ` Na 5×2, cabem ${max1}. Não é falta de organização. É falta de tempo.`;
    } else {
      insight = `Sua lista cabe nas duas semanas. Mas na 6×1 sobra menos: ${a.free}h livres contra ${b.free}h na 5×2, e só um dia inteiro de folga.`;
    }
    if (a.extra) insight += ` E você ainda fez ${a.extra}h de hora extra na 6×1.`;
    $('results-insight').textContent = insight;
    const gain = b.free - a.free;
    $('gain-hours').textContent = `${gain >= 0 ? '+' : ''}${gain}h`;
    $('gain-text').textContent = `de vida além do trabalho por semana na 5×2, do jeito que você montou. E um dia inteiro a mais de folga.`;
    drawThumb('thumb-0', 0); drawThumb('thumb-1', 1);
    prepareShare();
  }
  function focusHeading() {
    const target = { playing: 'week-title', gameover: 'week-title', results: 'results-title' }[state.mode];
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
  function wrapItems(g, list, sep, maxWidth) {
    const lines = [];
    let line = '';
    for (const item of list) {
      const next = line ? line + sep + item : item;
      if (g.measureText(next).width > maxWidth && line) { lines.push(line); line = item; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawStar(g, cx, cy, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .42 : r;
      g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.closePath(); g.fill();
  }
  function fitFont(g, text, size, maxWidth, family) {
    while (size > 20) { g.font = `${size}px ${family}`; if (g.measureText(text).width <= maxWidth) break; size -= 4; }
  }
  // Painel de uma semana, com a identidade do candidato no cabeçalho.
  function sharePanel(g, round, x, y, w, boardH) {
    const C = theme(), wk = C.week[round], n = E.stats(round, state.weeks[round], items()).count, headH = 104, h = headH + boardH + 124;
    g.save(); g.translate(x, y);
    g.fillStyle = C.card; rr(g, 0, 0, w, h, 20); g.fill();
    g.save(); rr(g, 0, 0, w, h, 20); g.clip();
    g.fillStyle = wk.main; g.fillRect(0, 0, w, headH);
    g.fillStyle = round ? wk.deep : C.yellow; g.fillRect(0, headH, w, 10);
    if (!round) { g.fillStyle = C.navy; g.fillRect(0, headH + 10, w, 7); }
    let tx = 24;
    if (round) { g.fillStyle = wk.on; drawStar(g, 52, headH / 2 + 2, 26); tx = 92; }
    const name = who(round).toUpperCase();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    fitFont(g, name, 76, w - tx - 130, DISPLAY);
    g.fillStyle = round ? wk.deep : C.navy; g.fillText(name, tx + 5, 87);
    g.fillStyle = round ? wk.on : C.yellow; g.fillText(name, tx, 82);
    g.font = `52px ${DISPLAY}`; g.textAlign = 'right'; g.fillStyle = wk.on;
    g.fillText(E.SCENARIOS[round].scale, w - 24, 80);
    g.restore();
    g.save(); g.translate(14, headH + 32);
    paintWeek(g, w - 28, boardH, round, state.weeks[round], items(), { hours: true, gutter: 44, headerH: 40, scale: 2.1, emoji: 15, dayFont: 9.5, letters: true });
    g.restore();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.font = `68px ${DISPLAY}`;
    g.fillText(`COUBE ${n}/${N()}`, w / 2, headH + boardH + 106);
    g.restore();
    return h;
  }
  async function buildShareImage() {
    try { await document.fonts.load(`80px ${DISPLAY}`); } catch { /* Sem Anton, usa a reserva. */ }
    const C = theme(), W = 1080, H = 1920, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    g.save(); g.translate(84, 190); g.rotate(-.05);
    g.font = `92px ${DISPLAY}`; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const bw = g.measureText('FOLGA').width + 44;
    g.strokeStyle = C.ink; g.lineWidth = 8; rr(g, 0, 0, bw, 118, 14); g.stroke();
    g.fillStyle = C.ink; g.fillText('FOLGA', 22, 102);
    g.restore();
    g.fillStyle = C.muted; g.font = `700 30px ${SANS}`; g.textAlign = 'right'; g.fillText('VIDA ALÉM DO TRABALHO', W - 80, 272);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = `96px ${DISPLAY}`;
    g.fillText('MINHA SEMANA', 80, 416);
    const second = `COM ${who(0)} E COM ${who(1)}`.toUpperCase();
    fitFont(g, second, 96, W - 160, DISPLAY);
    g.fillText(second, 80, 540);
    const panelY = 574, boardH = 560;
    const panelH = Math.max(sharePanel(g, 0, 70, panelY, 452, boardH), sharePanel(g, 1, W - 70 - 452, panelY, 452, boardH));
    let y = panelY + panelH + 72;
    const left = items().filter(it => !state.weeks[0].plans.some(p => p.uid === it.uid));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (left.length) {
      g.fillStyle = C.muted; g.font = `800 30px ${SANS}`; g.fillText(`COM ${who(0).toUpperCase()}, FICOU DE FORA:`, 80, y);
      g.fillStyle = C.ink; g.font = `700 40px ${SANS}, ${EMOJI}`;
      let lines = wrapItems(g, left.map(itemLabel), '  ·  ', W - 160);
      if (lines.length > 2) lines = wrapItems(g, left.map(it => it.emoji), '  ', W - 160);
      for (const line of lines.slice(0, 2)) { y += 54; g.fillText(line, 80, y); }
    } else {
      g.fillStyle = C.ink; g.font = `800 40px ${SANS}`; g.fillText(`COM ${who(0).toUpperCase()}, COUBE TUDO. NO LIMITE.`, 80, y);
    }
    const ctaY = Math.max(y + 42, 1500);
    g.fillStyle = C.ink; rr(g, 70, ctaY, W - 140, 150, 22); g.fill();
    g.fillStyle = C.paper; g.textAlign = 'center'; g.font = `60px ${DISPLAY}`;
    g.fillText('SUA VIDA CABE NA 6×1?', W / 2, ctaY + 74);
    g.font = `700 32px ${SANS}`; g.fillText(shareURL().replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, ctaY + 124);
    return c;
  }
  function prepareShare() {
    share.text = E.shareText(state.weeks, items(), [0, 1], shareURL());
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
  $('about-button').addEventListener('click', () => openDialog('about-dialog'));
  document.querySelectorAll('[data-about]').forEach(b => b.addEventListener('click', () => { closeDialog($('howto-dialog')); openDialog('about-dialog'); }));
  $('help-button').addEventListener('click', showHowto);
  $('howto-start').addEventListener('click', () => closeDialog($('howto-dialog')));
  $('howto-dialog').addEventListener('close', () => {
    if (!state.introSeen) { state.introSeen = true; save(); }
    lastTick = performance.now();
  });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(b.closest('dialog'))));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => {
    if (e.target !== d || d.id === 'gameover-dialog') return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(d);
  }));
  // O game over não fecha com Esc: a pergunta precisa de resposta.
  $('gameover-dialog').addEventListener('cancel', e => e.preventDefault());

  $('tray').addEventListener('click', e => {
    if (e.target.closest('#add-chip')) { renderCatalog(); openDialog('add-dialog'); return; }
    const chip = e.target.closest('[data-task]');
    if (!chip) return;
    if (suppressClick) { suppressClick = false; return; }
    const uid = chip.dataset.task;
    if (selected === uid) { deselect(); document.querySelector(`[data-task="${uid}"]`)?.focus({ preventScroll: true }); }
    else select(uid, e.detail === 0);
  });
  $('picker').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.start !== undefined) {
      const uid = selected;
      if (place(uid, Number(b.dataset.day), Number(b.dataset.start)) && e.detail === 0) {
        const next = items().find(it => !week().plans.some(p => p.uid === it.uid));
        document.querySelector(`[data-task="${next ? next.uid : uid}"]`)?.focus({ preventScroll: true });
      }
    } else if (b.dataset.work) {
      const change = { 'extra+': { extra: 1 }, 'extra-': { extra: -1 }, 'lunch-off': { lunch: false }, 'lunch-on': { lunch: true }, 'lunch-': { lunchAt: -1 }, 'lunch+': { lunchAt: 1 } }[b.dataset.work];
      editWork(change);
      document.querySelector(`[data-work="${b.dataset.work}"]`)?.focus({ preventScroll: true });
    } else if (b.dataset.remove) removePlan(b.dataset.remove);
    else if (b.dataset.delete) deleteItem(b.dataset.delete);
    else if (b.dataset.closePicker !== undefined) {
      const uid = deselect();
      document.querySelector(`[data-task="${uid}"]`)?.focus({ preventScroll: true });
    }
  });
  $('catalog').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    const uid = b.dataset.cat;
    if (items().some(it => it.uid === uid)) deleteItem(uid);
    else { const c = E.catalogById(uid); if (c) addItem(E.itemFromCatalog(c)); }
    document.querySelector(`[data-cat="${uid}"]`)?.focus({ preventScroll: true });
  });
  $('custom-form').addEventListener('submit', e => {
    e.preventDefault();
    const it = E.customItem($('custom-name').value, $('custom-hours').value, `c${state.nextId}`, (state.nextId + 5) % E.COLORS);
    if (!it) { $('custom-status').textContent = 'Escreva o que é e quantas horas leva.'; return; }
    state.nextId += 1;
    if (addItem(it)) { $('custom-name').value = ''; $('custom-status').textContent = `${itemLabel(it)} entrou na lista.`; }
  });
  $('go-yes').addEventListener('click', () => answer(true));
  $('go-no').addEventListener('click', () => answer(false));
  $('go-again').addEventListener('click', againSixOne);
  $('go-lula').addEventListener('click', toLula);

  // Arrastar (mouse e toque): da lista para o calendário, ou algo já encaixado (inclusive o trabalho).
  function beginPointer(e, source, id) {
    pointer = { source, id, x0: e.clientX, y0: e.clientY, moved: false, pointerId: e.pointerId, touch: e.pointerType !== 'mouse' };
  }
  $('tray').addEventListener('pointerdown', e => {
    const chip = e.target.closest('[data-task]');
    if (!chip || e.button > 0 || state.mode !== 'playing') return;
    beginPointer(e, 'chip', chip.dataset.task);
  });
  board.addEventListener('pointerdown', e => {
    if (e.button > 0 || state.mode !== 'playing' || document.querySelector('dialog[open]')) return;
    const pt = boardPoint(e.clientX, e.clientY), hit = pt && blockAt(pt);
    beginPointer(e, 'board', hit ? hit.uid : null);
    pointer.pt = pt;
    try { board.setPointerCapture(e.pointerId); } catch { /* Sem captura, segue com eventos do documento. */ }
  });
  document.addEventListener('pointermove', e => {
    if (!pointer) {
      if (e.target === board && e.pointerType === 'mouse' && selected) { hover = boardPoint(e.clientX, e.clientY); drawBoard(); }
      return;
    }
    if (e.pointerId !== pointer.pointerId) return;
    if (!pointer.moved) {
      const dx = e.clientX - pointer.x0, dy = e.clientY - pointer.y0;
      if (!pointer.id || Math.hypot(dx, dy) < 8) return;
      // Na lista, arrastar para o lado rola a lista; para cima, leva o plano ao calendário.
      if (pointer.source === 'chip' && pointer.touch && Math.abs(dx) > Math.abs(dy)) { pointer = null; return; }
      pointer.moved = true;
      const ghost = $('drag-ghost');
      if (E.isWork(pointer.id)) { ghost.textContent = '💼 Dia de trabalho'; ghost.style.setProperty('--c', 'var(--work-ink)'); }
      else { const it = E.itemOf(items(), pointer.id); ghost.textContent = `${it.emoji} ${it.short} · ${it.hours}h`; ghost.style.setProperty('--c', `var(--plan-${it.color})`); }
      ghost.hidden = false;
      document.querySelector(`[data-task="${pointer.id}"]`)?.classList.add('dragging');
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
    if (state.mode !== 'playing') return;
    if (p.moved) {
      if (p.source === 'chip') suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      drop(p.id, boardPoint(e.clientX, e.clientY - (p.touch ? 27 : 0)));
    } else if (p.source === 'board') tapBoard(p.pt);
  });
  document.addEventListener('pointercancel', () => { if (pointer && pointer.moved) renderGame(); pointer = null; hover = null; $('drag-ghost').hidden = true; });
  board.addEventListener('pointerleave', () => { if (!pointer && hover) { hover = null; drawBoard(); } });

  $('undo-button').addEventListener('click', undo);
  $('finish-button').addEventListener('click', askFinish);
  $('confirm-finish').addEventListener('click', finish);
  $('replay-button').addEventListener('click', () => openDialog('restart-dialog'));
  $('confirm-restart').addEventListener('click', restart);
  document.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', openShare));
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
      const uid = deselect();
      document.querySelector(`[data-task="${uid}"]`)?.focus({ preventScroll: true });
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); undo(); }
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => drawBoard()).observe($('board-wrap'));
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    drawBoard();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.mode === 'results') { drawThumb('thumb-0', 0); drawThumb('thumb-1', 1); } }, 120);
  });
  document.addEventListener('visibilitychange', () => { lastTick = performance.now(); save(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawBoard(); });
  lastTick = performance.now();
  setInterval(tick, 250);

  // Ganchos de teste: estado em texto e geometria do calendário (px CSS, origem no canto superior esquerdo do canvas).
  window.render_game_to_text = () => {
    const rect = board.getBoundingClientRect(), wk = week();
    return JSON.stringify({
      mode: state.mode, round: state.round, introSeen: state.introSeen, clock: Math.round(state.clock * 10) / 10, scale: E.SCENARIOS[state.round].scale,
      candidate: who(state.round), selected, dialog: document.querySelector('dialog[open]')?.id || null, status: statusText, statusTone,
      storageAvailable: storageOK, historyLength: history.length,
      items: items().map(it => ({ uid: it.uid, name: it.name, hours: it.hours, custom: !it.ref })),
      week: wk, weeks: state.weeks, stats: [0, 1].map(r => (state.weeks[r] ? E.stats(r, state.weeks[r], items()) : null)),
      maxPlans: [E.maxPlans(0, items()), E.maxPlans(1, items())],
      options: selected && wk ? E.allOptions(state.round, wk, items(), selected) : [],
      board: geo && state.mode !== 'results' ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, firstHour: FIRST, ...geo } : null,
      share: { text: share.text, whatsapp: $('share-whatsapp').getAttribute('href'), imageBytes: share.size || 0, nativeShare: !$('share-native').hidden }
    });
  };
  // Avança o relógio da semana (para testes e para o cliente de automação).
  window.advanceTime = ms => { spend((ms || 0) / 1000); drawBoard(); return Promise.resolve(); };

  render();
  if (state.mode === 'gameover') showGameOver('time');
  else if (!state.introSeen) showHowto();
  if (!storageOK && state.mode === 'playing') say('Seu navegador não deixou salvar. Dá para jogar normalmente com a página aberta.');
})();
