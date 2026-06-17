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
app.use('/api/checkout-amount', rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

const calendar = calendarLib.init();

telegramBot.init(calendar);
reminders.start(calendar);
monitor.start(telegramBot);

function generateSlots(daySchedule, duration, breakDuration) {
  const slots = [];
  const dur = duration || config.slotDuration;
  const brk = breakDuration != null ? breakDuration : config.breakDuration;
  const [startH, startM] = daySchedule.start.split(':').map(Number);
  const [endH, endM] = daySchedule.end.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const step = dur + brk;

  for (let m = startMin; m + dur <= endMin; m += step) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}

// Resolve the per-session-type parameters used by both /api/slots and
// /api/book so the intro/paid split lives in exactly one place.
function sessionParams(type) {
  if (type === 'intro') {
    return {
      type: 'intro',
      schedule: config.introSchedule,
      duration: config.introDuration,
      breakDuration: config.introBreakDuration,
      price: 0,
      minLeadMs: config.introMinLeadHours * 60 * 60 * 1000,
      serviceName: config.introServiceName
    };
  }
  return {
    type: 'paid',
    schedule: config.schedule,
    duration: config.slotDuration,
    breakDuration: config.breakDuration,
    price: config.price,
    minLeadMs: 12 * 60 * 60 * 1000,
    serviceName: config.serviceName
  };
}

// Deterministic 32-bit hash (FNV-1a). Used to pick decoy slots stably per
// date so the showcase doesn't flicker between requests within a day.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// "Showcase" decoy pass (paid widget only). Flips a share of an individual
// day's AVAILABLE slots to 'taken' so the calendar looks in-demand. Display
// only: callers never persist this and /api/book ignores it, so a decoy slot
// stays genuinely bookable if asked for directly. Deterministic per date:
// stable on refresh, but the pattern differs day to day so it never repeats
// the same cells. Always keeps at least MIN_KEEP slots open per day.
function applyDecoys(dateStr, daySlots) {
  const cfg = config.decoy || {};
  if (!cfg.enabled) return;
  const ratio = cfg.intensity === 'med' ? 0.45 : 0.25;
  const MIN_KEEP = 2;
  const pinned = new Set(cfg.alwaysOpen || []);
  const avail = daySlots.filter(s => s.status === 'available');
  if (avail.length <= MIN_KEEP) return;
  // Pinned times are never decoyed — they always stay bookable on the site.
  const candidates = avail.filter(s => !pinned.has(s.time));
  let pick = Math.min(Math.floor(avail.length * ratio), candidates.length, avail.length - MIN_KEEP);
  if (pick <= 0) return;
  // Score: bias toward evening then midday (those book first in real life),
  // plus a per-slot deterministic jitter so it isn't a rigid evening block.
  const scored = candidates.map(s => {
    const h = parseInt(s.time.split(':')[0], 10);
    const prime = h >= 17 ? 3 : (h >= 11 && h <= 14 ? 2 : 1);
    const jitter = (hashStr(dateStr + s.time) % 100) / 100;
    return { time: s.time, score: prime + jitter };
  });
  scored.sort((a, b) => b.score - a.score);
  const chosen = new Set(scored.slice(0, pick).map(x => x.time));
  daySlots.forEach(s => { if (chosen.has(s.time)) s.status = 'taken'; });
}

app.get('/api/slots', async (req, res) => {
  try {
    const sp = sessionParams(req.query.type);
    const now = new Date();
    const timeMin = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }));
    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + config.daysAhead);

    // Both intro and paid read the same Google Calendar busy intervals, so a
    // free intro can never be offered on top of a paid session and vice versa.
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

    const tooSoonCutoff = new Date(now.getTime() + sp.minLeadMs);
    const days = [];
    const legacy = {};

    for (let d = 0; d < config.daysAhead; d++) {
      const date = new Date(timeMin);
      date.setDate(date.getDate() + d);
      const dow = date.getDay();
      const daySchedule = sp.schedule[dow];
      if (!daySchedule) continue;

      // dateStr must reflect the Warsaw calendar date, not the runtime's UTC
      // interpretation. warsawDateString handles DST and timezone offset.
      const dateStr = warsawDateString(date);
      const allSlots = generateSlots(daySchedule, sp.duration, sp.breakDuration);
      const daySlots = [];

      for (const time of allSlots) {
        // Slot times in the schedule are Warsaw clock readings.
        const slotStart = warsawDate(dateStr, time);
        const slotEnd = new Date(slotStart.getTime() + sp.duration * 60000);

        if (slotStart < now) continue;

        const isBusy = busySlots.some(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return slotStart < bEnd && slotEnd > bStart;
        });

        let status;
        if (isBusy) status = 'taken';
        else if (slotStart < tooSoonCutoff) status = 'too-soon';
        else status = 'available';

        daySlots.push({ time, status });
      }

      // Showcase decoys run on the paid widget only, after real statuses are
      // set, so they can flip available -> taken but never reveal a busy slot.
      if (sp.type === 'paid') applyDecoys(dateStr, daySlots);

      const availableLegacy = daySlots.filter(s => s.status === 'available').map(s => s.time);

      if (daySlots.length > 0) {
        days.push({ date: dateStr, slots: daySlots });
        if (availableLegacy.length > 0) legacy[dateStr] = availableLegacy;
      }
    }

    // Availability changes constantly (bookings, bot blocks, decoy). Never let
    // a browser serve a cached response, or the widget shows stale slots.
    res.set('Cache-Control', 'no-store');
    res.json({
      days,
      slots: legacy,
      type: sp.type,
      service: sp.serviceName,
      duration: sp.duration,
      price: sp.price,
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
    const sp = sessionParams(req.body.type);
    const validationError = validateBooking({ name, email, date, time, locale });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Schedule check: dow must be a working day, time must be a generated slot.
    // Intro and paid have separate schedules, picked by sp.
    const dow = new Date(`${date}T00:00:00`).getDay();
    const daySchedule = sp.schedule[dow];
    if (!daySchedule) {
      return res.status(400).json({ error: 'day_not_working' });
    }
    if (!generateSlots(daySchedule, sp.duration, sp.breakDuration).includes(time)) {
      return res.status(400).json({ error: 'invalid_slot' });
    }

    // Past + too-soon checks (must mirror /api/slots policy for this type).
    const slotStart = warsawDate(date, time);
    const now = new Date();
    if (slotStart < now) {
      return res.status(400).json({ error: 'past_slot' });
    }
    const tooSoonCutoff = new Date(now.getTime() + sp.minLeadMs);
    if (slotStart < tooSoonCutoff) {
      return res.status(400).json({ error: 'too_soon' });
    }

    // Race-window guard: someone may have just booked this slot.
    const free = await holds.isSlotFree(date, time, sp.duration);
    if (!free) {
      return res.status(409).json({ error: 'slot_taken' });
    }

    // Free intro: no payment, so no Stripe and no provisional hold. Create the
    // calendar event immediately (with Meet link), notify, and email. The
    // freebusy check above blocks the slot for everyone the moment it lands.
    if (sp.type === 'intro') {
      const { eventId, meetLink } = await calendarLib.createCalendarEvent({
        name, email, date, time, locale,
        durationMin: sp.duration,
        serviceNames: sp.serviceName
      });
      telegramBot.notifyNewBooking({ name, email, date, time, locale, eventId, meetLink, isIntro: true });
      mailer.sendConfirmation({ name, email, date, time, locale, meetLink, durationMin: sp.duration, isIntro: true })
        .catch(e => console.error('Intro client email error:', e.message));
      mailer.sendAdminBookingAlert({ name, email, date, time, locale, meetLink, durationMin: sp.duration, isIntro: true })
        .catch(e => console.error('Intro admin email error:', e.message));
      console.log(`Intro booked: ${name} on ${date} at ${time} (meet: ${meetLink || 'none'})`);
      audit.log('intro_booked', { date, time, locale: locale || 'ru', eventId });
      return res.json({ ok: true, booked: true, meetLink: meetLink || null });
    }

    // Place a provisional hold so a parallel /api/book sees the slot busy.
    // The hold is replaced with a real booking event on payment success
    // (checkout.session.completed) or deleted on payment expiry.
    holdEventId = await holds.createHold(date, time);

    const serviceName = config.serviceName[locale] || config.serviceName.ru;
    // SECURITY: never trust req.headers.origin — client-controlled, used in
    // Stripe redirect URLs (open-redirect / phishing risk). Hardcoded.
    const origin = 'https://levashou.pl';
    // Success goes to a dedicated thank-you page (minimal copy, no upsell).
    // Cancel returns to the booking section on the home page with a query
    // flag that the widget reads to show a "payment cancelled" hint.
    const successPage = locale === 'pl' ? '/dziekuje' : '/spasibo';
    const cancelPage = locale === 'pl' ? '/index-pl.html' : '/';

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
      success_url: `${origin}${successPage}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPage}?booking=cancelled`
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

// Returns the paid amount for a completed Checkout session so the thank-you
// page can fire the Google Ads purchase conversion with the real value.
// No PII: amount + currency only. The client falls back to a static value if
// this is unavailable, so a hiccup here never blocks the conversion itself.
app.get('/api/checkout-amount', async (req, res) => {
  try {
    const id = typeof req.query.session_id === 'string' ? req.query.session_id : '';
    if (!id.startsWith('cs_')) return res.status(400).json({ error: 'bad_session_id' });
    const session = await stripe.checkout.sessions.retrieve(id);
    if (!session || session.payment_status !== 'paid') return res.json({ paid: false });
    res.json({
      paid: true,
      amount: session.amount_total / 100,
      currency: (session.currency || 'pln').toUpperCase()
    });
  } catch (e) {
    res.status(500).json({ error: 'lookup_failed' });
  }
});

// Sentry's express error handler must come after all routes. It catches any
// unhandled exception thrown inside a handler and forwards it to Sentry,
// then chains to the default Express handler. No-op if Sentry is not init'd.
if (sentry.enabled) {
  sentry.Sentry.setupExpressErrorHandler(app);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Booking API on port ${PORT}`));
