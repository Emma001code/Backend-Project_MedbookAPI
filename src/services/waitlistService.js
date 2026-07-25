const redis = require('../config/redis');

const FREED_SLOTS_QUEUE = 'medibook:freed-slots';
const CONFIRMATION_QUEUE = 'medibook:confirmation-jobs';

function dateKeyFromDatetime(appointmentDatetime) {
  if (appointmentDatetime instanceof Date) {
    const year = appointmentDatetime.getFullYear();
    const month = String(appointmentDatetime.getMonth() + 1).padStart(2, '0');
    const day = String(appointmentDatetime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(appointmentDatetime).slice(0, 10);
}

// One FIFO queue per doctor-day — first in line gets the next freed slot
function waitlistKey(doctorId, appointmentDatetime) {
  const date = dateKeyFromDatetime(appointmentDatetime);
  return `medibook:waitlist:doctor:${doctorId}:date:${date}`;
}

function normalizeDatetime(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  return String(value);
}

// POST /waitlist — join the doctor-day queue
async function joinWaitlist({ patient_id, doctor_id, appointment_datetime }) {
  const key = waitlistKey(doctor_id, appointment_datetime);
  const patientId = String(patient_id);
  const members = await redis.lrange(key, 0, -1);

  if (members.includes(patientId)) {
    const error = new Error('Patient is already on the waitlist for this doctor-day');
    error.statusCode = 409;
    throw error;
  }

  await redis.rpush(key, patientId);
  const position = await redis.llen(key);

  return { position };
}

// Called after cancel — tells the worker a slot opened
async function notifyWaitlistSlotFreed({ doctor_id, appointment_datetime }) {
  const payload = JSON.stringify({
    doctor_id,
    appointment_datetime: normalizeDatetime(appointment_datetime),
  });

  await redis.rpush(FREED_SLOTS_QUEUE, payload);
}

// Every confirmed booking gets a confirmation job for the worker
async function enqueueConfirmationJob(job) {
  try {
    await redis.rpush(CONFIRMATION_QUEUE, JSON.stringify(job));
  } catch (error) {
    console.error('Failed to enqueue confirmation job:', error.message);
  }
}

async function popNextWaitlistedPatient(doctorId, appointmentDatetime) {
  const key = waitlistKey(doctorId, appointmentDatetime);
  return redis.lpop(key);
}

// Put patient back at the front if promotion booking fails
async function returnPatientToWaitlistFront({ patient_id, doctor_id, appointment_datetime }) {
  const key = waitlistKey(doctor_id, appointment_datetime);
  await redis.lpush(key, String(patient_id));
}

module.exports = {
  FREED_SLOTS_QUEUE,
  CONFIRMATION_QUEUE,
  joinWaitlist,
  notifyWaitlistSlotFreed,
  enqueueConfirmationJob,
  popNextWaitlistedPatient,
  returnPatientToWaitlistFront,
};
