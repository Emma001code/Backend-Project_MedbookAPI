// Clinic rules stored in one place — used by booking, reports, and tests

const MAX_DAILY_APPOINTMENTS = 12;
const WORK_DAY_START_HOUR = 9;           // first slot starts at 09:00
const WORK_DAY_LAST_SLOT_HOUR = 16;     // last slot starts at 16:30
const WORK_DAY_LAST_SLOT_MINUTE = 30;
const SLOT_MINUTES = 30;

module.exports = {
  MAX_DAILY_APPOINTMENTS,
  WORK_DAY_START_HOUR,
  WORK_DAY_LAST_SLOT_HOUR,
  WORK_DAY_LAST_SLOT_MINUTE,
  SLOT_MINUTES,
};
