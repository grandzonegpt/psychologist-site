const { Resend } = require('resend');
const config = require('./config');
const { escapeHtml } = require('./sanitize');

const MEET_LINK = 'https://meet.google.com/mbs-kkqi-kpp';

let resend;

const templates = {
  ru: ({ name, date, time }) => ({
    subject: `Запись подтверждена: ${date}, ${time}`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0b;color:#f5f1e8;padding:40px 30px;border-radius:12px;">
        <h2 style="color:#C9A961;margin:0 0 24px;font-size:20px;">Запись подтверждена</h2>
        <p style="margin:0 0 8px;">Привет, ${escapeHtml(name)}!</p>
        <p style="margin:0 0 20px;color:#a8a39a;">Твоя сессия забронирована.</p>
        <div style="background:#131316;border:1px solid #2a2a30;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;">📅 <strong>${date}</strong></p>
          <p style="margin:0 0 8px;">🕐 <strong>${time}</strong></p>
          <p style="margin:0 0 8px;">⏱ ${config.slotDuration} мин</p>
        </div>
        <a href="${MEET_LINK}" style="display:inline-block;background:#C9A961;color:#0a0a0b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Подключиться через Google Meet</a>
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">Ссылка на встречу: <a href="${MEET_LINK}" style="color:#C9A961;">${MEET_LINK}</a></p>
        <hr style="border:none;border-top:1px solid #2a2a30;margin:24px 0;">
        <p style="margin:0;color:#a8a39a;font-size:12px;">Aliaksei Levashou, психотравматолог<br>levashou.pl</p>
      </div>
    `
  }),
  pl: ({ name, date, time }) => ({
    subject: `Potwierdzenie wizyty: ${date}, ${time}`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0b;color:#f5f1e8;padding:40px 30px;border-radius:12px;">
        <h2 style="color:#C9A961;margin:0 0 24px;font-size:20px;">Wizyta potwierdzona</h2>
        <p style="margin:0 0 8px;">Cześć, ${escapeHtml(name)}!</p>
        <p style="margin:0 0 20px;color:#a8a39a;">Twoja sesja została zarezerwowana.</p>
        <div style="background:#131316;border:1px solid #2a2a30;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;">📅 <strong>${date}</strong></p>
          <p style="margin:0 0 8px;">🕐 <strong>${time}</strong></p>
          <p style="margin:0 0 8px;">⏱ ${config.slotDuration} min</p>
        </div>
        <a href="${MEET_LINK}" style="display:inline-block;background:#C9A961;color:#0a0a0b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Dołącz przez Google Meet</a>
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">Link do spotkania: <a href="${MEET_LINK}" style="color:#C9A961;">${MEET_LINK}</a></p>
        <hr style="border:none;border-top:1px solid #2a2a30;margin:24px 0;">
        <p style="margin:0;color:#a8a39a;font-size:12px;">Aliaksei Levashou, psychotraumatolog<br>levashou.pl</p>
      </div>
    `
  })
};

async function sendConfirmation({ name, email, date, time, locale }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Mailer: no Resend key, skipping');
    return;
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);

  const template = (templates[locale] || templates.ru)({ name, date, time });

  await resend.emails.send({
    from: 'Aliaksei Levashou <onboarding@resend.dev>',
    to: email,
    subject: template.subject,
    html: template.html
  });

  console.log(`Confirmation email sent to ${email}`);
}

async function sendContactNotification({ name, email, message, locale, to }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Mailer: no Resend key, skipping contact notification');
    return;
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);

  const recipient = to || process.env.CONTACT_EMAIL || 'goalcoachup@gmail.com';
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message || '').replace(/\n/g, '<br>');
  const subject = `Новая заявка с levashou.pl от ${safeName}`;

  await resend.emails.send({
    from: 'levashou.pl <onboarding@resend.dev>',
    to: recipient,
    replyTo: email,
    subject,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 28px;color:#1f1c18;">
        <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-weight:500;">Новая заявка с сайта</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#6b645a;width:140px;">Имя:</td><td style="padding:8px 0;"><strong>${safeName}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b645a;">Email / телефон:</td><td style="padding:8px 0;"><strong>${safeEmail}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b645a;">Локаль:</td><td style="padding:8px 0;">${locale === 'pl' ? 'PL' : 'RU'}</td></tr>
        </table>
        ${safeMessage ? `
        <div style="padding:18px 20px;background:#f4ede0;border-left:3px solid #8a6a3a;margin-bottom:24px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#6b645a;margin-bottom:8px;">Сообщение</div>
          <div style="font-size:15px;line-height:1.6;color:#1f1c18;">${safeMessage}</div>
        </div>` : ''}
        <p style="margin:0;color:#6b645a;font-size:13px;">Ответить можно прямо на это письмо: Reply-To указан на адрес отправителя.</p>
      </div>
    `
  });

  console.log(`Contact notification sent to ${recipient} from ${email}`);
}

module.exports = { sendConfirmation, sendContactNotification };
