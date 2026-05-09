// Hold events: provisional calendar entries that block a slot during Stripe
// checkout. They are real Google Calendar events with `transparency: opaque`,
// so freebusy.query treats them as busy and a second visitor cannot start
// checkout for the same slot. On payment success the hold is replaced with
// the real booking event; on payment expiry it is deleted.

const calendarLib = require('./calendar');
const config = require('./config');
const audit = require('./audit');
const { warsawDate } = require('./tz');

const HOLD_PREFIX = 'HOLD:';
const HOLD_TTL_MS = 35 * 60 * 1000;

async function isSlotFree(date, time) {
  const cal = calendarLib.getClient();
  if (!cal) return true;

  const start = warsawDate(date, time);
  const end = new Date(start.getTime() + config.slotDuration * 60000);

  const busy = await cal.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: config.timezone,
      items: [{ id: config.calendarId }]
    }
  });
  const intervals = busy.data.calendars[config.calendarId]?.busy || [];

  return !intervals.some(b => {
    const bStart = new Date(b.start);
    const bEnd = new Date(b.end);
    return start < bEnd && end > bStart;
  });
}

async function createHold(date, time) {
  const cal = calendarLib.getClient();
  if (!cal) throw new Error('Calendar not initialized');

  const start = warsawDate(date, time);
  const end = new Date(start.getTime() + config.slotDuration * 60000);

  const event = await cal.events.insert({
    calendarId: config.calendarId,
    requestBody: {
      summary: `${HOLD_PREFIX} ${date} ${time}`,
      description: 'Pending Stripe checkout. Auto-cleanup after ~35 min.',
      start: { dateTime: start.toISOString(), timeZone: config.timezone },
      end: { dateTime: end.toISOString(), timeZone: config.timezone },
      transparency: 'opaque'
    }
  });

  audit.log('hold_create', { date, time, eventId: event.data.id });
  return event.data.id;
}

async function deleteHold(eventId) {
  const cal = calendarLib.getClient();
  if (!cal || !eventId) return;
  try {
    await cal.events.delete({ calendarId: config.calendarId, eventId });
    audit.log('hold_delete', { eventId });
  } catch (e) {
    if (e.code !== 404 && e.code !== 410) {
      console.error('deleteHold:', eventId, e.message);
    }
  }
}

// Sweep stale holds: catches edge cases where Stripe never fires session.expired
// (server downtime, webhook delivery failure). Idempotent.
async function cleanupStaleHolds() {
  const cal = calendarLib.getClient();
  if (!cal) return 0;

  const now = Date.now();
  const future = new Date(now + 14 * 24 * 60 * 60 * 1000);

  const events = await cal.events.list({
    calendarId: config.calendarId,
    timeMin: new Date(now).toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    q: HOLD_PREFIX,
    maxResults: 100
  });

  const stale = (events.data.items || []).filter(ev => {
    if (!ev.summary || !ev.summary.startsWith(HOLD_PREFIX)) return false;
    const created = ev.created ? new Date(ev.created).getTime() : now;
    return now - created > HOLD_TTL_MS;
  });

  let deleted = 0;
  for (const ev of stale) {
    try {
      await cal.events.delete({ calendarId: config.calendarId, eventId: ev.id });
      deleted++;
    } catch (e) {
      console.error('cleanupStaleHolds:', ev.id, e.message);
    }
  }
  if (deleted > 0) {
    console.log(`Holds cleaned up: ${deleted}`);
    audit.log('hold_cleanup', { count: deleted });
  }
  return deleted;
}

module.exports = { isSlotFree, createHold, deleteHold, cleanupStaleHolds, HOLD_PREFIX };
