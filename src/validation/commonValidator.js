// Shared checks used by patient, doctor, and appointment validators

// Check that a value is a whole number greater than zero (for URL ids)
function validatePositiveInteger(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return {
      valid: false,
      message: `${fieldName} must be a positive integer`,
    };
  }

  return {
    valid: true,
    data: number,
  };
}

module.exports = {
  validatePositiveInteger,
};
