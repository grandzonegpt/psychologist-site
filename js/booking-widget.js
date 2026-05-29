(function() {
  const API_URL = 'https://booking-api-production-c2ca.up.railway.app';
  const BATCH_SIZE = 4;
  const MOBILE_QUERY = '(max-width: 768px)';
  const TG_URL = 'https://t.me/aliaksei_therapist';

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
      meta: 'Сессия · {duration} минут · {price} PLN',
      tzNote: 'по варшавскому времени',
      formTitle: '{dayName}, {day} {date}, {time}, {duration} мин, {price} PLN',
      name: 'Имя',
      email: 'Email',
      bookContinue: 'Далее',
      loading: 'Загрузка...',
      loadingSchedule: 'Загружаю расписание...',
      error: 'Ошибка. Попробуй ещё раз.',
      navPrev: 'Раньше',
      navNext: 'Позже',
      bookedTitle: 'Оплата прошла.',
      bookedBody: 'Подтверждение и ссылка на встречу придут на твой email в течение минуты.',
      allTaken: 'все занято',
      tooSoonHint: 'минимум за 12 часов',
      apiError: 'Не удалось загрузить расписание. Напиши в Telegram, подберём время вручную.',
      slotTaken: 'Этот слот только что заняли. Обнови страницу и выбери другое время.',
      writeTelegram: 'Написать в Telegram',
      confirmTitle: 'Подтверждение записи',
      confirmSession: 'Сессия {dayFull}, {day} {month} в {time}',
      confirmCancel: 'Бесплатная отмена за 24 часа до сессии',
      confirmDuration: 'Сессия {duration} минут · {price} PLN',
      confirmPay: 'Подтвердить и оплатить →',
      changeTime: 'изменить время',
      cancelDetailsTitle: 'Подробнее об отмене',
      cancelDetailsP1: 'Отменить или перенести сессию без потери оплаты можно за 24 часа до её начала. Если отменяешь позже, оплата сохраняется: это время уже было зарезервировано для тебя.',
      cancelDetailsP2: 'Если отменяю я, ты получаешь полный возврат или можешь выбрать новое время.',
      cancelDetailsP3: 'Болезнь, форс-мажор и другие исключительные ситуации обсуждаем отдельно. Напиши мне, разберёмся.',
      metaIntro: 'Знакомство · {duration} минут · бесплатно',
      formTitleIntro: '{dayName}, {day} {date}, {time}, {duration} мин, бесплатно',
      confirmDurationIntro: 'Знакомство · {duration} минут · бесплатно',
      confirmCancelIntro: 'Отменить можно в любой момент, ответом на письмо',
      confirmPayIntro: 'Подтвердить запись →',
      bookedTitleIntro: 'Готово, ты записан.',
      bookedBodyIntro: 'Ссылка на видеовстречу придёт на твой email в течение минуты. Если не пришла, проверь спам или напиши в Telegram.'
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
      meta: 'Sesja · {duration} minut · {price} PLN',
      tzNote: 'czas warszawski',
      formTitle: '{dayName}, {day} {date}, {time}, {duration} min, {price} PLN',
      name: 'Imię',
      email: 'Email',
      bookContinue: 'Dalej',
      loading: 'Ładowanie...',
      loadingSchedule: 'Ładuję terminy...',
      error: 'Błąd. Spróbuj ponownie.',
      navPrev: 'Wcześniej',
      navNext: 'Później',
      bookedTitle: 'Płatność przeszła.',
      bookedBody: 'Potwierdzenie i link do spotkania przyjdą na twój email w ciągu minuty.',
      allTaken: 'wszystkie zajęte',
      tooSoonHint: 'minimum 12 godzin wcześniej',
      apiError: 'Nie udało się załadować terminów. Napisz na Telegram, ustalimy termin ręcznie.',
      slotTaken: 'Ten termin właśnie został zarezerwowany. Odśwież stronę i wybierz inny.',
      writeTelegram: 'Napisz na Telegram',
      confirmTitle: 'Potwierdzenie rezerwacji',
      confirmSession: 'Sesja {dayFull}, {day} {month} o {time}',
      confirmCancel: 'Bezpłatna anulacja do 24 godzin przed sesją',
      confirmDuration: 'Sesja {duration} minut · {price} PLN',
      confirmPay: 'Potwierdź i opłać →',
      changeTime: 'zmień godzinę',
      cancelDetailsTitle: 'Więcej o anulacji',
      cancelDetailsP1: 'Sesję można odwołać lub przełożyć bez utraty opłaty na 24 godziny przed jej rozpoczęciem. Przy późniejszym odwołaniu opłata zostaje, ponieważ ten czas był już zarezerwowany dla Ciebie.',
      cancelDetailsP2: 'Jeśli to ja odwołuję sesję, dostajesz pełny zwrot albo możesz wybrać nowy termin.',
      cancelDetailsP3: 'Choroba, siła wyższa i inne wyjątkowe sytuacje omawiamy osobno. Napisz do mnie, znajdziemy rozwiązanie.',
      metaIntro: 'Zapoznanie · {duration} minut · bezpłatnie',
      formTitleIntro: '{dayName}, {day} {date}, {time}, {duration} min, bezpłatnie',
      confirmDurationIntro: 'Zapoznanie · {duration} minut · bezpłatnie',
      confirmCancelIntro: 'Możesz odwołać w każdej chwili, odpisując na email',
      confirmPayIntro: 'Potwierdź rezerwację →',
      bookedTitleIntro: 'Gotowe, jesteś zapisany.',
      bookedBodyIntro: 'Link do spotkania wideo przyjdzie na twój email w ciągu minuty. Jeśli nie dotarł, sprawdź spam albo napisz na Telegram.'
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

  function init(containerId, locale, options) {
    const t = i18n[locale] || i18n.ru;
    const isIntro = !!(options && options.type === 'intro');
    const payLabel = isIntro ? t.confirmPayIntro : t.confirmPay;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML =
      '<div class="bw-v2">' +
        '<h2 class="bw-v2__lead"></h2>' +
        '<p class="bw-v2__meta"></p>' +
        '<p class="bw-v2__tz-note">' + t.tzNote + '</p>' +
        '<header class="bw-v2__header">' +
          '<div class="bw-v2__range"></div>' +
          '<div class="bw-v2__nav">' +
            '<button class="bw-v2__nav-btn" type="button" data-action="prev" disabled aria-label="' + t.navPrev + '">‹</button>' +
            '<button class="bw-v2__nav-btn" type="button" data-action="next" aria-label="' + t.navNext + '">›</button>' +
          '</div>' +
        '</header>' +
        '<div class="bw-v2__grid"></div>' +
        '<button type="button" class="bw-v2__change-time" hidden>' + t.changeTime + '</button>' +
        '<div class="bw-v2__form" hidden>' +
          '<div class="bw-v2__form-title"></div>' +
          '<form>' +
            '<input type="text" name="name" placeholder="' + t.name + '" required>' +
            '<input type="email" name="email" placeholder="' + t.email + '" required>' +
            '<button type="submit">' + t.bookContinue + '</button>' +
          '</form>' +
        '</div>' +
        '<div class="bw-v2__confirm" hidden>' +
          '<div class="bw-v2__confirm-title">' + t.confirmTitle + '</div>' +
          '<p class="bw-v2__confirm-session"></p>' +
          '<p class="bw-v2__tz-note">' + t.tzNote + '</p>' +
          '<p class="bw-v2__confirm-meta"></p>' +
          '<p class="bw-v2__confirm-cancel"></p>' +
          '<button type="button" class="bw-v2__confirm-pay">' + payLabel + '</button>' +
          '<details class="bw-v2__cancel-details">' +
            '<summary class="bw-v2__cancel-details-summary">' + t.cancelDetailsTitle + '</summary>' +
            '<div class="bw-v2__cancel-details-body">' +
              '<p>' + t.cancelDetailsP1 + '</p>' +
              '<p>' + t.cancelDetailsP2 + '</p>' +
              '<p>' + t.cancelDetailsP3 + '</p>' +
            '</div>' +
          '</details>' +
        '</div>' +
        '<div class="bw-v2__message" hidden></div>' +
        '<div class="bw-v2__loading">' + t.loadingSchedule + '</div>' +
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
    const $confirm = container.querySelector('.bw-v2__confirm');
    const $confirmSession = container.querySelector('.bw-v2__confirm-session');
    const $confirmCancel = container.querySelector('.bw-v2__confirm-cancel');
    const $confirmMeta = container.querySelector('.bw-v2__confirm-meta');
    const $confirmPay = container.querySelector('.bw-v2__confirm-pay');
    const $changeTime = container.querySelector('.bw-v2__change-time');
    const $message = container.querySelector('.bw-v2__message');
    const $loading = container.querySelector('.bw-v2__loading');

    let daysData = [];
    let serviceInfo = isIntro ? { duration: 15, price: 0 } : { duration: 50, price: 180 };
    let selectedDate = null;
    let selectedTime = null;
    let pendingName = '';
    let pendingEmail = '';
    let currentBatchStart = 0;

    const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

    function visibleDays() {
      if (isMobile()) return daysData;
      return daysData.slice(currentBatchStart, currentBatchStart + BATCH_SIZE);
    }

    function findFirstAvailable() {
      for (let i = 0; i < daysData.length; i++) {
        const day = daysData[i];
        for (let j = 0; j < day.slots.length; j++) {
          if (day.slots[j].status === 'available') {
            return { date: day.date, time: day.slots[j].time };
          }
        }
      }
      return null;
    }

    function updateLead() {
      const first = findFirstAvailable();
      if (!first) {
        $lead.textContent = t.leadEmpty;
        return;
      }
      const d = parseDate(first.date);
      const dayWord = t.daysFull[d.getDay()];
      $lead.innerHTML = t.leadPrefix + ' <em>' + dayWord + ', ' + first.time + '</em>';
    }

    function updateMeta() {
      if (isIntro) {
        $meta.textContent = t.metaIntro.replace('{duration}', serviceInfo.duration || 15);
        return;
      }
      $meta.textContent = t.meta
        .replace('{duration}', serviceInfo.duration || 50)
        .replace('{price}', serviceInfo.price || 180);
    }

    function updateRange() {
      const days = visibleDays();
      if (!days.length) { $range.textContent = ''; return; }
      $range.textContent = formatRangeUpper(days[0].date, days[days.length - 1].date, t);
    }

    function updateNavButtons() {
      if (isMobile()) {
        const atStart = $grid.scrollLeft <= 1;
        const atEnd = $grid.scrollLeft + $grid.clientWidth >= $grid.scrollWidth - 1;
        $prev.disabled = atStart;
        $next.disabled = atEnd || daysData.length === 0;
        return;
      }
      $prev.disabled = currentBatchStart === 0;
      $next.disabled = currentBatchStart + BATCH_SIZE >= daysData.length;
    }

    function dayIsAllTaken(day) {
      if (!day.slots.length) return false;
      return day.slots.every(function(s) { return s.status === 'taken'; });
    }

    function renderGrid() {
      const days = visibleDays();
      const cols = isMobile() ? Math.min(days.length, 3) : Math.max(1, Math.min(days.length, BATCH_SIZE));
      $widget.style.setProperty('--bw-columns', cols);

      $grid.innerHTML = days.map(function(day) {
        const d = parseDate(day.date);
        const dayName = isToday(day.date) ? t.today : t.daysShort[d.getDay()].toUpperCase();
        const dateLabel = d.getDate() + ' <em>' + t.monthsGen[d.getMonth()] + '</em>';
        const allTaken = dayIsAllTaken(day);
        const allTakenLabel = allTaken
          ? '<div class="bw-v2__all-taken">' + t.allTaken + '</div>'
          : '';
        const slotsHtml = day.slots.map(function(s) {
          const isSelected = (day.date === selectedDate && s.time === selectedTime && s.status === 'available');
          const cls = 'bw-v2__time bw-v2__time--' + s.status + (isSelected ? ' bw-v2__time--selected' : '');
          const tooltip = s.status === 'too-soon' ? ' title="' + t.tooSoonHint + '"' : '';
          return '<button type="button" class="' + cls + '" data-date="' + day.date + '" data-time="' + s.time + '" data-status="' + s.status + '"' + tooltip + '>' + s.time + '</button>';
        }).join('');
        return '<div class="bw-v2__column">' +
                 '<div class="bw-v2__day">' +
                   '<span class="bw-v2__day-name">' + dayName + '</span>' +
                   '<span class="bw-v2__day-date">' + dateLabel + '</span>' +
                 '</div>' +
                 allTakenLabel +
                 '<div class="bw-v2__times">' + slotsHtml + '</div>' +
               '</div>';
      }).join('');

      $grid.querySelectorAll('.bw-v2__time').forEach(function(el) {
        el.addEventListener('click', onSlotClick);
      });

      updateRange();
      updateNavButtons();
    }

    function deselectSlot() {
      selectedDate = null;
      selectedTime = null;
      $grid.querySelectorAll('.bw-v2__time--selected').forEach(function(s) { s.classList.remove('bw-v2__time--selected'); });
      $form.setAttribute('hidden', '');
      $confirm.setAttribute('hidden', '');
      $message.setAttribute('hidden', '');
      $changeTime.setAttribute('hidden', '');
    }

    function onSlotClick(e) {
      const el = e.currentTarget;
      if (el.dataset.status !== 'available') {
        e.preventDefault();
        return;
      }
      if (el.classList.contains('bw-v2__time--selected')) {
        deselectSlot();
        return;
      }
      selectedDate = el.dataset.date;
      selectedTime = el.dataset.time;

      $grid.querySelectorAll('.bw-v2__time--selected').forEach(function(s) { s.classList.remove('bw-v2__time--selected'); });
      el.classList.add('bw-v2__time--selected');

      const d = parseDate(selectedDate);
      $formTitle.textContent = (isIntro ? t.formTitleIntro : t.formTitle)
        .replace('{dayName}', t.daysFull[d.getDay()])
        .replace('{day}', d.getDate())
        .replace('{date}', t.monthsGen[d.getMonth()])
        .replace('{time}', selectedTime)
        .replace('{duration}', serviceInfo.duration || (isIntro ? 15 : 50))
        .replace('{price}', serviceInfo.price || 180);

      $formEl.name.value = pendingName;
      $formEl.email.value = pendingEmail;
      $form.removeAttribute('hidden');
      $confirm.setAttribute('hidden', '');
      $message.setAttribute('hidden', '');
      $changeTime.removeAttribute('hidden');
      trackEvent('slot_selected', { locale: locale, date: selectedDate, time: selectedTime });
    }

    function showConfirm() {
      const d = parseDate(selectedDate);

      $confirmSession.textContent = t.confirmSession
        .replace('{dayFull}', t.daysFull[d.getDay()])
        .replace('{day}', d.getDate())
        .replace('{month}', t.monthsGen[d.getMonth()])
        .replace('{time}', selectedTime);

      $confirmCancel.textContent = isIntro ? t.confirmCancelIntro : t.confirmCancel;

      $confirmMeta.textContent = (isIntro ? t.confirmDurationIntro : t.confirmDuration)
        .replace('{duration}', serviceInfo.duration || (isIntro ? 15 : 50))
        .replace('{price}', serviceInfo.price || 180);

      $form.setAttribute('hidden', '');
      $confirm.removeAttribute('hidden');
      $message.setAttribute('hidden', '');
    }

    function backToForm() {
      $confirm.setAttribute('hidden', '');
      $form.removeAttribute('hidden');
      $formEl.name.value = pendingName;
      $formEl.email.value = pendingEmail;
    }

    $changeTime.addEventListener('click', deselectSlot);

    $confirmPay.addEventListener('click', async function() {
      if (!selectedDate || !selectedTime || !pendingName || !pendingEmail) {
        backToForm();
        return;
      }
      $confirmPay.disabled = true;
      $confirmPay.textContent = t.loading;
      try {
        if (isIntro) {
          trackEvent('intro_begin', { locale: locale });
        } else {
          trackEvent('begin_checkout', { currency: 'PLN', value: serviceInfo.price || 180, locale: locale });
        }
        const attr = getAttribution();
        const payload = Object.assign({ name: pendingName, email: pendingEmail, date: selectedDate, time: selectedTime, locale: locale }, attr);
        if (isIntro) payload.type = 'intro';
        const resp = await fetch(API_URL + '/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(function() { return {}; });
        // Paid flow: Stripe checkout URL to redirect to.
        if (data.ok && data.url) {
          window.location.href = data.url;
          return;
        }
        // Intro flow: booked immediately, no payment. Show inline success.
        if (data.ok && data.booked) {
          trackEvent('intro_booked', { locale: locale });
          if (selectedDate && selectedTime) {
            var booked = (daysData.find(function(dd) { return dd.date === selectedDate; }) || {}).slots || [];
            booked.forEach(function(s) { if (s.time === selectedTime) s.status = 'taken'; });
          }
          $confirm.setAttribute('hidden', '');
          $changeTime.setAttribute('hidden', '');
          deselectSlot();
          renderGrid();
          $message.innerHTML = '<strong>' + t.bookedTitleIntro + '</strong><br>' + t.bookedBodyIntro;
          $message.className = 'bw-v2__message bw-v2__message--success';
          $message.removeAttribute('hidden');
          return;
        }
        // 409 means the slot was just taken by a parallel booking.
        const slotTaken = resp.status === 409 || data.error === 'slot_taken';
        $message.textContent = slotTaken ? t.slotTaken : t.error;
        $message.className = 'bw-v2__message bw-v2__message--error';
        $message.removeAttribute('hidden');
      } catch (err) {
        $message.textContent = t.error;
        $message.className = 'bw-v2__message bw-v2__message--error';
        $message.removeAttribute('hidden');
      }
      $confirmPay.disabled = false;
      $confirmPay.textContent = payLabel;
    });

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
      if (currentBatchStart + BATCH_SIZE < daysData.length) {
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

    $formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = $formEl.name.value.trim();
      const email = $formEl.email.value.trim();
      if (!name || !email || !selectedDate || !selectedTime) return;
      pendingName = name;
      pendingEmail = email;
      showConfirm();
    });

    function showApiError() {
      $widget.classList.add('bw-v2--error');
      $loading.style.display = 'none';
      $grid.innerHTML =
        '<div class="bw-v2__fallback">' +
          '<p>' + t.apiError + '</p>' +
          '<a class="bw-v2__fallback-btn" href="' + TG_URL + '" target="_blank" rel="noopener noreferrer">' + t.writeTelegram + '</a>' +
        '</div>';
      $lead.textContent = t.leadEmpty;
      $range.textContent = '';
      $prev.disabled = true;
      $next.disabled = true;
    }

    function normalizeDays(data) {
      if (Array.isArray(data.days)) return data.days;
      // Fallback to legacy { slots: { dateStr: [time, ...] } }
      const map = data.slots || {};
      return Object.keys(map).sort().map(function(date) {
        return {
          date: date,
          slots: (map[date] || []).map(function(time) { return { time: time, status: 'available' }; })
        };
      });
    }

    async function loadSlots() {
      $loading.style.display = 'block';
      let data;
      try {
        const resp = await fetch(API_URL + '/api/slots' + (isIntro ? '?type=intro' : ''));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        data = await resp.json();
      } catch (e) {
        showApiError();
        return;
      }

      if (data.duration) serviceInfo.duration = data.duration;
      if (data.price) serviceInfo.price = data.price;

      daysData = normalizeDays(data);
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
