/* Hand-drawn underline for the key word in the hero title (rough-notation). */
(function () {
  function run() {
    var el = document.querySelector('.hero-annotate');
    if (!el || !window.RoughNotation) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var light = document.documentElement.classList.contains('light-theme');
    var a = window.RoughNotation.annotate(el, {
      type: 'underline',
      color: light ? '#8a6a3a' : '#b08c5a',
      strokeWidth: 2,
      iterations: 2,
      padding: 2,
      animate: !reduced,
      animationDuration: 900
    });
    setTimeout(function () { a.show(); }, 350);
  }
  function start() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run);
    } else {
      run();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
