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
      consentNote: 'Записываясь, вы соглашаетесь с <a href="/privacy.html" target="_blank" rel="noopener">политикой конфиденциальности</a>.',
      emailInvalid: 'Кажется, в адресе ошибка. Проверьте email: на него придёт ссылка на встречу.',
      emailMaybeTypo: 'Возможно, опечатка. Вы имели в виду %s? Если адрес верный, нажмите «Далее» ещё раз.',
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
      bookedTitleIntro: 'Готово. Запись подтверждена.',
      bookedBodyIntro: 'Ссылка на видеовстречу придёт на почту в течение минуты. Если не пришла, проверьте спам или напишите в Telegram.',
      introTitle: 'Бесплатное знакомство, 15 минут',
      introSub: 'Короткая встреча, чтобы понять запрос, задать вопросы и выбрать дальнейший формат работы.',
      introMicro: 'Если нужно другое время, напиши, подберём вручную.',
      introMoreDates: 'Показать ещё даты',
      introCta: 'Записаться на бесплатное знакомство',
      introTaken: 'занято'
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
      consentNote: 'Rezerwując, zgadzasz się z <a href="/privacy.html" target="_blank" rel="noopener">polityką prywatności</a>.',
      emailInvalid: 'Wygląda na błąd w adresie. Sprawdź email: na niego przyjdzie link do spotkania.',
      emailMaybeTypo: 'Możliwa literówka. Chodziło o %s? Jeśli adres jest poprawny, kliknij „Dalej” ponownie.',
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
      bookedTitleIntro: 'Gotowe. Wizyta potwierdzona.',
      bookedBodyIntro: 'Link do spotkania wideo przyjdzie na pocztę w ciągu minuty. Jeśli nie dotarł, proszę sprawdzić spam albo napisać na Telegram.',
      introTitle: 'Bezpłatne spotkanie wstępne, 15 minut',
      introSub: 'Krótka rozmowa, żeby omówić temat, zadać pytania i wybrać dalszy format pracy.',
      introMicro: 'Jeśli potrzebujesz innej godziny, napisz, dobierzemy termin indywidualnie.',
      introMoreDates: 'Pokaż kolejne terminy',
      introCta: 'Umów bezpłatne spotkanie wstępne',
      introTaken: 'zajęte'
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

  // SHA-256 hex of a normalized string, for Google Ads enhanced conversions.
  // Returns null if Web Crypto is unavailable (e.g. a non-secure context).
  async function sha256Hex(value) {
    try {
      if (!value || !window.crypto || !crypto.subtle) return null;
      var norm = String(value).trim().toLowerCase();
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
      return Array.prototype.map.call(new Uint8Array(buf), function(b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    } catch (e) {
      return null;
    }
  }

  function trackEvent(name, params) {
    params = params || {};
    // Enhanced conversions: lift the hashed email out before the GA4 event so
    // it only ever rides on the Google Ads conversion, never into GA4.
    var emailSha256 = params._email_sha256;
    if (emailSha256) delete params._email_sha256;

    if (typeof gtag === 'function') {
      gtag('event', name, params);
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
        if (params.value != null) fbParams.value = params.value;
        if (params.currency) fbParams.currency = params.currency;
        window.fbq('track', fbName, fbParams);
      }
    }
    var ids = window.MARKETING_IDS || {};
    if (ids.googleAdsTag && typeof gtag === 'function') {
      // Paid session: precise value-based Google Ads conversion.
      if (name === 'purchase' && ids.googleAdsConversionLabel) {
        gtag('event', 'conversion', {
          send_to: ids.googleAdsTag + '/' + ids.googleAdsConversionLabel,
          value: params.value || 180,
          currency: params.currency || 'PLN',
          transaction_id: params.transaction_id || ''
        });
      }
      // Free intro booking: the pilot's primary conversion, no monetary value.
      // Enhanced conversions for leads: attach the hashed email when present.
      // The AW tag is configured unconditionally in the page head; Consent Mode
      // still withholds user_data and the ping until ad_storage/ad_user_data are
      // granted, so a visitor who declines simply does not send this conversion.
      if (name === 'intro_booking' && ids.googleAdsIntroLabel) {
        if (emailSha256) {
          gtag('set', 'user_data', { sha256_email_address: emailSha256 });
        }
        gtag('event', 'conversion', {
          send_to: ids.googleAdsTag + '/' + ids.googleAdsIntroLabel,
          transaction_id: params.transaction_id || ''
        });
      }
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

    // Intro mode: one quiet vertical column, nearest date only, compact choice.
    // Paid mode keeps the original multi-day grid untouched.
    const topHtml = isIntro
      ? '<h2 class="bw-v2__intro-title">' + t.introTitle + '</h2>' +
        '<p class="bw-v2__intro-sub">' + t.introSub + '</p>' +
        '<p class="bw-v2__tz-note">' + t.tzNote + '</p>' +
        '<div class="bw-v2__single"></div>' +
        '<button type="button" class="bw-v2__more-dates" hidden>' + t.introMoreDates + '</button>' +
        '<p class="bw-v2__intro-micro">' + t.introMicro + '</p>' +
        '<button type="button" class="bw-v2__intro-cta" disabled>' + t.introCta + '</button>'
      : '<h2 class="bw-v2__lead"></h2>' +
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
        '<button type="button" class="bw-v2__change-time" hidden>' + t.changeTime + '</button>';

    container.innerHTML =
      '<div class="bw-v2' + (isIntro ? ' bw-v2--intro' : '') + '">' +
        topHtml +
        '<div class="bw-v2__form" hidden>' +
          '<div class="bw-v2__form-title"></div>' +
          '<form>' +
            '<input type="text" name="name" autocomplete="name" aria-label="' + t.name + '" placeholder="' + t.name + '" required>' +
            '<input type="email" name="email" autocomplete="email" inputmode="email" spellcheck="false" aria-label="' + t.email + '" placeholder="' + t.email + '" required>' +
            '<button type="submit">' + t.bookContinue + '</button>' +
            '<p class="bw-v2__email-warn" hidden style="margin:8px 0 0;font-size:13px;color:#b00020;"></p>' +
            '<p class="bw-v2__consent" style="margin:10px 0 0;font-size:12px;color:var(--text-muted,#6b6b6b);">' + t.consentNote + '</p>' +
          '</form>' +
        '</div>' +
        '<div class="bw-v2__confirm" hidden>' +
          '<div class="bw-v2__confirm-title">' + t.confirmTitle + '</div>' +
          '<p class="bw-v2__confirm-session"></p>' +
          '<p class="bw-v2__tz-note">' + t.tzNote + '</p>' +
          '<p class="bw-v2__confirm-meta"></p>' +
          '<p class="bw-v2__confirm-cancel"></p>' +
          '<button type="button" class="bw-v2__confirm-pay">' + payLabel + '</button>' +
          (isIntro ? '' :
            '<details class="bw-v2__cancel-details">' +
              '<summary class="bw-v2__cancel-details-summary">' + t.cancelDetailsTitle + '</summary>' +
              '<div class="bw-v2__cancel-details-body">' +
                '<p>' + t.cancelDetailsP1 + '</p>' +
                '<p>' + t.cancelDetailsP2 + '</p>' +
                '<p>' + t.cancelDetailsP3 + '</p>' +
              '</div>' +
            '</details>') +
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
    const $emailWarn = container.querySelector('.bw-v2__email-warn');
    const $confirm = container.querySelector('.bw-v2__confirm');
    const $confirmSession = container.querySelector('.bw-v2__confirm-session');
    const $confirmCancel = container.querySelector('.bw-v2__confirm-cancel');
    const $confirmMeta = container.querySelector('.bw-v2__confirm-meta');
    const $confirmPay = container.querySelector('.bw-v2__confirm-pay');
    const $changeTime = container.querySelector('.bw-v2__change-time');
    const $message = container.querySelector('.bw-v2__message');
    const $loading = container.querySelector('.bw-v2__loading');
    // Intro-only nodes (null in paid mode).
    const $single = container.querySelector('.bw-v2__single');
    const $moreDates = container.querySelector('.bw-v2__more-dates');
    const $introCta = container.querySelector('.bw-v2__intro-cta');

    let daysData = [];
    let serviceInfo = isIntro ? { duration: 15, price: 0 } : { duration: 50, price: 180 };
    let selectedDate = null;
    let selectedTime = null;
    let pendingName = '';
    let pendingEmail = '';
    let formStarted = false;
    let bookingCompleted = false;
    let emailWarned = false;
    let currentBatchStart = 0;
    let introVisibleDays = 1; // how many upcoming dates the intro column reveals

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

    // ---- Intro mode ----------------------------------------------------
    // Only days that actually have a free slot count as "dates".
    function introDays() {
      return daysData.filter(function(day) {
        return day.slots.some(function(s) { return s.status === 'available'; });
      });
    }

    function updateIntroCta() {
      if (!$introCta) return;
      if (selectedDate && selectedTime) $introCta.removeAttribute('disabled');
      else $introCta.setAttribute('disabled', '');
    }

    function renderIntro() {
      const days = introDays();
      if (!days.length) {
        $single.innerHTML = '<p class="bw-v2__intro-empty">' + t.leadEmpty + '</p>';
        if ($moreDates) $moreDates.setAttribute('hidden', '');
        updateIntroCta();
        return;
      }
      const shown = days.slice(0, introVisibleDays);
      $single.innerHTML = shown.map(function(day) {
        const d = parseDate(day.date);
        let dayName = t.daysFull[d.getDay()];
        dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const head = dayName + ', ' + d.getDate() + ' ' + t.monthsGen[d.getMonth()];
        // At most 1-2 quiet "taken" markers + up to 4 free slots, kept chronological.
        const taken = day.slots.filter(function(s) { return s.status === 'taken'; }).slice(0, 2);
        const avail = day.slots.filter(function(s) { return s.status === 'available'; }).slice(0, 4);
        const rows = taken.concat(avail).sort(function(a, b) {
          return a.time < b.time ? -1 : (a.time > b.time ? 1 : 0);
        });
        const slotsHtml = rows.map(function(s) {
          if (s.status === 'taken') {
            return '<div class="bw-v2__islot bw-v2__islot--taken">' +
                     '<span class="bw-v2__islot-time">' + s.time + '</span>' +
                     '<span class="bw-v2__islot-note">' + t.introTaken + '</span>' +
                   '</div>';
          }
          const isSel = (day.date === selectedDate && s.time === selectedTime);
          return '<button type="button" class="bw-v2__islot bw-v2__islot--available' +
                   (isSel ? ' bw-v2__islot--selected' : '') + '"' +
                   ' data-date="' + day.date + '" data-time="' + s.time + '" data-status="available">' +
                   '<span class="bw-v2__islot-time">' + s.time + '</span>' +
                 '</button>';
        }).join('');
        return '<div class="bw-v2__iday">' +
                 '<div class="bw-v2__iday-head">' + head + '</div>' +
                 '<div class="bw-v2__islots">' + slotsHtml + '</div>' +
               '</div>';
      }).join('');

      $single.querySelectorAll('.bw-v2__islot--available').forEach(function(el) {
        el.addEventListener('click', onSlotClick);
      });

      if ($moreDates) {
        if (introVisibleDays < days.length) $moreDates.removeAttribute('hidden');
        else $moreDates.setAttribute('hidden', '');
      }
      updateIntroCta();
    }

    function rerender() {
      if (isIntro) renderIntro();
      else renderGrid();
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
      if ($grid) $grid.querySelectorAll('.bw-v2__time--selected').forEach(function(s) { s.classList.remove('bw-v2__time--selected'); });
      if ($single) $single.querySelectorAll('.bw-v2__islot--selected').forEach(function(s) { s.classList.remove('bw-v2__islot--selected'); });
      $form.setAttribute('hidden', '');
      $confirm.setAttribute('hidden', '');
      $message.setAttribute('hidden', '');
      if ($changeTime) $changeTime.setAttribute('hidden', '');
      updateIntroCta();
    }

    function onSlotClick(e) {
      const el = e.currentTarget;
      if (el.dataset.status !== 'available') {
        e.preventDefault();
        return;
      }

      // Intro mode: tapping a slot only selects it; the main CTA opens the form.
      if (isIntro) {
        const already = (el.dataset.date === selectedDate && el.dataset.time === selectedTime);
        $single.querySelectorAll('.bw-v2__islot--selected').forEach(function(s) { s.classList.remove('bw-v2__islot--selected'); });
        $form.setAttribute('hidden', '');
        $confirm.setAttribute('hidden', '');
        $message.setAttribute('hidden', '');
        if (already) {
          selectedDate = null;
          selectedTime = null;
          updateIntroCta();
          return;
        }
        selectedDate = el.dataset.date;
        selectedTime = el.dataset.time;
        el.classList.add('bw-v2__islot--selected');
        updateIntroCta();
        trackEvent('slot_selected', { locale: locale, date: selectedDate, time: selectedTime });
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

    if ($changeTime) $changeTime.addEventListener('click', deselectSlot);

    if ($moreDates) $moreDates.addEventListener('click', function() {
      introVisibleDays += 1;
      renderIntro();
    });

    // Intro main CTA: enabled once a slot is picked, opens the name/email form.
    if ($introCta) $introCta.addEventListener('click', function() {
      if (!selectedDate || !selectedTime) return;
      const d = parseDate(selectedDate);
      $formTitle.textContent = t.formTitleIntro
        .replace('{dayName}', t.daysFull[d.getDay()])
        .replace('{day}', d.getDate())
        .replace('{date}', t.monthsGen[d.getMonth()])
        .replace('{time}', selectedTime)
        .replace('{duration}', serviceInfo.duration || 15);
      $formEl.name.value = pendingName;
      $formEl.email.value = pendingEmail;
      $form.removeAttribute('hidden');
      $confirm.setAttribute('hidden', '');
      $message.setAttribute('hidden', '');
      $form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

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
          bookingCompleted = true;
          window.location.href = data.url;
          return;
        }
        // Intro flow: booked immediately, no payment. Show inline success.
        if (data.ok && data.booked) {
          bookingCompleted = true;
          trackEvent('intro_booked', { locale: locale });
          var emailSha256 = await sha256Hex(pendingEmail);
          trackEvent('intro_booking', { method: 'website_widget', language: locale, transaction_id: (selectedDate && selectedTime) ? (selectedDate + '_' + selectedTime) : '', _email_sha256: emailSha256 });
          if (selectedDate && selectedTime) {
            var booked = (daysData.find(function(dd) { return dd.date === selectedDate; }) || {}).slots || [];
            booked.forEach(function(s) { if (s.time === selectedTime) s.status = 'taken'; });
          }
          $confirm.setAttribute('hidden', '');
          if ($changeTime) $changeTime.setAttribute('hidden', '');
          deselectSlot();
          rerender();
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

    if ($prev) $prev.addEventListener('click', function() {
      if (isMobile()) {
        const colWidth = $grid.clientWidth / 3;
        $grid.scrollBy({ left: -colWidth * 2, behavior: 'smooth' });
        return;
      }
      currentBatchStart = Math.max(0, currentBatchStart - BATCH_SIZE);
      renderGrid();
    });

    if ($next) $next.addEventListener('click', function() {
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

    if ($grid) $grid.addEventListener('scroll', function() {
      if (isMobile()) updateNavButtons();
    }, { passive: true });

    window.addEventListener('resize', function() {
      if (isIntro) return; // intro column is single-column at every width
      currentBatchStart = 0;
      renderGrid();
    });

    // form_started: first interaction with the booking form (Ads-pilot funnel).
    $formEl.addEventListener('focusin', function() {
      if (!formStarted) {
        formStarted = true;
        trackEvent('form_started', { locale: locale, type: isIntro ? 'intro' : 'paid' });
      }
    });
    $formEl.email.addEventListener('input', function() { emailWarned = false; hideEmailWarn(); });

    var EMAIL_DOMAINS = ['gmail.com','googlemail.com','yandex.ru','yandex.by','ya.ru','mail.ru','outlook.com','hotmail.com','live.com','icloud.com','me.com','yahoo.com','proton.me','protonmail.com','wp.pl','o2.pl','onet.pl','interia.pl','op.pl','gazeta.pl'];
    function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
    function lev(a, b) {
      var m = a.length, n = b.length, i, j, d = [];
      for (i = 0; i <= m; i++) d[i] = [i];
      for (j = 0; j <= n; j++) d[0][j] = j;
      for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a.charAt(i-1) === b.charAt(j-1) ? 0 : 1));
      return d[m][n];
    }
    function suggestEmailFix(v) {
      var at = v.lastIndexOf('@'); if (at < 1) return '';
      var local = v.slice(0, at), domain = v.slice(at + 1).toLowerCase();
      if (EMAIL_DOMAINS.indexOf(domain) !== -1) return '';
      var best = '', bestD = 3, i, dd;
      for (i = 0; i < EMAIL_DOMAINS.length; i++) {
        dd = lev(domain, EMAIL_DOMAINS[i]);
        if (dd < bestD) { bestD = dd; best = EMAIL_DOMAINS[i]; }
      }
      return (best && bestD <= 2) ? local + '@' + best : '';
    }
    function showEmailWarn(msg) { if ($emailWarn) { $emailWarn.textContent = msg; $emailWarn.removeAttribute('hidden'); } }
    function hideEmailWarn() { if ($emailWarn) { $emailWarn.setAttribute('hidden', ''); $emailWarn.textContent = ''; } }

    $formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = $formEl.name.value.trim();
      const email = $formEl.email.value.trim();
      if (!name || !email || !selectedDate || !selectedTime) return;
      // Email is the ONLY channel for the Meet link: guard typos before booking.
      if (!isValidEmail(email)) { showEmailWarn(t.emailInvalid); $formEl.email.focus(); return; }
      var fix = suggestEmailFix(email);
      if (fix && !emailWarned) { emailWarned = true; showEmailWarn(t.emailMaybeTypo.replace('%s', fix)); return; }
      hideEmailWarn();
      pendingName = name;
      pendingEmail = email;
      showConfirm();
    });

    // form_abandoned: started the form but left before booking (drop-off signal).
    window.addEventListener('pagehide', function() {
      if (formStarted && !bookingCompleted) {
        trackEvent('form_abandoned', { locale: locale, type: isIntro ? 'intro' : 'paid', transport_type: 'beacon' });
      }
    });

    function showApiError() {
      $widget.classList.add('bw-v2--error');
      $loading.style.display = 'none';
      const target = isIntro ? $single : $grid;
      target.innerHTML =
        '<div class="bw-v2__fallback">' +
          '<p>' + t.apiError + '</p>' +
          '<a class="bw-v2__fallback-btn" href="' + TG_URL + '" target="_blank" rel="noopener noreferrer">' + t.writeTelegram + '</a>' +
        '</div>';
      if ($moreDates) $moreDates.setAttribute('hidden', '');
      if ($lead) $lead.textContent = t.leadEmpty;
      if ($range) $range.textContent = '';
      if ($prev) $prev.disabled = true;
      if ($next) $next.disabled = true;
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
      introVisibleDays = 1;

      if (isIntro) {
        renderIntro();
      } else {
        updateLead();
        updateMeta();
        renderGrid();
      }
      $loading.style.display = 'none';
    }

    loadSlots();

    // Paid checkout returns via Stripe to /spasibo or /dziekuje, which fire the
    // purchase conversion themselves; the old ?booking=success widget path is
    // retired. Only the cancel return is still handled here.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('booking') === 'cancelled') {
      trackEvent('checkout_abandoned', { currency: 'PLN', value: 180 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  window.BookingWidget = { init };
})();
