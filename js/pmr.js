/* pmr.js — IIFE, vanilla, no deps
   Каждая зона = напряжение 5с -> отпускание 10с -> пауза 5с -> следующая.
   Всего 8 зон × 20с ≈ 12 минут с переходами.
   Тексты зон и инструкций берутся из data-атрибутов разметки (для RU/PL). */

(function () {
  var figure = document.getElementById('pmr-figure');
  var circle = document.getElementById('pmr-circle');
  var whichEl = document.getElementById('pmr-which');
  var nameEl = document.getElementById('pmr-name');
  var whatEl = document.getElementById('pmr-what');
  var secsEl = document.getElementById('pmr-secs');
  var instrEl = document.getElementById('pmr-instr');
  var btnStart = document.getElementById('pmr-start');
  var btnStop = document.getElementById('pmr-stop');
  if (!figure || !btnStart) return;

  var lang = (document.documentElement.getAttribute('lang') || 'ru').slice(0, 2);
  var L = lang === 'pl' ? {
    zoneOf: function (i, n) { return 'Strefa ' + i + ' z ' + n; },
    tense: 'Napnij ',
    release: 'Puść ',
    rest: 'Przerwa ',
    ready: 'Gotów? ',
    sec: ' sek',
    notice: 'Zauważ, gdzie ciągnie, gdzie pali.',
    diff: 'Zapamiętaj tę różnicę: to właśnie cel praktyki.',
    rest_p1: 'Przerwa. Oddychaj swobodnie.',
    rest_p2: 'Za kilka sekund: następna strefa.',
    done_which: 'Gotowe',
    done_name: 'Wszystkie 8 stref przeszły',
    done_text: 'Poleż jeszcze minutę. Zauważ, jak teraz czuje się ciało. Stało się inne.'
  } : {
    zoneOf: function (i, n) { return 'Зона ' + i + ' из ' + n; },
    tense: 'Напряги ',
    release: 'Отпусти ',
    rest: 'Передышка ',
    ready: 'Готов? ',
    sec: ' сек',
    notice: 'Заметь, где тянет, где жжёт.',
    diff: 'Запомни эту разницу: именно она и есть цель практики.',
    rest_p1: 'Передышка. Дыши свободно.',
    rest_p2: 'Через несколько секунд: следующая зона.',
    done_which: 'Готово',
    done_name: 'Все 8 зон пройдены',
    done_text: 'Полежи ещё минуту. Заметь, как сейчас чувствуется тело. Оно стало другим.'
  };

  var zoneEls = Array.prototype.slice.call(figure.querySelectorAll('.pmr-zone'));
  var ZONES = zoneEls.map(function (el) {
    return {
      name: el.getAttribute('data-name') || '',
      tense: el.getAttribute('data-tense') || '',
      release: el.getAttribute('data-release') || ''
    };
  });
  var TENSE_S = 5;
  var RELEASE_S = 10;
  var REST_S = 5;

  var state = { running: false, zone: 0, phase: 'idle', secLeft: 0, tickId: null };

  function paintZones() {
    zoneEls.forEach(function (z, i) {
      z.classList.remove('active', 'done');
      if (i < state.zone) z.classList.add('done');
      else if (i === state.zone) z.classList.add('active');
    });
  }

  function paintCircle() {
    circle.classList.remove('is-tense', 'is-release');
    if (state.phase === 'tense') circle.classList.add('is-tense');
    else if (state.phase === 'release') circle.classList.add('is-release');
  }

  function paintInstr() {
    var z = ZONES[state.zone];
    if (state.phase === 'tense') {
      instrEl.innerHTML = '<p>' + z.tense + '</p><p>' + L.notice + '</p>';
    } else if (state.phase === 'release') {
      instrEl.innerHTML = '<p>' + z.release + '</p><p>' + L.diff + '</p>';
    } else if (state.phase === 'rest') {
      instrEl.innerHTML = '<p>' + L.rest_p1 + '</p><p>' + L.rest_p2 + '</p>';
    }
  }

  function paintCard() {
    var z = ZONES[state.zone];
    whichEl.textContent = L.zoneOf(state.zone + 1, ZONES.length);
    nameEl.textContent = z.name;
    var labelMap = { tense: L.tense, release: L.release, rest: L.rest };
    var firstNode = whatEl.firstChild;
    if (firstNode && firstNode.nodeType === 3) {
      firstNode.textContent = labelMap[state.phase] || L.ready;
    }
    secsEl.textContent = state.running ? state.secLeft + L.sec : '';
  }

  function repaint() { paintZones(); paintCircle(); paintInstr(); paintCard(); }

  function startPhase(name, dur) {
    state.phase = name;
    state.secLeft = dur;
    repaint();
  }

  function tick() {
    state.secLeft -= 1;
    if (state.secLeft <= 0) {
      if (state.phase === 'tense')        startPhase('release', RELEASE_S);
      else if (state.phase === 'release') startPhase('rest',    REST_S);
      else if (state.phase === 'rest') {
        state.zone += 1;
        if (state.zone >= ZONES.length) { stop(true); return; }
        startPhase('tense', TENSE_S);
      }
    } else {
      paintCard();
    }
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.zone = 0;
    btnStart.classList.add('is-on'); btnStop.classList.remove('is-on');
    startPhase('tense', TENSE_S);
    state.tickId = setInterval(tick, 1000);
  }

  function stop(completed) {
    state.running = false;
    if (state.tickId) clearInterval(state.tickId);
    state.tickId = null;
    btnStart.classList.remove('is-on'); btnStop.classList.add('is-on');
    if (completed) {
      whichEl.textContent = L.done_which;
      nameEl.textContent = L.done_name;
      var firstNode = whatEl.firstChild;
      if (firstNode && firstNode.nodeType === 3) firstNode.textContent = '';
      secsEl.textContent = '';
      instrEl.innerHTML = '<p>' + L.done_text + '</p>';
      circle.classList.remove('is-tense', 'is-release');
    } else {
      state.phase = 'idle';
      repaint();
    }
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', function () { stop(false); });
  repaint();
})();
