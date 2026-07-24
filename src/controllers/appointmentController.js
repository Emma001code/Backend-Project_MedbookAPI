const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { validateBookAppointmentInput } = require('../validation/appointmentValidator');

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

module.exports = {
  bookAppointment,
};
