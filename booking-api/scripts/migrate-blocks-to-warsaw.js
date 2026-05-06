// One-shot migration: shift existing "Blocked X:00" events from
// "Warsaw X+offset" (legacy bot bug) to the correct Warsaw X:00 time.
//
// Pre-flight (DRY-RUN): node scripts/migrate-blocks-to-warsaw.js
// Apply changes:        node scripts/migrate-blocks-to-warsaw.js --apply
//
// Only events whose summary matches "Blocked HH:MM" are migrated.
// All-day blocks ("Blocked / Заблокировано") are skipped, they have no
// time component to fix.
// Already-migrated events (current Warsaw time matches summary) are skipped.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const { warsawDate } = require('../tz');

const APPLY = process.argv.includes('--apply');

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'talkwith@levashou.pl';
const oauth = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);
oauth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
const cal = google.calendar({ version: 'v3', auth: oauth });

const TZ = 'Europe/Warsaw';
const fmtWarsawHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function currentWarsawTime(dateInstance) {
  return fmtWarsawHour.format(dateInstance);
}

async function listBlockedEvents() {
  const now = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const all = [];
  let pageToken;
  do {
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      q: 'Blocked',
      pageToken,
      maxResults: 250,
    });
    all.push(...(res.data.items || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return all;
}

(async () => {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const events = await listBlockedEvents();
  console.log(`Found ${events.length} events matching "Blocked" search.\n`);

  const stats = { skipped_allday: 0, skipped_already: 0, skipped_other: 0, will_migrate: 0, migrated: 0, errors: 0 };

  for (const ev of events) {
    // Skip all-day blocks
    if (!ev.start?.dateTime) {
      stats.skipped_allday++;
      continue;
    }

    // Match "Blocked HH:MM" pattern
    const m = (ev.summary || '').match(/^Blocked\s+(\d{1,2}:\d{2})/i);
    if (!m) {
      stats.skipped_other++;
      console.log(`SKIP non-matching summary: "${ev.summary}"`);
      continue;
    }
    const intendedTime = m[1].padStart(5, '0'); // "13:00"

    const start = new Date(ev.start.dateTime);
    const actualTime = currentWarsawTime(start);

    if (actualTime === intendedTime) {
      // Already at the intended Warsaw time. Nothing to do.
      stats.skipped_already++;
      continue;
    }

    // Compute the date the event should fall on. Use the existing event's
    // dateTime to extract the calendar date in Warsaw, but if that misaligns,
    // we keep it. Easiest: take the Warsaw-formatted date of the existing start.
    const fmtDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = fmtDate.format(start); // "YYYY-MM-DD"

    const newStart = warsawDate(dateStr, intendedTime);
    const durationMs = new Date(ev.end.dateTime).getTime() - start.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    stats.will_migrate++;
    console.log(`MIGRATE: "${ev.summary}"`);
    console.log(`  current: ${ev.start.dateTime}  (Warsaw ${actualTime})`);
    console.log(`  new:     ${newStart.toISOString()}  (Warsaw ${intendedTime})`);

    if (APPLY) {
      try {
        await cal.events.patch({
          calendarId: CALENDAR_ID,
          eventId: ev.id,
          requestBody: {
            start: { dateTime: newStart.toISOString(), timeZone: TZ },
            end: { dateTime: newEnd.toISOString(), timeZone: TZ },
          },
        });
        stats.migrated++;
      } catch (e) {
        stats.errors++;
        console.error(`  ERROR: ${e.message}`);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`All-day blocks (skipped):   ${stats.skipped_allday}`);
  console.log(`Already correct (skipped):  ${stats.skipped_already}`);
  console.log(`Non-matching (skipped):     ${stats.skipped_other}`);
  console.log(`Will migrate:               ${stats.will_migrate}`);
  if (APPLY) {
    console.log(`Migrated successfully:      ${stats.migrated}`);
    console.log(`Errors:                     ${stats.errors}`);
  } else {
    console.log('\nDRY-RUN. To apply, run: node scripts/migrate-blocks-to-warsaw.js --apply');
  }
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
