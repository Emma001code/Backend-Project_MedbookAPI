const { validatePositiveInteger } = require('./commonValidator');
const { validateAppointmentSlot } = require('./slotValidator');

// Booking validation — patient id, doctor id, and slot time (ids only, no names)
function validateBookAppointmentInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body is required' };
  }

  const patientCheck = validatePositiveInteger(body.patient_id, 'patient id');
  if (!patientCheck.valid) {
    return patientCheck;
  }

  const doctorCheck = validatePositiveInteger(body.doctor_id, 'doctor id');
  if (!doctorCheck.valid) {
    return doctorCheck;
  }

  const slotCheck = validateAppointmentSlot(body.appointment_datetime);
  if (!slotCheck.valid) {
    return slotCheck;
  }

  return {
    valid: true,
    data: {
      patient_id: patientCheck.data,
      doctor_id: doctorCheck.data,
      appointment_datetime: slotCheck.data,
    },
  };
}

module.exports = {
  validateBookAppointmentInput,
};
