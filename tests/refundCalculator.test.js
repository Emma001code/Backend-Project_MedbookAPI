const { calculateRefund } = require('../src/validation/refundCalculator');

const APPOINTMENT = '2026-08-10 10:00:00';
const AMOUNT = 150;

describe('calculateRefund', () => {
  test('returns 100% when notice is more than 48 hours', () => {
    const cancelledAt = '2026-08-07 10:00:00';
    expect(calculateRefund(AMOUNT, APPOINTMENT, cancelledAt)).toBe(150);
  });

  test('returns 100% at exactly 48 hours notice', () => {
    const cancelledAt = '2026-08-08 10:00:00';
    expect(calculateRefund(AMOUNT, APPOINTMENT, cancelledAt)).toBe(150);
  });

  test('returns 50% when notice is between 24 and 48 hours', () => {
    const cancelledAt = '2026-08-08 22:00:00';
    expect(calculateRefund(AMOUNT, APPOINTMENT, cancelledAt)).toBe(75);
  });

  test('returns 50% at exactly 24 hours notice', () => {
    const cancelledAt = '2026-08-09 10:00:00';
    expect(calculateRefund(AMOUNT, APPOINTMENT, cancelledAt)).toBe(75);
  });

  test('returns 0% when notice is less than 24 hours', () => {
    const cancelledAt = '2026-08-09 22:00:00';
    expect(calculateRefund(AMOUNT, APPOINTMENT, cancelledAt)).toBe(0);
  });

  test('returns 0% just under 24 hours notice', () => {
    const cancelledAt = '2026-08-09 10:01:00';
    expect(calculateRefund(AMOUNT, APPOINTMENT, cancelledAt)).toBe(0);
  });
});
