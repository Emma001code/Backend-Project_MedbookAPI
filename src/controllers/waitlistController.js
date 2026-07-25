const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { validateBookAppointmentInput } = require('../validation/appointmentValidator');
const { joinWaitlist } = require('../services/waitlistService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// POST /waitlist — join the doctor-day queue when booking is not possible
async function addToWaitlist(req, res, next) {
  try {
    const validation = validateBookAppointmentInput(req.body);
    if (!validation.valid) {
      throw createHttpError(422, validation.message);
    }

    const { patient_id, doctor_id, appointment_datetime } = validation.data;

    const patient = await patientModel.findPatientById(patient_id);
    if (!patient) {
      throw createHttpError(404, 'Patient not found');
    }

    const doctor = await doctorModel.findDoctorById(doctor_id);
    if (!doctor) {
      throw createHttpError(404, 'Doctor not found');
    }

    const eligible = await appointmentModel.isWaitlistEligible(
      doctor_id,
      appointment_datetime
    );

    if (!eligible) {
      throw createHttpError(
        400,
        'This slot is still available — book an appointment instead'
      );
    }

    const { position } = await joinWaitlist({
      patient_id,
      doctor_id,
      appointment_datetime,
    });

    res.status(201).json({
      message: 'Added to waitlist',
      patient_id,
      doctor_id,
      appointment_datetime,
      position,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    next(error);
  }
}

module.exports = {
  addToWaitlist,
};
