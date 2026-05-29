module.exports = {
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  timezone: 'Europe/Warsaw',
  slotDuration: 50,
  breakDuration: 10,
  price: 180,
  currency: 'PLN',
  // Source of truth lives in schedule.json under BOOKING_DATA_DIR and is
  // mutated by the Telegram bot. Empty here so a fresh deploy without that
  // file shows nothing rather than misleading legacy defaults.
  schedule: {},
  daysAhead: 14,
  serviceName: {
    ru: 'Психологическая консультация',
    pl: 'Konsultacja psychologiczna'
  },

  // Free 15-minute intro call ("Бесплатное знакомство"). Booked through the
  // same widget + Google Calendar as paid sessions, but with no Stripe step:
  // the calendar event is created immediately on /api/book. Its weekly
  // availability is a SEPARATE schedule the Telegram bot manages, stored in
  // intro-schedule.json under BOOKING_DATA_DIR.
  introSchedule: {},
  introDuration: 15,
  introBreakDuration: 5,
  // Intro can be booked closer to "now" than paid sessions (no payment to
  // clear), so it uses a shorter lead-time cutoff. Paid uses 12h, hardcoded
  // in server.js; intro uses this.
  introMinLeadHours: 3,
  introServiceName: {
    ru: 'Бесплатное знакомство',
    pl: 'Bezpłatne zapoznanie'
  },

  // "Showcase" decoy availability: a marketing display that makes the PAID
  // calendar look in-demand by rendering a share of free slots as taken
  // (struck-through). Display-only: it never touches Google Calendar, never
  // blocks a real booking, and never applies to the free intro. Toggled by
  // the Telegram bot, persisted to decoy.json under BOOKING_DATA_DIR.
  decoy: { enabled: false, intensity: 'low' }
};
