// Sentry must initialise BEFORE express so its auto-instrumentation can patch
// http/express modules at require time. No-op if SENTRY_DSN env var is unset.
const sentry = require('./sentry');

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Stripe = require('stripe');
const { warsawDate, warsawDateString } = require('./tz');
const config = require('./config');
const dataDir = require('./dataDir');
const telegramBot = require('./bot');
const mailer = require('./mailer');
const reminders = require('./reminders');
const calendarLib = require('./calendar');
const holds = require('./holds');
const audit = require('./audit');
const monitor = require('./monitor');
const { validateBooking, validateContact } = require('./sanitize');

const app = express();
// Railway/Heroku/Cloudflare put us behind a reverse proxy. Without trust proxy,
// express-rate-limit sees every request as coming from the proxy IP and the
// rate limit applies globally instead of per-client. '1' trusts a single hop
// upstream, which matches Railway's edge.
app.set('trust proxy', 1);
app.use(helmet());
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const allowedOrigins = ['https://levashou.pl', 'https://www.levashou.pl', 'http://localhost:3000', 'http://127.0.0.1:5500'];

// Stripe retries deliveries on non-2xx (and sometimes on 2xx if they didn't
// see the ack in time). Without dedup the same event creates two calendar
// entries. Persisted to BOOKING_DATA_DIR so a restart in the middle of
// Stripe's retry window doesn't reopen the door.
const PROCESSED_FILE = dataDir.path('processed-events.json');
const PROCESSED_LIMIT = 1000;
const processedWebhookEvents = new Set();

function loadProcessedWebhookEvents() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const arr = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
      arr.forEach(id => processedWebhookEvents.add(id));
      console.log(`Webhook dedup: loaded ${arr.length} ids`);
    }
  } catch (e) {
    console.error('Failed to load processed events:', e.message);
  }
}

function saveProcessedWebhookEvents() {
  // Atomic write: tmp + rename. Without this, a crash mid-fsync could leave
  // corrupted JSON, the next restart would load 0 events, and a Stripe retry
  // would create a duplicate calendar entry that the monitor wouldn't catch.
  const tmp = PROCESSED_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(Array.from(processedWebhookEvents)));
    fs.renameSync(tmp, PROCESSED_FILE);
  } catch (e) {
    console.error('Failed to save processed events:', e.message);
  }
}

function markWebhookProcessed(eventId) {
  processedWebhookEvents.add(eventId);
  if (processedWebhookEvents.size > PROCESSED_LIMIT) {
    const half = Array.from(processedWebhookEvents).slice(PROCESSED_LIMIT / 2);
    processedWebhookEvents.clear();
    half.forEach(id => processedWebhookEvents.add(id));
  }
  saveProcessedWebhookEvents();
}

loadProcessedWebhookEvents();

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature failed:', e.message);
    return res.status(400).send('Invalid signature');
  }

  if (processedWebhookEvents.has(event.id)) {
    console.log(`Webhook duplicate ignored: ${event.id} (${event.type})`);
    audit.log('webhook_dedup', { eventId: event.id, type: event.type });
    return res.json({ received: true, deduped: true });
  }
  markWebhookProcessed(event.id);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { name, email, date, time, locale, holdEventId } = session.metadata;
    try {
      // Drop the provisional hold first so the slot is free for the
      // real booking event. createCalendarEvent doesn't tolerate a
      // duplicate-time event in the same calendar.
      if (holdEventId) await holds.deleteHold(holdEventId);
      const { eventId, meetLink } = await calendarLib.createCalendarEvent({ name, email, date, time, locale });
      telegramBot.notifyNewBooking({ name, email, date, time, locale, eventId, meetLink });
      mailer.sendConfirmation({ name, email, date, time, locale, meetLink }).catch(e => console.error('Client email error:', e.message));
      mailer.sendAdminBookingAlert({ name, email, date, time, locale, meetLink }).catch(e => console.error('Admin email error:', e.message));
      console.log(`Booking confirmed: ${name} on ${date} at ${time} (meet: ${meetLink || 'none'})`);
      audit.log('booking_confirmed', { date, time, locale, eventId, sessionId: session.id });
    } catch (e) {
      console.error('Calendar event failed after payment:', e.message);
      sentry.captureException(e, { phase: 'webhook_calendar_event', sessionId: session.id, date, time, email });
      telegramBot.notifyBookingFailed({ name, email, date, time, error: e.message });
      audit.log('booking_failed', { date, time, error: e.message, sessionId: session.id });
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const holdEventId = session.metadata?.holdEventId;
    if (holdEventId) {
      await holds.deleteHold(holdEventId);
      console.log(`Hold released on session expiry: ${holdEventId}`);
      audit.log('session_expired', { sessionId: session.id, holdEventId });
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
monitor.start(telegramBot);

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

    const tooSoonCutoff = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const days = [];
    const legacy = {};

    for (let d = 0; d < config.daysAhead; d++) {
      const date = new Date(timeMin);
      date.setDate(date.getDate() + d);
      const dow = date.getDay();
      const daySchedule = config.schedule[dow];
      if (!daySchedule) continue;

      // dateStr must reflect the Warsaw calendar date, not the runtime's UTC
      // interpretation. warsawDateString handles DST and timezone offset.
      const dateStr = warsawDateString(date);
      const allSlots = generateSlots(daySchedule);
      const daySlots = [];
      const availableLegacy = [];

      for (const time of allSlots) {
        // Slot times in the schedule are Warsaw clock readings.
        const slotStart = warsawDate(dateStr, time);
        const slotEnd = new Date(slotStart.getTime() + config.slotDuration * 60000);

        if (slotStart < now) continue;

        const isBusy = busySlots.some(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return slotStart < bEnd && slotEnd > bStart;
        });

        let status;
        if (isBusy) status = 'taken';
        else if (slotStart < tooSoonCutoff) status = 'too-soon';
        else {
          status = 'available';
          availableLegacy.push(time);
        }

        daySlots.push({ time, status });
      }

      if (daySlots.length > 0) {
        days.push({ date: dateStr, slots: daySlots });
        if (availableLegacy.length > 0) legacy[dateStr] = availableLegacy;
      }
    }

    res.json({
      days,
      slots: legacy,
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
  let holdEventId = null;
  try {
    const { name, email, date, time, locale } = req.body;
    const validationError = validateBooking({ name, email, date, time, locale });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Schedule check: dow must be a working day, time must be a generated slot.
    const dow = new Date(`${date}T00:00:00`).getDay();
    const daySchedule = config.schedule[dow];
    if (!daySchedule) {
      return res.status(400).json({ error: 'day_not_working' });
    }
    if (!generateSlots(daySchedule).includes(time)) {
      return res.status(400).json({ error: 'invalid_slot' });
    }

    // Past + too-soon checks (must mirror /api/slots policy).
    const slotStart = warsawDate(date, time);
    const now = new Date();
    if (slotStart < now) {
      return res.status(400).json({ error: 'past_slot' });
    }
    const tooSoonCutoff = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    if (slotStart < tooSoonCutoff) {
      return res.status(400).json({ error: 'too_soon' });
    }

    // Race-window guard: someone may have just booked this slot.
    const free = await holds.isSlotFree(date, time);
    if (!free) {
      return res.status(409).json({ error: 'slot_taken' });
    }

    // Place a provisional hold so a parallel /api/book sees the slot busy.
    // The hold is replaced with a real booking event on payment success
    // (checkout.session.completed) or deleted on payment expiry.
    holdEventId = await holds.createHold(date, time);

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

    // 31 minutes is just over Stripe's 30-minute minimum for expires_at.
    // Keeps holds from lingering long if the user abandons checkout.
    const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'p24', 'blik'],
      mode: 'payment',
      expires_at: expiresAt,
      line_items: [{
        price_data: {
          currency: 'pln',
          product_data: { name: serviceName },
          unit_amount: config.price * 100
        },
        quantity: 1
      }],
      customer_email: email,
      metadata: { name, email, date, time, locale: locale || 'ru', holdEventId, ...attribution },
      success_url: `${origin}${returnPage}?booking=success`,
      cancel_url: `${origin}${returnPage}?booking=cancelled`
    });

    audit.log('book_request', { date, time, locale: locale || 'ru', sessionId: session.id, holdEventId });
    res.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('Book error:', e.message);
    sentry.captureException(e, { phase: 'api_book', date: req.body?.date, time: req.body?.time, holdEventId });
    if (holdEventId) {
      // Stripe creation failed after we placed a hold. Roll back.
      await holds.deleteHold(holdEventId);
    }
    audit.log('book_error', { error: e.message });
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
    sentry.captureException(e, { phase: 'api_contact' });
    res.status(500).json({ error: 'Contact submission failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// TEMP: one-shot Sentry pipeline check. Removed in the immediately following
// commit, so this endpoint is only reachable for a few minutes during the
// deploy that adds it.
app.get('/api/sentry-test', (req, res) => {
  const err = new Error('Sentry pipeline test');
  sentry.captureException(err, { phase: 'sentry_pipeline_test', triggeredAt: new Date().toISOString() });
  res.json({ ok: true, sentryEnabled: sentry.enabled });
});

// Sentry's express error handler must come after all routes. It catches any
// unhandled exception thrown inside a handler and forwards it to Sentry,
// then chains to the default Express handler. No-op if Sentry is not init'd.
if (sentry.enabled) {
  sentry.Sentry.setupExpressErrorHandler(app);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Booking API on port ${PORT}`));
