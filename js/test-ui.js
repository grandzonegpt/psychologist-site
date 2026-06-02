/* ============================================================
   test-ui.js : progressive enhancement for questionnaire pages.
   Adds a progress indicator and gates the submit button until all
   questions are answered. Reads radio state only; never changes
   values, scoring, or the existing submit handler. Safe no-op on
   pages without a .test-form.
   ============================================================ */
(function () {
  var form = document.querySelector('.test-form');
  if (!form) return;

  // mark hero + bottom-CTA sections so the warm styling can hook them
  var intro = document.querySelector('.test-intro');
  if (intro) { var hero = intro.closest('section'); if (hero) hero.classList.add('t-hero'); }
  var edu = document.querySelector('.test-edu');
  if (edu) {
    var sib = edu.nextElementSibling;
    if (sib && sib.tagName === 'SECTION') sib.classList.add('t-cta');
  }

  // collect radio groups in document order
  var radios = form.querySelectorAll('input[type="radio"]');
  if (!radios.length) return;
  var names = [];
  for (var i = 0; i < radios.length; i++) {
    if (names.indexOf(radios[i].name) === -1) names.push(radios[i].name);
  }
  var total = names.length;
  if (!total) return;

  var lang = (document.documentElement.getAttribute('lang') || 'ru').slice(0, 2).toLowerCase();
  var T = lang === 'pl'
    ? { q: 'Pytanie', of: 'z' }
    : { q: 'Вопрос', of: 'из' };

  // build progress element
  var prog = document.createElement('div');
  prog.className = 'test-progress';
  prog.innerHTML =
    '<div class="tp-row"><span class="tp-label"></span><span class="tp-count"></span></div>' +
    '<div class="tp-track"><div class="tp-fill"></div></div>';

  // place it above the first question (after the lead-in paragraph, if any)
  var firstTq = form.querySelector('.tq');
  if (firstTq) form.insertBefore(prog, firstTq);
  else form.insertBefore(prog, form.firstChild);

  var fill = prog.querySelector('.tp-fill');
  var label = prog.querySelector('.tp-label');
  var count = prog.querySelector('.tp-count');
  var submit = form.querySelector('.test-submit');

  function answered() {
    var n = 0;
    for (var j = 0; j < names.length; j++) {
      if (form.querySelector('input[name="' + names[j] + '"]:checked')) n++;
    }
    return n;
  }

  function update() {
    var a = answered();
    var current = a < total ? a + 1 : total;
    fill.style.width = Math.round((a / total) * 100) + '%';
    label.textContent = T.q + ' ' + current + ' ' + T.of + ' ' + total;
    count.textContent = a + ' / ' + total;
    if (submit) {
      if (a >= total) { submit.disabled = false; submit.classList.remove('is-disabled'); }
      else { submit.disabled = true; submit.classList.add('is-disabled'); }
    }
  }

  form.addEventListener('change', function (e) {
    if (e.target && e.target.type === 'radio') update();
  });

  update();
})();
