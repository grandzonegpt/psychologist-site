const config = require('./config');
const { Resend } = require('resend');
const { escapeHtml } = require('./sanitize');

const MEET_LINK = 'https://meet.google.com/mbs-kkqi-kpp';
const CHECK_INTERVAL = 5 * 60 * 1000;
const REMINDER_MINUTES = 60;
const sentReminders = new Set();

let resend;

const templates = {
  ru: ({ name, time }) => ({
    subject: `Напоминание: сессия сегодня в ${time}`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0b;color:#f5f1e8;padding:40px 30px;border-radius:12px;">
        <h2 style="color:#C9A961;margin:0 0 24px;font-size:20px;">⏰ Напоминание</h2>
        <p style="margin:0 0 8px;">${escapeHtml(name)}, через час твоя сессия.</p>
        <p style="margin:0 0 20px;color:#a8a39a;">Начало в <strong>${time}</strong></p>
        <a href="${MEET_LINK}" style="display:inline-block;background:#C9A961;color:#0a0a0b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Подключиться через Google Meet</a>
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">${MEET_LINK}</p>
        <hr style="border:none;border-top:1px solid #2a2a30;margin:24px 0;">
        <p style="margin:0;color:#a8a39a;font-size:12px;">Aliaksei Levashou<br>levashou.pl</p>
      </div>
    `
  }),
  pl: ({ name, time }) => ({
    subject: `Przypomnienie: sesja dzisiaj o ${time}`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0b;color:#f5f1e8;padding:40px 30px;border-radius:12px;">
        <h2 style="color:#C9A961;margin:0 0 24px;font-size:20px;">⏰ Przypomnienie</h2>
        <p style="margin:0 0 8px;">${escapeHtml(name)}, za godzinę Twoja sesja.</p>
        <p style="margin:0 0 20px;color:#a8a39a;">Początek o <strong>${time}</strong></p>
        <a href="${MEET_LINK}" style="display:inline-block;background:#C9A961;color:#0a0a0b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Dołącz przez Google Meet</a>
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">${MEET_LINK}</p>
        <hr style="border:none;border-top:1px solid #2a2a30;margin:24px 0;">
        <p style="margin:0;color:#a8a39a;font-size:12px;">Aliaksei Levashou<br>levashou.pl</p>
      </div>
    `
  })
};

function start(calendar) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Reminders: no Resend key, skipping');
    return;
  }
  resend = new Resend(process.env.RESEND_API_KEY);

  console.log('Reminders: checking every 5 minutes');
  setInterval(() => checkUpcoming(calendar), CHECK_INTERVAL);
  setTimeout(() => checkUpcoming(calendar), 10000);
}

async function checkUpcoming(calendar) {
  if (!calendar) return;

  try {
    const now = new Date();
    const soon = new Date(now.getTime() + REMINDER_MINUTES * 60000);

    const events = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin: now.toISOString(),
      timeMax: soon.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: config.timezone
    });

    const items = (events.data.items || []).filter(ev =>
      ev.summary && !ev.summary.toLowerCase().includes('block') && ev.description
    );

    for (const ev of items) {
      if (sentReminders.has(ev.id)) continue;

      const start = new Date(ev.start.dateTime);
      const minutesUntil = (start - now) / 60000;
      if (minutesUntil > REMINDER_MINUTES || minutesUntil < 50) continue;

      const desc = ev.description || '';
      const emailMatch = desc.match(/Email:\s*(\S+)/);
      const localeMatch = desc.match(/Locale:\s*(\S+)/);
      if (!emailMatch) continue;

      const email = emailMatch[1];
      const locale = localeMatch ? localeMatch[1] : 'ru';
      const name = ev.summary.split(':').slice(1).join(':').trim() || 'Клиент';
      const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;

      const template = (templates[locale] || templates.ru)({ name, time });

      await resend.emails.send({
        from: 'Aliaksei Levashou <onboarding@resend.dev>',
        to: email,
        subject: template.subject,
        html: template.html
      });

      sentReminders.add(ev.id);
      console.log(`Reminder sent to ${email} for ${time}`);
    }
  } catch (e) {
    console.error('Reminder check error:', e.message);
  }
}

module.exports = { start };
