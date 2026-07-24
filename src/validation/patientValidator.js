const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePatientInput(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body is required' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!name) {
    errors.push('name is required');
  }

  if (!email) {
    errors.push('email is required');
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('email must be valid');
  }

  if (!phone) {
    errors.push('phone is required');
  }

  if (errors.length > 0) {
    return { valid: false, message: errors.join(', ') };
  }

  return {
    valid: true,
    data: { name, email, phone },
  };
}

function validatePatientId(id) {
  const patientId = Number(id);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return { valid: false, message: 'Invalid patient id' };
  }

  return { valid: true, data: patientId };
}

module.exports = {
  validatePatientInput,
  validatePatientId,
};
