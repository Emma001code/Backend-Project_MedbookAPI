const express = require('express');
const doctorController = require('../controllers/doctorController');

const router = express.Router();

// Maps URLs to controller functions (base path: /doctors)
router.get('/', doctorController.getAllDoctors);           // list all
router.get('/:id', doctorController.getDoctorById);        // get one
router.post('/', doctorController.createDoctor);           // create
router.put('/:id', doctorController.updateDoctor);         // update
router.delete('/:id', doctorController.deleteDoctor);      // delete

module.exports = router;
