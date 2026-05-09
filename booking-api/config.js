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
  }
};
