// Warsaw timezone helpers. DST-aware via Intl.
//
// Why this exists: Date constructors with naive datetime strings get parsed
// in the runtime's local timezone (UTC on Railway). Slot times like "13:00"
// are intended as Warsaw clock readings, so we must construct Date objects
// that represent that Warsaw time as an absolute UTC instant.

const TZ = 'Europe/Warsaw';

const fmtWarsawHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const fmtWarsawDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns a Date object representing the given Warsaw datetime as an absolute
 * UTC instant. Handles CET/CEST transitions automatically.
 *
 * dateStr: "YYYY-MM-DD"
 * timeStr: "HH:MM"
 */
function warsawDate(dateStr, timeStr) {
  // Probe with summer offset (+02:00). If that round-trips back to the same
  // local time in Warsaw, we're in CEST. Otherwise winter (+01:00).
  const summer = new Date(`${dateStr}T${timeStr}:00+02:00`);
  if (fmtWarsawHour.format(summer) === timeStr) return summer;
  return new Date(`${dateStr}T${timeStr}:00+01:00`);
}

/**
 * Returns { start: Date, end: Date } representing the start and end of a
 * given calendar day in Warsaw time, as UTC instants.
 *
 * Useful for `events.list({ timeMin, timeMax })` queries scoped to a Warsaw day.
 */
function warsawDayBounds(dateStr) {
  return {
    start: warsawDate(dateStr, '00:00'),
    end: warsawDate(dateStr, '23:59'),
  };
}

/**
 * Returns "YYYY-MM-DD" formatted in Warsaw time for a given Date instance.
 */
function warsawDateString(date) {
  // en-CA produces "YYYY-MM-DD"
  return fmtWarsawDate.format(date);
}

module.exports = { warsawDate, warsawDayBounds, warsawDateString, TZ };
