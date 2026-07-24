const pool = require('../config/db');

// All patient SQL lives here — uses ? placeholders only

async function findAllPatients() {
  const [rows] = await pool.query(
    'SELECT id, name, email, phone FROM patients ORDER BY id'
  );
  return rows;
}

async function findPatientById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, phone FROM patients WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function createPatient({ name, email, phone }) {
  const [result] = await pool.query(
    'INSERT INTO patients (name, email, phone) VALUES (?, ?, ?)',
    [name, email, phone]
  );
  return findPatientById(result.insertId);
}

async function updatePatient(id, { name, email, phone }) {
  const [result] = await pool.query(
    'UPDATE patients SET name = ?, email = ?, phone = ? WHERE id = ?',
    [name, email, phone, id]
  );
  return result.affectedRows;
}

async function deletePatient(id) {
  const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows;
}


  exports.findAllPatients = findAllPatients;
  exports.findPatientById = findPatientById;
  exports.createPatient = createPatient;
  exports.updatePatient = updatePatient;
  exports.deletePatient = deletePatient;

