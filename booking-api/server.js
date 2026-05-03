const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Stripe = require('stripe');
const config = require('./config');
const telegramBot = require('./bot');
const mailer = require('./mailer');
const reminders = require('./reminders');
const calendarLib = require('./calendar');
const { validateBooking, validateContact } = require('./sanitize');

const app = express();
app.use(helmet());
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const allowedOrigins = ['https://levashou.pl', 'https://www.levashou.pl', 'http://localhost:3000', 'http://127.0.0.1:5500'];

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature failed:', e.message);
    return res.status(400).send('Invalid signature');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { name, email, date, time, locale } = session.metadata;
    try {
      const { eventId, meetLink } = await calendarLib.createCalendarEvent({ name, email, date, time, locale });
      telegramBot.notifyNewBooking({ name, email, date, time, locale, eventId, meetLink });
      mailer.sendConfirmation({ name, email, date, time, locale, meetLink }).catch(e => console.error('Email error:', e.message));
      console.log(`Booking confirmed: ${name} on ${date} at ${time} (meet: ${meetLink || 'none'})`);
    } catch (e) {
      console.error('Calendar event failed after payment:', e.message);
      telegramBot.notifyBookingFailed({ name, email, date, time, error: e.message });
    }
  }
  res.json({ received: true });
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '16kb' }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/book', apiLimiter);
app.use('/api/slots', rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/contact', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));

const calendar = calendarLib.init();

telegramBot.init(calendar);
reminders.start(calendar);

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
    const validationError = validateBooking({ name, email, date, time, locale });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const serviceName = config.serviceName[locale] || config.serviceName.ru;
    // SECURITY: never trust req.headers.origin — client-controlled, used in
    // Stripe redirect URLs (open-redirect / phishing risk). Hardcoded.
    const origin = 'https://levashou.pl';
    const returnPage = locale === 'pl' ? '/index-pl.html' : '/';

    const truncate = (v) => (typeof v === 'string' ? v.slice(0, 200) : '');
    const attribution = {
      utm_source: truncate(req.body.utm_source),
      utm_medium: truncate(req.body.utm_medium),
      utm_campaign: truncate(req.body.utm_campaign),
      utm_content: truncate(req.body.utm_content),
      referrer_page: truncate(req.body.referrer_page)
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'p24', 'blik'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'pln',
          product_data: { name: serviceName },
          unit_amount: config.price * 100
        },
        quantity: 1
      }],
      customer_email: email,
      metadata: { name, email, date, time, locale: locale || 'ru', ...attribution },
      success_url: `${origin}${returnPage}?booking=success`,
      cancel_url: `${origin}${returnPage}?booking=cancelled`
    });

    res.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('Book error:', e.message);
    res.status(500).json({ error: 'Booking failed' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, locale, _gotcha, consent_privacy } = req.body || {};

    if (_gotcha) return res.json({ ok: true });

    if (!consent_privacy) return res.status(400).json({ error: 'Consent required' });

    const validationError = validateContact({ name, email, message });
    if (validationError) return res.status(400).json({ error: validationError });

    const localeStr = locale === 'pl' ? 'pl' : 'ru';

    mailer.sendContactNotification({ name, email, message, locale: localeStr })
      .catch(e => console.error('Contact email error:', e.message));

    telegramBot.notifyContact({ name, email, message, locale: localeStr });

    console.log(`Contact: ${name} <${email}> [${localeStr}]`);
    res.json({ ok: true });
  } catch (e) {
    console.error('Contact error:', e.message);
    res.status(500).json({ error: 'Contact submission failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Booking API on port ${PORT}`));
