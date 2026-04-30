function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const LOCALE_RE = /^(ru|pl)$/;

function validateBooking({ name, email, date, time, locale }) {
  if (!name || typeof name !== 'string' || name.length > 100) return 'Invalid name';
  if (!email || !EMAIL_RE.test(email)) return 'Invalid email';
  if (!date || !DATE_RE.test(date)) return 'Invalid date';
  if (!time || !TIME_RE.test(time)) return 'Invalid time';

  const d = new Date(`${date}T${time}:00`);
  if (isNaN(d.getTime())) return 'Invalid date/time';

  if (locale && !LOCALE_RE.test(locale)) return 'Invalid locale';
  return null;
}

function validateContact({ name, email, message }) {
  if (!name || typeof name !== 'string' || name.length > 100) return 'Invalid name';
  if (!email || typeof email !== 'string' || email.length > 200) return 'Invalid email or phone';
  if (message != null && (typeof message !== 'string' || message.length > 1000)) return 'Invalid message';
  return null;
}

module.exports = { escapeHtml, validateBooking, validateContact };
