/* ================================================
   main.js — Navigation, Scroll Reveal, Interactions
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Nav scroll effect ──
  const nav = document.getElementById('main-nav');
  const onScroll = () => {
    nav?.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Mobile menu ──
  const menuBtn  = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  menuBtn?.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuBtn.classList.toggle('open', open);
  });
  // Close on link click
  document.querySelectorAll('.mobile-link, .mobile-nav .btn').forEach(el => {
    el.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menuBtn?.classList.remove('open');
    });
  });

  // ── Scroll reveal ──
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // ── Testimonials drag-scroll ──
  const track = document.getElementById('testimonials-track');
  if (track) {
    let isDown = false, startX = 0, scrollLeft = 0;
    track.addEventListener('mousedown', e => {
      isDown = true;
      track.classList.add('active');
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });
    track.addEventListener('mouseleave', () => { isDown = false; });
    track.addEventListener('mouseup',   () => { isDown = false; });
    track.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x    = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
  }

  // ── Smooth anchor scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
        const top  = target.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ── Cookie consent ──
  const cookieBanner = document.getElementById('cookie-banner');
  const cookieAccept = document.getElementById('cookie-accept');
  const cookieReject = document.getElementById('cookie-reject');

  if (cookieBanner && !localStorage.getItem('cookie-consent')) {
    setTimeout(() => cookieBanner.classList.add('visible'), 800);
  }
  function dismissCookie(choice) {
    localStorage.setItem('cookie-consent', choice);
    cookieBanner?.classList.remove('visible');
  }
  cookieAccept?.addEventListener('click', () => dismissCookie('all'));
  cookieReject?.addEventListener('click', () => dismissCookie('necessary'));

});
