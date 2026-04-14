/* Site interactions: nav, reveal, cookies, form */

document.addEventListener('DOMContentLoaded', () => {
  // Fixed nav scrolled state
  const nav = document.querySelector('.site-nav');
  const floatingCta = document.getElementById('floating-cta');
  const bookingSection = document.getElementById('booking');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    if (floatingCta) {
      const pastHero = window.scrollY > 400;
      const atBooking = bookingSection && bookingSection.getBoundingClientRect().top < window.innerHeight * 0.5;
      const cookieBanner = document.querySelector('.cookie-banner');
      const cookieVisible = cookieBanner && cookieBanner.classList.contains('visible');
      floatingCta.classList.toggle('visible', pastHero && !atBooking && !cookieVisible);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
    document.addEventListener('click', (e) => {
      if (links.classList.contains('open') && !links.contains(e.target) && e.target !== toggle) {
        links.classList.remove('open');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
      }
    });
  }

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Cookie banner
  const banner = document.querySelector('.cookie-banner');
  const CKEY = 'cookie-consent';
  const stored = localStorage.getItem(CKEY);
  if (banner && !stored) banner.classList.add('visible');

  const saveConsent = (val) => {
    localStorage.setItem(CKEY, val);
    if (banner) banner.classList.remove('visible');
    if (val === 'all') loadAnalytics();
  };
  document.querySelectorAll('[data-cookie="all"]').forEach(b =>
    b.addEventListener('click', () => saveConsent('all'))
  );
  document.querySelectorAll('[data-cookie="necessary"]').forEach(b =>
    b.addEventListener('click', () => saveConsent('necessary'))
  );
  document.querySelectorAll('[data-cookie="rejected"]').forEach(b =>
    b.addEventListener('click', () => saveConsent('rejected'))
  );
  document.querySelectorAll('[data-cookie="open"]').forEach(b =>
    b.addEventListener('click', () => banner && banner.classList.add('visible'))
  );
  if (stored === 'all') loadAnalytics();
  function loadAnalytics() {
    // Analytics/tracking scripts load here only after explicit "all" consent.
  }

  // Rotating quotes
  const quoteEl = document.querySelector('#quote-rotate .rotating-quote');
  if (quoteEl) {
    const lang = document.documentElement.lang;
    const quotes = lang === 'pl' ? [
      { text: 'Traumatyczne wspomnienia żyją nie w słowach, a w ciele: w napięciu mięśni, w reakcjach układu nerwowego, w sposobie oddychania.', author: 'Bessel van der Kolk, "Strach ucieleśniony"' },
      { text: 'Im bardziej walczysz z lękowymi myślami, tym silniejsze się stają. Nie spierać się z lękiem, lecz zmienić stosunek do niego.', author: 'David Carbonell, "The Worry Trick"' },
      { text: 'Ten, kto ma po co żyć, zniesie niemal każde jak.', author: 'Viktor Frankl, "Człowiek w poszukiwaniu sensu"' },
      { text: 'Ludzie, którzy latami nie potrafią powiedzieć nie i stawiają cudze potrzeby ponad swoje, płacą za to ciałem.', author: 'Gabor Maté, "Kiedy ciało mówi nie"' },
      { text: 'Mózg nie jest w stanie jednocześnie panikować i uważnie liczyć odcienie przedmiotów wokół.', author: 'Technika uziemienia 5-4-3-2-1' },
      { text: 'Depresja to nie lenistwo i nie słabość. To sposób, w jaki psychika mówi, że jest przeciążona.', author: 'David Burns, "Radość życia"' }
    ] : [
      { text: 'Травматические воспоминания живут не в словах, а в теле: в мышечном напряжении, в реакциях нервной системы, в способе дышать.', author: 'Бессел ван дер Колк, "Тело помнит всё"' },
      { text: 'Чем больше вы боретесь с тревожными мыслями, тем сильнее они становятся. Не спорить с тревогой, а менять отношение к ней.', author: 'Дэвид Карбонелл, "Когда ничего не помогает"' },
      { text: 'Тот, кто знает зачем жить, вынесет почти любое как.', author: 'Виктор Франкл, "Человек в поисках смысла"' },
      { text: 'Люди, которые годами не могут сказать нет и ставят чужие потребности выше своих, платят за это телом.', author: 'Габор Матэ, "Когда тело говорит нет"' },
      { text: 'Мозг не может одновременно паниковать и внимательно считать оттенки предметов вокруг.', author: 'Техника заземления 5-4-3-2-1' },
      { text: 'Депрессия это не лень и не слабость. Это способ, которым психика говорит, что она перегружена.', author: 'Дэвид Бёрнс, "Хорошее самочувствие"' }
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.querySelector('p').textContent = q.text;
    quoteEl.querySelector('cite').textContent = q.author;
  }

  // Contact form submit
  document.querySelectorAll('form.contact-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const endpoint = form.getAttribute('action');
      if (!endpoint) return;
      const btn = form.querySelector('button[type="submit"]');
      const errEl = form.querySelector('.form-error');
      if (btn) btn.disabled = true;
      if (errEl) errEl.hidden = true;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.hidden = true;
          const thanks = form.parentElement.querySelector('.form-thanks');
          if (thanks) {
            thanks.hidden = false;
            thanks.classList.add('visible');
          }
        } else {
          if (errEl) errEl.hidden = false;
          if (btn) btn.disabled = false;
        }
      } catch (err) {
        console.error(err);
        if (errEl) errEl.hidden = false;
        if (btn) btn.disabled = false;
      }
    });
  });
});
