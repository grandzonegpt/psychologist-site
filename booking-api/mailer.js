const { Resend } = require('resend');
const config = require('./config');
const { escapeHtml } = require('./sanitize');

let resend;

const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const PL_MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const PL_DOW = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

function formatDateHuman(date, locale) {
  const d = new Date(`${date}T00:00:00`);
  if (locale === 'pl') {
    return `${PL_DOW[d.getDay()]}, ${d.getDate()} ${PL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${RU_DOW[d.getDay()]}, ${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const templates = {
  ru: ({ name, date, time, meetLink }) => {
    const safeMeet = meetLink || '#';
    const meetText = meetLink || 'ссылка придёт отдельно';
    const humanDate = formatDateHuman(date, 'ru');
    return {
      subject: `Запись подтверждена: ${humanDate}, ${time}`,
      html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0b;color:#f5f1e8;padding:40px 30px;border-radius:12px;">
        <h2 style="color:#C9A961;margin:0 0 24px;font-size:20px;">Запись подтверждена</h2>
        <p style="margin:0 0 8px;">Здравствуйте, ${escapeHtml(name)}.</p>
        <p style="margin:0 0 20px;color:#a8a39a;">Ваша сессия забронирована.</p>
        <div style="background:#131316;border:1px solid #2a2a30;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;">📅 <strong>${humanDate}</strong></p>
          <p style="margin:0 0 8px;">🕐 <strong>${time}</strong> по Варшаве</p>
          <p style="margin:0 0 8px;">⏱ ${config.slotDuration} минут</p>
        </div>
        ${meetLink ? `<a href="${safeMeet}" style="display:inline-block;background:#C9A961;color:#0a0a0b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Подключиться через Google Meet</a>
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">Ссылка на встречу: <a href="${safeMeet}" style="color:#C9A961;">${meetText}</a></p>` : `<p style="margin:0;color:#a8a39a;font-size:13px;">Ссылку на Google Meet вы получите отдельным приглашением Google Calendar.</p>`}
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">Если что-то поменяется, напишите ответом на это письмо.</p>
        <hr style="border:none;border-top:1px solid #2a2a30;margin:24px 0;">
        <p style="margin:0;color:#a8a39a;font-size:12px;">Aliaksei Levashou, психотравматолог<br>levashou.pl</p>
      </div>
    `
    };
  },
  pl: ({ name, date, time, meetLink }) => {
    const safeMeet = meetLink || '#';
    const meetText = meetLink || 'link zostanie wysłany osobno';
    const humanDate = formatDateHuman(date, 'pl');
    return {
      subject: `Potwierdzenie wizyty: ${humanDate}, ${time}`,
      html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0b;color:#f5f1e8;padding:40px 30px;border-radius:12px;">
        <h2 style="color:#C9A961;margin:0 0 24px;font-size:20px;">Wizyta potwierdzona</h2>
        <p style="margin:0 0 8px;">Dzień dobry, ${escapeHtml(name)}.</p>
        <p style="margin:0 0 20px;color:#a8a39a;">Twoja sesja została zarezerwowana.</p>
        <div style="background:#131316;border:1px solid #2a2a30;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;">📅 <strong>${humanDate}</strong></p>
          <p style="margin:0 0 8px;">🕐 <strong>${time}</strong> czasu warszawskiego</p>
          <p style="margin:0 0 8px;">⏱ ${config.slotDuration} minut</p>
        </div>
        ${meetLink ? `<a href="${safeMeet}" style="display:inline-block;background:#C9A961;color:#0a0a0b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Dołącz przez Google Meet</a>
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">Link do spotkania: <a href="${safeMeet}" style="color:#C9A961;">${meetText}</a></p>` : `<p style="margin:0;color:#a8a39a;font-size:13px;">Link do Google Meet otrzymasz w osobnym zaproszeniu Google Calendar.</p>`}
        <p style="margin:24px 0 0;color:#a8a39a;font-size:13px;">Jeśli coś się zmieni, odpisz na ten email.</p>
        <hr style="border:none;border-top:1px solid #2a2a30;margin:24px 0;">
        <p style="margin:0;color:#a8a39a;font-size:12px;">Aliaksei Levashou, psychotraumatolog<br>levashou.pl</p>
      </div>
    `
    };
  }
};

async function sendConfirmation({ name, email, date, time, locale, meetLink }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Mailer: no Resend key, skipping');
    return;
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);

  const template = (templates[locale] || templates.ru)({ name, date, time, meetLink });
  const replyTo = process.env.CONTACT_EMAIL || 'goalcoachup@gmail.com';

  await resend.emails.send({
    from: 'Aliaksei Levashou <onboarding@resend.dev>',
    to: email,
    replyTo,
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

module.exports = { sendConfirmation, sendContactNotification, formatDateHuman };
