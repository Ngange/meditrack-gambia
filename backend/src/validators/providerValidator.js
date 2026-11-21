const clean = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

function validateRegisterProvider(body) {
  const email = clean(body.email);
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const licenceNumber = clean(body.licenceNumber).toUpperCase();
  const facilityName = clean(body.facilityName);
  const specialty = clean(body.specialty);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || !firstName || !lastName || !licenceNumber || !facilityName) {
    return { error: 'Email, password, name, licence number and facility are required.' };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (licenceNumber.length < 3 || licenceNumber.length > 40) return { error: 'Enter your licence number as printed on your licence.' };
  if (facilityName.length < 2 || facilityName.length > 150) return { error: 'Enter the name of your clinic or hospital.' };
  if (firstName.length > 100 || lastName.length > 100 || specialty.length > 100) return { error: 'A name or specialty is too long.' };

  return { value: { email, password, firstName, lastName, licenceNumber, facilityName, specialty: specialty || null } };
}

function validateReview(body) {
  const decision = body.decision;
  if (decision !== 'verified' && decision !== 'rejected') return { error: 'Decision must be "verified" or "rejected".' };
  const note = clean(body.note);
  if (note.length > 500) return { error: 'The note is too long (500 characters at most).' };
  return { value: { decision, note: note || null } };
}

module.exports = { validateRegisterProvider, validateReview };
