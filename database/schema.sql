-- MediBook database setup
-- This file creates the 3 tables from our ER diagram

-- Start fresh (only for local dev)
DROP DATABASE IF EXISTS medibook;

CREATE DATABASE medibook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medibook;

-- People who book appointments
CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  UNIQUE KEY uk_patients_email (email) -- one email per patient
);

-- Doctors at the clinic
CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  consultation_fee DECIMAL(10, 2) NOT NULL,
  room VARCHAR(20) NOT NULL,
  CONSTRAINT chk_doctors_consultation_fee CHECK (consultation_fee >= 0) -- fee cannot be negative
);

-- Bookings linking a patient and a doctor
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_datetime DATETIME NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  booked_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  cancelled_at DATETIME NULL,
  refund_amount DECIMAL(10, 2) NULL,
  -- Filled only while scheduled; empty when cancelled so the slot can be booked again
  active_slot DATETIME AS (
    CASE
      WHEN status = 'scheduled' THEN appointment_datetime
      ELSE NULL
    END
  ) STORED,
  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_appointments_status
    CHECK (status IN ('scheduled', 'cancelled')),
  UNIQUE KEY uk_doctor_active_slot (doctor_id, active_slot) -- no double booking same doctor + time
);
