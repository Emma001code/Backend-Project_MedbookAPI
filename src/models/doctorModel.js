const pool = require('../config/db');

// All doctor SQL lives here — uses ? placeholders only (no SQL injection)

// GET /doctors — list every doctor
async function findAllDoctors() {
  const [rows] = await pool.query(
    'SELECT id, name, specialty, consultation_fee, room FROM doctors ORDER BY id'
  );
  return rows;
}

// GET /doctors/:id — one doctor or null if missing
async function findDoctorById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, specialty, consultation_fee, room FROM doctors WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

// POST /doctors — insert a new doctor
async function createDoctor({ name, specialty, consultation_fee, room }) {
  const [result] = await pool.query(
    'INSERT INTO doctors (name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [name, specialty, consultation_fee, room]
  );
  return findDoctorById(result.insertId);
}

// PUT /doctors/:id — update an existing doctor
async function updateDoctor(id, { name, specialty, consultation_fee, room }) {
  const [result] = await pool.query(
    'UPDATE doctors SET name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE id = ?',
    [name, specialty, consultation_fee, room, id]
  );
  return result.affectedRows;
}

// DELETE /doctors/:id — remove a doctor
async function deleteDoctor(id) {
  const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  findAllDoctors,
  findDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};
