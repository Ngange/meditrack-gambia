// Builds the patient's timeline from their records: one list, newest first.
//  - a visit carries everything linked to it (diagnoses, medicines, tests, documents);
//  - records with no visit stand on their own, at their own date;
//  - lab results with no visit, from the same day and lab, are shown as one "lab panel".
// Allergies are not here: they have no date of their own.
// Pure function (no database), so it is easy to test.

const KIND_ORDER = { visit: 0, lab_panel: 1, condition: 2, medication: 3, document: 4 };

// "YYYY-MM-DD" from a date string or a Date.
const dayOf = (v) => (typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10));

function groupByVisit(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.visit_id) continue;
    if (!map.has(row.visit_id)) map.set(row.visit_id, []);
    map.get(row.visit_id).push(row);
  }
  return map;
}

function buildTimeline({ visits, conditions, medications, labResults, documents }) {
  const events = [];
  const known = new Set(visits.map((v) => v.visit_id));
  const linked = (row) => row.visit_id && known.has(row.visit_id);

  const c = groupByVisit(conditions);
  const m = groupByVisit(medications);
  const l = groupByVisit(labResults);
  const d = groupByVisit(documents);

  for (const v of visits) {
    events.push({
      kind: 'visit',
      key: `visit:${v.visit_id}`,
      date: v.visit_date,
      visit: v,
      conditions: c.get(v.visit_id) ?? [],
      medications: m.get(v.visit_id) ?? [],
      lab_results: l.get(v.visit_id) ?? [],
      documents: d.get(v.visit_id) ?? [],
    });
  }

  for (const row of conditions) {
    if (linked(row)) continue;
    events.push({ kind: 'condition', key: `condition:${row.condition_id}`, date: row.diagnosis_date || dayOf(row.created_at), condition: row });
  }
  for (const row of medications) {
    if (linked(row)) continue;
    events.push({ kind: 'medication', key: `medication:${row.medication_id}`, date: row.start_date, medication: row });
  }
  for (const row of documents) {
    if (linked(row)) continue;
    events.push({ kind: 'document', key: `document:${row.document_id}`, date: row.document_date || dayOf(row.upload_date), document: row });
  }

  const panels = new Map();
  for (const row of labResults) {
    if (linked(row)) continue;
    const key = `${row.test_date}|${row.facility_name ?? ''}`;
    if (!panels.has(key)) {
      panels.set(key, { kind: 'lab_panel', key: `lab_panel:${key}`, date: row.test_date, facility_name: row.facility_name ?? null, lab_results: [] });
    }
    panels.get(key).lab_results.push(row);
  }
  events.push(...panels.values());

  return events.sort(
    (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.key < b.key ? -1 : 1)),
  );
}

module.exports = { buildTimeline };
