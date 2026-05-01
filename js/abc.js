/* abc.js — IIFE, vanilla, no deps
   Просто toggle на чипах + autosave в localStorage. */

(function () {
  var STORAGE_KEY = 'levashou-abc-draft';
  var form = document.getElementById('abc-form');
  var chipsRoot = document.getElementById('abc-distortions');
  if (!form || !chipsRoot) return;

  // restore draft
  try {
    var draft = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    if (draft.a) form.a.value = draft.a;
    if (draft.b) form.b.value = draft.b;
    if (draft.c) form.c.value = draft.c;
    (draft.distortions || []).forEach(function (k) {
      var chip = chipsRoot.querySelector('.dchip[data-key="' + k + '"]');
      if (chip) chip.classList.add('on');
    });
  } catch (e) {}

  function save() {
    var entry = {
      a: form.a.value,
      b: form.b.value,
      c: form.c.value,
      distortions: Array.prototype.map.call(
        chipsRoot.querySelectorAll('.dchip.on'),
        function (el) { return el.getAttribute('data-key'); }
      )
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  }

  form.addEventListener('input', save);
  chipsRoot.addEventListener('click', function (e) {
    var chip = e.target.closest('.dchip');
    if (!chip) return;
    chip.classList.toggle('on');
    save();
  });
})();
