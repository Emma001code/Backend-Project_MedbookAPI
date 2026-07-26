require('dotenv').config();

const Redis = require('ioredis');
const env = require('./config/env');
const pool = require('./config/db');
const appointmentModel = require('./models/appointmentModel');
const doctorModel = require('./models/doctorModel');
const patientModel = require('./models/patientModel');
const { appendToAuditLog } = require('./services/auditLogService');
const { validateAppointmentSlot } = require('./validation/slotValidator');
const {
  FREED_SLOTS_QUEUE,
  CONFIRMATION_QUEUE,
  normalizeDatetime,
  popNextWaitlistedPatient,
  returnPatientToWaitlistFront,
  enqueueConfirmationJob,
} = require('./services/waitlistService');

// Separate Redis connection so blocking pops do not stall the API
const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
});

async function processConfirmationJob(raw) {
  const job = JSON.parse(raw);

  await appendToAuditLog({
    event: 'confirmation',
    patient_id: job.patient_id,
    doctor_id: job.doctor_id,
    appointment_id: job.appointment_id,
    appointment_datetime: job.appointment_datetime,
    message: `Would send confirmation SMS/email for appointment ${job.appointment_id}`,
  });
}

async function processFreedSlot(raw) {
  const { doctor_id, appointment_datetime: rawDatetime } = JSON.parse(raw);
  const appointment_datetime = normalizeDatetime(rawDatetime);
  const patientIdStr = await popNextWaitlistedPatient(doctor_id, appointment_datetime);

  if (!patientIdStr) {
    return;
  }

  const patient_id = Number(patientIdStr);

  try {
    const slotCheck = validateAppointmentSlot(appointment_datetime);
    if (!slotCheck.valid) {
      throw new Error(slotCheck.message);
    }

    const doctor = await doctorModel.findDoctorById(doctor_id);
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    const patient = await patientModel.findPatientById(patient_id);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const appointment = await appointmentModel.bookAppointment({
      patient_id,
      doctor_id,
      appointment_datetime: slotCheck.data,
      amount_paid: doctor.consultation_fee,
      booked_at: new Date(),
    });

    await enqueueConfirmationJob({
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_id: appointment.id,
      appointment_datetime: appointment.appointment_datetime,
    });

    await appendToAuditLog({
      event: 'waitlist_promotion',
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_datetime: appointment.appointment_datetime,
    });
  } catch (error) {
    await returnPatientToWaitlistFront({
      patient_id,
      doctor_id,
      appointment_datetime,
    });

    await appendToAuditLog({
      event: 'waitlist_promotion_failed',
      patient_id,
      doctor_id,
      appointment_datetime,
      reason: error.message,
    });

    console.error('Waitlist promotion failed, patient returned to queue:', error.message);
  }
}

async function runWorker() {
  await pool.query('SELECT 1');
  console.log('Worker connected to MySQL');
  console.log('Worker listening for freed slots and confirmation jobs...');

  while (true) {
    try {
      const result = await redis.brpop(FREED_SLOTS_QUEUE, CONFIRMATION_QUEUE, 5);

      if (!result) {
        continue;
      }

      const [queue, value] = result;

      if (queue === FREED_SLOTS_QUEUE) {
        await processFreedSlot(value);
      } else if (queue === CONFIRMATION_QUEUE) {
        await processConfirmationJob(value);
      }
    } catch (error) {
      console.error('Worker loop error:', error.message);
    }
  }
}

runWorker().catch((error) => {
  console.error('Worker failed to start:', error.message);
  process.exit(1);
});
