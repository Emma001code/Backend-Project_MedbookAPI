const pool = require('../config/db');
const { MAX_DAILY_APPOINTMENTS } = require('../validation/constants');

// Advanced report SQL lives here — joins and aggregates only

// Net money kept after refunds for this doctor
async function getDoctorRevenueCollected(doctorId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount_paid), 0) - COALESCE(SUM(refund_amount), 0) AS revenue_collected
     FROM appointments
     WHERE doctor_id = ?`,
    [doctorId]
  );
  return Number(rows[0].revenue_collected);
}

// Scheduled appointments still in the future
async function getDoctorUpcomingCount(doctorId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS upcoming_appointments
     FROM appointments
     WHERE doctor_id = ?
       AND status = 'scheduled'
       AND appointment_datetime > NOW()`,
    [doctorId]
  );
  return Number(rows[0].upcoming_appointments);
}

// Next 7 calendar days starting today — count and utilization vs 12-slot cap
async function getDoctorNext7Days(doctorId) {
  const [rows] = await pool.query(
    `WITH RECURSIVE day_series AS (
       SELECT CURDATE() AS day_date, 0 AS day_index
       UNION ALL
       SELECT DATE_ADD(day_date, INTERVAL 1 DAY), day_index + 1
       FROM day_series
       WHERE day_index < 6
     )
     SELECT
       ds.day_date AS date,
       COUNT(a.id) AS appointments,
       ROUND(COUNT(a.id) / ? * 100, 2) AS utilization_percent
     FROM day_series ds
     LEFT JOIN appointments a
       ON a.doctor_id = ?
      AND a.status = 'scheduled'
      AND DATE(a.appointment_datetime) = ds.day_date
     GROUP BY ds.day_date
     ORDER BY ds.day_date`,
    [MAX_DAILY_APPOINTMENTS, doctorId]
  );

  return rows.map((row) => ({
    date: row.date,
    appointments: Number(row.appointments),
    utilization_percent: Number(row.utilization_percent),
  }));
}

// GET /reports/doctors — every doctor, even with zero appointments
async function getDoctorsReport() {
  const [rows] = await pool.query(
    `SELECT
       d.id AS doctor_id,
       d.name AS doctor_name,
       COUNT(a.id) AS total_appointments,
       COALESCE(SUM(a.amount_paid), 0) - COALESCE(SUM(a.refund_amount), 0) AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.id
     GROUP BY d.id, d.name
     ORDER BY d.id`
  );

  return rows.map((row) => ({
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name,
    total_appointments: Number(row.total_appointments),
    revenue_collected: Number(row.revenue_collected),
  }));
}

module.exports = {
  getDoctorRevenueCollected,
  getDoctorUpcomingCount,
  getDoctorNext7Days,
  getDoctorsReport,
};
