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

  // Reveal on scroll (progressive enhancement)
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    document.documentElement.classList.add('js-reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
    // Safety net: if anything is still hidden after 2s (e.g. inside initially
    // hidden tabs, collapsed details, off-screen layouts), force it visible.
    setTimeout(() => {
      reveals.forEach(el => el.classList.add('visible'));
    }, 2000);
  }

  // Counter animation for 500+
  const counterEl = document.querySelector('.stat-num[data-count]');
  if (counterEl) {
    const target = parseInt(counterEl.dataset.count);
    const suffix = counterEl.dataset.suffix || '';
    let counted = false;
    const counterObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        let current = 0;
        const step = Math.ceil(target / 40);
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          counterEl.textContent = current + suffix;
        }, 30);
        counterObs.unobserve(counterEl);
      }
    }, { threshold: 0.5 });
    counterObs.observe(counterEl);
  }

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
      { text: 'Kiedy człowiek jest w depresji, widzi świat przez filtr zniekształceń. Usuń filtr, a świat stanie się inny.', author: 'David Burns, "Radość życia"' }
    ] : [
      { text: 'Травматические воспоминания живут не в словах, а в теле: в мышечном напряжении, в реакциях нервной системы, в способе дышать.', author: 'Бессел ван дер Колк, "Тело помнит всё"' },
      { text: 'Чем больше вы боретесь с тревожными мыслями, тем сильнее они становятся. Не спорить с тревогой, а менять отношение к ней.', author: 'Дэвид Карбонелл, "Когда ничего не помогает"' },
      { text: 'Тот, кто знает зачем жить, вынесет почти любое как.', author: 'Виктор Франкл, "Человек в поисках смысла"' },
      { text: 'Люди, которые годами не могут сказать нет и ставят чужие потребности выше своих, платят за это телом.', author: 'Габор Матэ, "Когда тело говорит нет"' },
      { text: 'Мозг не может одновременно паниковать и внимательно считать оттенки предметов вокруг.', author: 'Техника заземления 5-4-3-2-1' },
      { text: 'Когда человек в депрессии, он видит мир через фильтр искажений. Уберите фильтр, и мир станет другим.', author: 'Дэвид Бёрнс, "Хорошее самочувствие"' }
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.querySelector('p').textContent = q.text;
    quoteEl.querySelector('cite').textContent = q.author;
  }

  // Self-check quiz
  const quiz = document.getElementById('quiz');
  if (quiz) {
    const lang = document.documentElement.lang;
    const questions = quiz.querySelectorAll('.quiz-q');
    const stepEl = document.getElementById('quiz-step');
    const resultEl = document.getElementById('quiz-result');
    const resultText = document.getElementById('quiz-result-text');
    const restartBtn = document.getElementById('quiz-restart');
    const scores = [];
    let current = 0;

    const results = lang === 'pl' ? [
      { max: 4, html: '<h3>Wygląda na to, że sobie radzisz</h3><p>Twoje odpowiedzi nie wskazują na poważne trudności. To dobrze. Jeśli mimo to coś cię niepokoi, zawsze możesz napisać.</p>' },
      { max: 9, html: '<h3>Jest nad czym się zastanowić</h3><p>Część odpowiedzi sugeruje, że pewne rzeczy zaczynają ci przeszkadzać. Warto porozmawiać, zanim problem się pogłębi.</p>' },
      { max: 15, html: '<h3>Warto z kimś porozmawiać</h3><p>Kilka twoich odpowiedzi wskazuje na wyraźny dyskomfort. To nie wyrok, ale sygnał. Psycholog pomoże zrozumieć, co się dzieje, i znaleźć sposób na ulgę.</p>' }
    ] : [
      { max: 4, html: '<h3>Похоже, ты справляешься</h3><p>Твои ответы не указывают на серьёзные трудности. Это хорошо. Если всё же что-то беспокоит, можешь написать.</p>' },
      { max: 9, html: '<h3>Есть над чем задуматься</h3><p>Часть ответов говорит о том, что кое-что начинает мешать жить. Стоит поговорить, пока проблема не стала глубже.</p>' },
      { max: 15, html: '<h3>Стоит поговорить с кем-то</h3><p>Несколько ответов указывают на ощутимый дискомфорт. Это не приговор, а сигнал. Психолог поможет разобраться, что происходит, и найти способ облегчить состояние.</p>' }
    ];

    quiz.addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-options button');
      if (!btn) return;
      const q = btn.closest('.quiz-q');
      q.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      scores[current] = parseInt(btn.dataset.val);

      setTimeout(() => {
        if (current < questions.length - 1) {
          questions[current].hidden = true;
          current++;
          questions[current].hidden = false;
          questions[current].style.animation = 'fadeUp 0.4s ease';
          stepEl.textContent = current + 1;
        } else {
          // Show result
          const total = scores.reduce((a, b) => a + b, 0);
          const tier = results.find(r => total <= r.max) || results[results.length - 1];
          quiz.querySelector('.quiz-questions').hidden = true;
          quiz.querySelector('.quiz-progress').hidden = true;
          resultText.innerHTML = tier.html;
          resultEl.hidden = false;
          resultEl.style.animation = 'fadeUp 0.4s ease';
        }
      }, 300);
    });

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        scores.length = 0;
        current = 0;
        questions.forEach((q, i) => {
          q.hidden = i !== 0;
          q.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
        });
        stepEl.textContent = '1';
        quiz.querySelector('.quiz-questions').hidden = false;
        quiz.querySelector('.quiz-progress').hidden = false;
        resultEl.hidden = true;
      });
    }
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

  // Exit-intent popup (desktop only, no touch devices)
  const exitPopup = document.getElementById('exit-popup');
  if (exitPopup) {
    const hidePopup = () => { exitPopup.hidden = true; };
    exitPopup.querySelector('.exit-popup-overlay').addEventListener('click', hidePopup);
    exitPopup.querySelector('.exit-popup-close').addEventListener('click', hidePopup);
    exitPopup.querySelector('.exit-popup-skip').addEventListener('click', hidePopup);
    const cta = exitPopup.querySelector('#exit-popup-cta');
    if (cta) cta.addEventListener('click', hidePopup);

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch && window.innerWidth > 768) {
      const EKEY = 'exit-popup-shown';
      if (!sessionStorage.getItem(EKEY)) {
        document.addEventListener('mouseout', (e) => {
          if (e.clientY < 5 && !sessionStorage.getItem(EKEY)) {
            exitPopup.hidden = false;
            sessionStorage.setItem(EKEY, '1');
          }
        });
      }
    }
  }

  // Scroll progress bar
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    const updateProgress = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // Theme toggle
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') document.documentElement.classList.add('light-theme');
    const update = () => {
      const isLight = document.documentElement.classList.contains('light-theme');
      themeBtn.textContent = isLight ? '🌙' : '☀️';
    };
    update();
    themeBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('light-theme');
      const isLight = document.documentElement.classList.contains('light-theme');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      update();
    });
  }

  // Share button
  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        const msg = btn.nextElementSibling;
        if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 2000); }
      });
    });
  });

  // Seasonal banner dismiss
  const sBanner = document.querySelector('.seasonal-banner');
  if (sBanner) {
    const sKey = 'seasonal-dismissed';
    if (sessionStorage.getItem(sKey)) sBanner.remove();
    const closeBtn = sBanner.querySelector('.seasonal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { sBanner.remove(); sessionStorage.setItem(sKey, '1'); });
  }

  // Lightbox for diploma thumbnails
  const lightboxLinks = document.querySelectorAll('[data-lightbox]');
  if (lightboxLinks.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<button class="lightbox-close" aria-label="Закрыть">×</button><img alt="">';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    const close = () => lb.classList.remove('open');
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox-close')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    lightboxLinks.forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      lbImg.src = a.href;
      lb.classList.add('open');
    }));
  }

  // Article recommender tabs
  document.querySelectorAll('.recommender-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const parent = tab.closest('.recommender');
      parent.querySelectorAll('.recommender-tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.recommender-results').forEach(r => r.classList.remove('active'));
      tab.classList.add('active');
      const target = parent.querySelector('.recommender-results[data-topic="' + tab.dataset.topic + '"]');
      if (target) {
        target.classList.add('active');
        target.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      }
    });
  });

});
