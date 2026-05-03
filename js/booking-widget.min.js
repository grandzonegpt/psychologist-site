(function() {
  const API_URL = 'https://booking-api-production-c2ca.up.railway.app';
  const BATCH_SIZE = 4;
  const MOBILE_QUERY = '(max-width: 768px)';

  const i18n = {
    ru: {
      daysShort: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
      daysFull: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
      months: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
      monthsGen: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
      monthsRangeUpper: ['ЯНВАРЯ','ФЕВРАЛЯ','МАРТА','АПРЕЛЯ','МАЯ','ИЮНЯ','ИЮЛЯ','АВГУСТА','СЕНТЯБРЯ','ОКТЯБРЯ','НОЯБРЯ','ДЕКАБРЯ'],
      today: 'СЕГОДНЯ',
      leadPrefix: 'Ближайшее окно',
      leadEmpty: 'Свободных окон пока нет',
      meta: 'Сессия · {duration} минут · {price} PLN · листай дни ‹ ›',
      formTitle: '{day} {date}, {time}, {duration} мин, {price} PLN',
      name: 'Имя',
      email: 'Email',
      book: 'Записаться',
      loading: 'Загрузка...',
      error: 'Ошибка. Попробуй ещё раз.',
      navPrev: 'Раньше',
      navNext: 'Позже',
      bookedTitle: 'Оплата прошла.',
      bookedBody: 'Подтверждение и ссылка на встречу придут на твой email в течение минуты.'
    },
    pl: {
      daysShort: ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'],
      daysFull: ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'],
      months: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
      monthsGen: ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'],
      monthsRangeUpper: ['STYCZNIA','LUTEGO','MARCA','KWIETNIA','MAJA','CZERWCA','LIPCA','SIERPNIA','WRZEŚNIA','PAŹDZIERNIKA','LISTOPADA','GRUDNIA'],
      today: 'DZIŚ',
      leadPrefix: 'Najbliższy termin',
      leadEmpty: 'Brak wolnych terminów',
      meta: 'Sesja · {duration} minut · {price} PLN · przesuwaj dni ‹ ›',
      formTitle: '{day} {date}, {time}, {duration} min, {price} PLN',
      name: 'Imię',
      email: 'Email',
      book: 'Umów sesję',
      loading: 'Ładowanie...',
      error: 'Błąd. Spróbuj ponownie.',
      navPrev: 'Wcześniej',
      navNext: 'Później',
      bookedTitle: 'Płatność przeszła.',
      bookedBody: 'Potwierdzenie i link do spotkania przyjdą na twój email w ciągu minuty.'
    }
  };

  function getAttribution() {
    const params = new URLSearchParams(window.location.search);
    ['utm_source','utm_medium','utm_content','utm_campaign'].forEach(function(k) {
      var v = params.get(k);
      if (v && !sessionStorage.getItem('attr_' + k)) {
        sessionStorage.setItem('attr_' + k, v);
      }
    });
    return {
      utm_source: sessionStorage.getItem('attr_utm_source') || '',
      utm_medium: sessionStorage.getItem('attr_utm_medium') || '',
      utm_content: sessionStorage.getItem('attr_utm_content') || '',
      utm_campaign: sessionStorage.getItem('attr_utm_campaign') || '',
      referrer_page: document.referrer || ''
    };
  }

  function trackEvent(name, params) {
    if (typeof gtag === 'function') {
      gtag('event', name, params || {});
    }
    if (typeof window.fbq === 'function') {
      var fbMap = {
        slot_selected: 'Lead',
        begin_checkout: 'InitiateCheckout',
        purchase: 'Purchase',
        checkout_abandoned: null
      };
      var fbName = fbMap[name];
      if (fbName) {
        var fbParams = {};
        if (params && params.value != null) fbParams.value = params.value;
        if (params && params.currency) fbParams.currency = params.currency;
        window.fbq('track', fbName, fbParams);
      }
    }
    var ids = window.MARKETING_IDS || {};
    if (name === 'purchase' && ids.googleAdsTag && ids.googleAdsConversionLabel && typeof gtag === 'function') {
      gtag('event', 'conversion', {
        send_to: ids.googleAdsTag + '/' + ids.googleAdsConversionLabel,
        value: (params && params.value) || 180,
        currency: (params && params.currency) || 'PLN',
        transaction_id: (params && params.transaction_id) || ''
      });
    }
  }

  function parseDate(dateStr) { return new Date(dateStr + 'T00:00:00'); }

  function isToday(dateStr) {
    const d = parseDate(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  }

  function formatRangeUpper(dateStrA, dateStrB, t) {
    const a = parseDate(dateStrA);
    const b = parseDate(dateStrB);
    const aStr = a.getDate() + ' ' + t.monthsRangeUpper[a.getMonth()];
    const bStr = b.getDate() + ' ' + t.monthsRangeUpper[b.getMonth()];
    if (dateStrA === dateStrB) return aStr;
    return aStr + '. ' + bStr;
  }

  function init(containerId, locale) {
    const t = i18n[locale] || i18n.ru;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML =
      '<div class="bw-v2">' +
        '<h2 class="bw-v2__lead"></h2>' +
        '<p class="bw-v2__meta"></p>' +
        '<header class="bw-v2__header">' +
          '<div class="bw-v2__range"></div>' +
          '<div class="bw-v2__nav">' +
            '<button class="bw-v2__nav-btn" type="button" data-action="prev" disabled aria-label="' + t.navPrev + '">‹</button>' +
            '<button class="bw-v2__nav-btn" type="button" data-action="next" aria-label="' + t.navNext + '">›</button>' +
          '</div>' +
        '</header>' +
        '<div class="bw-v2__grid"></div>' +
        '<div class="bw-v2__form" hidden>' +
          '<div class="bw-v2__form-title"></div>' +
          '<form>' +
            '<input type="text" name="name" placeholder="' + t.name + '" required>' +
            '<input type="email" name="email" placeholder="' + t.email + '" required>' +
            '<button type="submit">' + t.book + '</button>' +
          '</form>' +
        '</div>' +
        '<div class="bw-v2__message" hidden></div>' +
        '<div class="bw-v2__loading">' + t.loading + '</div>' +
      '</div>';

    const $widget = container.querySelector('.bw-v2');
    const $lead = container.querySelector('.bw-v2__lead');
    const $meta = container.querySelector('.bw-v2__meta');
    const $range = container.querySelector('.bw-v2__range');
    const $prev = container.querySelector('[data-action="prev"]');
    const $next = container.querySelector('[data-action="next"]');
    const $grid = container.querySelector('.bw-v2__grid');
    const $form = container.querySelector('.bw-v2__form');
    const $formTitle = container.querySelector('.bw-v2__form-title');
    const $formEl = $form.querySelector('form');
    const $message = container.querySelector('.bw-v2__message');
    const $loading = container.querySelector('.bw-v2__loading');

    let slotsData = {};
    let availableDays = [];
    let serviceInfo = { duration: 50, price: 180 };
    let selectedDate = null;
    let selectedTime = null;
    let currentBatchStart = 0;

    const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

    function visibleDays() {
      if (isMobile()) return availableDays;
      return availableDays.slice(currentBatchStart, currentBatchStart + BATCH_SIZE);
    }

    function findFirstFreeSlot() {
      for (let i = 0; i < availableDays.length; i++) {
        const d = availableDays[i];
        const slots = slotsData[d];
        if (slots && slots.length) return { date: d, time: slots[0] };
      }
      return null;
    }

    function updateLead() {
      const first = findFirstFreeSlot();
      if (!first) {
        $lead.textContent = t.leadEmpty;
        return;
      }
      const d = parseDate(first.date);
      const dayWord = t.daysFull[d.getDay()];
      $lead.innerHTML = t.leadPrefix + ' <em>' + dayWord + ', ' + first.time + '</em>';
    }

    function updateMeta() {
      $meta.textContent = t.meta
        .replace('{duration}', serviceInfo.duration || 50)
        .replace('{price}', serviceInfo.price || 180);
    }

    function updateRange() {
      const days = visibleDays();
      if (!days.length) { $range.textContent = ''; return; }
      $range.textContent = formatRangeUpper(days[0], days[days.length - 1], t);
    }

    function updateNavButtons() {
      if (isMobile()) {
        const atStart = $grid.scrollLeft <= 1;
        const atEnd = $grid.scrollLeft + $grid.clientWidth >= $grid.scrollWidth - 1;
        $prev.disabled = atStart;
        $next.disabled = atEnd || availableDays.length === 0;
        return;
      }
      $prev.disabled = currentBatchStart === 0;
      $next.disabled = currentBatchStart + BATCH_SIZE >= availableDays.length;
    }

    function renderGrid() {
      const days = visibleDays();
      const cols = isMobile() ? Math.min(days.length, 3) : Math.max(1, Math.min(days.length, BATCH_SIZE));
      $widget.style.setProperty('--bw-columns', cols);

      $grid.innerHTML = days.map(function(date) {
        const d = parseDate(date);
        const dayName = isToday(date) ? t.today : t.daysShort[d.getDay()].toUpperCase();
        const dateLabel = d.getDate() + ' <em>' + t.monthsGen[d.getMonth()] + '</em>';
        const slots = slotsData[date] || [];
        const slotsHtml = slots.map(function(time) {
          const sel = (date === selectedDate && time === selectedTime) ? ' bw-v2__time--selected' : '';
          return '<button type="button" class="bw-v2__time' + sel + '" data-date="' + date + '" data-time="' + time + '">' + time + '</button>';
        }).join('');
        return '<div class="bw-v2__column">' +
                 '<div class="bw-v2__day">' +
                   '<span class="bw-v2__day-name">' + dayName + '</span>' +
                   '<span class="bw-v2__day-date">' + dateLabel + '</span>' +
                 '</div>' +
                 '<div class="bw-v2__times">' + slotsHtml + '</div>' +
               '</div>';
      }).join('');

      $grid.querySelectorAll('.bw-v2__time').forEach(function(el) {
        el.addEventListener('click', onSlotClick);
      });

      updateRange();
      updateNavButtons();
    }

    function onSlotClick(e) {
      const el = e.currentTarget;
      if (el.classList.contains('bw-v2__time--taken')) {
        e.preventDefault();
        return;
      }
      selectedDate = el.dataset.date;
      selectedTime = el.dataset.time;

      $grid.querySelectorAll('.bw-v2__time--selected').forEach(function(s) { s.classList.remove('bw-v2__time--selected'); });
      el.classList.add('bw-v2__time--selected');

      const d = parseDate(selectedDate);
      $formTitle.textContent = t.formTitle
        .replace('{day}', d.getDate())
        .replace('{date}', t.monthsGen[d.getMonth()])
        .replace('{time}', selectedTime)
        .replace('{duration}', serviceInfo.duration || 50)
        .replace('{price}', serviceInfo.price || 180);
      $form.removeAttribute('hidden');
      $message.setAttribute('hidden', '');
      trackEvent('slot_selected', { locale: locale, date: selectedDate, time: selectedTime });
    }

    $prev.addEventListener('click', function() {
      if (isMobile()) {
        const colWidth = $grid.clientWidth / 3;
        $grid.scrollBy({ left: -colWidth * 2, behavior: 'smooth' });
        return;
      }
      currentBatchStart = Math.max(0, currentBatchStart - BATCH_SIZE);
      renderGrid();
    });

    $next.addEventListener('click', function() {
      if (isMobile()) {
        const colWidth = $grid.clientWidth / 3;
        $grid.scrollBy({ left: colWidth * 2, behavior: 'smooth' });
        return;
      }
      if (currentBatchStart + BATCH_SIZE < availableDays.length) {
        currentBatchStart += BATCH_SIZE;
        renderGrid();
      }
    });

    $grid.addEventListener('scroll', function() {
      if (isMobile()) updateNavButtons();
    }, { passive: true });

    window.addEventListener('resize', function() {
      currentBatchStart = 0;
      renderGrid();
    });

    $formEl.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = $formEl.name.value.trim();
      const email = $formEl.email.value.trim();
      if (!name || !email || !selectedDate || !selectedTime) return;

      const $submit = $formEl.querySelector('button[type="submit"]');
      $submit.disabled = true;
      $submit.textContent = t.loading;

      try {
        trackEvent('begin_checkout', { currency: 'PLN', value: serviceInfo.price || 180, locale: locale });
        const attr = getAttribution();
        const resp = await fetch(API_URL + '/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({ name: name, email: email, date: selectedDate, time: selectedTime, locale: locale }, attr))
        });
        const data = await resp.json();
        if (data.ok && data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error(data.error || 'Booking failed');
      } catch (err) {
        $message.textContent = t.error;
        $message.className = 'bw-v2__message bw-v2__message--error';
        $message.removeAttribute('hidden');
      }
      $submit.disabled = false;
      $submit.textContent = t.book;
    });

    async function loadSlots() {
      $loading.style.display = 'block';
      try {
        const resp = await fetch(API_URL + '/api/slots');
        const data = await resp.json();
        slotsData = data.slots || {};
        if (data.duration) serviceInfo.duration = data.duration;
        if (data.price) serviceInfo.price = data.price;
      } catch (e) {
        slotsData = {};
      }
      availableDays = Object.keys(slotsData)
        .filter(function(d) { return slotsData[d] && slotsData[d].length > 0; })
        .sort();
      currentBatchStart = 0;

      updateLead();
      updateMeta();
      renderGrid();
      $loading.style.display = 'none';
    }

    loadSlots();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('booking') === 'success') {
      trackEvent('purchase', { currency: 'PLN', value: serviceInfo.price || 180, transaction_id: 'pending_' + Date.now() });
      $message.innerHTML = '<strong>' + t.bookedTitle + '</strong><br>' + t.bookedBody;
      $message.className = 'bw-v2__message bw-v2__message--success';
      $message.removeAttribute('hidden');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('booking') === 'cancelled') {
      trackEvent('checkout_abandoned', { currency: 'PLN', value: 180 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  window.BookingWidget = { init };
})();
