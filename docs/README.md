# MediBook — Setup & Design Notes

How to run the project locally and the main design choices for Parts C, D, and E. The assignment Instructions is in [README.md](../README.md).

**Stack:** Node.js, Express, MySQL (`mysql2`), Redis, Jest

---

## What is in this repo

| Item | Location |
|------|----------|
| ER diagram | `schema-diagram.png` |
| Database DDL + seed data | `database/schema.sql`, `database/seed.sql` |
| API + worker | `src/` |
| Unit tests | `tests/` |
| Locale files (Part G) | `locales/english.json`, `locales/french.json` |
| Environment template | `.env.example` |
| Docs + demo video | `docs/` |

---

## Prerequisites

Before the app starts:

1. **MySQL 8+** (required for `npm start`)
2. **Node.js 18+**
3. **Redis** (required for waitlist promotion and confirmation jobs; use Memurai on Windows or any Redis-compatible server)

---

## Setup

### 1. Create the database

From the project root, load the schema and seed data into MySQL:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p medibook < database/seed.sql
```

`schema.sql` drops and recreates the `medibook` database, so only run it on a dev machine.

### 2. Configure environment variables

Copy the example file and fill in your values.

**Mac / Linux / Git Bash:**

```bash
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Open `.env` and set `DB_PASSWORD` to your MySQL password. The other defaults (`DB_NAME=medibook`, `PORT=3000`, Redis on `localhost:6379`) are fine for local development.

Variables (see `.env.example` for the full list):

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection |

Do not commit `.env`. Secrets in git cost marks.

### 3. Install dependencies and start

See [Running the app](#running-the-app) below. Run `npm install` once, then `npm start`.

---

## Running the app

From the project root:

```bash
npm install
npm start
```

The server listens on `http://localhost:3000` (or whatever you set in `PORT`). If MySQL is configured correctly, you should see `Connected to MySQL` in the terminal.

Confirm it is up:

```bash
curl http://localhost:3000/health
```

Or open `http://localhost:3000/health` in a browser or in postman. You should get `{"status":"ok","database":"connected"}`.

**Waitlist and confirmations** need Redis running plus a second terminal:

```bash
npm run worker
```

Run tests (no MySQL or Redis required):

```bash
npm test
```

When booking appointments, use a **future** datetime on a 30-minute boundary within working hours (for example `2026-09-15 10:00:00`).

---

## API overview

All routes are mounted at the root. SQL lives only in `src/models/`.

### Patients

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/patients` | List all |
| `GET` | `/patients/:id` | One patient |
| `POST` | `/patients` | Create |
| `PUT` | `/patients/:id` | Update |
| `DELETE` | `/patients/:id` | Delete |

### Doctors

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/doctors` | List all |
| `GET` | `/doctors/:id` | One doctor |
| `GET` | `/doctors/:id/statistics` | Revenue, upcoming count, 7-day breakdown, utilization |
| `POST` | `/doctors` | Create |
| `PUT` | `/doctors/:id` | Update |
| `DELETE` | `/doctors/:id` | Delete |

### Appointments

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/appointments` | Book a slot |
| `DELETE` | `/appointments/:id` | Cancel + refund |

**Book request body:**

```json
{
  "patient_id": 1,
  "doctor_id": 1,
  "appointment_datetime": "2026-08-20 10:00:00",
  "join_waitlist_if_full": true
}
```

- `amount_paid` comes from the doctor's `consultation_fee`, not from the client.
- If the slot or doctor-day is full and `join_waitlist_if_full` is `true`, the patient joins the waitlist and gets `201` with `{ "status": "waitlisted", "position": ... }`.
- If the slot is full and `join_waitlist_if_full` is `false` or omitted, the API returns `409` with `waitlist_available: true` so the client can ask the patient before joining.

### Reports

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/reports/doctors` | Every doctor, including those with zero appointments |
| `GET` | `/reports/busy-days` | Doctor-days above 80% of the 12-slot cap |

### Feedback (Part G)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/feedback` | English feedback form |
| `GET` | `/feedback?lang=fr` | French version |

Unsupported `lang` values fall back to English.

---

## Design justifications

These are the main decisions for Parts C, D, and E.

### Part C: API and business rules

**REST layout.** I split routes by resource (`/patients`, `/doctors`, `/appointments`, `/reports`) and kept appointment booking/cancellation on `/appointments` instead of a generic CRUD table. That matches how the clinic actually uses the system: patients and doctors are managed separately, but an appointment is really a "book" or "cancel" action, not a normal update.

**Validation before the database.** Slot rules (future only, 09:00 to 17:00, 30-minute boundaries, last slot at 16:30) live in `slotValidator.js`. Controllers validate first and return `422` for bad input. The model layer handles rules that need database state (daily cap, double booking).

**Stopping double bookings.** Two things work together:
- A generated `active_slot` column plus `UNIQUE(doctor_id, active_slot)` blocks two scheduled rows for the same doctor and time.
- Booking runs inside a transaction and maps MySQL duplicate-key errors to `409`.

That way even two requests at the same instant should not both succeed.

**Refunds.** The server calculates the refund in `refundCalculator.js`. The client never sends an amount.

| Notice before appointment | Refund |
|---------------------------|--------|
| 48 hours or more | 100% |
| 24 hours up to (but not including) 48 hours | 50% |
| Less than 24 hours | 0% |

At exactly 24 hours notice you get 50%. At exactly 48 hours you get 100%.

Cancellation updates `status`, `cancelled_at`, and `refund_amount` in one transaction. The row stays in the table for history, but `active_slot` becomes `NULL`, so the time slot can be booked again.

**Reports in SQL.** Doctor statistics and both admin reports are computed in the model layer with joins and aggregates. JavaScript mostly just passes results through.

### Part D: Audit log

Successful bookings and cancellations append one JSON line to `logs/audit.log` using `fs/promises` (`appendFile`, `mkdir`). The `logs/` folder is created on first write.

Logging is fire-and-forget (`void appendToAuditLog(...)`). If the disk write fails, the error is logged to the console but the HTTP response still succeeds. No `*Sync` calls in request handlers.

The worker also writes to the same file for confirmations and waitlist events, but Part D only required booking and cancellation from the API path.

### Part E: Waitlist and worker

**Why a separate worker.** The web server should answer HTTP quickly. Popping a waitlist entry, re-booking into MySQL, and sending a confirmation job can take time, so that work runs in `src/worker.js` with its own Redis connection.

**Queue design.** I use one FIFO Redis list per doctor-day (`medibook:waitlist:doctor:{id}:date:{YYYY-MM-DD}`). Each queue entry is a JSON string with `patient_id`, `doctor_id`, and the requested `appointment_datetime`. When someone cancels, a job goes on `medibook:freed-slots` with that doctor and freed slot time. The worker pops the first patient from **that doctor's** queue for **that day** and books them into the freed slot.

I did not add a separate `POST /waitlist` endpoint. Waitlist join happens inside `POST /appointments` when the slot is full and the client sends `join_waitlist_if_full: true`. That keeps booking and waitlist as one user action instead of two API calls.

**If promotion fails.** The patient is pushed back to the front of the queue with `LPUSH`, and a `waitlist_promotion_failed` line goes to the audit log. They should not disappear from both Redis and MySQL.

**Confirmations.** Every successful booking enqueues a job on `medibook:confirmation-jobs`. The worker writes a fake SMS/email message to the audit log. No real provider is wired up.

**Timezone note.** MySQL returns datetimes as strings (`dateStrings: true` in the DB config), and waitlist keys use local date parts so doctor-day queues match clinic time, not UTC drift.

---

## Project structure

```
├── database/
│   ├── schema.sql
│   └── seed.sql
├── docs/                  setup notes + demo video
├── locales/
├── logs/                  created at runtime
├── schema-diagram.png
├── src/
│   ├── config/            db, redis, env
│   ├── controllers/
│   ├── middleware/
│   ├── models/            all SQL queries
│   ├── routes/
│   ├── services/          audit log, waitlist, locales
│   ├── validation/        pure functions (also unit-tested)
│   ├── worker.js          separate process
│   ├── app.js
│   └── server.js
└── tests/
```

---

## Demo video

- **Video:** *()*
