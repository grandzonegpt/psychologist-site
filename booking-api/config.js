module.exports = {
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
  timezone: 'Europe/Warsaw',
  slotDuration: 50,
  breakDuration: 10,
  price: 180,
  currency: 'PLN',
  schedule: {
    2: { start: '12:00', end: '16:00' },
    3: { start: '10:00', end: '14:00' },
    4: { start: '12:00', end: '16:00' }
  },
  daysAhead: 28,
  serviceName: {
    ru: 'Психологическая консультация',
    pl: 'Konsultacja psychologiczna'
  }
};
