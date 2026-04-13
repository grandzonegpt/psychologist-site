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
