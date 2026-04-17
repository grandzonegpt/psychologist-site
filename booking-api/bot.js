const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

let bot;
let ownerChatId = null;

const DAY_NAMES = {
  0: 'Вс', 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб'
};

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

function init(calendar) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('Telegram bot: no token, skipping');
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log('Telegram bot started');

  bot.onText(/\/start/, (msg) => {
    ownerChatId = msg.chat.id;
    bot.sendMessage(msg.chat.id,
      '👋 *Привет! Я твой бот для управления записями.*\n\n' +
      'Вот что я умею:',
      {
        parse_mode: 'Markdown',
        reply_markup: mainMenu()
      }
    );
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
      if (data === 'schedule') {
        await showSchedule(chatId, calendar);
      } else if (data === 'week') {
        await showWeekBookings(chatId, calendar);
      } else if (data === 'block_day') {
        await showBlockDayPicker(chatId);
      } else if (data.startsWith('block_')) {
        await blockDay(chatId, data.replace('block_', ''), calendar);
      } else if (data === 'unblock_day') {
        await showUnblockDayPicker(chatId, calendar);
      } else if (data.startsWith('unblock_')) {
        await unblockDay(chatId, data.replace('unblock_', ''), calendar);
      } else if (data === 'menu') {
        await bot.sendMessage(chatId, '📋 *Главное меню*', {
          parse_mode: 'Markdown',
          reply_markup: mainMenu()
        });
      }
    } catch (e) {
      console.error('Bot error:', e.message);
      bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
    }

    bot.answerCallbackQuery(query.id);
  });
}

function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: '📅 Расписание', callback_data: 'schedule' }, { text: '📋 Записи на неделю', callback_data: 'week' }],
      [{ text: '🚫 Заблокировать день', callback_data: 'block_day' }, { text: '✅ Разблокировать день', callback_data: 'unblock_day' }]
    ]
  };
}

function backButton() {
  return [[{ text: '◀️ Меню', callback_data: 'menu' }]];
}

async function showSchedule(chatId) {
  const days = Object.entries(config.schedule)
    .sort(([a], [b]) => a - b)
    .map(([dow, s]) => `  ${DAY_NAMES[dow]}:  ${s.start} — ${s.end}`)
    .join('\n');

  await bot.sendMessage(chatId,
    '📅 *Твоё расписание:*\n\n' +
    days + '\n\n' +
    `⏱ Сессия: ${config.slotDuration} мин + ${config.breakDuration} мин перерыв\n` +
    `💰 Цена: ${config.price} ${config.currency}`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
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

  const items = events.data.items || [];
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

    text += `${icon} *${day} ${month}, ${dow}* ${time}\n`;
    text += `    ${ev.summary || 'Без названия'}\n\n`;
  });

  await bot.sendMessage(chatId, text,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

async function showBlockDayPicker(chatId) {
  const buttons = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    if (!config.schedule[dow]) continue;

    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const dateStr = date.toISOString().split('T')[0];

    buttons.push([{
      text: `${DAY_NAMES[dow]} ${day} ${month}`,
      callback_data: `block_${dateStr}`
    }]);
  }
  buttons.push(...backButton());

  await bot.sendMessage(chatId, '🚫 *Выбери день для блокировки:*', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

async function blockDay(chatId, dateStr, calendar) {
  if (!calendar) {
    await bot.sendMessage(chatId, '❌ Google Calendar не подключён');
    return;
  }

  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59`);

  await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: {
      summary: 'Blocked / Заблокировано',
      start: { date: dateStr, timeZone: config.timezone },
      end: { date: dateStr, timeZone: config.timezone },
      transparency: 'opaque'
    }
  });

  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];

  await bot.sendMessage(chatId,
    `✅ *${day} ${month}* заблокирован.\nСлоты на этот день больше не будут показываться.`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
  );
}

async function showUnblockDayPicker(chatId, calendar) {
  if (!calendar) {
    await bot.sendMessage(chatId, '❌ Google Calendar не подключён');
    return;
  }

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
    await bot.sendMessage(chatId, '✅ Нет заблокированных дней.',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
    return;
  }

  const buttons = items.map(ev => {
    const dateStr = ev.start.date || ev.start.dateTime.split('T')[0];
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const dow = DAY_NAMES[d.getDay()];
    return [{
      text: `${dow} ${day} ${month}`,
      callback_data: `unblock_${ev.id}`
    }];
  });
  buttons.push(...backButton());

  await bot.sendMessage(chatId, '✅ *Выбери день для разблокировки:*', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

async function unblockDay(chatId, eventId, calendar) {
  if (!calendar) {
    await bot.sendMessage(chatId, '❌ Google Calendar не подключён');
    return;
  }

  try {
    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId: eventId
    });
    await bot.sendMessage(chatId, '✅ День разблокирован. Слоты снова доступны.',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: backButton() } }
    );
  } catch (e) {
    await bot.sendMessage(chatId, '❌ Не удалось разблокировать: ' + e.message);
  }
}

function notifyNewBooking({ name, email, date, time, locale }) {
  if (!bot || !ownerChatId) return;

  const d = new Date(`${date}T00:00:00`);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const dow = DAY_NAMES[d.getDay()];

  bot.sendMessage(ownerChatId,
    '🔔 *Новая запись!*\n\n' +
    `👤 ${name}\n` +
    `📧 ${email}\n` +
    `📅 ${day} ${month}, ${dow}\n` +
    `🕐 ${time}\n` +
    `🌐 ${locale === 'pl' ? 'Польский' : 'Русский'}`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { init, notifyNewBooking };
