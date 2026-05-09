// Health monitor: every 15 min, scan Stripe checkout sessions completed in
// the last hour and verify each one has a real (non-HOLD, non-Block) calendar
// event at its slot. Anything missing is flagged via Telegram so the operator
// can recover manually before the client wonders why no Meet link arrived.
//
// Why this exists: webhook delivery can fail. Stripe retries, but if the
// server was down for the full retry window or Stripe events were filtered
// upstream, "paid but not on calendar" goes unnoticed for hours.

const Stripe = require('stripe');
const calendarLib = require('./calendar');
const config = require('./config');
const audit = require('./audit');
const dataDir = require('./dataDir');
const fs = require('fs');
const { warsawDate } = require('./tz');

const CHECK_INTERVAL = 15 * 60 * 1000;
const LOOKBACK_MS = 60 * 60 * 1000;
const SETTLE_MS = 5 * 60 * 1000;
const ALERTED_FILE = dataDir.path('alerted-sessions.json');
const ALERTED_LIMIT = 500;

let stripe;
let bot;
const alertedSessions = new Set();

function loadAlerted() {
  try {
    if (fs.existsSync(ALERTED_FILE)) {
      const arr = JSON.parse(fs.readFileSync(ALERTED_FILE, 'utf8'));
      arr.forEach(id => alertedSessions.add(id));
    }
  } catch (e) {
    console.error('Monitor: load alerted failed:', e.message);
  }
}

function saveAlerted() {
  try {
    let arr = Array.from(alertedSessions);
    if (arr.length > ALERTED_LIMIT) arr = arr.slice(-ALERTED_LIMIT);
    fs.writeFileSync(ALERTED_FILE, JSON.stringify(arr));
  } catch (e) {
    console.error('Monitor: save alerted failed:', e.message);
  }
}

async function check() {
  try {
    const cal = calendarLib.getClient();
    if (!cal || !stripe) return;

    const now = Date.now();
    const since = Math.floor((now - LOOKBACK_MS) / 1000);

    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      created: { gte: since }
    });

    for (const s of sessions.data) {
      if (s.payment_status !== 'paid') continue;
      if (s.status !== 'complete') continue;
      // Give the webhook a few minutes to land before we second-guess it.
      if ((now - s.created * 1000) < SETTLE_MS) continue;
      if (alertedSessions.has(s.id)) continue;

      const meta = s.metadata || {};
      const { date, time, name, email } = meta;
      if (!date || !time) continue;

      const slotStart = warsawDate(date, time);
      const slotEnd = new Date(slotStart.getTime() + config.slotDuration * 60000);

      const events = await cal.events.list({
        calendarId: config.calendarId,
        timeMin: slotStart.toISOString(),
        timeMax: slotEnd.toISOString(),
        singleEvents: true
      });

      const realEvents = (events.data.items || []).filter(ev =>
        ev.summary &&
        !ev.summary.startsWith('HOLD:') &&
        !ev.summary.toLowerCase().includes('block')
      );

      if (realEvents.length === 0) {
        // Paid but no real event in calendar: webhook failure or processing error.
        if (bot && typeof bot.notifyMissingBooking === 'function') {
          bot.notifyMissingBooking({ name, email, date, time, sessionId: s.id });
        }
        audit.log('monitor_alert_missing', { sessionId: s.id, date, time });
        alertedSessions.add(s.id);
        saveAlerted();
      }
    }
  } catch (e) {
    console.error('Monitor check error:', e.message);
  }
}

function start(telegramBot) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('Monitor: no Stripe key, skipping');
    return;
  }
  stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  bot = telegramBot;
  loadAlerted();
  setInterval(check, CHECK_INTERVAL);
  setTimeout(check, 120000);
  console.log('Monitor: payment-vs-calendar reconciliation every 15 min');
}

module.exports = { start };
