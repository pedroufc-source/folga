(() => {
  'use strict';
  const E = window.FolgaEngine;
  const $ = id => document.getElementById(id);
  const KEY = 'folga-game-v2';
  const fresh = () => ({ version: 2, mode: 'intro', round: 0, weeks: [[], []], events: [false, false] });
  let state = fresh(), storageOK = true, selected = null, day = 0, history = [], statusText = 'Por onde você quer começar?', statusError = false;
  let board = null, drag = null, hover = null, eventAfter = null, resumeMode = null, mobileView = 'plans';
  try {
    const raw = localStorage.getItem(KEY);
    $('schedule-update').hidden = Boolean(raw) || !localStorage.getItem('folga-game-v1');
    let saved = null;
    try { saved = JSON.parse(raw || 'null'); } catch { /* An invalid save starts a new game. */ }
    state = E.validateSave(saved) || fresh();
  } catch { storageOK = false; }
  if (state.mode !== 'intro') { resumeMode = state.mode; state.mode = 'intro'; }
  const canvas = $('week-canvas'), ctx = canvas.getContext('2d');
  const narrow = () => window.matchMedia('(max-width: 760px)').matches;
  const placements = () => state.weeks[state.round];
  const activeEvent = () => state.events[state.round];
  const formatHour = hour => `${hour}h`;
  const timeRange = (start, end) => `${start}h–${end}h`;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, mode: resumeMode || state.mode })); }
    catch { storageOK = false; }
  }
  function message(text, error = false) {
    statusText = text; statusError = error;
    $('status').textContent = text; $('status').classList.toggle('error', error);
  }
  function focusHeading() {
    const target = state.mode === 'playing' ? $('week-title') : $(state.mode).querySelector('h1');
    target.tabIndex = -1; target.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function closeDialog(dialog) { if (dialog && dialog.open) dialog.close(); }
  function showDialog(id) { if (!$(`${id}`).open) $(id).showModal(); }
  function possible(id, targetDay) { return E.options(state.round, placements(), activeEvent(), id, targetDay); }
  function selectTask(id, shouldScroll = true) {
    selected = id;
    if (!possible(id, day).length) {
      const first = E.DAYS.findIndex((_, d) => possible(id, d).length);
      day = first >= 0 ? first : E.taskById(id).days[0];
    }
    const task = E.taskById(id);
    message(`${task.name}: ${task.note}`);
    renderGame();
    if (shouldScroll && narrow()) $('placement-picker').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function setDay(next) { day = next; renderGame(); }
  function remember() { history.push(placements().map(p => ({ ...p }))); if (history.length > 30) history.shift(); }
  function activateEvent(after = null) {
    if (activeEvent()) return false;
    const result = E.applyEvent(placements());
    state.events[state.round] = true;
    state.weeks[state.round] = result.placements;
    // Previous states may overlap the newly fixed event; start a new undo history.
    history = [];
    eventAfter = after;
    $('event-impact').textContent = result.removed.length
      ? `${result.removed.map(p => E.taskById(p.id).name).join(' e ')} voltou para os planos sem horário. Você pode tentar outro encaixe.`
      : 'Seus planos já encaixados continuam no lugar. A quarta passa a ter uma hora a menos disponível.';
    save(); renderGame(); showDialog('event-dialog');
    return true;
  }
  function place(id, targetDay, start) {
    const result = E.put(state.round, placements(), activeEvent(), id, targetDay, start);
    if (!result.ok) { message(result.reason, true); draw(); return false; }
    remember(); state.weeks[state.round] = result.placements; selected = null; day = targetDay;
    message(`${E.taskById(id).name}: ${E.DAYS[targetDay].toLowerCase()}, ${timeRange(start, result.placement.end)}. Encaixou!`);
    save(); renderGame();
    if (!activeEvent() && placements().length >= 3) activateEvent();
    return true;
  }
  function removeTask(id) {
    if (!placements().some(p => p.id === id)) return;
    remember(); state.weeks[state.round] = placements().filter(p => p.id !== id); selected = null;
    message(`${E.taskById(id).name} voltou para os planos sem horário.`); save(); renderGame();
    document.querySelector(`[data-task="${id}"]`)?.focus({ preventScroll: true });
  }
  function undo() {
    if (!history.length) return;
    state.weeks[state.round] = history.pop(); selected = null;
    message('Último encaixe desfeito.'); save(); renderGame();
  }
  function render() {
    for (const mode of ['intro', 'game', 'intermission', 'results']) $(mode).hidden = mode !== (state.mode === 'playing' ? 'game' : state.mode);
    if (state.mode === 'intro') {
      $('start-button').innerHTML = resumeMode ? 'Continuar minha partida <span aria-hidden="true">↗</span>' : 'Vamos encontrar tempo <span aria-hidden="true">↗</span>';
      $('fresh-button').hidden = !resumeMode;
    } else if (state.mode === 'playing') renderGame();
    else if (state.mode === 'intermission') renderFirst();
    else renderResults();
  }
  function renderGame() {
    $('game').dataset.mobileView = mobileView;
    $('show-plans').setAttribute('aria-pressed', String(mobileView === 'plans'));
    $('show-calendar').setAttribute('aria-pressed', String(mobileView === 'calendar'));
    const scenario = E.SCENARIOS[state.round];
    $('round-label').textContent = `SEMANA ${state.round + 1} DE 2 · ESCALA ${scenario.scale}`;
    $('week-title').textContent = state.round ? 'Um dia a mais para você.' : 'Faça a semana caber.';
    $('week-subtitle').textContent = `${scenario.workHours}h de trabalho · ${scenario.commuteHours}h de trajeto · ${state.round ? 'sábado e domingo de folga' : 'domingo de folga'}`;
    $('progress-count').innerHTML = `${placements().length}<span>/8</span>`;
    $('undo-button').disabled = history.length === 0;
    $('day-tabs').innerHTML = E.SHORT_DAYS.map((label, d) => `<button class="day-tab ${d === day ? 'active' : ''} ${selected && possible(selected, d).length ? 'available' : ''}" data-day="${d}" aria-label="${E.DAYS[d]}" aria-pressed="${d === day}">${label}</button>`).join('');
    $('tasks').innerHTML = E.TASKS.map(task => {
      const p = placements().find(p => p.id === task.id);
      return `<div class="task-row ${p ? 'placed' : ''} ${selected === task.id ? 'selected' : ''}" style="--task-color:${task.color}"><button class="task-main" data-task="${task.id}" aria-pressed="${selected === task.id}" aria-label="${task.name}, ${task.hours} horas${p ? `, ${E.DAYS[p.day]}, ${timeRange(p.start, p.end)}. Mover atividade` : '. Escolher horário'}"><span class="task-icon" aria-hidden="true">${task.icon}</span><span class="task-copy"><span class="task-name">${task.name}</span><span class="task-time">${p ? `${E.SHORT_DAYS[p.day]} · ${timeRange(p.start, p.end)}` : task.days.length === 7 ? 'Qualquer dia' : task.days.map(d => E.SHORT_DAYS[d]).join(' / ')}</span></span><span class="task-length" aria-hidden="true">${p ? '✓' : `${task.hours}h`}</span></button><button class="drag-handle" data-drag="${task.id}" aria-label="Arrastar ${task.name}; ou pressione Enter para escolher um horário">⠿</button></div>`;
    }).join('');
    renderPicker(); renderAgenda(); message(statusText, statusError); draw();
  }
  function renderPicker() {
    const picker = $('placement-picker');
    picker.hidden = !selected;
    if (!selected) { picker.innerHTML = ''; return; }
    const task = E.taskById(selected), slots = possible(selected, day);
    const placed = placements().some(p => p.id === selected);
    picker.innerHTML = `<h3>${task.name} · ${task.hours}h</h3><p>${task.note}</p><div class="picker-days" aria-label="Dia da atividade">${E.SHORT_DAYS.map((label, d) => `<button class="picker-day ${d === day ? 'active' : ''} ${possible(selected, d).length ? '' : 'no-slots'}" data-picker-day="${d}" aria-label="${E.DAYS[d]}${possible(selected, d).length ? ', com horários disponíveis' : ', sem encaixe disponível'}" aria-pressed="${d === day}">${label}</button>`).join('')}</div><p><b>${E.DAYS[day]}</b> · ${slots.length ? 'Começar às:' : 'Sem encaixe disponível.'}</p><div class="slot-buttons">${slots.map(start => `<button class="slot-button" data-start="${start}" aria-label="Encaixar ${task.name}, ${E.DAYS[day]}, das ${start} às ${start + task.hours} horas">${timeRange(start, start + task.hours)}</button>`).join('')}</div>${!slots.length ? '<p>Tente outro dia ou mova um plano já encaixado. Alguns planos podem ficar para depois.</p>' : ''}<div class="picker-meta">${placed ? `<button class="remove-button" data-remove="${task.id}">Retirar da semana</button>` : '<span></span>'}<button class="text-button" id="cancel-selection">Cancelar seleção</button></div>`;
  }
  function renderAgenda() {
    $('agenda-text').innerHTML = E.DAYS.map((label, d) => {
      const blocks = E.fixedBlocks(state.round, activeEvent()).concat(placements()).filter(p => p.day === d).sort((a, b) => a.start - b.start);
      return `<h3>${label}</h3><ul>${blocks.map(b => `<li>${timeRange(b.start, b.end)}: ${b.id ? E.taskById(b.id).name : b.label}</li>`).join('')}<li>23h–7h: sono</li></ul>`;
    }).join('');
  }
  function roundRect(x, y, width, height, radius = 4) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  }
  function textFit(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    while (text && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
    return text + '…';
  }
  function draw() {
    if (state.mode !== 'playing') return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = narrow(), shownDays = mobile ? [day] : [0, 1, 2, 3, 4, 5, 6];
    const left = 30, top = mobile ? 28 : 30, bottom = 20, row = (height - top - bottom) / 16;
    const col = (width - left - 4) / shownDays.length;
    board = { width, height, left, top, row, col, shownDays, mobile };
    ctx.fillStyle = '#fffef8'; ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';
    for (let n = 0; n < shownDays.length; n++) {
      const d = shownDays[n], x = left + n * col;
      ctx.fillStyle = d >= E.SCENARIOS[state.round].workDays ? '#f3f6e9' : '#faf9f2';
      ctx.fillRect(x + 2, top, col - 4, row * 16);
      ctx.fillStyle = '#526650'; ctx.font = mobile ? 'bold 11px Arial' : '10px Arial'; ctx.textAlign = 'center';
      const dailyHours = E.SCENARIOS[state.round].hoursPerDay[d];
      ctx.fillText(mobile ? E.DAYS[d].toUpperCase() : (dailyHours ? `${dailyHours}h trabalho` : 'FOLGA'), x + col / 2, 12);
    }
    for (let hour = 7; hour <= 23; hour++) {
      const y = top + (hour - 7) * row;
      ctx.strokeStyle = '#e9ebdf'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - 3, y); ctx.stroke();
      ctx.fillStyle = '#758173'; ctx.font = '9px Arial'; ctx.textAlign = 'right'; ctx.fillText(`${hour}h`, left - 7, y + 1);
    }
    const colors = { work: '#d8d2e7', commute: '#eac5a4', routine: '#e8e9e1', event: '#e7a17e' };
    const blocks = E.fixedBlocks(state.round, activeEvent()).concat(placements().map(p => ({ ...p, kind: 'plan' })));
    for (const b of blocks) {
      const n = shownDays.indexOf(b.day); if (n === -1) continue;
      const x = left + n * col + 3, y = top + (b.start - 7) * row + 1, w = col - 6, h = (b.end - b.start) * row - 2;
      const task = b.id && E.taskById(b.id);
      ctx.fillStyle = task ? task.color : colors[b.kind]; roundRect(x, y, w, h, 3); ctx.fill();
      if (b.kind === 'work') {
        ctx.save(); roundRect(x, y, w, h, 3); ctx.clip(); ctx.strokeStyle = '#ffffff38'; ctx.lineWidth = 1;
        for (let offset = -h; offset < w + h; offset += 9) { ctx.beginPath(); ctx.moveTo(x + offset, y + h); ctx.lineTo(x + offset + h, y); ctx.stroke(); }
        ctx.restore();
      }
      if (task && selected === task.id) { ctx.strokeStyle = '#234736'; ctx.lineWidth = 2; roundRect(x + 1, y + 1, w - 2, h - 2, 3); ctx.stroke(); }
      ctx.fillStyle = '#344936'; ctx.textAlign = 'center'; ctx.font = `${task ? 'bold ' : ''}${mobile ? 11 : 9}px Arial`;
      const label = task ? (mobile ? task.name : task.short) : (b.kind === 'routine' && !mobile ? (b.start === 12 ? 'Almoço' : 'Rotina') : b.label);
      const midY = y + h / 2;
      ctx.fillText(textFit(label, w - 7), x + w / 2, h > 44 ? midY - 7 : midY);
      if (h > 44) { ctx.font = `${mobile ? 10 : 8}px Arial`; ctx.fillStyle = '#57674f'; ctx.fillText(timeRange(b.start, b.end), x + w / 2, midY + 10); }
    }
    if (selected) {
      for (const d of shownDays) {
        const n = shownDays.indexOf(d);
        for (const start of possible(selected, d)) {
          const x = left + n * col + 4, y = top + (start - 7) * row + 2;
          ctx.fillStyle = '#c3da8659'; roundRect(x, y, col - 8, row - 4, 3); ctx.fill();
          ctx.strokeStyle = '#719146'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#3d642f'; ctx.textAlign = 'center'; ctx.font = mobile ? '10px Arial' : '9px Arial';
          ctx.fillText(mobile ? `+ começar às ${start}h` : '+', x + (col - 8) / 2, y + (row - 4) / 2);
        }
      }
    }
    if (hover && drag) {
      const n = shownDays.indexOf(hover.day), task = E.taskById(drag.id);
      if (n >= 0) {
        const valid = E.checkPlacement(state.round, placements(), activeEvent(), drag.id, hover.day, hover.start).ok;
        const y = top + (hover.start - 7) * row;
        ctx.save(); ctx.beginPath(); ctx.rect(left, top, width - left, row * 16); ctx.clip();
        ctx.fillStyle = valid ? '#3e795350' : '#b3523e50'; ctx.fillRect(left + n * col + 3, y, col - 6, task.hours * row);
        ctx.restore();
      }
    }
  }
  function boardPoint(clientX, clientY) {
    if (!board) return null;
    const rect = canvas.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    const colIndex = Math.floor((x - board.left) / board.col);
    if (colIndex < 0 || colIndex >= board.shownDays.length || y < board.top || y >= board.top + 16 * board.row) return null;
    return { day: board.shownDays[colIndex], start: 7 + Math.floor((y - board.top) / board.row) };
  }
  function renderFirst() {
    const stats = E.stats(0, state.weeks[0]);
    $('first-result').innerHTML = `<div class="first-summary"><span class="big-count">${stats.count}<small>/8</small></span><p>planos encontraram um lugar na semana.<br>${stats.left.length ? 'Nem tudo precisa virar obrigação. Veja o que ficou sem horário.' : 'Todos os planos encontraram um horário.'}</p></div>${stats.left.length ? `<div class="left-plans">${stats.left.map(id => `<span class="plan-pill">${E.taskById(id).name}</span>`).join('')}</div>` : ''}`;
  }
  function resultCard(round) {
    const s = E.stats(round, state.weeks[round]);
    return `<article class="result-card ${round ? 'second' : ''}"><div class="result-card-top"><span>${round ? 'DUAS FOLGAS' : 'UMA FOLGA'}</span><strong>${E.SCENARIOS[round].scale}</strong></div><span class="big-count">${s.count}<small>/8</small></span><p>planos encaixados · ${s.planned}h</p><div class="result-squares" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i class="${i < s.count ? '' : 'empty'}"></i>`).join('')}</div><p>${s.available}h disponíveis na semana<br>${s.unallocated}h continuaram sem plano</p></article>`;
  }
  function renderResults() {
    const a = E.stats(0, state.weeks[0]), b = E.stats(1, state.weeks[1]);
    $('time-gain').textContent = `+${b.available - a.available}h`;
    $('time-gain-description').textContent = `Neste cenário: ${a.work - b.work}h a menos de trabalho + ${a.commute - b.commute}h a menos de trajeto. O sábado passa a ser um dia inteiro sem trabalho.`;
    const diff = b.count - a.count;
    $('results-lead').textContent = diff > 0 ? `Na segunda semana, você encaixou ${diff} ${diff === 1 ? 'plano a mais' : 'planos a mais'}. Veja o que mudou na sua organização.` : diff === 0 ? 'Você encaixou a mesma quantidade de planos nas duas semanas. Veja como o tempo disponível mudou.' : 'Você encaixou menos planos na segunda semana. Ter mais tempo disponível permite outros encaixes, mas as escolhas também contam.';
    $('comparison').innerHTML = resultCard(0) + resultCard(1);
    $('plan-comparison').innerHTML = `<table class="plan-table"><caption class="eyebrow">O QUE ENCONTROU LUGAR</caption><thead><tr><th scope="col">SEUS PLANOS</th><th scope="col">6×1</th><th scope="col">5×2</th></tr></thead><tbody>${E.TASKS.map(task => `<tr><th scope="row">${task.name}</th>${[0, 1].map(r => { const p = state.weeks[r].find(item => item.id === task.id); return `<td class="${p ? 'included' : 'excluded'}">${p ? `✓ ${E.SHORT_DAYS[p.day]} ${p.start}h` : 'Ficou de fora'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    const rows = [['Trabalho', 'work'], ['Deslocamento', 'commute'], ['Sono', 'sleep'], ['Rotina básica', 'routine'], ['Imprevisto', 'event'], ['Disponíveis para planos', 'available'], ['Horas planejadas por você', 'planned'], ['Horas disponíveis sem plano', 'unallocated']];
    $('hours-table').innerHTML = `<table class="hours-table"><thead><tr><th scope="col">168h NA SEMANA</th><th scope="col">6×1</th><th scope="col">5×2</th></tr></thead><tbody>${rows.map(([name, key]) => `<tr><th scope="row">${name}</th><td>${a[key]}h</td><td>${b[key]}h</td></tr>`).join('')}</tbody></table>`;
  }
  function askFinish() {
    if (!activeEvent()) { activateEvent('finish'); return; }
    const count = placements().length;
    $('finish-detail').textContent = `Você encaixou ${count} de 8 planos. ${count < 8 ? 'Os que ficaram de fora aparecerão na comparação. Você pode continuar tentando ou seguir com essa semana.' : 'Todos encontraram um lugar. Vamos ver o resultado?'}`;
    showDialog('finish-dialog');
  }
  function finish() {
    closeDialog($('finish-dialog')); state.mode = state.round ? 'results' : 'intermission';
    selected = null; history = []; save(); render(); focusHeading();
  }
  function start() {
    if (resumeMode) { state.mode = resumeMode; resumeMode = null; }
    else state.mode = 'playing';
    save(); render(); focusHeading();
    if (!storageOK && state.mode === 'playing') message('Seu navegador não permitiu salvar. Você pode jogar normalmente enquanto esta página estiver aberta.');
  }
  function restart() {
    closeDialog($('restart-dialog')); state = fresh(); state.mode = 'playing'; resumeMode = null; selected = null; history = []; day = 0; mobileView = 'plans';
    message('Uma nova semana. Por onde você quer começar?'); save(); render(); focusHeading();
  }
  function shareText() {
    const a = E.stats(0, state.weeks[0]), b = E.stats(1, state.weeks[1]);
    const squares = n => '🟩'.repeat(n) + '⬜'.repeat(8 - n);
    let text = `FOLGA ✳ A vida cabe na semana?\n\n6×1 · ${a.count}/8 planos\n${squares(a.count)}\n5×2 · ${b.count}/8 planos\n${squares(b.count)}\n\nNeste jogo: ${a.work}h → ${b.work}h de trabalho por semana.\nO que você faria com mais tempo livre?`;
    const host = location.hostname;
    const local = !host || host === 'localhost' || host === '[::1]' || host.endsWith('.local') || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (['https:', 'http:'].includes(location.protocol) && !local) text += `\n${location.origin + location.pathname}`;
    return text;
  }
  $('start-button').addEventListener('click', start);
  $('home-button').addEventListener('click', () => {
    if (state.mode === 'intro') return;
    resumeMode = state.mode; state.mode = 'intro'; selected = null; render(); focusHeading();
  });
  for (const button of document.querySelectorAll('[data-about], #about-button')) button.addEventListener('click', () => showDialog('about-dialog'));
  for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', e => {
    const rect = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) && dialog.id !== 'event-dialog') closeDialog(dialog);
  });
  $('show-plans').addEventListener('click', () => { mobileView = 'plans'; renderGame(); });
  $('show-calendar').addEventListener('click', () => { mobileView = 'calendar'; renderGame(); });
  $('day-tabs').addEventListener('click', e => {
    const button = e.target.closest('[data-day]');
    if (button) { const value = button.dataset.day; setDay(Number(value)); document.querySelector(`[data-day="${value}"]`)?.focus({ preventScroll: true }); }
  });
  $('tasks').addEventListener('click', e => {
    const button = e.target.closest('[data-task], [data-drag]');
    if (button && !drag) {
      selectTask(button.dataset.task || button.dataset.drag);
      if (e.detail === 0) $('placement-picker').querySelector('.picker-day.active')?.focus();
    }
  });
  $('placement-picker').addEventListener('click', e => {
    const button = e.target.closest('button'); if (!button) return;
    if (button.dataset.pickerDay !== undefined) {
      const value = button.dataset.pickerDay; setDay(Number(value));
      document.querySelector(`[data-picker-day="${value}"]`)?.focus({ preventScroll: true });
    }
    else if (button.dataset.start !== undefined) {
      const id = selected;
      if (place(selected, day, Number(button.dataset.start)) && !$('event-dialog').open) {
        const next = E.TASKS.find(task => !placements().some(p => p.id === task.id));
        const target = document.querySelector(`[data-task="${next ? next.id : id}"]`);
        if (target) target.focus({ preventScroll: true });
      }
    }
    else if (button.dataset.remove) removeTask(button.dataset.remove);
    else if (button.id === 'cancel-selection') {
      const id = selected; selected = null; message('Escolha outro plano quando quiser.'); renderGame();
      document.querySelector(`[data-task="${id}"]`)?.focus({ preventScroll: true });
    }
  });
  canvas.addEventListener('click', e => {
    if (drag || document.querySelector('dialog[open]')) return;
    const point = boardPoint(e.clientX, e.clientY); if (!point) return;
    if (selected) { place(selected, point.day, point.start); return; }
    const p = placements().find(item => item.day === point.day && point.start >= item.start && point.start < item.end);
    if (p) selectTask(p.id, false);
    else { day = point.day; message('Escolha um plano na lista para encontrar um horário.'); renderGame(); }
  });
  $('tasks').addEventListener('pointerdown', e => {
    const handle = e.target.closest('[data-drag]');
    if (!handle || e.button !== 0) return;
    drag = { id: handle.dataset.drag, startX: e.clientX, startY: e.clientY, moving: false, pointerId: e.pointerId };
    handle.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moving && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 7) return;
    e.preventDefault();
    drag.moving = true; selected = drag.id;
    $('drag-ghost').hidden = false; $('drag-ghost').textContent = `${E.taskById(drag.id).name} · ${E.taskById(drag.id).hours}h`;
    $('drag-ghost').style.left = `${e.clientX}px`; $('drag-ghost').style.top = `${e.clientY}px`;
    hover = boardPoint(e.clientX, e.clientY); draw();
    if (e.clientY < 70) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
  }, { passive: false });
  document.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const current = drag, point = boardPoint(e.clientX, e.clientY);
    $('drag-ghost').hidden = true; hover = null;
    // Defer reset so the synthetic click following pointerup cannot select the task again.
    if (current.moving) {
      if (point) place(current.id, point.day, point.start);
      else { message('Solte sobre um horário do calendário, ou escolha um horário pelos botões.'); renderGame(); }
    } else selectTask(current.id);
    setTimeout(() => { drag = null; draw(); }, 0);
  });
  document.addEventListener('pointercancel', () => { drag = null; hover = null; $('drag-ghost').hidden = true; draw(); });
  $('undo-button').addEventListener('click', undo);
  $('finish-button').addEventListener('click', askFinish);
  $('confirm-finish').addEventListener('click', finish);
  function eventClosed() {
    const after = eventAfter; eventAfter = null;
    if (after === 'finish') askFinish();
    else { message('Imprevisto anotado. Você pode reorganizar seus planos.'); renderGame(); }
  }
  $('event-ok').addEventListener('click', () => closeDialog($('event-dialog')));
  $('event-dialog').addEventListener('close', eventClosed);
  $('next-button').addEventListener('click', () => {
    state.round = 1; state.mode = 'playing'; day = 5; selected = null; history = []; mobileView = 'plans';
    message('Os mesmos planos. Agora o sábado também está livre do trabalho.'); save(); render(); focusHeading();
  });
  for (const id of ['fresh-button', 'replay-button']) $(id).addEventListener('click', () => showDialog('restart-dialog'));
  $('confirm-restart').addEventListener('click', restart);
  $('share-button').addEventListener('click', () => { $('share-text').value = shareText(); $('copy-status').textContent = 'O compartilhamento só acontece quando você copiar e enviar o texto.'; showDialog('share-dialog'); });
  $('copy-button').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('share-text').value); $('copy-status').textContent = 'Copiado. Pronto para colar onde você quiser.'; }
    catch { $('share-text').focus(); $('share-text').select(); $('copy-status').textContent = 'Selecionei o texto. Use Copiar no seu dispositivo (⌘C no Mac).'; }
  });
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  new ResizeObserver(() => draw()).observe($('canvas-wrap'));
  window.addEventListener('resize', draw);
  window.render_game_to_text = () => JSON.stringify({
    mode: state.mode, round: state.round + 1, scenario: E.SCENARIOS[state.round], day: E.DAYS[day], mobileView,
    selected, eventActive: activeEvent(), dialog: document.querySelector('dialog[open]')?.id || null,
    plans: E.TASKS.map(t => ({ id: t.id, name: t.name, hours: t.hours, days: t.days.map(d => E.DAYS[d]), window: timeRange(t.from, t.to), scheduled: placements().find(p => p.id === t.id) || null })),
    choices: selected ? E.DAYS.map((name, d) => ({ day: name, dayIndex: d, starts: possible(selected, d) })) : [],
    weeks: state.weeks, stats: state.weeks.map((w, r) => E.stats(r, w, state.events[r])),
    message: statusText, storageAvailable: storageOK,
    board: board ? { origin: 'canvas top left; x right, y down; CSS pixels; hours 7–23', ...board } : null
  });
  window.advanceTime = () => { draw(); return Promise.resolve(); };
  render();
})();
