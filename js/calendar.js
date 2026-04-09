/* ================================================
   calendar.js — Interactive Booking Calendar
   ================================================ */

(function () {

  /* Fall back to defaults if schedule.js not loaded */
  function getSchedule() {
    return (typeof SCHEDULE !== 'undefined') ? SCHEDULE : {
      workDays: [1,2,3,4,5],
      defaultHours: [10,11,12,14,15,16,18,19],
      customDayHours: {},
      blockedDates: [],
      bookedSlots: [],
    };
  }

  function getHoursForDate(date) {
    const sc = getSchedule();
    const dow = date.getDay(); // 0=Sun
    if (sc.customDayHours && sc.customDayHours[dow]) {
      return sc.customDayHours[dow];
    }
    return sc.defaultHours;
  }

  function isBlockedDate(date) {
    const sc = getSchedule();
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return sc.blockedDates.includes(key);
  }

  function isBookedSlot(date, hour) {
    const sc = getSchedule();
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}-${hour}`;
    return sc.bookedSlots.includes(key);
  }

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let selectedDate = null;
  let selectedTime = null;

  function getLang() {
    return localStorage.getItem('lang') || 'ru';
  }

  function getT(key) {
    const lang = getLang();
    return (typeof T !== 'undefined' && T[lang] && T[lang][key]) ? T[lang][key] : key;
  }

  function getMonths() { return getT('cal.months'); }
  function getDays()   { return getT('cal.days'); }

  function isBusy(date, hour) {
    return isBookedSlot(date, hour);
  }

  function isWorkday(date) {
    const sc = getSchedule();
    const d  = date.getDay();
    if (!sc.workDays.includes(d)) return false;
    if (isBlockedDate(date)) return false;
    return getHoursForDate(date).length > 0;
  }

  function isPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  function isToday(date) {
    const t = new Date();
    return date.getDate() === t.getDate() &&
           date.getMonth() === t.getMonth() &&
           date.getFullYear() === t.getFullYear();
  }

  function formatDate(date) {
    const months = getMonths();
    const days_ru = ['воскресенье','понедельник','вторник','среду','четверг','пятницу','субботу'];
    const days_pl = ['niedzielę','poniedziałek','wtorek','środę','czwartek','piątek','sobotę'];
    const dayNames = getLang() === 'pl' ? days_pl : days_ru;
    return `${date.getDate()} ${months[date.getMonth()].toLowerCase()}, ${dayNames[date.getDay()]}`;
  }

  /* Render */
  function renderCalendar() {
    const widget = document.getElementById('calendar-widget');
    if (!widget) return;

    const months   = getMonths();
    const weekdays = getDays();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay  = new Date(currentYear, currentMonth + 1, 0);

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    let daysHTML = '';
    for (let i = 0; i < startOffset; i++) {
      daysHTML += `<div class="cal-day empty"></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date    = new Date(currentYear, currentMonth, d);
      const past    = isPast(date);
      const workday = isWorkday(date);
      const today   = isToday(date);

      let cls = 'cal-day';
      if (past)         cls += ' past';
      else if (workday) cls += ' avail';
      if (today)        cls += ' today';

      if (selectedDate &&
          date.getDate()      === selectedDate.getDate() &&
          date.getMonth()     === selectedDate.getMonth() &&
          date.getFullYear()  === selectedDate.getFullYear()) {
        cls += ' selected';
      }

      const dataAttr = (!past && workday)
        ? `data-date="${currentYear}-${currentMonth + 1}-${d}"`
        : '';

      daysHTML += `<div class="${cls}" ${dataAttr}>${d}</div>`;
    }

    let slotsHTML = '';
    if (selectedDate) {
      const slotsGrid = getHoursForDate(selectedDate).map(h => {
        const busy = isBusy(selectedDate, h);
        const time = `${h}:00`;
        const cls  = 'time-slot' + (busy ? ' busy' : '');
        const data = busy ? '' : `data-time="${time}"`;
        return `<div class="${cls}" ${data}>${time}</div>`;
      }).join('');

      slotsHTML = `
        <div class="slots-panel">
          <div class="slots-title">${getT('cal.slots.title')}: ${formatDate(selectedDate)}</div>
          <div class="slots-grid">${slotsGrid}</div>
        </div>`;
    } else {
      slotsHTML = `
        <div class="slots-panel">
          <div class="cal-placeholder">${getT('cal.placeholder')}</div>
        </div>`;
    }

    const today = new Date();
    const prevDisabled = (currentYear === today.getFullYear() && currentMonth <= today.getMonth());

    widget.innerHTML = `
      <div class="cal-head">
        <button class="cal-btn" id="cal-prev" ${prevDisabled ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>&#8249;</button>
        <span class="cal-month-title">${months[currentMonth]} ${currentYear}</span>
        <button class="cal-btn" id="cal-next">&#8250;</button>
      </div>
      <div class="cal-weekdays">
        ${weekdays.map(w => `<div class="cal-wd">${w}</div>`).join('')}
      </div>
      <div class="cal-days" id="cal-days">${daysHTML}</div>
      ${slotsHTML}
    `;

    attachCalendarEvents();
  }

  function attachCalendarEvents() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      const today = new Date();
      if (currentYear > today.getFullYear() || currentMonth > today.getMonth()) {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        selectedDate = null;
        renderCalendar();
      }
    });

    document.getElementById('cal-next')?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      selectedDate = null;
      renderCalendar();
    });

    document.querySelectorAll('.cal-day.avail').forEach(el => {
      el.addEventListener('click', () => {
        const [y, m, d] = el.dataset.date.split('-').map(Number);
        selectedDate = new Date(y, m - 1, d);
        renderCalendar();
      });
    });

    document.querySelectorAll('.time-slot:not(.busy)').forEach(el => {
      el.addEventListener('click', () => {
        selectedTime = el.dataset.time;
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        openModal(selectedDate, selectedTime);
      });
    });
  }

  /* Modal */
  function openModal(date, time) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    const hour = parseInt(time);
    const slotLabel = `${formatDate(date)}  ·  ${time} – ${hour + 1}:00`;

    const body = document.getElementById('modal-body');
    if (body) {
      body.innerHTML = `
        <div class="modal-slot">📅 &nbsp; ${slotLabel}</div>
        <h3 class="modal-title">${getT('modal.title')}</h3>
        <p class="modal-sub">${getT('modal.sub')}</p>
        <form id="booking-form">
          <div class="fg">
            <label for="b-name">${getT('modal.name')} *</label>
            <input type="text" id="b-name" placeholder="${getT('modal.name.ph')}" required />
          </div>
          <div class="fg">
            <label for="b-contact">${getT('modal.contact')} *</label>
            <input type="text" id="b-contact" placeholder="${getT('modal.contact.ph')}" required />
          </div>
          <div class="fg">
            <label for="b-note">${getT('modal.note')}</label>
            <textarea id="b-note" placeholder="${getT('modal.note.ph')}"></textarea>
          </div>
          <button type="submit" class="btn btn-warm" style="width:100%;justify-content:center;margin-top:.25rem;">
            ${getT('modal.submit')} &rarr;
          </button>
        </form>
      `;
      attachFormEvents();
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modal-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    selectedTime = null;
  }

  function attachFormEvents() {
    document.getElementById('booking-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const name    = document.getElementById('b-name')?.value.trim();
      const contact = document.getElementById('b-contact')?.value.trim();
      if (!name || !contact) return;

      const body = document.getElementById('modal-body');
      if (body) {
        body.innerHTML = `
          <div class="modal-success">
            <div class="success-icon">✓</div>
            <h3 class="success-t">${getT('modal.ok.title')}</h3>
            <p class="success-d" style="margin-top:.5rem">
              ${escapeHTML(name)} · ${escapeHTML(contact)}
            </p>
            <button class="btn btn-ghost" style="margin-top:1.75rem;width:100%;justify-content:center;" id="modal-done-btn">
              ${getT('modal.ok.close')}
            </button>
          </div>
        `;
        document.getElementById('modal-done-btn')?.addEventListener('click', closeModal);
      }
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
    );
  }

  /* Init */
  document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();

    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  });

  /* Expose for re-render on language change */
  window.renderCalendar = renderCalendar;

})();
