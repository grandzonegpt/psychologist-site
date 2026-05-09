const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const config = require('./config');
const dataDir = require('./dataDir');
const audit = require('./audit');
const { warsawDate, warsawDayBounds } = require('./tz');

const SCHEDULE_FILE = dataDir.path('schedule.json');
const CHAT_FILE = dataDir.path('chat.json');

let bot;
let ownerChatId = null;

function loadOwnerChatId() {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8'));
      if (data && typeof data.ownerChatId === 'number') {
        ownerChatId = data.ownerChatId;
        console.log(`Bot: restored ownerChatId=${ownerChatId} from ${CHAT_FILE}`);
      }
    }
  } catch (e) {
    console.error('Failed to load chat.json:', e.message);
  }
}

function saveOwnerChatId(chatId) {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify({ ownerChatId: chatId }, null, 2));
  } catch (e) {
    console.error('Failed to save chat.json:', e.message);
  }
}
let calendarRef = null;
const pendingLinks = new Map();
const bookingEvents = new Map();
const unblockMap = new Map();
const pendingTime = new Map();

function loadSchedule() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
      Object.keys(data).forEach(k => { config.schedule[k] = data[k]; });
      const toDelete = Object.keys(config.schedule).filter(k => !data[k]);
      toDelete.forEach(k => delete config.schedule[k]);
    }
  } catch (e) {
    console.error('Failed to load schedule:', e.message);
  }
}

function saveSchedule() {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(config.schedule, null, 2));
  } catch (e) {
    console.error('Failed to save schedule:', e.message);
  }
}

loadSchedule();

const DAY_NAMES = {
  0: 'Вс', 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб'
};

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

function generateSlots(daySchedule) {
  const slots = [];
  const [startH, startM] = daySchedule.start.split(':').map(Number);
  const [endH, endM] = daySchedule.end.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const step = config.slotDuration + config.breakDuration;
  for (let m = startMin; m + config.slotDuration <= endMin; m += step) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}

function init(calendar) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('Telegram bot: no token, skipping');
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  calendarRef = calendar;
  loadOwnerChatId();
  console.log('Telegram bot started');

  bot.onText(/\/start/, (msg) => {
    ownerChatId = msg.chat.id;
    saveOwnerChatId(ownerChatId);
    bot.sendMessage(msg.chat.id,
      '👋 *Привет! Я твой бот для управления записями.*\n\nВот что я умею:',
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });

  bot.onText(/^\/log(?:\s+(\d+))?$/, (msg, m) => {
    const n = m && m[1] ? Math.min(parseInt(m[1], 10), 50) : 20;
    showAuditLog(msg.chat.id, n);
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
      if (data === 'schedule' || data === 'edit_schedule') {
        await showSchedule(chatId);
      } else if (data === 'week') {
        await showWeekBookings(chatId, calendar);
      } else if (data === 'block_day') {
        await showBlockDayPicker(chatId, 'blockday');
      } else if (data.startsWith('blockday_')) {
        await blockDay(chatId, data.replace('blockday_', ''), calendar);
      } else if (data === 'block_hour') {
        await showBlockDayPicker(chatId, 'blockhourday');
      } else if (data.startsWith('blockhourday_')) {
        await showBlockHourPicker(chatId, data.replace('blockhourday_', ''), calendar);
      } else if (data.startsWith('blockhour_')) {
        const parts = data.replace('blockhour_', '').split('_');
        await blockHour(chatId, parts[0], parts[1], calendar);
      } else if (data === 'unblock') {
        await showUnblockPicker(chatId, calendar);
      } else if (data === 'log') {
        await showAuditLog(chatId);
      } else if (data.startsWith('toggleday_')) {
        await toggleDay(chatId, parseInt(data.replace('toggleday_', '')));
      } else if (data.startsWith('settime_')) {
        const dow = parseInt(data.replace('settime_', ''));
        await promptSetTime(chatId, dow);
      } else if (data.startsWith('unblock_')) {
        const shortId = data.replace('unblock_', '');
        const realEventId = unblockMap.get(shortId) || shortId;
        await unblockEvent(chatId, realEventId, calendar);
      } else if (data.startsWith('sendlink_')) {
        const bookingId = data.replace('sendlink_', '');
        const booking = bookingEvents.get(bookingId);
        if (booking) {
          pendingLinks.set(chatId, booking);
          await bot.sendMessage(chatId,
            `📎 *Отправить ссылку клиенту ${booking.name}*\n\nВставь ссылку на Google Meet:`,
            { parse_mode: 'Markdown' }
          );
        }
      } else if (data === 'menu') {
        await bot.sendMessage(chatId, '📋 *Главное меню*', {
          parse_mode: 'Markdown', reply_markup: mainMenu()
        });
      }
    } catch (e) {
      console.error('Bot error:', e.message);
      bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
    }

    bot.answerCallbackQuery(query.id);
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;

    const timeInput = pendingTime.get(chatId);
    if (timeInput) {
      pendingTime.delete(chatId);
      await handleSetTime(chatId, timeInput.dow, msg.text.trim());
      return;
    }

    const pending = pendingLinks.get(chatId);
    if (!pending) return;

    const link = msg.text.trim();
    if (!link.includes('meet.google.com') && !link.includes('zoom.') && !link.startsWith('http')) {
      await bot.sendMessage(chatId, '❌ Это не похоже на ссылку. Попробуй ещё раз или нажми ◀️ Меню.',
        { reply_markup: { inline_keyboard: backButton() } }
      );
      return;
    }

    pendingLinks.delete(chatId);

    try {
      if (calendarRef && pending.eventId) {
        const event = await calendarRef.events.get({
          calendarId: config.calendarId,
          eventId: pending.eventId
        });
        const desc = (event.data.description || '') + `\n\n🔗 Meet: ${link}`;
        await calendarRef.events.patch({
          calendarId: config.calendarId,
          eventId: pending.eventId,
          requestBody: { description: desc },
          sendUpdates: 'all'
        });
        await bot.sendMessage(chatId,
          `✅ Ссылка отправлена!\n\n👤 ${pending.name}\n📧 ${pending.email}\n🔗 ${link}\n\nКлиент получит обновлённое приглашение на email.`,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
        );
      } else {
        await bot.sendMessage(chatId, '❌ Не удалось найти событие в календаре.',
          { reply_markup: { inline_keyboard: backButton() } }
        );
      }
    } catch (e) {
      console.error('Send link error:', e.message);
      await bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
    }
  });
}

function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: '📅 Расписание', callback_data: 'schedule' }, { text: '📋 Записи', callback_data: 'week' }],
      [{ text: '🚫 Закрыть день', callback_data: 'block_day' }, { text: '🚫 Закрыть час', callback_data: 'block_hour' }],
      [{ text: '✅ Открыть слот', callback_data: 'unblock' }],
      [{ text: '🕓 Журнал', callback_data: 'log' }]
    ]
  };
}

function backButton() {
  return [[{ text: '◀️ Меню', callback_data: 'menu' }]];
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}, ${DAY_NAMES[d.getDay()]}`;
}

async function showSchedule(chatId) {
  // Combined view + editor: all 7 days with current state and inline toggles.
  const buttons = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = dow % 7;
    const active = !!config.schedule[d];
    const label = active
      ? `✅ ${FULL_DAY_NAMES[d]}  ${config.schedule[d].start}-${config.schedule[d].end}`
      : `⚪ ${FULL_DAY_NAMES[d]}  выходной`;
    const row = [{ text: label, callback_data: `toggleday_${d}` }];
    if (active) row.push({ text: '🕐 Часы', callback_data: `settime_${d}` });
    buttons.push(row);
  }
  buttons.push(...backButton());

  const summary =
    '📅 *Расписание*\n\n' +
    'Тапни день чтобы открыть или закрыть.\n' +
    'Кнопка 🕐 Часы меняет время рабочего дня.\n\n' +
    `⏱ Сессия: ${config.slotDuration} мин + ${config.breakDuration} мин перерыв\n` +
    `💰 Цена: ${config.price} ${config.currency}`;

  await bot.sendMessage(chatId, summary,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } }
  );
}

async function showWeekBookings(chatId, calendar) {
  if (!calendar) {
    await bot.sendMessage(chatId, '❌ Google Calendar не подключён');
    return;
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const events = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: now.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: config.timezone
  });

  // Hide HOLD events: they're transient checkout placeholders, not real bookings.
  const items = (events.data.items || []).filter(ev =>
    !(ev.summary && ev.summary.startsWith('HOLD:'))
  );
  if (items.length === 0) {
    await bot.sendMessage(chatId, '📋 *Записи на неделю:*\n\nПусто, записей нет 🏖',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }

  let text = '📋 *Записи на ближайшую неделю:*\n\n';
  items.forEach(ev => {
    const start = new Date(ev.start.dateTime || ev.start.date);
    const day = start.getDate();
    const month = MONTH_NAMES[start.getMonth()];
    const dow = DAY_NAMES[start.getDay()];
    const time = ev.start.dateTime
      ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      : 'весь день';

    const isBlocked = ev.summary && ev.summary.toLowerCase().includes('block');
    const icon = isBlocked ? '🚫' : '👤';
    text += `${icon} *${day} ${month}, ${dow}* ${time}\n    ${ev.summary || 'Без названия'}\n\n`;
  });

  await bot.sendMessage(chatId, text,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

async function showBlockDayPicker(chatId, prefix) {
  const buttons = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    if (!config.schedule[dow]) continue;
    const dateStr = date.toISOString().split('T')[0];
    buttons.push([{ text: `${DAY_NAMES[dow]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`, callback_data: `${prefix}_${dateStr}` }]);
  }
  buttons.push(...backButton());

  const title = prefix === 'blockday'
    ? '🚫 *Выбери день для блокировки:*'
    : '🕐 *Выбери день, чтобы заблокировать час:*';

  await bot.sendMessage(chatId, title, {
    parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons }
  });
}

async function blockDay(chatId, dateStr, calendar) {
  if (!calendar) { await bot.sendMessage(chatId, '❌ Google Calendar не подключён'); return; }

  const nextDay = new Date(dateStr + 'T00:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const endStr = nextDay.toISOString().split('T')[0];

  await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: {
      summary: 'Blocked / Заблокировано',
      start: { date: dateStr },
      end: { date: endStr },
      transparency: 'opaque'
    }
  });

  audit.log('block_day', { date: dateStr });
  await bot.sendMessage(chatId,
    `✅ *${formatDate(dateStr)}* заблокирован.\nСлоты на этот день больше не будут показываться.`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

async function showBlockHourPicker(chatId, dateStr, calendar) {
  if (!calendar) { await bot.sendMessage(chatId, '❌ Google Calendar не подключён'); return; }

  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  const daySchedule = config.schedule[dow];
  if (!daySchedule) {
    await bot.sendMessage(chatId, '❌ Нет расписания на этот день');
    return;
  }

  const allSlots = generateSlots(daySchedule);

  const now = new Date();
  const bounds = warsawDayBounds(dateStr);
  const events = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: bounds.start.toISOString(),
    timeMax: bounds.end.toISOString(),
    singleEvents: true,
    timeZone: config.timezone
  });
  const busyItems = events.data.items || [];

  const buttons = [];
  const row = [];
  for (const time of allSlots) {
    const slotStart = warsawDate(dateStr, time);
    const slotEnd = new Date(slotStart.getTime() + config.slotDuration * 60000);

    const isBusy = busyItems.some(ev => {
      const evStart = new Date(ev.start.dateTime || ev.start.date);
      const evEnd = new Date(ev.end.dateTime || ev.end.date);
      return slotStart < evEnd && slotEnd > evStart;
    });

    const isPast = slotStart < now;
    const label = isBusy ? `${time} ❌` : isPast ? `${time} ⏳` : time;

    if (!isBusy && !isPast) {
      row.push({ text: label, callback_data: `blockhour_${dateStr}_${time}` });
      if (row.length === 2) {
        buttons.push([...row]);
        row.length = 0;
      }
    }
  }
  if (row.length > 0) buttons.push([...row]);
  buttons.push(...backButton());

  if (buttons.length === 1) {
    await bot.sendMessage(chatId, `🕐 *${formatDate(dateStr)}*\n\nНет свободных слотов для блокировки.`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }

  await bot.sendMessage(chatId, `🕐 *${formatDate(dateStr)}*\nВыбери время для блокировки:`, {
    parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons }
  });
}

async function blockHour(chatId, dateStr, time, calendar) {
  if (!calendar) { await bot.sendMessage(chatId, '❌ Google Calendar не подключён'); return; }

  const start = warsawDate(dateStr, time);
  const end = new Date(start.getTime() + config.slotDuration * 60000);

  await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: {
      summary: `Blocked ${time}`,
      start: { dateTime: start.toISOString(), timeZone: config.timezone },
      end: { dateTime: end.toISOString(), timeZone: config.timezone },
      transparency: 'opaque'
    }
  });

  audit.log('block_hour', { date: dateStr, time });
  await bot.sendMessage(chatId,
    `✅ *${formatDate(dateStr)}, ${time}* заблокирован.\nЭтот слот больше не будет показываться на сайте.`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

async function showUnblockPicker(chatId, calendar) {
  if (!calendar) { await bot.sendMessage(chatId, '❌ Google Calendar не подключён'); return; }

  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 28);

  const events = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    q: 'Blocked'
  });

  const items = (events.data.items || []).filter(ev =>
    ev.summary && ev.summary.toLowerCase().includes('block')
  );

  if (items.length === 0) {
    await bot.sendMessage(chatId, '✅ Нет заблокированных дней или часов.',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }

  const buttons = items.map(ev => {
    const dateStr = ev.start.date || ev.start.dateTime.split('T')[0];
    const isAllDay = !!ev.start.date;
    let label;
    if (isAllDay) {
      label = `🚫 ${formatDate(dateStr)} (весь день)`;
    } else {
      const start = new Date(ev.start.dateTime);
      const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      label = `🕐 ${formatDate(dateStr)}, ${time}`;
    }
    const shortId = `u${unblockMap.size}`;
    unblockMap.set(shortId, ev.id);
    return [{ text: label, callback_data: `unblock_${shortId}` }];
  });
  buttons.push(...backButton());

  await bot.sendMessage(chatId, '✅ *Выбери что разблокировать:*', {
    parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons }
  });
}

async function unblockEvent(chatId, eventId, calendar) {
  if (!calendar) { await bot.sendMessage(chatId, '❌ Google Calendar не подключён'); return; }

  try {
    await calendar.events.delete({ calendarId: config.calendarId, eventId });
    audit.log('unblock', { eventId });
    await bot.sendMessage(chatId, '✅ Разблокировано. Слоты снова доступны.',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
  } catch (e) {
    await bot.sendMessage(chatId, '❌ Не удалось разблокировать: ' + e.message);
  }
}

const WARSAW_TS = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false
});

async function showAuditLog(chatId, n) {
  const entries = audit.tail(n || 20);
  if (entries.length === 0) {
    await bot.sendMessage(chatId, '🕓 Журнал пуст.',
      { reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }
  const lines = entries.map(e => {
    const ts = WARSAW_TS.format(new Date(e.ts));
    const details = Object.entries(e)
      .filter(([k]) => k !== 'ts' && k !== 'action')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    return `${ts} • ${e.action}${details ? ' · ' + details : ''}`;
  }).join('\n');
  await bot.sendMessage(chatId,
    `🕓 *Журнал, последние ${entries.length}:*\n\`\`\`\n${lines}\n\`\`\``,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

function notifyNewBooking({ name, email, date, time, locale, eventId }) {
  if (!bot || !ownerChatId) return;

  const bookingId = `${date}_${time}_${Date.now()}`;
  bookingEvents.set(bookingId, { name, email, date, time, locale, eventId });

  bot.sendMessage(ownerChatId,
    '🔔 *Новая запись!*\n\n' +
    `👤 ${name}\n` +
    `📧 ${email}\n` +
    `📅 ${formatDate(date)}\n` +
    `🕐 ${time}\n` +
    `🌐 ${locale === 'pl' ? 'Польский' : 'Русский'}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📎 Отправить ссылку на Meet', callback_data: `sendlink_${bookingId}` }]
        ]
      }
    }
  );
}

const FULL_DAY_NAMES = {
  0: 'Воскресенье', 1: 'Понедельник', 2: 'Вторник', 3: 'Среда',
  4: 'Четверг', 5: 'Пятница', 6: 'Суббота'
};

async function toggleDay(chatId, dow) {
  if (config.schedule[dow]) {
    delete config.schedule[dow];
    audit.log('schedule_close', { dow });
  } else {
    config.schedule[dow] = { start: '10:00', end: '16:00' };
    audit.log('schedule_open', { dow, start: '10:00', end: '16:00' });
  }
  saveSchedule();
  await showSchedule(chatId);
}

async function promptSetTime(chatId, dow) {
  pendingTime.set(chatId, { dow });
  await bot.sendMessage(chatId,
    `🕐 *${FULL_DAY_NAMES[dow]}*\n\n` +
    'Напиши диапазон часов. Подойдут любые формы:\n' +
    '`10-16`\n`10:00-16:00`\n`8 20`\n`9:30 18:30`',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

// Forgiving parser: accepts dashes (-, –, —) and bare whitespace as separator,
// minutes are optional, ASCII spaces collapsed.
function parseTimeRange(text) {
  const cleaned = text.trim().replace(/[—–]/g, '-').replace(/\s+/g, ' ');
  let m = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
  if (!m) m = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s+(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const startH = parseInt(m[1], 10);
  const startM = parseInt(m[2] || '0', 10);
  const endH = parseInt(m[3], 10);
  const endM = parseInt(m[4] || '0', 10);
  if (startH > 23 || endH > 23 || startM > 59 || endM > 59) return null;
  if (startH * 60 + startM >= endH * 60 + endM) return null;
  const fmt = (h, mi) => `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  return { start: fmt(startH, startM), end: fmt(endH, endM) };
}

async function handleSetTime(chatId, dow, text) {
  const range = parseTimeRange(text);
  if (!range) {
    await bot.sendMessage(chatId,
      '❌ Не смог распознать. Примеры: `10-16`, `10:00-16:00`, `8 20`',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }
  config.schedule[dow] = { start: range.start, end: range.end };
  saveSchedule();
  audit.log('schedule_hours', { dow, start: range.start, end: range.end });
  await bot.sendMessage(chatId,
    `✅ *${FULL_DAY_NAMES[dow]}*: ${range.start}-${range.end}`,
    { parse_mode: 'Markdown' }
  );
  await showSchedule(chatId);
}

function notifyBookingFailed({ name, email, date, time, error }) {
  if (!bot || !ownerChatId) return;

  const safe = (s) => String(s || '').replace(/[_*`\[\]]/g, m => '\\' + m);

  bot.sendMessage(ownerChatId,
    '🚨 *ПЛАТЁЖ ПРОШЁЛ, КАЛЕНДАРЬ НЕ ЗАПИСАН*\n\n' +
    `👤 ${safe(name)}\n` +
    `📧 ${safe(email)}\n` +
    `📅 ${formatDate(date)}\n` +
    `🕐 ${time}\n\n` +
    `❌ Ошибка: ${safe(error)}\n\n` +
    '*СРОЧНО ВРУЧНУЮ*: создай событие в календаре и напиши клиенту.',
    { parse_mode: 'Markdown' }
  );
}

function notifyMissingBooking({ name, email, date, time, sessionId }) {
  if (!bot || !ownerChatId) return;

  const safe = (s) => String(s || '').replace(/[_*`\[\]]/g, m => '\\' + m);

  bot.sendMessage(ownerChatId,
    '🚨 *ОПЛАЧЕНО, НО НЕТ СОБЫТИЯ В КАЛЕНДАРЕ*\n\n' +
    `👤 ${safe(name) || 'неизвестно'}\n` +
    `📧 ${safe(email) || 'неизвестно'}\n` +
    `📅 ${formatDate(date)}\n` +
    `🕐 ${time}\n` +
    `🔖 session: ${safe(sessionId)}\n\n` +
    '*Действие*: создай событие в Google Calendar вручную и напиши клиенту с Meet-ссылкой.',
    { parse_mode: 'Markdown' }
  );
}

function notifyContact({ name, email, message, locale }) {
  if (!bot || !ownerChatId) return;

  const safe = (s) => String(s || '').replace(/[_*`\[\]]/g, m => '\\' + m);
  const trimmedMsg = message ? (message.length > 600 ? message.slice(0, 600) + '…' : message) : '—';

  bot.sendMessage(ownerChatId,
    '✉️ *Новая заявка с сайта*\n\n' +
    `👤 ${safe(name)}\n` +
    `📧 ${safe(email)}\n` +
    `🌐 ${locale === 'pl' ? 'PL' : 'RU'}\n\n` +
    `💬 ${safe(trimmedMsg)}`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { init, notifyNewBooking, notifyBookingFailed, notifyContact, notifyMissingBooking };
