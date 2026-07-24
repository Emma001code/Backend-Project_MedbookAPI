const reportModel = require('../models/reportModel');

// GET /reports/doctors — summary row for every doctor
async function getDoctorsReport(req, res, next) {
  try {
    const doctors = await reportModel.getDoctorsReport();
    res.json(doctors);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDoctorsReport,
};
