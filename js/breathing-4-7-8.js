/* breathing-4-7-8.js — IIFE, vanilla, no deps
   Цикл 4-7-8 секунд × 4 повторения.
   Круг с radial-gradient масштабируется через CSS class is-inhale/is-hold/is-exhale. */

(function () {
  var lang = (document.documentElement.getAttribute('lang') || 'ru').slice(0, 2);
  var L = lang === 'pl' ? {
    inhale: 'Wdech', hold: 'Zatrzymanie', exhale: 'Wydech',
    ready: 'Gotów?', done: 'Gotowe'
  } : {
    inhale: 'Вдох', hold: 'Задержка', exhale: 'Выдох',
    ready: 'Готов?', done: 'Готово'
  };

  var PHASES = [
    { name: L.inhale, dur: 4, cls: 'is-inhale' },
    { name: L.hold,   dur: 7, cls: 'is-hold'   },
    { name: L.exhale, dur: 8, cls: 'is-exhale' }
  ];
  var TOTAL_CYCLES = 4;

  var stage   = document.getElementById('breath-stage');
  var labelEl = document.getElementById('phase-label');
  var countEl = document.getElementById('phase-count');
  var cycleEl = document.getElementById('cycle-now');
  var btnStart = document.getElementById('btn-start');
  var btnStop  = document.getElementById('btn-stop');

  if (!stage || !labelEl) return;

  var state = { running: false, phase: 0, cycle: 1, secLeft: 0, tickId: null };

  function applyPhaseClass() {
    PHASES.forEach(function (p) { stage.classList.remove(p.cls); });
    if (state.running) stage.classList.add(PHASES[state.phase].cls);
  }

  function render() {
    var p = PHASES[state.phase];
    labelEl.textContent = state.running ? p.name : L.ready;
    countEl.textContent = state.running ? state.secLeft : '·';
    cycleEl.textContent = state.cycle;
  }

  function tick() {
    state.secLeft -= 1;
    if (state.secLeft <= 0) {
      state.phase = (state.phase + 1) % PHASES.length;
      if (state.phase === 0) {
        state.cycle += 1;
        if (state.cycle > TOTAL_CYCLES) { stop(true); return; }
      }
      state.secLeft = PHASES[state.phase].dur;
      applyPhaseClass();
    }
    render();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.phase = 0;
    state.cycle = 1;
    state.secLeft = PHASES[0].dur;
    applyPhaseClass();
    btnStart.classList.add('is-on'); btnStop.classList.remove('is-on');
    render();
    state.tickId = setInterval(tick, 1000);
  }

  function stop(completed) {
    state.running = false;
    if (state.tickId) clearInterval(state.tickId);
    state.tickId = null;
    applyPhaseClass();
    btnStart.classList.remove('is-on'); btnStop.classList.add('is-on');
    if (completed) { labelEl.textContent = L.done; countEl.textContent = '✓'; }
    else { render(); }
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', function () { stop(false); });
  render();
})();
