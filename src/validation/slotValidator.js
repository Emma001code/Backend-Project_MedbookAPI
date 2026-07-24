const {
  WORK_DAY_START_HOUR,
  WORK_DAY_LAST_SLOT_HOUR,
  WORK_DAY_LAST_SLOT_MINUTE,
} = require('./constants');

// Slot rules for booking — pure function (no database, good for unit tests)
function validateAppointmentSlot(appointmentDatetime, now = new Date()) {
  if (typeof appointmentDatetime !== 'string' || !appointmentDatetime.trim()) {
    return { valid: false, message: 'appointment_datetime is required' };
  }

  // Expect format like 2026-08-10 16:30:00
  const match = appointmentDatetime.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return {
      valid: false,
      message: 'appointment_datetime must be YYYY-MM-DD HH:mm:ss',
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);

  const slotDate = new Date(year, month - 1, day, hour, minute, second);

  // Reject impossible dates like 2026-02-31
  if (
    slotDate.getFullYear() !== year ||
    slotDate.getMonth() !== month - 1 ||
    slotDate.getDate() !== day ||
    slotDate.getHours() !== hour ||
    slotDate.getMinutes() !== minute
  ) {
    return { valid: false, message: 'appointment_datetime is not a valid date' };
  }

  // Only :00 and :30 allowed (30-minute slots)
  if (minute !== 0 && minute !== 30) {
    return {
      valid: false,
      message: 'appointment must start on a 30-minute boundary (:00 or :30)',
    };
  }

  // Working hours: 09:00 up to 16:30 start (visit ends at 17:00)
  if (hour < WORK_DAY_START_HOUR) {
    return {
      valid: false,
      message: 'appointment must be within working hours (09:00-17:00)',
    };
  }

  if (
    hour > WORK_DAY_LAST_SLOT_HOUR ||
    (hour === WORK_DAY_LAST_SLOT_HOUR && minute > WORK_DAY_LAST_SLOT_MINUTE)
  ) {
    return {
      valid: false,
      message: 'appointment must be within working hours (09:00-17:00)',
    };
  }

  // Must be in the future
  if (slotDate <= now) {
    return { valid: false, message: 'appointment must be in the future' };
  }

  const formatted = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  return {
    valid: true,
    data: formatted,
  };
}

module.exports = {
  validateAppointmentSlot,
};
