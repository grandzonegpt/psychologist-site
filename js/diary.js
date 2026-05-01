/* diary.js — IIFE, vanilla, no deps
   Локальное хранилище в localStorage. Шкала интенсивности — клик по pip.
   Текст автогенерируется по lang атрибуту на <html>. */

(function () {
  var STORAGE_KEY = 'levashou-diary-v1';
  var form = document.getElementById('diary-form');
  var scale = document.getElementById('diary-scale');
  var todayEl = document.getElementById('diary-today');
  var numEl = document.getElementById('diary-num');
  var dlBtn = document.getElementById('diary-download');
  if (!form) return;

  var lang = (document.documentElement.getAttribute('lang') || 'ru').slice(0, 2);
  var L = lang === 'pl' ? {
    locale: 'pl-PL',
    saved: 'Zapisano ✓',
    none: 'Na razie nie ma żadnych wpisów.',
    entry: 'Wpis',
    happened: 'Co się stało',
    thought: 'Myśl',
    feeling: 'Uczucie',
    reframe: 'Co zamiast tego'
  } : {
    locale: 'ru-RU',
    saved: 'Сохранено ✓',
    none: 'Пока нет ни одной записи.',
    entry: 'Запись',
    happened: 'Что произошло',
    thought: 'Мысль',
    feeling: 'Чувство',
    reframe: 'Что вместо'
  };

  var today = new Date();
  var fmt = today.toLocaleDateString(L.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  todayEl.textContent = fmt.charAt(0).toUpperCase() + fmt.slice(1);

  function readAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeAll(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  numEl.textContent = String(readAll().length + 1).padStart(2, '0');

  scale.addEventListener('click', function (e) {
    var pip = e.target.closest('.pip');
    if (!pip) return;
    var v = parseInt(pip.getAttribute('data-v'), 10);
    scale.setAttribute('data-value', v);
    Array.prototype.forEach.call(scale.querySelectorAll('.pip'), function (p) {
      var pv = parseInt(p.getAttribute('data-v'), 10);
      p.classList.toggle('on', pv <= v);
      p.classList.toggle('peak', pv === v);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var entry = {
      date: today.toISOString(),
      event: form.event.value.trim(),
      thought: form.thought.value.trim(),
      feeling: form.feeling.value.trim(),
      intensity: parseInt(scale.getAttribute('data-value'), 10) || 0,
      reframe: form.reframe.value.trim()
    };
    var list = readAll();
    list.push(entry);
    writeAll(list);
    form.reset();
    Array.prototype.forEach.call(scale.querySelectorAll('.pip'), function (p) {
      p.classList.remove('on'); p.classList.remove('peak');
    });
    scale.setAttribute('data-value', 0);
    numEl.textContent = String(list.length + 1).padStart(2, '0');
    var btn = form.querySelector('.save');
    var orig = btn.textContent;
    btn.textContent = L.saved;
    setTimeout(function () { btn.textContent = orig; }, 1600);
  });

  dlBtn.addEventListener('click', function () {
    var list = readAll();
    if (!list.length) { alert(L.none); return; }
    var txt = list.map(function (e, i) {
      return '— ' + L.entry + ' ' + (i + 1) + ' · ' + new Date(e.date).toLocaleDateString(L.locale) + ' —\n'
        + L.happened + ': ' + e.event + '\n'
        + L.thought + ': ' + e.thought + '\n'
        + L.feeling + ': ' + e.feeling + ' (' + e.intensity + '/10)\n'
        + L.reframe + ': ' + e.reframe + '\n';
    }).join('\n');
    var blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'thought-diary-' + today.toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
})();
