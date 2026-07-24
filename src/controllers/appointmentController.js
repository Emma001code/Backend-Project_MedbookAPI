const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { validateBookAppointmentInput } = require('../validation/appointmentValidator');
const { validatePositiveInteger } = require('../validation/commonValidator');
const { calculateRefund } = require('../validation/refundCalculator');
const { notifyWaitlistSlotFreed } = require('../services/waitlistService');

// --- helpers ---

// Build an error with the right HTTP status code
function createHttpError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

// --- route handlers ---

// Book a new appointment for a patient with a doctor
async function bookAppointment(req, res, next) {
  try {
    // Step 1: check ids and slot time
    const validation = validateBookAppointmentInput(req.body);
    if (!validation.valid) {
      throw createHttpError(422, validation.message);
    }

    const { patient_id, doctor_id, appointment_datetime } = validation.data;

    // Step 2: make sure patient and doctor exist
    const patient = await patientModel.findPatientById(patient_id);
    if (!patient) {
      throw createHttpError(404, 'Patient not found');
    }

    const doctor = await doctorModel.findDoctorById(doctor_id);
    if (!doctor) {
      throw createHttpError(404, 'Doctor not found');
    }

    // Step 3: save booking — fee comes from the doctor record, not the client
    const appointment = await appointmentModel.bookAppointment({
      patient_id,
      doctor_id,
      appointment_datetime,
      amount_paid: doctor.consultation_fee,
      booked_at: new Date(),
    });

    res.status(201).json(appointment);
  } catch (error) {
    // Full day or taken slot — client can join waitlist later
    if (error.statusCode === 409 && error.waitlist_available) {
      return res.status(409).json({
        error: error.message,
        waitlist_available: true,
      });
    }

    next(error);
  }
}

// Cancel an appointment and return the refund amount
async function cancelAppointment(req, res, next) {
  try {
    const idCheck = validatePositiveInteger(req.params.id, 'appointment id');
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const existing = await appointmentModel.findAppointmentById(idCheck.data);
    if (!existing) {
      throw createHttpError(404, 'Appointment not found');
    }

    if (existing.status === 'cancelled') {
      throw createHttpError(409, 'Appointment is already cancelled');
    }

    const cancelledAt = new Date();
    const refundAmount = calculateRefund(
      existing.amount_paid,
      existing.appointment_datetime,
      cancelledAt
    );

    const appointment = await appointmentModel.cancelAppointment(idCheck.data, {
      cancelled_at: cancelledAt,
      refund_amount: refundAmount,
    });

    // Slot is free again — Part E worker will promote waitlist from here
    await notifyWaitlistSlotFreed({
      doctor_id: appointment.doctor_id,
      appointment_datetime: appointment.appointment_datetime,
    });

    res.json({
      message: 'Appointment cancelled',
      refund_amount: refundAmount,
      appointment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  bookAppointment,
  cancelAppointment,
};
