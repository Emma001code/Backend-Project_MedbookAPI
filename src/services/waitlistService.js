// Part E will send freed slots to the Redis waitlist queue

async function notifyWaitlistSlotFreed({ doctor_id, appointment_datetime }) {
  // Hook for Part E — worker promotes the first waitlisted patient
  void doctor_id;
  void appointment_datetime;
}

module.exports = {
  notifyWaitlistSlotFreed,
};
