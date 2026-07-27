const { validateAppointmentSlot } = require('../src/validation/slotValidator');

// Fixed "now" so future/past checks are predictable
const NOW = new Date(2026, 6, 1, 8, 0, 0);

describe('validateAppointmentSlot', () => {
  test('accepts a valid future slot on a 30-minute boundary', () => {
    const result = validateAppointmentSlot('2026-08-10 09:00:00', NOW);

    expect(result.valid).toBe(true);
    expect(result.data).toBe('2026-08-10 09:00:00');
  });

  test('rejects a time not on :00 or :30', () => {
    const result = validateAppointmentSlot('2026-08-10 09:15:00', NOW);

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/30-minute boundary/);
  });

  test('rejects 17:00 because the last slot starts at 16:30', () => {
    const result = validateAppointmentSlot('2026-08-10 17:00:00', NOW);

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/working hours/);
  });

  test('rejects malformed datetime input', () => {
    const result = validateAppointmentSlot('not-a-date', NOW);

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/YYYY-MM-DD HH:mm:ss/);
  });
});
