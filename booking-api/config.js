module.exports = {
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  timezone: 'Europe/Warsaw',
  slotDuration: 50,
  breakDuration: 10,
  price: 180,
  currency: 'PLN',
  schedule: {
    3: { start: '12:00', end: '17:00' },
    4: { start: '12:00', end: '17:00' }
  },
  daysAhead: 28,
  serviceName: {
    ru: 'Психологическая консультация',
    pl: 'Konsultacja psychologiczna'
  }
};
