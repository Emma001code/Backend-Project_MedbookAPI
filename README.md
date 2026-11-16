# MediBook API

A REST backend for a community clinic: book and cancel doctor appointments, enforce slot rules, run admin reports, and promote waitlisted patients through a Redis worker.

Setup and design notes: [`docs/README.md`](./docs/README.md).

## Features

- Patient and doctor CRUD with validation and consistent HTTP status codes
- Appointment booking with working-hours checks (09:00–17:00), 30-minute slots, and a 12-per-day doctor cap
- Double-booking protection via a unique active slot constraint plus transactional booking
- Cancellation with server-side refund tiers (100% / 50% / 0%) based on notice
- Redis waitlist + separate worker that promotes patients when a slot frees up
- Confirmation jobs written to the audit log (no real SMS/email provider)
- Async audit log for bookings and cancellations (`logs/audit.log`)
- SQL-backed doctor stats, doctors report, and busy-days report
- Feedback page with English/French i18n (`GET /feedback`)
- Jest unit tests for refund and slot validation (no live DB/Redis required)

## Tech stack

Node.js · Express · MySQL (`mysql2`, parameterized queries) · Redis (`ioredis`) · Jest

## Quick start

Full setup (MySQL, Redis, env vars, API details) is in **[docs/README.md](./docs/README.md)**.

```bash
# 1. Load schema + seed
mysql -u root -p < database/schema.sql
mysql -u root -p medibook < database/seed.sql

# 2. Configure env
cp .env.example .env   # Windows: Copy-Item .env.example .env
# set DB_PASSWORD in .env

# 3. Install and run the API
npm install
npm start

# 4. Optional: waitlist + confirmation worker (needs Redis)
npm run worker

# 5. Tests (no MySQL/Redis)
npm test
```

Health check: `GET http://localhost:3000/health`

## API highlights

| Area | Endpoints |
|------|-----------|
| Patients | `GET/POST /patients`, `GET/PUT/DELETE /patients/:id` |
| Doctors | `GET/POST /doctors`, `GET/PUT/DELETE /doctors/:id`, `GET /doctors/:id/statistics` |
| Appointments | `POST /appointments` (book or waitlist), `DELETE /appointments/:id` (cancel + refund) |
| Reports | `GET /reports/doctors`, `GET /reports/busy-days` |
| Feedback | `GET /feedback`, `GET /feedback?lang=fr` |
| Health | `GET /health` |

## Architecture

```
routes → controllers → models
```

- All SQL lives in `src/models/` (parameterized via `mysql2`)
- Controllers own validation and business flow; they never talk to the DB directly
- `src/worker.js` is a separate process for waitlist promotion and confirmation jobs
- Pure helpers under `src/validation/` are covered by unit tests

Schema diagram: [`schema-diagram.png`](./schema-diagram.png)

## Demo

- [MediBook project demo video](https://youtu.be/z_ai67KqA9k) (also linked from [`docs/Demovideo.md`](./docs/Demovideo.md))
