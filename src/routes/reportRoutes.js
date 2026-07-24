const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Admin reports (advanced SQL)
router.get('/doctors', reportController.getDoctorsReport);
router.get('/busy-days', reportController.getBusyDaysReport);

module.exports = router;
