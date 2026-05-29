const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const config = require('./config');
const dataDir = require('./dataDir');
const audit = require('./audit');
const { warsawDate, warsawDayBounds, warsawDateString } = require('./tz');

const SCHEDULE_FILE = dataDir.path('schedule.json');
const INTRO_SCHEDULE_FILE = dataDir.path('intro-schedule.json');
const DECOY_FILE = dataDir.path('decoy.json');
const CHAT_FILE = dataDir.path('chat.json');

let bot;
let ownerChatId = null;

// Authorization. If BOOKING_OWNER_CHAT_ID env is set, only that chat id is
// accepted. Otherwise, the first /start wins and subsequent /starts from
// different chats are silently ignored (first-come lockout). Without this
// guard, anyone who finds the bot username can send /start, become owner,
// and manage the schedule + audit log.
const ALLOWED_OWNER = process.env.BOOKING_OWNER_CHAT_ID
  ? Number(process.env.BOOKING_OWNER_CHAT_ID)
  : null;

function isAuthorized(chatId) {
  if (ALLOWED_OWNER) return chatId === ALLOWED_OWNER;
  return ownerChatId !== null && chatId === ownerChatId;
}

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

// Free-intro weekly availability lives in its own file so it never collides
// with the paid schedule. Same shape: { [dow]: { start, end } }.
function loadIntroSchedule() {
  try {
    if (fs.existsSync(INTRO_SCHEDULE_FILE)) {
      const data = JSON.parse(fs.readFileSync(INTRO_SCHEDULE_FILE, 'utf8'));
      Object.keys(data).forEach(k => { config.introSchedule[k] = data[k]; });
      const toDelete = Object.keys(config.introSchedule).filter(k => !data[k]);
      toDelete.forEach(k => delete config.introSchedule[k]);
    }
  } catch (e) {
    console.error('Failed to load intro schedule:', e.message);
  }
}

function saveIntroSchedule() {
  try {
    fs.writeFileSync(INTRO_SCHEDULE_FILE, JSON.stringify(config.introSchedule, null, 2));
  } catch (e) {
    console.error('Failed to save intro schedule:', e.message);
  }
}

// Showcase decoy config (display-only marketing availability). Persisted so
// the setting survives restarts.
function loadDecoy() {
  try {
    if (fs.existsSync(DECOY_FILE)) {
      const data = JSON.parse(fs.readFileSync(DECOY_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        if (typeof data.enabled === 'boolean') config.decoy.enabled = data.enabled;
        if (data.intensity === 'low' || data.intensity === 'med') config.decoy.intensity = data.intensity;
      }
    }
  } catch (e) {
    console.error('Failed to load decoy config:', e.message);
  }
}

function saveDecoy() {
  try {
    fs.writeFileSync(DECOY_FILE, JSON.stringify(config.decoy, null, 2));
  } catch (e) {
    console.error('Failed to save decoy config:', e.message);
  }
}

loadSchedule();
loadIntroSchedule();
loadDecoy();

// bookingEvents accumulates entries on every confirmed payment (one per webhook)
// and is only deleted on the "Send Meet link" button press. Operators may not
// click that button ever (Calendar invite already includes the Meet link), so
// the Map would otherwise grow unbounded across the deploy lifetime. Hourly
// sweep with 7-day TTL: the button is meaningful only while the session is
// still upcoming, and 7 days covers the longest expected booking horizon.
const BOOKING_EVENTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - BOOKING_EVENTS_TTL_MS;
  for (const [k, v] of bookingEvents) {
    if (v && typeof v.addedAt === 'number' && v.addedAt < cutoff) {
      bookingEvents.delete(k);
    }
  }
}, 60 * 60 * 1000);

const DAY_NAMES = {
  0: 'Вс', 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб'
};

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

// Escape Telegram Markdown specials. Any user-provided string (name, email)
// interpolated into a parse_mode:'Markdown' message must pass through this,
// or one stray underscore makes Telegram 400 the whole message.
function escapeMd(s) {
  return String(s || '').replace(/[_*`\[\]]/g, m => '\\' + m);
}

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
  // If the owner is pinned via env but /start was never run on this volume,
  // chat.json is absent and ownerChatId stays null — which silently disables
  // all notifications even though the menu works (auth uses ALLOWED_OWNER).
  // Seed ownerChatId from the env so notifications fire without a /start.
  if (!ownerChatId && ALLOWED_OWNER) {
    ownerChatId = ALLOWED_OWNER;
    console.log(`Bot: seeded ownerChatId from BOOKING_OWNER_CHAT_ID=${ALLOWED_OWNER}`);
  }
  console.log('Telegram bot started');

  bot.onText(/\/start/, (msg) => {
    if (ALLOWED_OWNER && msg.chat.id !== ALLOWED_OWNER) {
      console.warn(`Bot: rejected /start from unauthorized chat ${msg.chat.id}`);
      return;
    }
    if (!ALLOWED_OWNER && ownerChatId !== null && ownerChatId !== msg.chat.id) {
      console.warn(`Bot: rejected /start from non-owner chat ${msg.chat.id} (owner=${ownerChatId})`);
      return;
    }
    ownerChatId = msg.chat.id;
    saveOwnerChatId(ownerChatId);
    bot.sendMessage(msg.chat.id,
      '👋 *Привет! Я твой бот для управления записями.*\n\nВот что я умею:',
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });

  bot.onText(/^\/log(?:\s+(\d+))?$/, (msg, m) => {
    if (!isAuthorized(msg.chat.id)) return;
    const n = m && m[1] ? Math.min(parseInt(m[1], 10), 50) : 20;
    showAuditLog(msg.chat.id, n);
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (!isAuthorized(chatId)) {
      bot.answerCallbackQuery(query.id);
      return;
    }
    const data = query.data;

    try {
      if (data === 'schedule' || data === 'edit_schedule') {
        await showSchedule(chatId);
      } else if (data === 'intro_schedule') {
        await showIntroSchedule(chatId);
      } else if (data === 'decoy') {
        await showDecoyMenu(chatId);
      } else if (data === 'decoy_toggle') {
        config.decoy.enabled = !config.decoy.enabled;
        saveDecoy();
        audit.log('decoy_toggle', { enabled: config.decoy.enabled });
        await showDecoyMenu(chatId);
      } else if (data === 'decoy_low' || data === 'decoy_med') {
        config.decoy.intensity = data === 'decoy_med' ? 'med' : 'low';
        saveDecoy();
        audit.log('decoy_intensity', { intensity: config.decoy.intensity });
        await showDecoyMenu(chatId);
      } else if (data.startsWith('introtoggleday_')) {
        await toggleIntroDay(chatId, parseInt(data.replace('introtoggleday_', '')));
      } else if (data.startsWith('introsettime_')) {
        const dow = parseInt(data.replace('introsettime_', ''));
        await promptSetTime(chatId, dow, true);
      } else if (data === 'week') {
        await showWeekBookings(chatId, calendar);
      } else if (data === 'day_detail') {
        await showDayDetailPicker(chatId);
      } else if (data.startsWith('daydetail_')) {
        await showDayDetail(chatId, data.replace('daydetail_', ''), calendar);
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
            `📎 *Отправить ссылку клиенту ${escapeMd(booking.name)}*\n\nВставь ссылку на Google Meet:`,
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
    if (!isAuthorized(chatId)) return;

    const timeInput = pendingTime.get(chatId);
    if (timeInput) {
      pendingTime.delete(chatId);
      await handleSetTime(chatId, timeInput.dow, msg.text.trim(), timeInput.intro);
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
          `✅ Ссылка отправлена!\n\n👤 ${escapeMd(pending.name)}\n📧 ${escapeMd(pending.email)}\n🔗 ${escapeMd(link)}\n\nКлиент получит обновлённое приглашение на email.`,
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
      [{ text: '🔎 Детали дня', callback_data: 'day_detail' }],
      [{ text: '🎁 Знакомства (расписание)', callback_data: 'intro_schedule' }],
      [{ text: '🎭 Витрина занятости', callback_data: 'decoy' }],
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

// Classify a calendar event by its summary so the operator can tell at a
// glance what is occupying a slot: paid session, free intro, a manual block,
// a transient checkout hold, or an unrelated personal event.
function classifyEvent(summary) {
  const s = (summary || '').toLowerCase();
  if (s.startsWith('hold:')) return { icon: '⏳', label: 'бронь в оплате' };
  if (s.includes('block') || s.includes('заблок')) return { icon: '🚫', label: 'блокировка' };
  if (s.includes('знакомств') || s.includes('zapozn')) return { icon: '🎁', label: 'знакомство' };
  if (s.includes('консультац') || s.includes('konsultac')) return { icon: '👤', label: 'платная сессия' };
  return { icon: '📌', label: 'личное / другое' };
}

async function showDayDetailPicker(chatId) {
  const buttons = [];
  const now = new Date();
  let row = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = warsawDateString(date);
    const [, monthStr, dayStr] = dateStr.split('-');
    const dayNum = parseInt(dayStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const dow = new Date(`${dateStr}T12:00:00`).getDay();
    row.push({ text: `${DAY_NAMES[dow]} ${dayNum} ${MONTH_NAMES[monthIdx]}`, callback_data: `daydetail_${dateStr}` });
    if (row.length === 2) { buttons.push([...row]); row.length = 0; }
  }
  if (row.length > 0) buttons.push([...row]);
  buttons.push(...backButton());

  await bot.sendMessage(chatId, '🔎 *Выбери день, чтобы посмотреть что в нём:*', {
    parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons }
  });
}

async function showDayDetail(chatId, dateStr, calendar) {
  if (!calendar) { await bot.sendMessage(chatId, '❌ Google Calendar не подключён'); return; }

  const bounds = warsawDayBounds(dateStr);
  const events = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: bounds.start.toISOString(),
    timeMax: bounds.end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: config.timezone
  });

  const items = events.data.items || [];
  if (items.length === 0) {
    await bot.sendMessage(chatId,
      `🔎 *${formatDate(dateStr)}*\n\nСвободно, событий нет.`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }

  const fmtTime = (dt) => `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  let text = `🔎 *${formatDate(dateStr)}* (${items.length})\n\n`;
  items.forEach(ev => {
    const cls = classifyEvent(ev.summary);
    if (ev.start.date) {
      text += `${cls.icon} весь день · _${cls.label}_\n    ${ev.summary || 'Без названия'}\n\n`;
      return;
    }
    const start = new Date(ev.start.dateTime);
    const end = new Date(ev.end.dateTime || ev.start.dateTime);
    const mins = Math.round((end - start) / 60000);
    text += `${cls.icon} ${fmtTime(start)}–${fmtTime(end)} (${mins} мин) · _${cls.label}_\n    ${ev.summary || 'Без названия'}\n\n`;
  });

  await bot.sendMessage(chatId, text,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

async function showDecoyMenu(chatId) {
  const on = config.decoy.enabled;
  const intensity = config.decoy.intensity === 'med' ? 'средняя (~45%)' : 'низкая (~25%)';
  const buttons = [
    [{ text: on ? '🟢 Витрина ВКЛ (выключить)' : '⚪ Витрина ВЫКЛ (включить)', callback_data: 'decoy_toggle' }],
    [
      { text: config.decoy.intensity === 'low' ? '✅ Низкая' : 'Низкая', callback_data: 'decoy_low' },
      { text: config.decoy.intensity === 'med' ? '✅ Средняя' : 'Средняя', callback_data: 'decoy_med' }
    ]
  ];
  buttons.push(...backButton());

  const summary =
    '🎭 *Витрина занятости*\n\n' +
    `Состояние: ${on ? '🟢 включена' : '⚪ выключена'}\n` +
    `Интенсивность: ${intensity}\n\n` +
    'Когда включено, часть свободных слотов на платном виджете показывается «занятыми» (перечёркнуто), чтобы календарь выглядел востребованным.\n\n' +
    '• Только платный виджет. Бесплатное знакомство всегда открыто.\n' +
    '• Реальный календарь не трогается, двойной записи не будет.\n' +
    '• Узор разный по дням, минимум 2 свободных слота в дне сохраняются.';

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
    // Use Warsaw calendar date, not UTC. Otherwise late evening in Warsaw
    // (after 22:00 in summer) the picker shows yesterday's date and clicking
    // it blocks the wrong day in Google Calendar.
    const dateStr = warsawDateString(date);
    const [, monthStr, dayStr] = dateStr.split('-');
    const dayNum = parseInt(dayStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const dow = new Date(`${dateStr}T12:00:00`).getDay();
    if (!config.schedule[dow]) continue;
    buttons.push([{ text: `${DAY_NAMES[dow]} ${dayNum} ${MONTH_NAMES[monthIdx]}`, callback_data: `${prefix}_${dateStr}` }]);
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

function notifyNewBooking({ name, email, date, time, locale, eventId, isIntro }) {
  if (!bot || !ownerChatId) return;

  // Escape Markdown specials: an unescaped underscore in a name or email
  // (e.g. test_user@mail) makes Telegram reject the message, and since this
  // send is fire-and-forget the failure was previously silent.
  const safe = (s) => String(s || '').replace(/[_*`\[\]]/g, m => '\\' + m);

  const bookingId = `${date}_${time}_${Date.now()}`;
  bookingEvents.set(bookingId, { name, email, date, time, locale, eventId, addedAt: Date.now() });

  const title = isIntro ? '🎁 *Новое знакомство!* (бесплатно)' : '🔔 *Новая запись!*';

  bot.sendMessage(ownerChatId,
    title + '\n\n' +
    `👤 ${safe(name)}\n` +
    `📧 ${safe(email)}\n` +
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
  ).catch(e => console.error('notifyNewBooking send error:', e.message));
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

async function promptSetTime(chatId, dow, intro) {
  pendingTime.set(chatId, { dow, intro: !!intro });
  const head = intro ? `🎁 Знакомства · *${FULL_DAY_NAMES[dow]}*` : `🕐 *${FULL_DAY_NAMES[dow]}*`;
  await bot.sendMessage(chatId,
    `${head}\n\n` +
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

async function handleSetTime(chatId, dow, text, intro) {
  const range = parseTimeRange(text);
  if (!range) {
    await bot.sendMessage(chatId,
      '❌ Не смог распознать. Примеры: `10-16`, `10:00-16:00`, `8 20`',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }
  if (intro) {
    config.introSchedule[dow] = { start: range.start, end: range.end };
    saveIntroSchedule();
    audit.log('intro_schedule_hours', { dow, start: range.start, end: range.end });
    await bot.sendMessage(chatId,
      `✅ Знакомства · *${FULL_DAY_NAMES[dow]}*: ${range.start}-${range.end}`,
      { parse_mode: 'Markdown' }
    );
    await showIntroSchedule(chatId);
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

async function toggleIntroDay(chatId, dow) {
  if (config.introSchedule[dow]) {
    delete config.introSchedule[dow];
    audit.log('intro_schedule_close', { dow });
  } else {
    config.introSchedule[dow] = { start: '10:00', end: '13:00' };
    audit.log('intro_schedule_open', { dow, start: '10:00', end: '13:00' });
  }
  saveIntroSchedule();
  await showIntroSchedule(chatId);
}

async function showIntroSchedule(chatId) {
  const buttons = [];
  for (let dow = 1; dow <= 7; dow++) {
    const d = dow % 7;
    const active = !!config.introSchedule[d];
    const label = active
      ? `✅ ${FULL_DAY_NAMES[d]}  ${config.introSchedule[d].start}-${config.introSchedule[d].end}`
      : `⚪ ${FULL_DAY_NAMES[d]}  закрыто`;
    const row = [{ text: label, callback_data: `introtoggleday_${d}` }];
    if (active) row.push({ text: '🕐 Часы', callback_data: `introsettime_${d}` });
    buttons.push(row);
  }
  buttons.push(...backButton());

  const summary =
    '🎁 *Расписание бесплатных знакомств*\n\n' +
    'Это отдельное расписание для 15-минутных знакомств.\n' +
    'Тапни день чтобы открыть или закрыть.\n' +
    'Кнопка 🕐 Часы меняет окно приёма.\n\n' +
    `⏱ Знакомство: ${config.introDuration} мин + ${config.introBreakDuration} мин перерыв\n` +
    '💰 Бесплатно, без оплаты\n\n' +
    'Занятые в Google Calendar времена (платные сессии, блокировки) автоматически не показываются.';

  await bot.sendMessage(chatId, summary,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } }
  );
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
  const trimmedMsg = message ? (message.length > 600 ? message.slice(0, 600) + '…' : message) : '(пусто)';

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
