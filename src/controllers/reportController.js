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

// GET /reports/busy-days — doctor-days above 80% capacity
async function getBusyDaysReport(req, res, next) {
  try {
    const busyDays = await reportModel.getBusyDaysReport();
    res.json(busyDays);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDoctorsReport,
  getBusyDaysReport,
};
