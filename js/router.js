/* router.js — фильтр списка практик по тегам ситуаций */

(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.router-chip'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.pitem[data-tags]'));
  var clearBtn = document.getElementById('rb-clear');
  if (!chips.length || !items.length) return;

  var active = new Set();

  function apply() {
    items.forEach(function (item) {
      if (active.size === 0) {
        item.classList.remove('dim');
        return;
      }
      var tags = (item.getAttribute('data-tags') || '').split(/\s+/);
      var hit = tags.some(function (t) { return active.has(t); });
      item.classList.toggle('dim', !hit);
    });
    if (clearBtn) clearBtn.classList.toggle('shown', active.size > 0);
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var tag = chip.getAttribute('data-tag');
      if (active.has(tag)) {
        active.delete(tag);
        chip.classList.remove('active');
      } else {
        active.add(tag);
        chip.classList.add('active');
      }
      apply();
    });
  });

  if (clearBtn) clearBtn.addEventListener('click', function () {
    active.clear();
    chips.forEach(function (c) { c.classList.remove('active'); });
    apply();
  });
})();
