const express = require('express');
const pool = require('../config/db');
const patientRoutes = require('./patientRoutes');

const router = express.Router();

router.use('/patients', patientRoutes);

router.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
