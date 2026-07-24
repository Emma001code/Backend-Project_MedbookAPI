const pool = require('../config/db');
const { MAX_DAILY_APPOINTMENTS } = require('../validation/constants');

// All appointment SQL lives here — uses ? placeholders only (no SQL injection)

// GET one appointment by id (used later for cancel)
async function findAppointmentById(id) {
  const [rows] = await pool.query(
    `SELECT id, patient_id, doctor_id, appointment_datetime, amount_paid,
            booked_at, status, cancelled_at, refund_amount
     FROM appointments
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

// How many scheduled bookings this doctor already has on this date
async function countScheduledForDoctorOnDate(connection, doctorId, appointmentDatetime) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM appointments
     WHERE doctor_id = ?
       AND status = 'scheduled'
       AND DATE(appointment_datetime) = DATE(?)`,
    [doctorId, appointmentDatetime]
  );
  return Number(rows[0].count);
}

// POST /appointments — insert a booking safely inside a transaction
async function bookAppointment({
  patient_id,
  doctor_id,
  appointment_datetime,
  amount_paid,
  booked_at,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Rule: max 12 scheduled appointments per doctor per day
    const dailyCount = await countScheduledForDoctorOnDate(
      connection,
      doctor_id,
      appointment_datetime
    );

    if (dailyCount >= MAX_DAILY_APPOINTMENTS) {
      const error = new Error('Doctor has reached the daily appointment limit');
      error.statusCode = 409;
      error.waitlist_available = true;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO appointments
        (patient_id, doctor_id, appointment_datetime, amount_paid, booked_at, status)
       VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      [patient_id, doctor_id, appointment_datetime, amount_paid, booked_at]
    );

    await connection.commit();

    const [rows] = await pool.query(
      `SELECT id, patient_id, doctor_id, appointment_datetime, amount_paid,
              booked_at, status, cancelled_at, refund_amount
       FROM appointments
       WHERE id = ?`,
      [result.insertId]
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();

    // Rule: same doctor + time blocked by UNIQUE(doctor_id, active_slot)
    if (error.code === 'ER_DUP_ENTRY') {
      const conflict = new Error('This doctor slot is already booked');
      conflict.statusCode = 409;
      conflict.waitlist_available = true;
      throw conflict;
    }

    throw error;
  } finally {
    connection.release();
  }
}

// DELETE /appointments/:id — cancel and store refund in one transaction
async function cancelAppointment(id, { cancelled_at, refund_amount }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, patient_id, doctor_id, appointment_datetime, amount_paid,
              booked_at, status, cancelled_at, refund_amount
       FROM appointments
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const appointment = rows[0];

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (appointment.status === 'cancelled') {
      const error = new Error('Appointment is already cancelled');
      error.statusCode = 409;
      throw error;
    }

    // Cancel + refund saved together — both succeed or both fail
    await connection.query(
      `UPDATE appointments
       SET status = 'cancelled', cancelled_at = ?, refund_amount = ?
       WHERE id = ?`,
      [cancelled_at, refund_amount, id]
    );

    await connection.commit();

    const [updatedRows] = await pool.query(
      `SELECT id, patient_id, doctor_id, appointment_datetime, amount_paid,
              booked_at, status, cancelled_at, refund_amount
       FROM appointments
       WHERE id = ?`,
      [id]
    );

    return updatedRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  findAppointmentById,
  bookAppointment,
  cancelAppointment,
};
