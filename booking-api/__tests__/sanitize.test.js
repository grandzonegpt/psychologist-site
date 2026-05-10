const { escapeHtml, validateBooking, validateContact } = require('../sanitize');

describe('escapeHtml', () => {
  test('escapes &, <, >, ", \'', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("it's")).toBe('it&#39;s');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('handles null/undefined safely', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('coerces non-strings to strings', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('validateBooking', () => {
  const valid = {
    name: 'Aliaksei',
    email: 'a@example.com',
    date: '2026-05-13',
    time: '13:00',
    locale: 'ru'
  };

  test('accepts a valid payload', () => {
    expect(validateBooking(valid)).toBeNull();
  });

  test('locale optional', () => {
    const { locale, ...rest } = valid;
    expect(validateBooking(rest)).toBeNull();
  });

  test('rejects missing name', () => {
    expect(validateBooking({ ...valid, name: '' })).toBe('Invalid name');
  });

  test('rejects name >100 chars', () => {
    expect(validateBooking({ ...valid, name: 'a'.repeat(101) })).toBe('Invalid name');
  });

  test('rejects malformed email', () => {
    expect(validateBooking({ ...valid, email: 'not-an-email' })).toBe('Invalid email');
    expect(validateBooking({ ...valid, email: 'a@b' })).toBe('Invalid email');
    expect(validateBooking({ ...valid, email: 'a b@c.d' })).toBe('Invalid email');
  });

  test('rejects email >200 chars', () => {
    const long = 'a'.repeat(196) + '@b.cd'; // 196 + 5 = 201 chars
    expect(validateBooking({ ...valid, email: long })).toBe('Invalid email');
  });

  test('rejects date not matching YYYY-MM-DD', () => {
    expect(validateBooking({ ...valid, date: '2026/05/13' })).toBe('Invalid date');
    expect(validateBooking({ ...valid, date: '13-05-2026' })).toBe('Invalid date');
    expect(validateBooking({ ...valid, date: '2026-5-13' })).toBe('Invalid date');
  });

  test('rejects time not matching HH:MM', () => {
    expect(validateBooking({ ...valid, time: '13:0' })).toBe('Invalid time');
    expect(validateBooking({ ...valid, time: '1:00' })).toBe('Invalid time');
    expect(validateBooking({ ...valid, time: '1300' })).toBe('Invalid time');
  });

  test('rejects unknown locale', () => {
    expect(validateBooking({ ...valid, locale: 'en' })).toBe('Invalid locale');
    expect(validateBooking({ ...valid, locale: 'be' })).toBe('Invalid locale');
  });

  test('accepts both ru and pl', () => {
    expect(validateBooking({ ...valid, locale: 'ru' })).toBeNull();
    expect(validateBooking({ ...valid, locale: 'pl' })).toBeNull();
  });
});

describe('validateContact', () => {
  const valid = {
    name: 'Aliaksei',
    email: 'a@example.com',
    message: 'Hello'
  };

  test('accepts valid input', () => {
    expect(validateContact(valid)).toBeNull();
  });

  test('rejects missing name', () => {
    expect(validateContact({ ...valid, name: '' })).toBe('Invalid name');
  });

  test('rejects name >100 chars', () => {
    expect(validateContact({ ...valid, name: 'a'.repeat(101) })).toBe('Invalid name');
  });

  test('email/phone field is permissive (no regex check, only length)', () => {
    expect(validateContact({ ...valid, email: '+48 555 12 34 56' })).toBeNull();
    expect(validateContact({ ...valid, email: 'not-an-email' })).toBeNull();
  });

  test('rejects email/phone field >200 chars', () => {
    expect(validateContact({ ...valid, email: 'a'.repeat(201) })).toBe('Invalid email or phone');
  });

  test('rejects message >1000 chars', () => {
    expect(validateContact({ ...valid, message: 'x'.repeat(1001) })).toBe('Invalid message');
  });

  test('allows empty / null message', () => {
    expect(validateContact({ ...valid, message: '' })).toBeNull();
    expect(validateContact({ ...valid, message: null })).toBeNull();
  });
});
