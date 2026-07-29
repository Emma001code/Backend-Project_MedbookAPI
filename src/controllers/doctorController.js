const doctorModel = require('../models/doctorModel');
const reportModel = require('../models/reportModel');
const {
  validateDoctorInput,
  validateDoctorId,
} = require('../validation/doctorValidator');

// --- helpers ---

// Build an error with the right HTTP status code
function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Turn MySQL errors into clear messages for the client
function mapDatabaseError(error) {
  if (error.statusCode) {
    return error;
  }

  if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return createHttpError(400, 'consultation_fee must be zero or greater');
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return createHttpError(
      409,
      'Cannot delete doctor with existing appointments'
    );
  }

  return error;
}

// --- route handlers ---

// List all doctors
async function getAllDoctors(req, res, next) {
  try {
    const doctors = await doctorModel.findAllDoctors();
    res.json(doctors);
  } catch (error) {
    next(error);
  }
}

// Get one doctor by id
async function getDoctorById(req, res, next) {
  try {
    const idCheck = validateDoctorId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const doctor = await doctorModel.findDoctorById(idCheck.data);
    if (!doctor) {
      throw createHttpError(404, 'Doctor not found');
    }

    res.json(doctor);
  } catch (error) {
    next(error);
  }
}

// Create a new doctor
async function createDoctor(req, res, next) {
  try {
    const validation = validateDoctorInput(req.body);
    if (!validation.valid) {
      throw createHttpError(400, validation.message);
    }

    const doctor = await doctorModel.createDoctor(validation.data);
    res.status(201).json(doctor);
  } catch (error) {
    next(mapDatabaseError(error));
  }
}

// Update an existing doctor
async function updateDoctor(req, res, next) {
  try {
    const idCheck = validateDoctorId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const validation = validateDoctorInput(req.body);
    if (!validation.valid) {
      throw createHttpError(400, validation.message);
    }

    const existingDoctor = await doctorModel.findDoctorById(idCheck.data);
    if (!existingDoctor) {
      throw createHttpError(404, 'Doctor not found');
    }

    await doctorModel.updateDoctor(idCheck.data, validation.data);
    const doctor = await doctorModel.findDoctorById(idCheck.data);
    res.json(doctor);
  } catch (error) {
    next(mapDatabaseError(error));
  }
}

// Delete a doctor (blocked if they still have appointments)
async function deleteDoctor(req, res, next) {
  try {
    const idCheck = validateDoctorId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const existingDoctor = await doctorModel.findDoctorById(idCheck.data);
    if (!existingDoctor) {
      throw createHttpError(404, 'Doctor not found');
    }

    await doctorModel.deleteDoctor(idCheck.data);
    res.status(200).send(`Doctor with id ${idCheck.data} deleted successfully`);
  } catch (error) {
    next(mapDatabaseError(error));
  }
}

// GET /doctors/:id/statistics — revenue, upcoming count, next 7 days
async function getDoctorStatistics(req, res, next) {
  try {
    const idCheck = validateDoctorId(req.params.id);
    if (!idCheck.valid) {
      throw createHttpError(400, idCheck.message);
    }

    const doctor = await doctorModel.findDoctorById(idCheck.data);
    if (!doctor) {
      throw createHttpError(404, 'Doctor not found');
    }

    const [revenue_collected, upcoming_appointments, next_7_days] = await Promise.all([
      reportModel.getDoctorRevenueCollected(idCheck.data),
      reportModel.getDoctorUpcomingCount(idCheck.data),
      reportModel.getDoctorNext7Days(idCheck.data),
    ]);

    res.json({
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      revenue_collected,
      upcoming_appointments,
      next_7_days,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorStatistics,
};
