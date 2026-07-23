-- Sample data for testing MediBook
-- Run this after schema.sql (database must already exist)

USE medibook;

-- Clear tables and reset IDs so patient_id 1,2,3 always match
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE appointments;
TRUNCATE TABLE doctors;
TRUNCATE TABLE patients;
SET FOREIGN_KEY_CHECKS = 1;

-- Patients
INSERT INTO patients (id, name, email, phone) VALUES
  (1, 'Alice', 'alice@mail.com', '0244-100-001'),
  (2, 'Bonae', 'bonae@mail.com', '0555-200-002'),
  (3, 'Sonia', 'sonia@mail.com', '0201-300-003');

-- Doctors (Dr. Adebayo will have no appointments)
INSERT INTO doctors (id, name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Emmanuel', 'Dermatology', 150.00, 'R-12'),
  (2, 'Dr. Moses', 'Paediatrics', 100.00, 'R-03'),
  (3, 'Dr. Adebayo', 'Cardiology', 200.00, 'R-07');

-- Dr. Emmanuel: 11 appointments on one day (near the 12-slot daily cap)
INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, amount_paid, booked_at, status) VALUES
  (1, 1, '2026-08-10 09:00:00', 150.00, '2026-07-01 10:00:00', 'scheduled'),
  (2, 1, '2026-08-10 09:30:00', 150.00, '2026-07-01 11:00:00', 'scheduled'),
  (3, 1, '2026-08-10 10:00:00', 150.00, '2026-07-02 09:00:00', 'scheduled'),
  (1, 1, '2026-08-10 10:30:00', 150.00, '2026-07-02 10:00:00', 'scheduled'),
  (2, 1, '2026-08-10 11:00:00', 150.00, '2026-07-03 09:00:00', 'scheduled'),
  (3, 1, '2026-08-10 11:30:00', 150.00, '2026-07-03 10:00:00', 'scheduled'),
  (1, 1, '2026-08-10 12:00:00', 150.00, '2026-07-04 09:00:00', 'scheduled'),
  (2, 1, '2026-08-10 12:30:00', 150.00, '2026-07-04 10:00:00', 'scheduled'),
  (3, 1, '2026-08-10 13:00:00', 150.00, '2026-07-05 09:00:00', 'scheduled'),
  (1, 1, '2026-08-10 13:30:00', 150.00, '2026-07-05 10:00:00', 'scheduled'),
  (2, 1, '2026-08-10 14:00:00', 150.00, '2026-07-06 09:00:00', 'scheduled');

-- Dr. Moses: a few appointments on other days
INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, amount_paid, booked_at, status) VALUES
  (3, 2, '2026-08-15 10:00:00', 100.00, '2026-07-07 09:00:00', 'scheduled'),
  (1, 2, '2026-08-15 10:30:00', 100.00, '2026-07-07 10:00:00', 'scheduled'),
  (2, 2, '2026-08-20 14:00:00', 100.00, '2026-07-08 09:00:00', 'scheduled');

-- Dr. Adebayo: no appointments (required for reports testing)
