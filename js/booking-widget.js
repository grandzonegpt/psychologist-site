(function() {
  const API_URL = 'https://booking-api-production-c2ca.up.railway.app';

  const i18n = {
    ru: {
      months: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
      weekdays: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
      selectDate: 'Выбери дату',
      selectTime: 'Выбери время',
      name: 'Имя',
      email: 'Email',
      book: 'Записаться',
      booked: 'Оплата прошла! Ссылка на встречу:',
      meetLink: 'Подключиться через Google Meet',
      noSlots: 'Нет свободных слотов',
      loading: 'Загрузка...',
      error: 'Ошибка. Попробуй ещё раз.',
      duration: 'мин',
      price: 'PLN'
    },
    pl: {
      months: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
      weekdays: ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'],
      selectDate: 'Wybierz datę',
      selectTime: 'Wybierz godzinę',
      name: 'Imię',
      email: 'Email',
      book: 'Umów sesję',
      booked: 'Płatność przeszła! Link do spotkania:',
      meetLink: 'Dołącz przez Google Meet',
      noSlots: 'Brak wolnych terminów',
      loading: 'Ładowanie...',
      error: 'Błąd. Spróbuj ponownie.',
      duration: 'min',
      price: 'PLN'
    }
  };

  function init(containerId, locale) {
    const t = i18n[locale] || i18n.ru;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="bw-widget">
        <div class="bw-header">
          <button class="bw-nav bw-prev" aria-label="Previous">&#8249;</button>
          <span class="bw-month"></span>
          <button class="bw-nav bw-next" aria-label="Next">&#8250;</button>
        </div>
        <div class="bw-weekdays">${t.weekdays.map(d => `<span>${d}</span>`).join('')}</div>
        <div class="bw-days"></div>
        <div class="bw-slots-section" style="display:none;">
          <div class="bw-slots-title"></div>
          <div class="bw-slots"></div>
        </div>
        <div class="bw-form-section" style="display:none;">
          <div class="bw-form-title"></div>
          <form class="bw-form">
            <input type="text" name="name" placeholder="${t.name}" required>
            <input type="email" name="email" placeholder="${t.email}" required>
            <button type="submit" class="bw-submit">${t.book}</button>
          </form>
        </div>
        <div class="bw-message" style="display:none;"></div>
        <div class="bw-loading" style="display:none;">${t.loading}</div>
      </div>
    `;

    let slotsData = {};
    let currentMonth = new Date();
    let selectedDate = null;
    let selectedTime = null;
    let serviceInfo = {};

    const $month = container.querySelector('.bw-month');
    const $days = container.querySelector('.bw-days');
    const $prev = container.querySelector('.bw-prev');
    const $next = container.querySelector('.bw-next');
    const $slotsSection = container.querySelector('.bw-slots-section');
    const $slotsTitle = container.querySelector('.bw-slots-title');
    const $slots = container.querySelector('.bw-slots');
    const $formSection = container.querySelector('.bw-form-section');
    const $formTitle = container.querySelector('.bw-form-title');
    const $form = container.querySelector('.bw-form');
    const $message = container.querySelector('.bw-message');
    const $loading = container.querySelector('.bw-loading');

    function renderCalendar() {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      $month.textContent = `${t.months[month]} ${year}`;

      const firstDay = new Date(year, month, 1);
      let startDow = firstDay.getDay() - 1;
      if (startDow < 0) startDow = 6;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      today.setHours(0,0,0,0);

      let html = '';
      for (let i = 0; i < startDow; i++) html += '<span class="bw-day bw-empty"></span>';

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dateObj = new Date(year, month, d);
        const isPast = dateObj < today;
        const hasSlots = slotsData[dateStr] && slotsData[dateStr].length > 0;
        const isSelected = dateStr === selectedDate;

        let cls = 'bw-day';
        if (isPast) cls += ' bw-past';
        else if (hasSlots) cls += ' bw-available';
        else cls += ' bw-unavailable';
        if (isSelected) cls += ' bw-selected';

        html += `<span class="${cls}" data-date="${dateStr}">${d}</span>`;
      }
      $days.innerHTML = html;

      $days.querySelectorAll('.bw-available').forEach(el => {
        el.addEventListener('click', () => selectDate(el.dataset.date));
      });
    }

    function selectDate(dateStr) {
      selectedDate = dateStr;
      selectedTime = null;
      $formSection.style.display = 'none';
      $message.style.display = 'none';
      renderCalendar();

      const slots = slotsData[dateStr] || [];
      if (slots.length === 0) {
        $slotsSection.style.display = 'none';
        return;
      }

      const d = new Date(dateStr + 'T00:00:00');
      const dayName = t.weekdays[(d.getDay() + 6) % 7];
      const dayNum = d.getDate();
      const monthName = t.months[d.getMonth()];
      $slotsTitle.textContent = `${dayNum} ${monthName}, ${dayName}`;

      $slots.innerHTML = slots.map(time =>
        `<button class="bw-slot" data-time="${time}">${time}</button>`
      ).join('');

      $slots.querySelectorAll('.bw-slot').forEach(el => {
        el.addEventListener('click', () => selectTime(el.dataset.time));
      });

      $slotsSection.style.display = 'block';
    }

    function selectTime(time) {
      selectedTime = time;
      $slots.querySelectorAll('.bw-slot').forEach(el => {
        el.classList.toggle('bw-slot-selected', el.dataset.time === time);
      });

      const d = new Date(selectedDate + 'T00:00:00');
      const dayNum = d.getDate();
      const monthName = t.months[d.getMonth()];
      $formTitle.textContent = `${dayNum} ${monthName}, ${time} — ${serviceInfo.duration || 50} ${t.duration}, ${serviceInfo.price || 180} ${t.price}`;
      $formSection.style.display = 'block';
      $message.style.display = 'none';
    }

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $form.name.value.trim();
      const email = $form.email.value.trim();
      if (!name || !email || !selectedDate || !selectedTime) return;

      $form.querySelector('.bw-submit').disabled = true;
      $form.querySelector('.bw-submit').textContent = t.loading;

      try {
        const resp = await fetch(`${API_URL}/api/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, date: selectedDate, time: selectedTime, locale })
        });
        const data = await resp.json();
        if (data.ok && data.url) {
          window.location.href = data.url;
          return;
        } else if (!data.ok) {
          throw new Error(data.error);
        }
      } catch (err) {
        $message.textContent = t.error;
        $message.className = 'bw-message bw-error';
        $message.style.display = 'block';
      }
      $form.querySelector('.bw-submit').disabled = false;
      $form.querySelector('.bw-submit').textContent = t.book;
    });

    $prev.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    });
    $next.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    });

    function generateDemoSlots() {
      const demo = {};
      const now = new Date();
      for (let d = 1; d <= 28; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        const dow = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        if (dow === 2 || dow === 4) demo[dateStr] = ['12:00','13:00','14:00','15:00'];
        else if (dow === 3) demo[dateStr] = ['10:00','11:00','12:00','13:00'];
        else continue;
      }
      return demo;
    }

    async function loadSlots() {
      $loading.style.display = 'block';
      try {
        const resp = await fetch(`${API_URL}/api/slots`);
        const data = await resp.json();
        slotsData = data.slots || {};
        serviceInfo = { duration: data.duration, price: data.price };
      } catch (e) {
        slotsData = generateDemoSlots();
        serviceInfo = { duration: 50, price: 180 };
      }
      renderCalendar();
      $loading.style.display = 'none';
    }

    loadSlots();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('booking') === 'success') {
      $message.innerHTML = `${t.booked}<br><a href="https://meet.google.com/mbs-kkqi-kpp" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;padding:10px 20px;background:#C9A961;color:#0a0a0b;border-radius:8px;text-decoration:none;font-weight:500;">${t.meetLink}</a>`;
      $message.className = 'bw-message bw-success';
      $message.style.display = 'block';
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  window.BookingWidget = { init };
})();
