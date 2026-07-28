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

// Fix — format local time, not UTC
function normalizeDatetime(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    const second = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  return String(value).trim().replace('T', ' ').slice(0, 19);
}

function buildWaitlistEntry({ patient_id, doctor_id, appointment_datetime }) {
  return JSON.stringify({
    patient_id: Number(patient_id),
    doctor_id: Number(doctor_id),
    appointment_datetime: normalizeDatetime(appointment_datetime),
  });
}

function parseWaitlistEntry(raw) {
  if (!raw) {
    return null;
  }

  try {
    const entry = JSON.parse(raw);
    if (entry.patient_id == null) {
      return null;
    }

    return {
      patient_id: Number(entry.patient_id),
      doctor_id: entry.doctor_id == null ? null : Number(entry.doctor_id),
      appointment_datetime: entry.appointment_datetime
        ? normalizeDatetime(entry.appointment_datetime)
        : null,
    };
  } catch {
    const legacyPatientId = Number(raw);
    if (Number.isNaN(legacyPatientId)) {
      return null;
    }

    // Older queue entries stored only the patient id as plain text
    return {
      patient_id: legacyPatientId,
      doctor_id: null,
      appointment_datetime: null,
    };
  }
}

// Join the doctor-day queue (called from POST /appointments when slot is full)
async function joinWaitlist({ patient_id, doctor_id, appointment_datetime }) {
  const key = waitlistKey(doctor_id, appointment_datetime);
  const members = await redis.lrange(key, 0, -1);
  const numericPatientId = Number(patient_id);

  const alreadyQueued = members.some((member) => {
    const entry = parseWaitlistEntry(member);
    return entry && entry.patient_id === numericPatientId;
  });

  if (alreadyQueued) {
    const error = new Error('Patient is already on the waitlist for this doctor-day');
    error.statusCode = 409;
    throw error;
  }

  await redis.rpush(
    key,
    buildWaitlistEntry({ patient_id, doctor_id, appointment_datetime })
  );
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

async function popNextWaitlistEntry(doctorId, appointmentDatetime) {
  const key = waitlistKey(doctorId, appointmentDatetime);
  const raw = await redis.lpop(key);

  if (!raw) {
    return null;
  }

  const entry = parseWaitlistEntry(raw);
  if (!entry) {
    return null;
  }

  return {
    patient_id: entry.patient_id,
    doctor_id: entry.doctor_id ?? Number(doctorId),
    appointment_datetime:
      entry.appointment_datetime ?? normalizeDatetime(appointmentDatetime),
  };
}

// Put patient back at the front if promotion booking fails
async function returnPatientToWaitlistFront({ patient_id, doctor_id, appointment_datetime }) {
  const key = waitlistKey(doctor_id, appointment_datetime);
  await redis.lpush(
    key,
    buildWaitlistEntry({ patient_id, doctor_id, appointment_datetime })
  );
}

module.exports = {
  FREED_SLOTS_QUEUE,
  CONFIRMATION_QUEUE,
  normalizeDatetime,
  buildWaitlistEntry,
  parseWaitlistEntry,
  joinWaitlist,
  notifyWaitlistSlotFreed,
  enqueueConfirmationJob,
  popNextWaitlistEntry,
  returnPatientToWaitlistFront,
};
