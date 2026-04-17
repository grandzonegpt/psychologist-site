const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const config = require('./config');

const app = express();
app.use(cors({ origin: ['https://levashou.pl', 'https://www.levashou.pl', 'http://localhost:3000', 'http://127.0.0.1:5500'] }));
app.use(express.json());

let calendar;
try {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });
  calendar = google.calendar({ version: 'v3', auth });
} catch (e) {
  console.error('Google auth error:', e.message);
}

function generateSlots(daySchedule) {
  const slots = [];
  const [startH, startM] = daySchedule.start.split(':').map(Number);
  const [endH, endM] = daySchedule.end.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const step = config.slotDuration + config.breakDuration;

  for (let m = startMin; m + config.slotDuration <= endMin; m += step) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}

app.get('/api/slots', async (req, res) => {
  try {
    const now = new Date();
    const timeMin = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }));
    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + config.daysAhead);

    let busySlots = [];
    if (calendar) {
      const busy = await calendar.freebusy.query({
        requestBody: {
          timeMin: now.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone: config.timezone,
          items: [{ id: config.calendarId }]
        }
      });
      busySlots = busy.data.calendars[config.calendarId]?.busy || [];
    }

    const result = {};
    for (let d = 0; d < config.daysAhead; d++) {
      const date = new Date(timeMin);
      date.setDate(date.getDate() + d);
      const dow = date.getDay();
      const daySchedule = config.schedule[dow];
      if (!daySchedule) continue;

      const dateStr = date.toISOString().split('T')[0];
      const allSlots = generateSlots(daySchedule);

      const available = allSlots.filter(time => {
        const slotStart = new Date(`${dateStr}T${time}:00`);
        const slotEnd = new Date(slotStart.getTime() + config.slotDuration * 60000);
        const slotStartUTC = new Date(slotStart.toLocaleString('en-US', { timeZone: 'UTC' }));

        if (slotStart < now) return false;

        return !busySlots.some(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return slotStart < bEnd && slotEnd > bStart;
        });
      });

      if (available.length > 0) {
        result[dateStr] = available;
      }
    }

    res.json({
      slots: result,
      service: config.serviceName,
      duration: config.slotDuration,
      price: config.price,
      currency: config.currency
    });
  } catch (e) {
    console.error('Slots error:', e.message);
    res.status(500).json({ error: 'Failed to load slots' });
  }
});

app.post('/api/book', async (req, res) => {
  try {
    const { name, email, date, time, locale } = req.body;
    if (!name || !email || !date || !time) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const startDateTime = `${date}T${time}:00`;
    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + config.slotDuration * 60000);

    const serviceName = config.serviceName[locale] || config.serviceName.ru;

    if (calendar) {
      await calendar.events.insert({
        calendarId: config.calendarId,
        requestBody: {
          summary: `${serviceName}: ${name}`,
          description: `Email: ${email}\nLocale: ${locale || 'ru'}`,
          start: { dateTime: start.toISOString(), timeZone: config.timezone },
          end: { dateTime: end.toISOString(), timeZone: config.timezone },
          attendees: [{ email }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        },
        sendUpdates: 'all'
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('Book error:', e.message);
    res.status(500).json({ error: 'Booking failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Booking API on port ${PORT}`));
