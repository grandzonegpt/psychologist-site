/* box-breathing.js — IIFE, vanilla, no deps
   Цикл 4-4-4-4 секунды × 6 повторений.
   Точка по периметру синхронизирована с текстом фазы. */

(function () {
  var PHASES = [
    { name: 'Вдох',     dur: 4 },
    { name: 'Задержка', dur: 4 },
    { name: 'Выдох',    dur: 4 },
    { name: 'Задержка', dur: 4 }
  ];
  var TOTAL_CYCLES = 6;

  var frame   = document.getElementById('box-frame');
  var labelEl = document.getElementById('phase-label');
  var countEl = document.getElementById('phase-count');
  var cycleEl = document.getElementById('cycle-now');
  var btnStart = document.getElementById('btn-start');
  var btnStop  = document.getElementById('btn-stop');

  if (!frame || !labelEl) return;

  var state = {
    running: false,
    phase: 0,
    cycle: 1,
    secLeft: 0,
    tickId: null
  };

  function render() {
    var p = PHASES[state.phase];
    labelEl.textContent = state.running ? p.name : 'Готов?';
    countEl.textContent = state.running ? state.secLeft : '—';
    cycleEl.textContent = state.cycle;
  }

  function tick() {
    state.secLeft -= 1;
    if (state.secLeft <= 0) {
      state.phase = (state.phase + 1) % PHASES.length;
      if (state.phase === 0) {
        state.cycle += 1;
        if (state.cycle > TOTAL_CYCLES) {
          stop(true);
          return;
        }
      }
      state.secLeft = PHASES[state.phase].dur;
    }
    render();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.phase = 0;
    state.cycle = 1;
    state.secLeft = PHASES[0].dur;
    frame.classList.add('is-running');
    btnStart.classList.add('is-on');
    btnStop.classList.remove('is-on');
    render();
    state.tickId = setInterval(tick, 1000);
  }

  function stop(completed) {
    state.running = false;
    if (state.tickId) clearInterval(state.tickId);
    state.tickId = null;
    frame.classList.remove('is-running');
    btnStart.classList.remove('is-on');
    btnStop.classList.add('is-on');
    if (completed) {
      labelEl.textContent = 'Готово';
      countEl.textContent = '✓';
    } else {
      render();
    }
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', function () { stop(false); });

  render();
})();
