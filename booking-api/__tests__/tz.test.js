const { warsawDate, warsawDateString, warsawDayBounds, TZ } = require('../tz');

describe('warsawDate', () => {
  test('summer (CEST = UTC+2): 2026-05-13 13:00 Warsaw == 11:00 UTC', () => {
    const d = warsawDate('2026-05-13', '13:00');
    expect(d.toISOString()).toBe('2026-05-13T11:00:00.000Z');
  });

  test('winter (CET = UTC+1): 2026-01-15 13:00 Warsaw == 12:00 UTC', () => {
    const d = warsawDate('2026-01-15', '13:00');
    expect(d.toISOString()).toBe('2026-01-15T12:00:00.000Z');
  });

  test('DST spring-forward day: 2026-03-29 03:00 Warsaw == 01:00 UTC (already CEST)', () => {
    const d = warsawDate('2026-03-29', '03:00');
    expect(d.toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });

  test('DST fall-back day: 2026-10-25 03:00 Warsaw == 02:00 UTC (back to CET)', () => {
    const d = warsawDate('2026-10-25', '03:00');
    expect(d.toISOString()).toBe('2026-10-25T02:00:00.000Z');
  });

  test('midnight: 2026-05-13 00:00 Warsaw == 22:00 UTC of previous day', () => {
    const d = warsawDate('2026-05-13', '00:00');
    expect(d.toISOString()).toBe('2026-05-12T22:00:00.000Z');
  });
});

describe('warsawDateString', () => {
  test('returns YYYY-MM-DD in Warsaw TZ for a given Date', () => {
    const d = new Date('2026-05-13T11:00:00.000Z');
    expect(warsawDateString(d)).toBe('2026-05-13');
  });

  test('crosses date line at midnight Warsaw correctly', () => {
    // 23:30 UTC on May 12 = 01:30 May 13 in Warsaw (summer)
    const d = new Date('2026-05-12T23:30:00.000Z');
    expect(warsawDateString(d)).toBe('2026-05-13');
  });

  test('returns previous day if UTC time is before Warsaw midnight', () => {
    // 21:00 UTC on May 12 = 23:00 May 12 in Warsaw (summer)
    const d = new Date('2026-05-12T21:00:00.000Z');
    expect(warsawDateString(d)).toBe('2026-05-12');
  });
});

describe('warsawDayBounds', () => {
  test('returns start and end of a Warsaw day as UTC instants', () => {
    const { start, end } = warsawDayBounds('2026-05-13');
    expect(start.toISOString()).toBe('2026-05-12T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-13T21:59:00.000Z');
  });
});

describe('TZ constant', () => {
  test('is Europe/Warsaw', () => {
    expect(TZ).toBe('Europe/Warsaw');
  });
});
