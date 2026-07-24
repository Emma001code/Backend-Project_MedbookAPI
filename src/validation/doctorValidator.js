// Doctor validation — runs before any database call

const { validatePositiveInteger } = require('./commonValidator');

// Check name, specialty, room, and fee before create or update
function validateDoctorInput(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body is required' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const specialty = typeof body.specialty === 'string' ? body.specialty.trim() : '';
  const room = typeof body.room === 'string' ? body.room.trim() : '';
  const consultationFee = Number(body.consultation_fee);

  if (!name) {
    errors.push('name is required');
  }

  if (!specialty) {
    errors.push('specialty is required');
  }

  if (!room) {
    errors.push('room is required');
  }

  if (body.consultation_fee === undefined || body.consultation_fee === null || body.consultation_fee === '') {
    errors.push('consultation_fee is required');
  } else if (Number.isNaN(consultationFee) || consultationFee < 0) {
    errors.push('consultation_fee must be zero or greater');
  }

  if (errors.length > 0) {
    return { valid: false, message: errors.join(', ') };
  }

  return {
    valid: true,
    data: {
      name,
      specialty,
      consultation_fee: consultationFee,
      room,
    },
  };
}

// Check the :id in the URL is a valid number
function validateDoctorId(id) {
  return validatePositiveInteger(id, 'doctor id');
}

module.exports = {
  validateDoctorInput,
  validateDoctorId,
};
