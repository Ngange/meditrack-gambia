// Fills a development database with test accounts and sample records.
//
//   node scripts/seed-test-data.js            (the API must be running: npm run dev)
//   API_URL=http://localhost:4000 node scripts/seed-test-data.js
//
// Creates:
//   - a VERIFIED doctor, and a second doctor left PENDING (to try the admin approval screen)
//   - 3 sample patients with different clinical histories (see seed-data.js), each with 10 allergies, 10 conditions, 10 medications, 10 visits,
//     10 lab results and 10 documents (3 synthetic X-ray images + 7 sample PDFs)
//   - a doctor-access PIN for every patient, so the doctor can open them with code + PIN
//
// Safe to run again: accounts that exist are signed in to, records already present are skipped,
// and a category that already has 10 or more records is left alone. All data is made up.
// Needs Node 18+ (built-in fetch). Everything goes through the real API, so it is validated,
// encrypted and stored exactly like data typed into the apps.
const fs = require('fs');
const path = require('path');
const DATA = require('./seed-data');

const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const ASSETS = path.join(__dirname, 'seed-assets');
const PASSWORD = 'Test1234!';

const DOCTORS = [
  { email: 'doctor@meditrack.test', firstName: 'Lamin', lastName: 'Touray', licenceNumber: 'GMC-TEST-001',
    facilityName: 'Edward Francis Small Teaching Hospital', specialty: 'General medicine', verify: true },
  { email: 'doctor.pending@meditrack.test', firstName: 'Isatou', lastName: 'Bojang', licenceNumber: 'GMC-TEST-002',
    facilityName: 'Bundung Maternal and Child Health Hospital', specialty: 'Paediatrics', verify: false },
];

const PATIENTS = [
  { email: 'fatou.ceesay@meditrack.test', firstName: 'Fatou', lastName: 'Ceesay', dateOfBirth: '1995-05-12', gender: 'Female', bloodGroup: 'O+',
    emergencyContactName: 'Binta Ceesay', emergencyContactPhone: '+220 7001122', pin: '482915', data: DATA.fatou },
  { email: 'modou.jallow@meditrack.test', firstName: 'Modou', lastName: 'Jallow', dateOfBirth: '1981-11-03', gender: 'Male', bloodGroup: 'A+',
    emergencyContactName: 'Aji Jallow', emergencyContactPhone: '+220 3345566', pin: '736204', data: DATA.modou },
  { email: 'awa.sanneh@meditrack.test', firstName: 'Awa', lastName: 'Sanneh', dateOfBirth: '2001-02-27', gender: 'Female', bloodGroup: 'B+',
    emergencyContactName: 'Lamin Sanneh', emergencyContactPhone: '+220 9887766', pin: '591378', data: DATA.awa },
];

// ---------- helpers ----------
const ymd = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
const MIME = { png: 'image/png', pdf: 'application/pdf', jpg: 'image/jpeg' };

async function call(method, route, token, body) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + route, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function ensureAccount(kind, details) {
  const reg = await call('POST', kind === 'doctor' ? '/auth/register-provider' : '/auth/register', null, details);
  if (reg.status === 201) return { token: reg.data.token, created: true };
  if (reg.status !== 409) throw new Error(`Could not register ${details.email}: ${reg.status} ${reg.data.error || ''}`);
  const login = await call('POST', '/auth/login', null, { email: details.email, password: PASSWORD });
  if (login.status !== 200) throw new Error(`${details.email} already exists but the password is not the test password (${login.data.error || login.status}).`);
  return { token: login.data.token, created: false };
}

// Posts every item; 409 means "already there". Returns how many were added.
async function addAll(route, token, items) {
  let added = 0;
  for (const body of items) {
    const r = await call('POST', route, token, body);
    if (r.status === 201) added++;
    else if (r.status !== 409) throw new Error(`${route}: ${r.status} ${r.data.error || ''} for ${JSON.stringify(body).slice(0, 80)}`);
  }
  return added;
}

async function countOf(route, token, key) {
  const r = await call('GET', route, token);
  return (r.data[key] || []).length;
}

async function seedPatient(p) {
  const { token, created } = await ensureAccount('patient', { email: p.email, password: PASSWORD, firstName: p.firstName, lastName: p.lastName });
  const { email, pin, data, ...profile } = p;
  await call('PUT', '/patients/me', token, profile);
  const out = {};

  // Visits go first, so the records that came out of a visit can be linked to it. A record is
  // linked to the visit nearest to its date (within 10 days); the rest stay standalone, as in real life.
  const visitPlan = ['visits', '/records/visits', 'visits', () => data.visits.map(([facilityName, reason, diagnosis, treatment, notes, ago]) => ({ facilityName, reason, diagnosis, treatment, notes, visitDate: ymd(ago) }))];
  const have0 = await countOf(visitPlan[1], token, 'visits');
  out.visits = have0 >= 10 ? `${have0} (kept)` : `${have0 + (await addAll(visitPlan[1], token, visitPlan[3]()))}`;
  const idByDate = new Map(((await call('GET', '/records/visits', token)).data.visits || []).map((v) => [v.visit_date, v.visit_id]));
  const visitFor = (ago) => {
    let best = null;
    for (const [vAgo] of data.visits.map((v) => [v[5]])) {
      const gap = Math.abs(vAgo - ago);
      if (gap <= 10 && (!best || gap < best.gap)) best = { gap, id: idByDate.get(ymd(vAgo)) };
    }
    return best ? best.id : undefined;
  };
  let linked = 0;
  const link = (ago) => { const id = visitFor(ago); if (id) linked++; return id; };

  const plan = [
    ['allergies', '/records/allergies', 'allergies', () => data.allergies.map(([allergen, reaction, severity, status]) => ({ allergen, reaction, severity, status }))],
    ['conditions', '/records/conditions', 'conditions', () => data.conditions.map(([conditionName, status, notes, ago]) => ({ conditionName, status, notes, diagnosisDate: ymd(ago), visitId: link(ago) }))],
    ['medications', '/records/medications', 'medications', () => data.medications.map(([medicationName, dosage, frequency, status, started, course]) => ({
      medicationName, dosage, frequency, status, startDate: ymd(started), visitId: link(started),
      endDate: course ? ymd(started - course) : undefined,
      reminderTimes: status === 'active' && course == null && /daily/i.test(frequency) ? ['08:00'] : undefined }))],
    ['lab results', '/records/lab-results', 'lab_results', () => data.labs.map(([testName, result, referenceRange, ago, facilityName]) => ({ testName, result, referenceRange, testDate: ymd(ago), facilityName, visitId: link(ago) }))],
  ];
  for (const [label, route, key, build] of plan) {
    const have = await countOf(route, token, key);
    out[label] = have >= 10 ? `${have} (kept)` : `${have + (await addAll(route, token, build()))}`;
  }

  const haveDocs = await countOf('/records/documents', token, 'documents');
  if (haveDocs >= 10) out.documents = `${haveDocs} (kept)`;
  else {
    let added = 0;
    for (const [file, documentType, description, fileName, ago] of data.docs) {
      const ext = file.split('.').pop();
      const form = new FormData();
      form.append('documentType', documentType);
      form.append('description', description);
      form.append('documentDate', ymd(ago));
      form.append('fileName', fileName);
      const vid = link(ago); if (vid) form.append('visitId', vid);
      form.append('file', new Blob([fs.readFileSync(path.join(ASSETS, file))], { type: MIME[ext] }), fileName);
      const r = await call('POST', '/records/documents', token, form);
      if (r.status !== 201) throw new Error(`document ${file}: ${r.status} ${r.data.error || ''}`);
      added++;
    }
    out.documents = String(haveDocs + added);
  }

  const pinRes = await call('PUT', '/patients/me/pin', token, { pin, password: PASSWORD });
  if (pinRes.status !== 200) throw new Error(`PIN for ${email}: ${pinRes.status} ${pinRes.data.error || ''}`);
  out.linked = linked;
  return { email, created, code: pinRes.data.access.patient_code, pin, out };
}

async function verifyDoctor(licenceNumber) {
  const pool = require('../src/config/db');
  try {
    await pool.query(
      `UPDATE provider_profile SET verification_status = 'verified', verification_note = 'Test account', verified_at = now()
        WHERE upper(licence_number) = upper($1)`, [licenceNumber]);
  } finally { await pool.end?.(); }
}

(async () => {
  console.log(`Seeding through ${API}\n`);
  const health = await fetch(API + '/auth/login', { method: 'POST' }).catch(() => null);
  if (!health) { console.error(`Cannot reach ${API}. Start the backend first (npm run dev in backend/).`); process.exit(1); }

  for (const d of DOCTORS) {
    const { verify, ...details } = d;
    const acct = await ensureAccount('doctor', { ...details, password: PASSWORD });
    let verified = false;
    if (verify) {
      try { await verifyDoctor(d.licenceNumber); verified = true; }
      catch (e) { console.log(`  (could not verify ${d.email} directly: ${e.message}. Verify it in the admin screen instead.)`); }
    }
    console.log(`Doctor ${acct.created ? 'created' : 'already existed'}: ${d.email}  licence ${d.licenceNumber}  ${verified ? 'VERIFIED' : 'pending (verify it as admin)'}`);
  }
  console.log('');

  const results = [];
  for (const p of PATIENTS) {
    const r = await seedPatient(p);
    results.push(r);
    const o = r.out;
    console.log(`Patient ${r.created ? 'created' : 'already existed'}: ${r.email}`);
    console.log(`  allergies ${o.allergies}, conditions ${o.conditions}, medications ${o.medications}, visits ${o.visits}, lab results ${o['lab results']}, documents ${o.documents}; ${o.linked} records linked to a visit`);
  }

  console.log(`\nAll accounts use the password  ${PASSWORD}`);
  console.log('\nDoctor sign-in:  doctor@meditrack.test');
  console.log('Patients (open them as the doctor with code + PIN):');
  for (const r of results) console.log(`  ${r.email}   code ${r.code}   PIN ${r.pin}`);
})().catch((err) => { console.error('\nSeeding stopped: ' + err.message); process.exit(1); });
