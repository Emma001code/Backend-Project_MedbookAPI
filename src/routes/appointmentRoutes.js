const express = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

// Maps URLs to controller (base path: /appointments)
router.post('/', appointmentController.bookAppointment);              // book a slot
router.delete('/:id', appointmentController.cancelAppointment);     // cancel + refund

module.exports = router;
