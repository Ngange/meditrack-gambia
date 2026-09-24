# MediTrack Gambia

A secure, patient-controlled personal health record system built as a final-year Computer Science project at the University of The Gambia (UTG).

MediTrack Gambia lets patients store their medical history in one place, share selected records with anyone via a secure time-limited link (no recipient account required), and access their own records offline on mobile. An admin console provides account and audit oversight without direct access to medical record content.


## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native (offline-capable, local SQLite cache) |
| Web app | React (online-only, no local cache) |
| Backend API | Node.js + Express |
| Database | PostgreSQL |
| Authentication | JWT, Argon2/bcrypt password hashing |
| Encryption | AES-256 field-level encryption at rest, master key via environment variable |

## Repository Structure

```
meditrack-gambia/
├── backend/          Node.js + Express API
├── mobile/           React Native patient app (offline-capable)
├── web/              React web app — patient + admin (online-only)
├── .gitignore
└── README.md
```

## Core Features

- Patient registration, login, and health profile (blood group, allergies, existing conditions, emergency contact)
- Medical record management: diagnoses, visits, medications, lab results, documents
- Automatic chronological medical timeline (`patient_timeline` view — computed, not stored)
- Medication reminders, computed from active medications' frequency and date range
- Patient-controlled, tokenless, time-limited record sharing (no account needed for the recipient)
- Offline access to a patient's own records — mobile only; the web app requires an active connection
- Audit trail of all access to shared records
- Admin console for account management and audit/share activity review (no access to medical record content)

Full scope, and what is explicitly out of scope, is documented in `proposal` and `feature-checklist`.


## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, MEDITRACK_MASTER_KEY
psql -f ../docs/schema/meditrack_schema.sql $DATABASE_URL
npm run dev
```

### Web
```bash
cd web
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx react-native run-android   # or run-ios
```

## Environment Variables

The backend requires a `MEDITRACK_MASTER_KEY` — a 256-bit random value used to wrap each patient's per-patient encryption key. Generate one with:

```bash
openssl rand -base64 32
```

See `backend/.env.example` for the full list of required variables.
