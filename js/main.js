/* Site interactions: nav, reveal, cookies, form */

document.addEventListener('DOMContentLoaded', () => {
  // Fixed nav scrolled state
  const nav = document.querySelector('.site-nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
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
  const CKEY = 'cookie_consent_v1';
  const stored = localStorage.getItem(CKEY);
  if (banner && !stored) banner.classList.add('visible');

  const saveConsent = (val) => {
    const payload = { value: val, ts: Date.now() };
    localStorage.setItem(CKEY, JSON.stringify(payload));
    if (banner) banner.classList.remove('visible');
    if (val === 'all') loadAnalytics();
  };
  document.querySelectorAll('[data-cookie="all"]').forEach(b =>
    b.addEventListener('click', () => saveConsent('all'))
  );
  document.querySelectorAll('[data-cookie="necessary"]').forEach(b =>
    b.addEventListener('click', () => saveConsent('necessary'))
  );
  document.querySelectorAll('[data-cookie="open"]').forEach(b =>
    b.addEventListener('click', () => banner && banner.classList.add('visible'))
  );
  if (stored) {
    try {
      if (JSON.parse(stored).value === 'all') loadAnalytics();
    } catch (e) {}
  }
  function loadAnalytics() {
    // Analytics would load here only after explicit consent.
  }

  // Contact form submit
  document.querySelectorAll('form.contact-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const endpoint = form.getAttribute('action');
      if (!endpoint || endpoint.includes('FORMSPREE_ENDPOINT')) {
        alert(form.dataset.langAlert || 'FORMSPREE_ENDPOINT не настроен');
        return;
      }
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.style.display = 'none';
          const thanks = form.parentElement.querySelector('.form-thanks');
          if (thanks) thanks.classList.add('visible');
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
});
