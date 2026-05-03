// Smoke test for booking-api: exercise the full calendar flow locally
// against the real Google Calendar before pushing to production.
//
// What it does:
//   1. Init calendar (OAuth2 from .env.local)
//   2. Pick a test slot 28+ days out on a scheduled weekday (avoids real customers)
//   3. Create a calendar event via createCalendarEvent (the same code path the webhook uses)
//   4. Assert: eventId returned, meetLink looks like a real Meet URL, event time matches
//      Europe/Warsaw, attendee was added
//   5. Confirm freebusy now reports the slot as busy
//   6. Delete the test event
//   7. Print PASS / FAIL summary
//
// Run: cd booking-api && node test-flow.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const config = require('./config');
const calendarLib = require('./calendar');

const TEST_EMAIL = 'smoke-test@levashou.pl';
const TEST_NAME = '[SMOKE TEST]';

function log(level, msg) {
  const tag = { pass: '✅', fail: '❌', info: 'ℹ️ ', step: '▶️ ' }[level] || '  ';
  console.log(`${tag} ${msg}`);
}

function pickTestSlot() {
  // Find first scheduled weekday >= 28 days from now; use the latest slot of the day.
  const now = new Date();
  for (let offset = 28; offset < 90; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const dow = d.getDay();
    const sched = config.schedule[dow];
    if (!sched) continue;

    const dateStr = d.toISOString().split('T')[0];
    const [endH, endM] = sched.end.split(':').map(Number);
    const lastSlotMin = endH * 60 + endM - config.slotDuration;
    const time = `${String(Math.floor(lastSlotMin / 60)).padStart(2, '0')}:${String(lastSlotMin % 60).padStart(2, '0')}`;
    return { date: dateStr, time };
  }
  throw new Error('Could not find a scheduled weekday in the next 90 days');
}

async function main() {
  log('step', 'Initialising calendar (OAuth2 from .env.local)...');
  const calendar = calendarLib.init();
  if (!calendar) {
    log('fail', 'calendar.init() returned null. Check GOOGLE_OAUTH_* env vars in .env.local.');
    process.exit(1);
  }
  log('pass', `Calendar ready, calendarId=${config.calendarId}`);

  const { date, time } = pickTestSlot();
  log('info', `Test slot: ${date} ${time} ${config.timezone}`);

  let eventId;
  let failures = 0;

  try {
    log('step', 'Creating calendar event...');
    const result = await calendarLib.createCalendarEvent({
      name: TEST_NAME, email: TEST_EMAIL, date, time, locale: 'ru'
    });
    eventId = result.eventId;
    const meetLink = result.meetLink;

    if (!eventId) { log('fail', 'No eventId returned'); failures++; }
    else log('pass', `eventId=${eventId}`);

    if (!meetLink) {
      log('fail', 'No meetLink returned. Workspace + OAuth not set up correctly, or conferenceData create failed.');
      failures++;
    } else if (!/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i.test(meetLink)) {
      log('fail', `meetLink looks wrong: ${meetLink}`);
      failures++;
    } else if (meetLink.includes('mbs-kkqi-kpp')) {
      log('fail', 'meetLink is the OLD hardcoded link, not unique. Fix createCalendarEvent.');
      failures++;
    } else {
      log('pass', `meetLink unique: ${meetLink}`);
    }

    log('step', 'Fetching event back to verify timezone + attendees...');
    const fetched = await calendar.events.get({ calendarId: config.calendarId, eventId });
    const startStr = fetched.data.start.dateTime;
    // Google normalises returned dateTime to UTC. Convert it back to Warsaw
    // wall-clock time and compare to what we asked for.
    const startDate = new Date(startStr);
    const warsawDate = startDate.toLocaleDateString('sv-SE', { timeZone: config.timezone });
    const warsawTime = startDate.toLocaleTimeString('en-GB', {
      timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hour12: false
    });
    if (warsawDate !== date || warsawTime !== time) {
      log('fail', `Event in ${config.timezone}: ${warsawDate} ${warsawTime}, expected ${date} ${time}`);
      failures++;
    } else {
      log('pass', `Event in ${config.timezone}: ${warsawDate} ${warsawTime} (correct)`);
    }
    if (fetched.data.start.timeZone !== config.timezone) {
      log('fail', `Event timeZone = ${fetched.data.start.timeZone}, expected ${config.timezone}`);
      failures++;
    } else {
      log('pass', `Event timeZone = ${config.timezone}`);
    }
    const hasAttendee = (fetched.data.attendees || []).some(a => a.email === TEST_EMAIL);
    if (!hasAttendee) { log('fail', 'Test attendee not on event'); failures++; }
    else log('pass', `Attendee ${TEST_EMAIL} present`);

    log('step', 'Verifying freebusy reports the slot as busy...');
    const slotStartIso = new Date(`${date}T${time}:00+02:00`).toISOString(); // approx, just for query window
    const slotEndIso = new Date(new Date(slotStartIso).getTime() + config.slotDuration * 60000).toISOString();
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: slotStartIso,
        timeMax: slotEndIso,
        timeZone: config.timezone,
        items: [{ id: config.calendarId }]
      }
    });
    const busy = fb.data.calendars[config.calendarId]?.busy || [];
    if (busy.length === 0) {
      log('fail', 'freebusy reported no busy intervals for the test slot');
      failures++;
    } else {
      log('pass', `freebusy reports ${busy.length} busy interval(s) covering the slot`);
    }
  } finally {
    if (eventId) {
      log('step', `Cleanup: deleting test event ${eventId}...`);
      try {
        await calendar.events.delete({
          calendarId: config.calendarId,
          eventId,
          sendUpdates: 'none'
        });
        log('pass', 'Test event deleted');
      } catch (e) {
        log('fail', `Cleanup failed: ${e.message}. Delete event ${eventId} manually in Google Calendar.`);
        failures++;
      }
    }
  }

  console.log();
  if (failures === 0) {
    log('pass', 'ALL CHECKS PASSED. Safe to git push.');
    process.exit(0);
  } else {
    log('fail', `${failures} check(s) failed. Do NOT push until fixed.`);
    process.exit(1);
  }
}

main().catch(e => {
  log('fail', `Smoke test crashed: ${e.message}`);
  console.error(e);
  process.exit(1);
});
