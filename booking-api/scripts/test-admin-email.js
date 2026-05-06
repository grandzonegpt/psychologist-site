// One-shot: send a fake admin booking alert to verify the email channel.
// No Stripe, no Calendar, no real booking. Just the email function.
//
// Run: cd booking-api && node scripts/test-admin-email.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const mailer = require('../mailer');

(async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY in .env.local. This is on Railway env, not local.');
    console.error('To test admin email, run this on Railway shell, or temporarily copy RESEND_API_KEY here.');
    process.exit(1);
  }
  const target = process.env.ADMIN_EMAIL || 'talkwith@levashou.pl';
  console.log(`Sending TEST admin booking alert to ${target} ...`);
  await mailer.sendAdminBookingAlert({
    name: 'Тест Тестовый',
    email: 'test@example.com',
    date: '2026-05-13',
    time: '13:00',
    locale: 'ru',
    meetLink: 'https://meet.google.com/test-fake-link',
  });
  console.log(`OK — check ${target} inbox in next ~30 seconds.`);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
