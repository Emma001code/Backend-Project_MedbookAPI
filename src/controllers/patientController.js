const patientModel = require('../models/patientModel');
const {
  validatePatientInput,
  validatePatientId,
} = require('../validation/patientValidator');

// Build an error with the right HTTP status code
function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Turn MySQL errors into clear API messages
function mapDatabaseError(error) {
  if (error.statusCode) {
    return error;
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return createHttpError(409, 'A patient with this email already exists');
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return createHttpError(
      409,
      'Cannot delete patient with existing appointments'
    );
  }

  return error;
}

async function getAllPatients(req, res, next) {
  try {
    const patients = await patientModel.findAllPatients();
    res.json(patients);
  } catch (error) {
    next(error);
  }
}

async function getPatientById(req, res, next) {
  try {
    const idCheck = validatePatientId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const patient = await patientModel.findPatientById(idCheck.data);
    if (!patient) {
      throw createHttpError(404, 'Patient not found');
    }

    res.json(patient);
  } catch (error) {
    next(error);
  }
}

async function createPatient(req, res, next) {
  try {
    const validation = validatePatientInput(req.body);
    if (!validation.valid) {
      throw createHttpError(400, validation.message);
    }

    const patient = await patientModel.createPatient(validation.data);
    res.status(201).json(patient);
  } catch (error) {
    next(mapDatabaseError(error));
  }
}

async function updatePatient(req, res, next) {
  try {
    const idCheck = validatePatientId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const validation = validatePatientInput(req.body);
    if (!validation.valid) {
      throw createHttpError(400, validation.message);
    }

    const existingPatient = await patientModel.findPatientById(idCheck.data);
    if (!existingPatient) {
      throw createHttpError(404, 'Patient not found');
    }

    await patientModel.updatePatient(idCheck.data, validation.data);
    const patient = await patientModel.findPatientById(idCheck.data);
    res.json(patient);
  } catch (error) {
    next(mapDatabaseError(error));
  }
}

async function deletePatient(req, res, next) {
  try {
    const idCheck = validatePatientId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const existingPatient = await patientModel.findPatientById(idCheck.data);
    if (!existingPatient) {
      throw createHttpError(404, 'Patient not found');
    }

    await patientModel.deletePatient(idCheck.data);
    res.status(200).send(`Patient with id ${idCheck.data} deleted successfully`);
  } catch (error) {
    next(mapDatabaseError(error));
  }
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
