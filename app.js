// FOLGA — interface: quem abre cai direto na semana 6×1 (com relógio e game over), depois pode
// experimentar a 5×2. Calendário em canvas no jeito de uma agenda, listas "pra sobreviver" e
// "pra viver", edição dos blocos do dia de trabalho, salvamento, resultado e compartilhamento.
(() => {
  'use strict';
  const E = window.FolgaEngine;
  const C_ = window.FolgaContent || { relatos: {}, videos: [], flavio: null };
  const $ = id => document.getElementById(id);
  const KEY = 'folga-v7';
  const FIRST = E.FIRST_HOUR, LAST = E.LAST_HOUR, ROWS = LAST - FIRST;
  const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif";
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fresh = () => ({ version: 7, mode: 'playing', round: 0, clock: E.CLOCK_SECONDS, introSeen: false, items: E.starterItems(), weeks: [E.newWeek(0), null], nextId: 1 });

  let state = fresh(), storageOK = true;
  let selected = null, part = null, tab = 'survive', history = [], statusText = '', statusTone = '';
  let pointer = null, hover = null, pop = null, geo = null, suppressClick = false, workTap = null, lastTick = 0;
  // Celular: visão da semana ou de um dia (como na agenda do celular); slotPick = horário tocado, à espera de um plano.
  let view = 'week', focusDay = 0, viewAnim = null, animFrame = 0, slotPick = null;
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
  const survivalItems = () => items().filter(it => it.kind === 'survive');
  const liveItems = () => items().filter(it => it.kind === 'live');
  const range = (a, b) => `${a}h–${b}h`;
  const isWide = () => window.matchMedia('(min-width: 820px)').matches;
  const timed = () => state.mode === 'playing' && state.round === 0;
  const itemLabel = it => `${it.emoji} ${it.name}`;
  const shortLabel = it => `${it.emoji} ${it.short}`;
  const placedOf = uid => (E.isWork(uid) ? week().work : week().plans).find(p => p.uid === uid);
  const spanOf = uid => E.spanOf(state.round, week(), items(), uid);
  const st = () => E.stats(state.round, week(), items());
  const liveLocked = () => !st().survivalDone;
  const scaleOf = round => E.SCENARIOS[round].scale;

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
      extra: v('extra'), commute: v('commute'), commuteInk: v('commute-ink'), lunch: v('routine'), lunchInk: v('routine-ink'), slot: v('slot'), slotFill: v('slot-fill'),
      bad: v('bad'), badFill: v('bad-fill'), planInk: v('plan-ink'), yellow: v('r0-yellow'), navy: v('r0-navy'), today: v('today'),
      week: [id(0), id(1)], plan: Array.from({ length: E.COLORS }, (_, i) => v(`plan-${i}`)) };
    return T;
  }

  // ---------- Desenho de uma semana (agenda, miniaturas e imagem de compartilhamento) ----------
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
  function fitText(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    while (text.length > 1 && g.measureText(`${text}…`).width > maxW) text = text.slice(0, -1);
    return `${text}…`;
  }
  // Evento no estilo de agenda: título e horário no alto do bloco; em bloco baixo, numa linha só.
  function eventText(g, r, title, time, color, s) {
    const pad = 4 * s, size = 10.5 * s;
    g.fillStyle = color; g.textAlign = 'left';
    if (r.h >= size * 2.6 + pad) {
      g.textBaseline = 'top'; g.font = `700 ${Math.round(size)}px ${SANS}`;
      g.fillText(fitText(g, title, r.w - pad * 2), r.x + pad, r.y + pad);
      if (time) { g.font = `500 ${Math.round(size * .9)}px ${SANS}`; g.fillText(fitText(g, time, r.w - pad * 2), r.x + pad, r.y + pad + size * 1.25); }
      return true;
    }
    const fs = Math.min(size, r.h + 2 * s);
    if (r.h < 7 * s || fs < 7.5 * s) return false;
    g.textBaseline = 'middle'; g.font = `700 ${Math.round(fs)}px ${SANS}`;
    g.fillText(fitText(g, time && r.w > 120 * s ? `${title} · ${time}` : title, r.w - pad * 2), r.x + pad, r.y + r.h / 2 + .5);
    return true;
  }
  // Colunas dos dias: na semana, sete iguais; no dia (celular), uma só ocupa a largura toda.
  function layoutCols(W, gx, v, f) {
    const cw = (W - gx) / 7;
    return Array.from({ length: 7 }, (_, d) => (v !== 'day' ? { x: gx + d * cw, w: cw } : d < f ? { x: gx, w: 0 } : d > f ? { x: W, w: 0 } : { x: gx, w: W - gx }));
  }
  function paintWeek(g, W, H, round, wk, list, o = {}) {
    const C = theme(), id = C.week[round], s = o.scale || 1;
    const gx = o.hours ? (o.gutter || 24) : 0, gy = o.headerH || 18;
    const cw = (W - gx) / 7, rh = (H - gy) / ROWS;
    const cols = o.cols || layoutCols(W, gx, 'week'), zoom = o.zoom || 0;
    const rad = Math.min(4 * s, cw / 6);
    const off = E.offDays(wk), shown = d => cols[d].w > 1;
    const labelsAt = d => o.labels && cols[d].w >= 70 * s;
    const box = (day, start, end) => {
      const c = cols[day], inset = Math.max(1, Math.min(2 * s, c.w * .05));
      return { x: c.x + inset, y: gy + (start - FIRST) * rh + inset, w: c.w - 2 * inset, h: (end - start) * rh - 2 * inset };
    };
    g.save();
    g.fillStyle = C.board; g.fillRect(0, 0, W, H);
    for (const d of off) { g.fillStyle = id.soft; g.fillRect(cols[d].x, gy, cols[d].w, ROWS * rh); }
    g.strokeStyle = C.grid; g.lineWidth = Math.max(1, s * .8);
    for (let h = 0; h <= ROWS; h++) { const y = Math.round(gy + h * rh) + .5; g.beginPath(); g.moveTo(gx, y); g.lineTo(W, y); g.stroke(); }
    for (let d = 1; d < 7; d++) {
      const x = Math.round(cols[d].x) + .5;
      if (x > gx + 1 && x < W - 1) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy + ROWS * rh); g.stroke(); }
    }
    if (o.hours) {
      g.fillStyle = C.hourInk; g.font = `${Math.round(9.5 * s)}px ${SANS}`; g.textAlign = 'right'; g.textBaseline = 'middle';
      const every = rh >= 14 * s ? 1 : 2;
      for (let h = 0; h < ROWS; h += every) g.fillText(`${FIRST + h}h`, gx - 4 * s, gy + (h + .5) * rh);
    }
    // Cabeçalho de agenda: dia da semana e número do dia; o domingo 25 é o dia do segundo turno.
    // Na visão do dia, o cabeçalho vira a faixa da semana: o dia em foco e quanto cada dia está ocupado.
    const busy = zoom > .01 ? E.blocks(round, wk, list) : [];
    for (let d = 0; d < 7; d++) {
      const x = gx + d * cw, cx = x + cw / 2, isOff = off.includes(d);
      const focused = zoom > .01 && d === o.focus;
      if (o.dates) {
        if (focused) { g.globalAlpha = zoom; g.fillStyle = C.ink; rr(g, x + 2 * s, 1, cw - 4 * s, gy - 2, 6 * s); g.fill(); g.globalAlpha = 1; }
        const onPill = focused && zoom > .5;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = onPill ? C.card : isOff ? id.main : C.dayInk; g.font = `800 ${Math.round(8.5 * s)}px ${SANS}`;
        g.fillText(o.letters ? E.SHORT_DAYS[d][0] : E.SHORT_DAYS[d], cx, gy * .27);
        const r = gy * .25, cy = gy * .62;
        if (d === E.ELECTION_DAY) { g.fillStyle = C.today; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.fillStyle = C.card; }
        else g.fillStyle = onPill ? C.card : isOff ? id.main : C.ink;
        g.font = `600 ${Math.round(gy * .34)}px ${SANS}`;
        g.fillText(String(E.DATES[d]), cx, cy + .5);
        if (zoom > .01) {
          // Barrinha de ocupação: trabalho, planos e o que sobra livre (6h–23h).
          const bx = x + 5 * s, bw = cw - 10 * s, by = gy - 4 * s, bh = 2.5 * s;
          g.globalAlpha = zoom;
          g.fillStyle = focused ? C.muted : C.grid; g.fillRect(bx, by, bw, bh);
          let at = bx;
          const mine = busy.filter(b => b.day === d).sort((a, b) => (a.kind === 'plan') - (b.kind === 'plan') || a.start - b.start);
          for (const b of mine) {
            const w = (b.end - b.start) / ROWS * bw;
            g.fillStyle = b.kind === 'plan' ? C.plan[E.itemOf(list, b.uid).color] : focused ? C.card : C.work;
            g.fillRect(at, by, w, bh); at += w;
          }
          if (o.optionDays && o.optionDays.has(d)) { g.fillStyle = C.slot; g.beginPath(); g.arc(x + cw - 6 * s, 5 * s, 2.5 * s, 0, Math.PI * 2); g.fill(); }
          g.globalAlpha = 1;
        }
      } else {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (isOff) { g.fillStyle = id.head; rr(g, x + 2 * s, 2 * s, cw - 4 * s, gy - 4 * s, rad); g.fill(); g.fillStyle = id.headInk; }
        else g.fillStyle = C.dayInk;
        g.font = `800 ${Math.round((o.dayFont || 9.5) * s)}px ${SANS}`;
        g.fillText(o.letters ? E.SHORT_DAYS[d][0] : E.SHORT_DAYS[d], cx, gy / 2 + .5);
      }
    }
    if (o.hours && zoom > .5) {
      // Canto: volta para a semana (grade de sete dias).
      g.fillStyle = C.dayInk; g.globalAlpha = (zoom - .5) * 2;
      const u = 3 * s, x0 = gx / 2 - 2 * u, y0 = gy / 2 - u * 1.2;
      for (let k = 0; k < 6; k++) g.fillRect(x0 + (k % 3) * u * 1.4, y0 + Math.floor(k / 3) * u * 1.4, u, u);
      g.globalAlpha = 1;
    }
    const lift = (uid, r) => {
      if (!(o.pop && o.pop.uid === uid)) return;
      const k = o.pop.k;
      g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(k, k); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    };
    for (const w of wk.work) {
      if (!shown(w.day)) continue;
      const hours = E.workHoursOf(round, w.uid), whole = box(w.day, w.start, w.start + E.workSpan(hours, w)), labels = labelsAt(w.day);
      g.save(); lift(w.uid, whole);
      for (const seg of E.workSegments(hours, w)) {
        const r = box(seg.day, seg.start, seg.end);
        g.fillStyle = { work: C.work, commute: C.commute, lunch: C.lunch }[seg.kind];
        rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
        if (seg.kind === 'work') {
          g.save(); rr(g, r.x, r.y, r.w, r.h, rad); g.clip(); g.strokeStyle = C.workHatch; g.lineWidth = s;
          for (let k = -r.h; k < r.w; k += 7 * s) { g.beginPath(); g.moveTo(r.x + k, r.y + r.h); g.lineTo(r.x + k + r.h, r.y); g.stroke(); }
          g.restore();
          if (labels) eventText(g, r, 'Trabalho', range(seg.start, seg.end), C.workInk, s);
        } else if (seg.kind === 'commute') {
          if (!(labels && eventText(g, r, `🚌 ${seg.part === 'tin' ? 'Ida' : 'Volta'}`, range(seg.start, seg.end), C.commuteInk, s))) {
            emojiAt(g, '🚌', r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .72, r.w * .5, 15 * s));
          }
        } else if (labels) {
          eventText(g, r, 'Almoço', range(seg.start, seg.end), C.lunchInk, s);
        }
        if (o.selected === w.uid && o.part && (seg.part === o.part || (o.part === seg.kind && seg.kind !== 'commute'))) {
          g.lineWidth = 2.5 * s; g.strokeStyle = C.yellow; rr(g, r.x, r.y, r.w, r.h, rad); g.stroke();
        }
      }
      if (w.extra) {
        const segs = E.workSegments(hours, w).filter(x => x.kind === 'work'), last = segs[segs.length - 1];
        const r = box(w.day, last.end - w.extra, last.end);
        g.fillStyle = C.extra; rr(g, r.x, r.y + r.h - Math.max(3 * s, r.h * .18), r.w, Math.max(3 * s, r.h * .18), rad); g.fill();
      }
      if (o.selected === w.uid) { g.lineWidth = 1.5 * s; g.strokeStyle = C.ink; rr(g, whole.x - 1, whole.y - 1, whole.w + 2, whole.h + 2, rad); g.stroke(); }
      g.restore();
    }
    for (const p of wk.plans) {
      const it = E.itemOf(list, p.uid);
      if (!it || !shown(p.day)) continue;
      const r = box(p.day, p.start, p.start + it.hours);
      g.save(); lift(p.uid, r);
      g.fillStyle = C.plan[it.color]; rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
      if (it.kind === 'survive') { g.fillStyle = C.ink; g.globalAlpha = .55; g.fillRect(r.x, r.y, Math.max(2, 3 * s), r.h); g.globalAlpha = 1; }
      if (o.selected === p.uid) { g.lineWidth = 2.5 * s; g.strokeStyle = C.ink; rr(g, r.x, r.y, r.w, r.h, rad); g.stroke(); }
      const title = `${it.emoji} ${cols[p.day].w >= 160 * s ? it.name : it.short}`;
      if (!(labelsAt(p.day) && eventText(g, r, title, range(p.start, p.start + it.hours), C.planInk, s))) {
        emojiAt(g, it.emoji, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .6, r.w * .6, (o.emoji || 20) * s));
      }
      g.restore();
    }
    if (o.region) {
      for (const seg of o.region) {
        if (!shown(seg.day)) continue;
        const r = box(seg.day, seg.start, seg.end);
        g.fillStyle = C.slotFill; rr(g, r.x, r.y, r.w, r.h, rad); g.fill();
        g.setLineDash([4 * s, 3 * s]); g.strokeStyle = C.slot; g.lineWidth = 1.6 * s; g.stroke(); g.setLineDash([]);
      }
    }
    if (o.draft && shown(o.draft.day)) {
      // Horário tocado: o espaço onde o próximo plano vai entrar.
      const r = box(o.draft.day, o.draft.hour, o.draft.hour + 1);
      g.fillStyle = C.slot; g.globalAlpha = .45; rr(g, r.x, r.y, r.w, r.h, rad); g.fill(); g.globalAlpha = 1;
    }
    if (o.preview && shown(o.preview.day)) {
      const pv = o.preview, r = box(pv.day, pv.start, pv.end);
      g.globalAlpha = .88;
      g.fillStyle = !pv.ok ? C.badFill : E.isWork(pv.uid) ? C.work : C.plan[E.itemOf(list, pv.uid).color];
      rr(g, r.x, r.y, r.w, r.h, rad); g.fill(); g.globalAlpha = 1;
      g.setLineDash([5 * s, 3 * s]); g.lineWidth = 2 * s; g.strokeStyle = pv.ok ? C.ink : C.bad; g.stroke(); g.setLineDash([]);
      emojiAt(g, E.isWork(pv.uid) ? '💼' : E.itemOf(list, pv.uid).emoji, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h * .5, r.w * .6, 20 * s));
    }
    g.restore();
    return { gx, gy, cw, rh, cols, zoom };
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
  const freeRunAt = (day, hour) => E.freeRuns(state.round, week(), items()).find(r => r.day === day && hour >= r.start && hour < r.end);
  function drawBoard() {
    if (state.mode === 'results') return;
    const { g, W, H } = fitCanvas(board);
    if (W < 20 || H < 20) return;
    if (view === 'day' && isWide()) { view = 'week'; viewAnim = null; }
    const big = W >= 520, gx = big ? 36 : 24;
    const dragId = pointer && pointer.moved ? pointer.id : null, focusId = dragId || selected;
    let popK = null;
    if (pop) {
      const p = Math.min(1, (performance.now() - pop.t0) / 240);
      popK = { uid: pop.uid, k: .72 + .28 * (1 - Math.pow(1 - p, 3)) + Math.sin(p * Math.PI) * .08 };
    }
    let cols = layoutCols(W, gx, view, focusDay), zoom = view === 'day' ? 1 : 0;
    if (viewAnim) {
      // Troca de visão: as colunas deslizam da posição antiga para a nova.
      const p = Math.min(1, (performance.now() - viewAnim.t0) / 260), e = 1 - Math.pow(1 - p, 3);
      cols = cols.map((c, d) => ({ x: viewAnim.cols[d].x + (c.x - viewAnim.cols[d].x) * e, w: viewAnim.cols[d].w + (c.w - viewAnim.cols[d].w) * e }));
      zoom = viewAnim.zoom + (zoom - viewAnim.zoom) * e;
      if (p < 1) { if (!animFrame) animFrame = requestAnimationFrame(() => { animFrame = 0; drawBoard(); }); } else viewAnim = null;
    }
    const region = focusId ? regionFor(focusId) : slotPick ? [freeRunAt(slotPick.day, slotPick.hour)].filter(Boolean) : null;
    geo = paintWeek(g, W, H, state.round, week(), items(), {
      hours: true, gutter: gx, headerH: big ? 40 : 30, labels: true, scale: big ? 1.05 : 1, emoji: big ? 22 : 18, dates: true,
      cols, zoom, focus: focusDay, optionDays: focusId && region ? new Set(region.map(r => r.day)) : null,
      selected, part, region, draft: slotPick,
      preview: focusId && hover ? previewFor(focusId, hover) : null, pop: popK });
  }
  const dayFree = d => E.freeRuns(state.round, week(), items()).filter(r => r.day === d).reduce((n, r) => n + r.end - r.start, 0);
  function setView(v, d = focusDay) {
    if (isWide()) v = 'week';
    if (v === view && d === focusDay) return;
    if (!reduceMotion && geo) viewAnim = { cols: geo.cols.map(c => ({ ...c })), zoom: geo.zoom, t0: performance.now() };
    const entering = v === 'day' && view === 'week';
    view = v; focusDay = d; slotPick = null; hover = null;
    if (v === 'day') {
      const n = dayFree(d);
      say(`${E.DAYS[d]}, ${E.DATES[d]}/10: ${n ? `${n}h livre${n > 1 ? 's' : ''}` : 'nenhuma hora livre'}.${entering ? ` Deslize para trocar de dia; toque em ${E.SHORT_DAYS[d]} para ver a semana.` : ''}`);
    } else say('A semana inteira. Toque num dia para ver de perto.');
    renderGame();
  }
  function headerTap(hp) {
    if (isWide()) return;
    if (hp.corner) { if (view === 'day') setView('week'); return; }
    if (view === 'week' || hp.day !== focusDay) setView('day', hp.day);
    else setView('week');
  }
  // O que cabe a partir do horário tocado: primeiro o básico; a lista pra viver só depois dele.
  function fitsAt(day, hour) {
    const out = [];
    for (const it of [...survivalItems(), ...(liveLocked() ? [] : liveItems())]) {
      const uid = E.nextInstance(week(), it);
      if (!uid) continue;
      const start = E.resolveStart(state.round, week(), items(), uid, day, hour);
      if (start !== null) out.push({ uid, it, start });
    }
    return out;
  }
  function openSlot(pt) {
    selected = null; part = null; slotPick = { day: pt.day, hour: pt.hour };
    const n = fitsAt(pt.day, pt.hour).length;
    const run = freeRunAt(pt.day, pt.hour), free = run ? ` (livre ${range(run.start, run.end)})` : '';
    say(n ? `${E.DAYS[pt.day]}, ${pt.hour}h${free}: escolha o que entra aqui.` : `${E.DAYS[pt.day]}, ${pt.hour}h${free}: não cabe nada que falta na lista.`, n ? '' : 'error');
    renderGame();
  }
  function animatePop() {
    drawBoard();
    if (pop && performance.now() - pop.t0 < 240) requestAnimationFrame(animatePop);
    else { pop = null; drawBoard(); }
  }
  function boardPoint(clientX, clientY) {
    if (!geo) return null;
    const rect = board.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    const day = geo.cols.findIndex(c => c.w > 1 && x >= c.x && x < c.x + c.w), hour = FIRST + Math.floor((y - geo.gy) / geo.rh);
    if (x > rect.width || day < 0 || hour < FIRST || hour >= LAST) return null;
    return { day, hour };
  }
  // Toque no cabeçalho: um dia da faixa da semana ou o canto (volta para a semana).
  function headerPoint(clientX, clientY) {
    if (!geo) return null;
    const rect = board.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    if (y < 0 || y >= geo.gy || x < 0 || x > rect.width) return null;
    if (x < geo.gx) return { corner: true };
    return { day: Math.min(6, Math.max(0, Math.floor((x - geo.gx) / geo.cw))) };
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
  const PARTS = {
    tin: 'Transporte de ida: 1h ou 2h. Dá para usar o mesmo em todos os dias.',
    tout: 'Transporte de volta: 1h ou 2h. Dá para usar o mesmo em todos os dias.',
    lunch: 'Almoço: mais cedo, mais tarde, de 1h ou 2h. Sem almoço, a CLT não deixa passar de 6h seguidas.',
    work: 'Trabalho: toque num espaço livre para mudar o horário ou o dia. Hora extra até 2h.'
  };
  function select(uid, fromKeyboard = false, newPart = null) {
    selected = uid; part = E.isWork(uid) ? (newPart || 'work') : null; workTap = null; slotPick = null;
    if (E.isWork(uid)) say(PARTS[part]);
    else {
      const it = E.itemOf(items(), uid), why = E.whyNoRoom(state.round, week(), items(), uid);
      const count = it.times > 1 ? ` (${E.placedCount(week(), it)} de ${it.times})` : '';
      if (why && !placedOf(uid)) say(why, 'error');
      else say(placedOf(uid) ? `Para mover, toque em outro espaço verde. ${it.name}${count}.` : `${itemLabel(it)}${count}: ${it.hours}h. Toque num espaço verde.`);
    }
    renderGame();
    if (fromKeyboard) { const p = $('picker'); (p.querySelector('.slot') || p.querySelector('.tool') || p.querySelector('.picker-close'))?.focus(); }
  }
  function deselect(message = 'Escolha outra coisa quando quiser.') {
    const uid = selected; selected = null; part = null; slotPick = null; say(message); renderGame();
    return uid;
  }
  function remember() { history.push(JSON.parse(JSON.stringify(week()))); if (history.length > 60) history.shift(); }
  function bump() { const score = $('score'); score.classList.remove('bump'); void score.offsetWidth; score.classList.add('bump'); }
  function chipFor(it) {
    if (it.kind === 'live' && liveLocked()) { say(`Primeiro, o que é pra sobreviver. ${missingText()}`, 'error'); tab = 'survive'; renderGame(); return; }
    const next = E.nextInstance(week(), it);
    const target = next || week().plans.filter(p => E.baseOf(p.uid) === it.uid).map(p => p.uid).pop();
    if (selected === target) { deselect(); return; }
    select(target);
  }
  function missingText() {
    const s = st();
    if (s.survivalDone) return '';
    return `Falta: ${E.joinList(s.missing.map(x => `${x.item.short.toLowerCase()}${x.item.times > 1 ? ` (${x.placed}/${x.times})` : ''}`))}.`;
  }
  function place(uid, day, start) {
    const wasDone = st().survivalDone;
    const result = E.move(state.round, week(), items(), uid, day, start);
    if (!result.ok) { say(result.reason, 'error'); drawBoard(); return false; }
    remember();
    state.weeks[state.round] = result.week;
    selected = null; part = null; hover = null; slotPick = null;
    const span = spanOf(uid), s = st();
    if (E.isWork(uid)) say(`Trabalho: ${E.DAYS[day].toLowerCase()}, ${range(start, start + span)}, com transporte.`, 'good');
    else {
      const it = E.itemOf(items(), uid), next = E.nextInstance(week(), it);
      if (next && it.times > 1) {
        // Plano que se repete: segue encaixando a próxima vez.
        selected = next;
        say(`${itemLabel(it)}: ${E.placedCount(week(), it)} de ${it.times}. Toque no próximo espaço.`, 'good');
      } else if (!wasDone && s.survivalDone) {
        tab = 'live';
        say(`Sobreviveu. Agora, viver: sobraram ${s.unplanned}h livres na semana.`, 'good');
      } else say(`${itemLabel(it)}: ${E.DAYS[day].toLowerCase()}, ${range(start, start + it.hours)}.`, 'good');
      bump();
    }
    save(); renderGame();
    if (!reduceMotion) { pop = { uid, t0: performance.now() }; requestAnimationFrame(animatePop); }
    return true;
  }
  const LAW_SOURCE = '<a href="https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm" target="_blank" rel="noopener noreferrer">CLT no Planalto</a>';
  function law(text, withFlavio) {
    $('law-text').textContent = text;
    $('law-flavio').textContent = withFlavio ? 'Na PEC 12/2026, que Flávio assina, o contrato individual pode valer mais que a convenção coletiva.' : '';
    $('law-source').innerHTML = `Fonte: ${LAW_SOURCE}${withFlavio ? ' · <a href="https://jornaldebrasilia.com.br/noticias/economia/entenda-as-propostas-pelo-fim-da-escala-6x1-de-flavio-bolsonaro-e-lula/" target="_blank" rel="noopener noreferrer">Jornal de Brasília, 7/10/2026</a>' : ''}.`;
    openDialog('law-dialog');
  }
  function editWork(change, all = false) {
    const uid = selected;
    const r = all ? E.editAllTransport(state.round, week(), items(), change.tin, change.tout) : E.editWork(state.round, week(), items(), uid, change);
    if (!r.ok) {
      if (r.code === 'clt71') { law(E.CLT71, true); say('A CLT não deixa: mais de 6h seguidas pede intervalo.', 'error', false); }
      else if (r.code === 'clt59') { law(E.CLT59, false); say('A CLT não deixa mais de 2h extras por dia.', 'error', false); }
      else say(r.reason, 'error');
      return;
    }
    remember();
    state.weeks[state.round] = r.week;
    const w = week().work.find(x => x.uid === uid), h = E.workHoursOf(state.round, uid);
    say(all ? `Transporte de ${change.tin}h na ida e ${change.tout}h na volta, em todos os dias de trabalho.`
      : `${E.DAYS[w.day]}: ida ${w.tin}h, ${h + w.extra}h de trabalho${w.extra ? ` (${w.extra}h extra)` : ''}, ${w.lunch ? `almoço de ${w.lunchLen}h` : 'sem almoço'}, volta ${w.tout}h.`, 'good');
    save(); renderGame();
  }
  function removePlan(uid) {
    if (!week().plans.some(p => p.uid === uid)) return;
    remember();
    state.weeks[state.round] = E.unplace(week(), uid);
    selected = null;
    say(`${itemLabel(E.itemOf(items(), uid))} saiu da semana.`); save(); renderGame();
  }
  function deleteItem(uid) {
    const it = E.itemOf(items(), uid);
    if (!it || it.kind !== 'live' || state.round !== 0) return;
    state.items = items().filter(x => x.uid !== uid);
    state.weeks = state.weeks.map(w => (w ? E.unplaceItem(w, uid) : w));
    history = []; if (selected && E.baseOf(selected) === uid) selected = null;
    say(`${itemLabel(it)} saiu da sua lista.`); save(); renderGame(); renderCatalog();
  }
  function addItem(it) {
    if (!it || items().length >= 50 || items().some(x => x.uid === it.uid)) return false;
    state.items = [...items(), it]; history = [];
    say(`${itemLabel(it)} entrou na lista "pra viver".`); save(); renderGame(); renderCatalog();
    return true;
  }
  function undo() {
    if (!history.length) return;
    state.weeks[state.round] = history.pop(); selected = null; part = null; slotPick = null;
    say('Desfeito.'); save(); renderGame();
  }
  function partAt(pt, uid) {
    const w = week().work.find(x => x.uid === uid);
    const seg = E.workSegments(E.workHoursOf(state.round, uid), w).find(x => pt.hour >= x.start && pt.hour < x.end);
    return seg ? (seg.part || seg.kind) : 'work';
  }
  function tapBoard(pt) {
    if (!pt) return;
    const hit = blockAt(pt);
    if (selected) {
      // Tocar no próprio bloco: no dia de trabalho, escolhe a parte tocada; num plano, solta.
      if (hit && hit.uid === selected) {
        if (E.isWork(selected)) select(selected, false, partAt(pt, selected));
        else deselect('Ficou no mesmo lugar.');
        return;
      }
      const start = E.resolveStart(state.round, week(), items(), selected, pt.day, pt.hour);
      if (start !== null) { place(selected, pt.day, start); return; }
      if (hit && E.isWork(hit.uid) && !E.isWork(selected) && workTap !== hit.uid) {
        // Primeiro toque no trabalho explica; o segundo seleciona o bloco para mexer.
        workTap = hit.uid; say(`${hit.reason} Para mexer nesse bloco, toque nele de novo.`, 'error'); drawBoard(); return;
      }
      if (hit) { select(hit.uid, false, E.isWork(hit.uid) ? partAt(pt, hit.uid) : null); return; }
      say(E.whyNotHere(state.round, week(), items(), selected, pt.day, pt.hour), 'error'); drawBoard(); return;
    }
    if (hit) { select(hit.uid, false, E.isWork(hit.uid) ? partAt(pt, hit.uid) : null); return; }
    openSlot(pt);
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
    const v = E.verdict(1, week(), items());
    if (v.code === 'all') { finish(); return; }
    $('finish-detail').textContent = v.code === 'survival' ? `Ainda falta o básico. ${missingText()}`
      : v.code === 'rest' ? `Você descansou ${v.stats.rest}h. O mínimo é ${E.REST_MIN}h.`
        : `Ficou de fora: ${E.joinList(v.stats.liveLeft.map(uid => itemLabel(E.itemOf(items(), uid))))}.`;
    openDialog('finish-dialog');
  }
  function finish() {
    closeDialog($('finish-dialog'));
    state.mode = 'results'; selected = null; history = []; share.ready = null; save(); render(); focusHeading();
  }

  // ---------- Game over da 6×1 ----------
  function gameOver(why) {
    if (state.mode !== 'playing' || state.round !== 0) return;
    state.mode = 'gameover'; selected = null; part = null; pointer = null; hover = null; slotPick = null;
    save(); renderGame(); showGameOver(why);
  }
  const extLink = (url, text) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}<span aria-hidden="true"> ↗</span></a>`;
  const flavioHTML = () => (C_.flavio ? `${C_.flavio.text} ${C_.flavio.sources.map(x => extLink(x.url, x.label)).join(' · ')}` : '');
  const verdictText = (round, v) => {
    const s = v.stats;
    if (v.code === 'survival') {
      const miss = s.missing.filter(x => x.item.uid !== 'nada');
      return { head: 'Faltou o básico.', detail: `${miss.length > 1 ? 'Ficaram' : 'Ficou'} de fora: ${E.joinList(miss.map(x => `${shortLabel(x.item)}${x.times > 1 ? ` (${x.placed} de ${x.times})` : ''}`))}.` };
    }
    if (v.code === 'rest') return { head: 'Faltou descanso.', detail: `Você sobreviveu, mas fez nada por só ${s.rest}h na semana. O mínimo é ${E.REST_MIN}h.` };
    if (v.code === 'live') return { head: 'Sobreviveu. Viver, não deu.', detail: `${s.liveLeft.length > 1 ? 'Ficaram' : 'Ficou'} de fora: ${E.joinList(s.liveLeft.map(uid => shortLabel(E.itemOf(items(), uid))))}.` };
    return { head: 'Coube tudo. No limite.', detail: `Sobraram ${s.unplanned}h livres na semana inteira.` };
  };
  function showGameOver(why = 'time') {
    const v = E.verdict(0, state.weeks[0], items()), t = verdictText(0, v);
    $('go-why').textContent = `${why === 'closed' ? 'Você fechou a semana.' : 'O tempo acabou.'} ${t.head}`;
    $('go-score').textContent = t.detail;
    const r = C_.relatos && C_.relatos[v.code];
    $('go-relato').hidden = !r;
    if (r) {
      $('go-quote').textContent = `“${r.quote}”`;
      $('go-who').innerHTML = `${r.who}. ${extLink(r.url, `${r.video ? '▶ ' : ''}${r.source}`)}`;
    }
    $('go-flavio').innerHTML = flavioHTML();
    $('go-flavio').hidden = !C_.flavio;
    const vids = C_.videos || [];
    $('go-videos').innerHTML = vids.length ? `<b>Assista:</b> ${vids.map(x => extLink(x.url, `▶ ${x.label} (${x.source})`)).join(' ')}` : '';
    $('go-videos').hidden = !vids.length;
    openDialog('gameover-dialog');
    // Foco no título, para nenhum botão parecer escolhido de antemão.
    $('go-title').focus({ preventScroll: true });
  }
  function againSixOne() {
    closeDialog($('gameover-dialog'));
    state.mode = 'playing'; state.clock = E.CLOCK_SECONDS; state.weeks = [E.newWeek(0), null]; history = []; tab = 'survive'; view = 'week'; viewAnim = null;
    lastTick = performance.now();
    say('Mais uma semana na 6×1. Segunda-feira começa tudo de novo.', 'error', false);
    save(); render(); focusHeading();
  }
  function toFiveTwo() {
    closeDialog($('gameover-dialog'));
    const carried = E.carryOver(state.weeks[0], 1, items());
    state.round = 1; state.weeks[1] = carried.week; state.mode = 'playing'; selected = null; part = null; history = []; share.ready = null; view = 'week'; viewAnim = null;
    tab = st().survivalDone ? 'live' : 'survive';
    say(`Escala 5×2: cinco dias de trabalho, um dia inteiro a mais pra você e sem relógio. Sobram ${st().unplanned}h livres.`);
    save(); render(); focusHeading();
  }
  const firstHint = () => (isWide()
    ? 'Comece pelo que é pra sobreviver: escolha na lista (ou arraste) e solte num espaço livre.'
    : 'Comece pelo que é pra sobreviver: toque na lista ou num horário livre.');
  function restart() {
    closeDialog($('restart-dialog'));
    state = fresh(); state.introSeen = true; selected = null; part = null; history = []; statusText = ''; share.ready = null; tab = 'survive'; view = 'week'; viewAnim = null; slotPick = null;
    lastTick = performance.now(); save(); render(); focusHeading();
  }
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
  function chipHTML(it) {
    const placed = E.placedCount(week(), it), done = placed >= it.times, locked = it.kind === 'live' && liveLocked();
    const p = it.times === 1 ? week().plans.find(x => E.baseOf(x.uid) === it.uid) : null;
    const meta = it.times > 1 ? `${placed}/${it.times}` : p ? `<span class="tick">✓ </span>${E.SHORT_DAYS[p.day]}<span class="hour"> ${p.start}h</span>` : `${it.hours}h`;
    const where = it.times > 1 ? `${placed} de ${it.times} encaixados` : p ? `${E.DAYS[p.day]}, ${range(p.start, p.start + it.hours)}` : 'fora da semana';
    const sel = selected && E.baseOf(selected) === it.uid;
    return `<button class="chip${done ? ' placed' : ''}${locked ? ' locked' : ''}" data-task="${it.uid}" style="--c: var(--plan-${it.color})" aria-pressed="${sel}" aria-label="${it.name}, ${it.hours} hora${it.hours > 1 ? 's' : ''}${it.times > 1 ? ` cada, ${it.times} vezes` : ''}, ${where}${locked ? ', bloqueado até sobreviver' : ''}">` +
      `<span class="emoji" aria-hidden="true">${locked ? '🔒' : it.emoji}</span><span class="name short">${it.short}</span><span class="name full">${it.name}</span>` +
      `<span class="meta">${meta}</span></button>`;
  }
  function renderGame() {
    const sc = E.SCENARIOS[state.round], s = st();
    document.body.dataset.round = String(state.round);
    $('week-scale').textContent = sc.scale;
    $('week-step').textContent = state.round ? 'Vida além do trabalho' : 'Com Flávio';
    $('band-icon-use').setAttribute('href', state.round ? '#star' : '#arminha');
    $('week-sub').textContent = `${sc.work.length} dias de trabalho · ${s.work}h · sobram ${s.free}h`;
    const surviveDone = survivalItems().reduce((n, it) => n + Math.min(E.placedCount(week(), it), it.times), 0);
    const surviveTotal = survivalItems().reduce((n, it) => n + it.times, 0);
    $('score').textContent = String(s.liveCount);
    $('score-total').textContent = `/${s.liveTotal}`;
    $('survive-count').textContent = `${surviveDone}/${surviveTotal}`;
    $('live-count').textContent = liveLocked() ? '🔒' : `${s.liveCount}/${s.liveTotal}`;
    $('tab-survive').setAttribute('aria-selected', String(tab === 'survive'));
    $('tab-live').setAttribute('aria-selected', String(tab === 'live'));
    $('tab-live').classList.toggle('locked', liveLocked());
    $('undo-button').disabled = history.length === 0;
    renderClock();
    const add = tab === 'live' && state.round === 0 && !liveLocked() ? '<button class="chip add-chip" id="add-chip" aria-label="Pôr mais coisas na lista"><span class="emoji" aria-hidden="true">＋</span><span class="name short">Mais coisas</span><span class="name full">Pôr mais coisas na lista</span></button>' : '';
    $('tray').innerHTML = add + (tab === 'survive' ? survivalItems() : liveItems()).map(chipHTML).join('');
    renderPicker(); renderAccessible();
    say(statusText || firstHint(), statusTone, false);
    drawBoard();
  }
  function renderPicker() {
    const picker = $('picker');
    $('dock').dataset.mode = selected || slotPick ? 'pick' : 'tray';
    picker.hidden = !(selected || slotPick);
    if (!selected && slotPick) { renderSlotPick(picker); return; }
    if (!selected) { picker.innerHTML = ''; return; }
    const work = E.isWork(selected), it = work ? null : E.itemOf(items(), selected);
    const span = spanOf(selected), cur = placedOf(selected);
    const slots = E.runStarts(state.round, week(), items(), selected);
    picker.style.setProperty('--c', work ? 'var(--work)' : `var(--plan-${it.color})`);
    let title = '', emoji = '', tools = '';
    if (work) {
      const h = E.workHoursOf(state.round, selected);
      if (part === 'tin' || part === 'tout') {
        const k = part, n = cur[k];
        emoji = '🚌'; title = `Transporte de ${k === 'tin' ? 'ida' : 'volta'} · ${n}h`;
        tools = `<button class="tool${n === 1 ? ' on' : ''}" data-work="${k}1">1h</button><button class="tool${n === 2 ? ' on' : ''}" data-work="${k}2">2h</button>` +
          `<button class="tool" data-work="all1">Todos os dias: 1h</button><button class="tool" data-work="all2">Todos os dias: 2h</button>`;
      } else if (part === 'lunch' && cur.lunch) {
        emoji = '🍽️'; title = `Almoço · ${cur.lunchLen}h`;
        tools = `<button class="tool" data-work="lunch-" aria-label="Almoço mais cedo">◀ Mais cedo</button><button class="tool" data-work="lunch+" aria-label="Almoço mais tarde">Mais tarde ▶</button>` +
          `<button class="tool${cur.lunchLen === 1 ? ' on' : ''}" data-work="len1">1h</button><button class="tool${cur.lunchLen === 2 ? ' on' : ''}" data-work="len2">2h</button><button class="tool" data-work="lunch-off">Tirar almoço</button>`;
      } else {
        emoji = '💼'; title = `Trabalho · ${h + cur.extra}h${cur.extra ? ` (${cur.extra}h extra)` : ''}`;
        tools = `<button class="tool" data-work="extra-" aria-label="Menos hora extra">− 1h</button><button class="tool" data-work="extra+" aria-label="Mais uma hora extra">+ 1h extra</button>` +
          (cur.lunch ? '' : '<button class="tool" data-work="lunch-on">Pôr almoço</button>');
      }
    } else {
      emoji = it.emoji;
      const k = Number(selected.split('.')[1]) + 1;
      title = it.times > 1 ? `${it.name} · ${k} de ${it.times}` : it.name;
    }
    picker.innerHTML = `<div class="picker-head"><span class="emoji" aria-hidden="true">${emoji}</span><b>${title}</b><span class="plan-hours">${work ? 'dia: ' : ''}${span}h</span><span class="spacer"></span>` +
      `<button class="picker-close" data-close-picker aria-label="Fechar">×</button></div>` +
      `<div class="slots" role="group" aria-label="${work ? 'Mexer no dia de trabalho' : 'Espaços livres'}">` + tools +
      (!work && cur ? `<button class="remove-button" data-remove="${selected}">Tirar da semana</button>` : '') +
      slots.map(o => `<button class="slot${cur && cur.day === o.day && cur.start === o.start ? ' current' : ''}" data-day="${o.day}" data-start="${o.start}" aria-label="${work ? 'Mover o dia para ' : ''}${E.DAYS[o.day]}, das ${o.start} às ${o.start + span} horas">${E.SHORT_DAYS[o.day]} ${range(o.start, o.start + span)}</button>`).join('') +
      (!slots.length && !cur ? '<p class="no-room">Libere espaço: toque em algo encaixado para mover ou tirar.</p>' : '') +
      (!work && it.kind === 'live' && state.round === 0 ? `<button class="remove-button ghost" data-delete="${it.uid}">Excluir da lista</button>` : '') +
      '</div>';
  }
  // Mesma altura da lista, para a agenda não pular quando a folha abre; o dia e a hora ficam no status.
  function renderSlotPick(picker) {
    const { day, hour } = slotPick, fits = fitsAt(day, hour), run = freeRunAt(day, hour);
    picker.style.setProperty('--c', 'var(--slot)');
    picker.innerHTML = `<div class="slots fits" role="group" aria-label="O que cabe em ${E.DAYS[day].toLowerCase()}, ${hour}h${run ? `, livre das ${run.start} às ${run.end}` : ''}">` +
      '<button class="picker-close fit-close" data-close-picker aria-label="Fechar">×</button>' +
      fits.map(f => `<button class="fit${f.it.kind === 'survive' ? ' basic' : ''}" data-fit="${f.uid}" data-day="${day}" data-start="${f.start}" style="--c: var(--plan-${f.it.color})" aria-label="${f.it.name}, das ${f.start} às ${f.start + f.it.hours} horas">` +
        `<span class="emoji" aria-hidden="true">${f.it.emoji}</span><span class="name">${f.it.short}</span><small>${range(f.start, f.start + f.it.hours)}</small></button>`).join('') +
      (fits.length ? '' : `<p class="no-room">Nada que falta cabe aqui. Toque em algo encaixado para mover ou tirar.</p>`) + '</div>';
  }
  function renderAccessible() {
    const all = E.blocks(state.round, week(), items()).map(b => ({ ...b, text: b.kind === 'plan' ? `${E.itemOf(items(), b.uid).name} (plano)` : { work: 'trabalho', commute: 'transporte', lunch: 'almoço' }[b.kind] }));
    $('accessible-board').innerHTML = `<h2>Agenda da semana ${scaleOf(state.round)}</h2>` + E.DAYS.map((name, d) => {
      const list = all.filter(b => b.day === d).sort((a, b) => a.start - b.start).map(b => `${range(b.start, b.end)} ${b.text.toLowerCase()}`);
      return `<p>${name}, ${E.DATES[d]} de outubro: ${list.length ? list.join('; ') : 'livre'}; 23h–6h sono.</p>`;
    }).join('');
    const s = st();
    board.setAttribute('aria-label', `Agenda da semana ${scaleOf(state.round)}: ${s.survivalDone ? 'tudo pra sobreviver encaixado' : 'falta o que é pra sobreviver'}, ${s.rest}h de descanso, ${s.liveCount} de ${s.liveTotal} planos pra viver. A agenda em texto vem logo depois.`);
  }
  function renderCatalog() {
    const has = new Set(items().map(it => it.uid));
    $('catalog').innerHTML = E.GROUPS.map(group => `<h3>${group}</h3><div class="cat-row">` + E.LIVING.filter(c => c.group === group).map(c =>
      `<button class="cat-chip" data-cat="${c.id}" aria-pressed="${has.has(c.id)}" style="--c: var(--plan-${c.color})"><span aria-hidden="true">${c.emoji}</span> ${c.name} <small>${c.hours}h</small></button>`).join('') + '</div>').join('') +
      (liveItems().some(it => !it.ref) ? `<h3>Seus itens</h3><div class="cat-row">${liveItems().filter(it => !it.ref).map(it =>
        `<button class="cat-chip" data-cat="${it.uid}" aria-pressed="true" style="--c: var(--plan-${it.color})"><span aria-hidden="true">${it.emoji}</span> ${it.name} <small>${it.hours}h</small></button>`).join('')}</div>` : '');
    $('catalog-count').textContent = `${liveItems().length} na lista pra viver · ${liveItems().reduce((n, it) => n + it.hours, 0)}h`;
  }
  function drawThumb(id, round) {
    const c = $(id); if (!c || !c.getBoundingClientRect().width || !state.weeks[round]) return;
    const { g, W, H } = fitCanvas(c);
    paintWeek(g, W, H, round, state.weeks[round], items(), { headerH: Math.max(14, W / 16), letters: true, dayFont: Math.max(8, W / 26), emoji: 16, scale: 1 });
    c.setAttribute('aria-label', `Semana ${scaleOf(round)}: ${state.weeks[round].plans.map(p => `${E.itemOf(items(), p.uid).name}, ${E.DAYS[p.day].toLowerCase()} ${p.start}h`).join('; ') || 'nenhum plano'}.`);
  }
  const shortVerdict = v => (v.code === 'survival' ? 'não deu pra sobreviver' : v.code === 'rest' ? 'sem descanso' : v.code === 'live' ? `viveu ${v.stats.liveCount} de ${v.stats.liveTotal}` : 'coube tudo');
  function renderResults() {
    const v0 = E.verdict(0, state.weeks[0], items()), v1 = E.verdict(1, state.weeks[1], items());
    const a = v0.stats, b = v1.stats, max0 = E.maxPlans(0, items()), max1 = E.maxPlans(1, items());
    $('results-title').innerHTML = `Na 6×1, ${shortVerdict(v0)}.<br>Na 5×2, ${shortVerdict(v1)}.`;
    $('score-0').innerHTML = `${a.liveCount}/${a.liveTotal}<small>${a.survivalDone ? 'pra viver' : 'faltou o básico'}</small>`;
    $('score-1').innerHTML = `${b.liveCount}/${b.liveTotal}<small>${b.survivalDone ? 'pra viver' : 'faltou o básico'}</small>`;
    const lines = [];
    const left = l => `${l.length > 1 ? 'ficaram' : 'ficou'} de fora:</b> ${l.map(uid => itemLabel(E.itemOf(items(), uid))).join(' · ')}`;
    if (a.liveLeft.length) lines.push(`<b>Na 6×1, ${left(a.liveLeft)}`);
    if (b.liveLeft.length) lines.push(`<b>Na 5×2, ainda ${left(b.liveLeft)}`);
    $('results-left').innerHTML = lines.join('<br>');
    let insight;
    if (max0 < 0) insight = 'Com a sua lista, na 6×1 nem o básico cabe, mesmo mexendo no trabalho.';
    else if (max0 < a.liveTotal) insight = `Com a sua lista, mesmo mexendo no trabalho e sem relógio, na 6×1 dá pra sobreviver e viver no máximo ${max0} de ${a.liveTotal}.`;
    else insight = `Sua lista cabe na 6×1, no limite: sobram ${a.free}h livres contra ${b.free}h na 5×2.`;
    insight += max1 >= b.liveTotal ? ' Na 5×2, cabe tudo. Não é falta de organização. É falta de tempo.' : ` Na 5×2, ${max1} de ${b.liveTotal}.`;
    $('results-insight').textContent = insight;
    $('results-flavio').innerHTML = flavioHTML();
    $('results-flavio').hidden = !C_.flavio;
    const gain = b.free - a.free;
    $('gain-hours').textContent = `${gain >= 0 ? '+' : ''}${gain}h`;
    $('gain-text').textContent = 'de vida além do trabalho por semana na 5×2, do jeito que você montou. E um dia inteiro a mais de folga.';
    drawThumb('thumb-0', 0); drawThumb('thumb-1', 1);
    prepareShare();
  }
  function focusHeading() {
    const el = $(state.mode === 'results' ? 'results-title' : 'week-title'); el.tabIndex = -1; el.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ---------- Compartilhar ----------
  function shareURL() {
    const host = location.hostname;
    const local = !host || host === 'localhost' || /^(127\.|10\.|192\.168\.)/.test(host) || host.endsWith('.local');
    return /^https?:$/.test(location.protocol) && !local ? location.origin + location.pathname.replace(/index\.html$/, '') : E.SITE_URL;
  }
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
  function sharePanel(g, round, x, y, w, boardH) {
    const C = theme(), wk = C.week[round], v = E.verdict(round, state.weeks[round], items()), headH = 104, h = headH + boardH + 124;
    g.save(); g.translate(x, y);
    g.fillStyle = C.card; rr(g, 0, 0, w, h, 20); g.fill();
    g.save(); rr(g, 0, 0, w, h, 20); g.clip();
    g.fillStyle = wk.main; g.fillRect(0, 0, w, headH);
    g.fillStyle = round ? wk.deep : C.yellow; g.fillRect(0, headH, w, 10);
    if (!round) { g.fillStyle = C.navy; g.fillRect(0, headH + 10, w, 7); }
    let tx = 24;
    if (round) { g.fillStyle = wk.on; drawStar(g, 52, headH / 2 + 2, 26); tx = 92; }
    const name = scaleOf(round);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = `80px ${DISPLAY}`;
    g.fillStyle = round ? wk.deep : C.navy; g.fillText(name, tx + 5, 89);
    g.fillStyle = round ? wk.on : C.yellow; g.fillText(name, tx, 84);
    g.font = `800 24px ${SANS}`; g.textAlign = 'right'; g.fillStyle = wk.on;
    g.fillText(round ? 'VIDA ALÉM DO TRABALHO' : 'COM FLÁVIO', w - 24, 62);
    g.restore();
    g.save(); g.translate(14, headH + 32);
    paintWeek(g, w - 28, boardH, round, state.weeks[round], items(), { hours: true, gutter: 44, headerH: 40, scale: 2.1, emoji: 15, dayFont: 9.5, letters: true });
    g.restore();
    const foot = v.code === 'survival' ? 'NÃO DEU PRA SOBREVIVER' : v.code === 'rest' ? 'SEM DESCANSO' : v.code === 'live' ? `VIVI ${v.stats.liveCount}/${v.stats.liveTotal}` : 'COUBE TUDO';
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink;
    fitFont(g, foot, 64, w - 40, DISPLAY);
    g.fillText(foot, w / 2, headH + boardH + 106);
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
    fitFont(g, 'NA 6×1 E NA 5×2', 96, W - 160, DISPLAY);
    g.fillText('NA 6×1 E NA 5×2', 80, 540);
    const panelY = 574, boardH = 560;
    const panelH = Math.max(sharePanel(g, 0, 70, panelY, 452, boardH), sharePanel(g, 1, W - 70 - 452, panelY, 452, boardH));
    let y = panelY + panelH + 72;
    const v0 = E.verdict(0, state.weeks[0], items());
    const left = v0.code === 'survival' ? v0.stats.missing.map(x => x.item) : liveItems().filter(it => v0.stats.liveLeft.includes(it.uid));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (left.length) {
      g.fillStyle = C.muted; g.font = `800 30px ${SANS}`; g.fillText(v0.code === 'survival' ? 'NA 6×1, FALTOU O BÁSICO:' : 'NA 6×1, FICOU DE FORA:', 80, y);
      g.fillStyle = C.ink; g.font = `700 40px ${SANS}, ${EMOJI}`;
      let lines = wrapItems(g, left.map(it => `${it.emoji} ${it.short}`), '  ·  ', W - 160);
      if (lines.length > 2) lines = wrapItems(g, left.map(it => it.emoji), '  ', W - 160);
      for (const line of lines.slice(0, 2)) { y += 54; g.fillText(line, 80, y); }
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
  // O game over não fecha com Esc: é preciso escolher o que fazer.
  $('gameover-dialog').addEventListener('cancel', e => e.preventDefault());
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.tab === 'live' && liveLocked()) { say(`Primeiro, o que é pra sobreviver. ${missingText()}`, 'error'); return; }
    tab = b.dataset.tab; selected = null; part = null; slotPick = null; renderGame();
  }));

  $('tray').addEventListener('click', e => {
    if (e.target.closest('#add-chip')) { renderCatalog(); openDialog('add-dialog'); return; }
    const chip = e.target.closest('[data-task]');
    if (!chip) return;
    if (suppressClick) { suppressClick = false; return; }
    chipFor(E.itemOf(items(), chip.dataset.task));
    if (e.detail === 0 && selected) { const p = $('picker'); (p.querySelector('.slot') || p.querySelector('.picker-close'))?.focus(); }
  });
  $('picker').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fit) { place(b.dataset.fit, Number(b.dataset.day), Number(b.dataset.start)); return; }
    if (b.dataset.start !== undefined) {
      const uid = selected;
      if (place(uid, Number(b.dataset.day), Number(b.dataset.start)) && e.detail === 0) {
        (selected ? $('picker').querySelector('.slot') : null)?.focus() || document.querySelector(`[data-task="${E.baseOf(uid)}"]`)?.focus({ preventScroll: true });
      }
    } else if (b.dataset.work) {
      const key = b.dataset.work;
      const changes = { 'extra+': { extra: 1 }, 'extra-': { extra: -1 }, 'lunch-off': { lunch: false }, 'lunch-on': { lunch: true }, 'lunch-': { lunchAt: -1 },
        'lunch+': { lunchAt: 1 }, len1: { lunchLen: 1 }, len2: { lunchLen: 2 }, tin1: { tin: 1 }, tin2: { tin: 2 }, tout1: { tout: 1 }, tout2: { tout: 2 } };
      if (key === 'all1' || key === 'all2') editWork({ tin: Number(key.slice(3)), tout: Number(key.slice(3)) }, true);
      else editWork(changes[key]);
      document.querySelector(`[data-work="${key}"]`)?.focus({ preventScroll: true });
    } else if (b.dataset.remove) removePlan(b.dataset.remove);
    else if (b.dataset.delete) deleteItem(b.dataset.delete);
    else if (b.dataset.closePicker !== undefined) deselect();
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
  $('go-again').addEventListener('click', againSixOne);
  $('go-52').addEventListener('click', toFiveTwo);

  // Arrastar (mouse e toque): da lista para a agenda, ou algo já encaixado (inclusive o trabalho).
  function beginPointer(e, source, id) {
    pointer = { source, id, x0: e.clientX, y0: e.clientY, moved: false, pointerId: e.pointerId, touch: e.pointerType !== 'mouse' };
  }
  $('tray').addEventListener('pointerdown', e => {
    const chip = e.target.closest('[data-task]');
    if (!chip || e.button > 0 || state.mode !== 'playing') return;
    const it = E.itemOf(items(), chip.dataset.task);
    if (it.kind === 'live' && liveLocked()) return;
    const id = E.nextInstance(week(), it) || week().plans.filter(p => E.baseOf(p.uid) === it.uid).map(p => p.uid).pop();
    beginPointer(e, 'chip', id);
  });
  board.addEventListener('pointerdown', e => {
    if (e.button > 0 || state.mode !== 'playing' || document.querySelector('dialog[open]')) return;
    const hp = headerPoint(e.clientX, e.clientY);
    const pt = hp ? null : boardPoint(e.clientX, e.clientY), hit = pt && blockAt(pt);
    beginPointer(e, hp ? 'header' : 'board', hit ? hit.uid : null);
    pointer.pt = pt; pointer.hp = hp;
    try { board.setPointerCapture(e.pointerId); } catch { /* Sem captura, segue com eventos do documento. */ }
  });
  document.addEventListener('pointermove', e => {
    if (!pointer) {
      if (e.target === board && e.pointerType === 'mouse' && selected) { hover = boardPoint(e.clientX, e.clientY); drawBoard(); }
      return;
    }
    if (e.pointerId !== pointer.pointerId || pointer.swipe) return;
    if (!pointer.moved) {
      const dx = e.clientX - pointer.x0, dy = e.clientY - pointer.y0;
      if (!pointer.id || Math.hypot(dx, dy) < 8) return;
      // Na visão do dia, arrastar para o lado troca o dia; para cima ou para baixo, muda o horário do bloco.
      if (pointer.source === 'board' && view === 'day' && Math.abs(dx) > Math.abs(dy)) { pointer.swipe = true; return; }
      // Na lista, arrastar para o lado rola a lista; para cima, leva o plano à agenda.
      if (pointer.source === 'chip' && pointer.touch && Math.abs(dx) > Math.abs(dy)) { pointer = null; return; }
      pointer.moved = true;
      const ghost = $('drag-ghost');
      if (E.isWork(pointer.id)) { ghost.textContent = '💼 Dia de trabalho'; ghost.style.setProperty('--c', 'var(--work-ink)'); }
      else { const it = E.itemOf(items(), pointer.id); ghost.textContent = `${it.emoji} ${it.short} · ${it.hours}h`; ghost.style.setProperty('--c', `var(--plan-${it.color})`); }
      ghost.hidden = false;
      document.querySelector(`[data-task="${E.baseOf(pointer.id)}"]`)?.classList.add('dragging');
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
    const dx = e.clientX - p.x0, dy = e.clientY - p.y0;
    if (p.moved) {
      if (p.source === 'chip') suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      drop(p.id, boardPoint(e.clientX, e.clientY - (p.touch ? 27 : 0)));
    } else if (p.source !== 'chip' && view === 'day' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setView('day', Math.min(6, Math.max(0, focusDay + (dx < 0 ? 1 : -1))));
    } else if (p.source === 'header') headerTap(p.hp);
    else if (p.source === 'board') tapBoard(p.pt);
  });
  document.addEventListener('pointercancel', () => { if (pointer && pointer.moved) renderGame(); pointer = null; hover = null; $('drag-ghost').hidden = true; });
  // Toque na agenda: sem o clique "fantasma" que o celular dispara depois, que podia cair num botão que mudou de lugar.
  board.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
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
    if (e.key === 'Escape' && (selected || slotPick)) deselect();
    else if (e.key === 'Escape' && view === 'day') setView('week');
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); undo(); }
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

  // Ganchos de teste: estado em texto e geometria da agenda (px CSS, origem no canto superior esquerdo do canvas).
  window.render_game_to_text = () => {
    const rect = board.getBoundingClientRect(), wk = week();
    return JSON.stringify({
      mode: state.mode, round: state.round, introSeen: state.introSeen, clock: Math.round(state.clock * 10) / 10, scale: scaleOf(state.round),
      tab, selected, part, view, focusDay, slotPick, fits: slotPick ? fitsAt(slotPick.day, slotPick.hour).map(f => f.uid) : [], dialog: document.querySelector('dialog[open]')?.id || null, status: statusText, statusTone,
      storageAvailable: storageOK, historyLength: history.length,
      items: items().map(it => ({ uid: it.uid, name: it.name, hours: it.hours, times: it.times, kind: it.kind, custom: !it.ref })),
      week: wk, weeks: state.weeks, stats: [0, 1].map(r => (state.weeks[r] ? E.stats(r, state.weeks[r], items()) : null)),
      verdict: [0, 1].map(r => (state.weeks[r] ? E.verdict(r, state.weeks[r], items()).code : null)),
      maxPlans: [E.maxPlans(0, items()), E.maxPlans(1, items())],
      options: selected && wk ? E.allOptions(state.round, wk, items(), selected) : [],
      board: geo && state.mode !== 'results' ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, firstHour: FIRST, ...geo } : null,
      share: { text: share.text, whatsapp: $('share-whatsapp').getAttribute('href'), imageBytes: share.size || 0, nativeShare: !$('share-native').hidden }
    });
  };
  window.advanceTime = ms => { spend((ms || 0) / 1000); drawBoard(); return Promise.resolve(); };

  render();
  if (state.mode === 'gameover') showGameOver('time');
  else if (!state.introSeen) showHowto();
  if (!storageOK && state.mode === 'playing') say('Seu navegador não deixou salvar. Dá para jogar normalmente com a página aberta.');
})();
