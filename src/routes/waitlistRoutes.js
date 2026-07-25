const express = require('express');
const waitlistController = require('../controllers/waitlistController');

const router = express.Router();

router.post('/', waitlistController.addToWaitlist);

module.exports = router;
