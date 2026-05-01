/* grounding-5-4-3-2-1.js — IIFE, vanilla, no deps
   Не таймер — пошаговый прогресс по органам чувств.
   Юзер сам отмечает каждый чип; когда все на шаге отмечены — шаг done и активным становится следующий. */

(function () {
  var steps = Array.prototype.slice.call(document.querySelectorAll('.gstep'));
  if (!steps.length) return;

  function refresh() {
    var firstActiveSet = false;
    steps.forEach(function (step) {
      var chips = step.querySelectorAll('.gchip');
      var checked = step.querySelectorAll('.gchip.checked').length;
      var total = chips.length;
      var statusEl = step.querySelector('.gstatus');

      step.classList.remove('active', 'done');

      if (checked === total && total > 0) {
        step.classList.add('done');
        if (statusEl) statusEl.textContent = 'Готово';
      } else if (!firstActiveSet) {
        step.classList.add('active');
        if (statusEl) statusEl.textContent = checked + ' / ' + total;
        firstActiveSet = true;
      } else {
        if (statusEl) statusEl.textContent = checked + ' / ' + total;
      }
    });
  }

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.gchip');
    if (!chip) return;
    chip.classList.toggle('checked');
    refresh();
  });

  refresh();
})();
