const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const config = require('./config');

let calendar = null;

function init() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Calendar: missing OAuth env vars (CLIENT_ID/SECRET/REFRESH_TOKEN). Calendar disabled.');
    return null;
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  console.log(`Calendar: OAuth2 ready (calendarId=${config.calendarId})`);
  return calendar;
}

function getClient() {
  return calendar;
}

async function createCalendarEvent({ name, email, date, time, locale }) {
  if (!calendar) throw new Error('Calendar not initialized');

  // Naive datetime (no Z): Google interprets it in start.timeZone.
  // Passing through new Date(...).toISOString() would treat 13:00 Warsaw as UTC
  // and shift the event to 15:00 in the calendar.
  const startDateTime = `${date}T${time}:00`;
  const [h, m] = time.split(':').map(Number);
  const endTotalMin = h * 60 + m + config.slotDuration;
  const endDateTime = `${date}T${String(Math.floor(endTotalMin / 60)).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}:00`;
  const serviceName = config.serviceName[locale] || config.serviceName.ru;

  // The Meet link is read by reminders.js directly from event.hangoutLink,
  // so we don't need a follow-up patch to write it into the description.
  // Description must be non-empty though, or reminders.js skips the event.
  const description = `Email: ${email}\nLocale: ${locale || 'ru'}`;

  const event = await calendar.events.insert({
    calendarId: config.calendarId,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: `${serviceName}: ${name}`,
      description,
      start: { dateTime: startDateTime, timeZone: config.timezone },
      end: { dateTime: endDateTime, timeZone: config.timezone },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `booking-${date}-${time}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 30 }]
      }
    }
  });

  return { eventId: event.data.id, meetLink: event.data.hangoutLink || null };
}

module.exports = { init, getClient, createCalendarEvent };
