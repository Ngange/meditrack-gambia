const { clean } = require('../utils/text');
const { isRealDate, today, EARLIEST_DATE } = require('../utils/dates');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function validateProfile(body) {
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const dateOfBirth = clean(body.dateOfBirth);
  const gender = clean(body.gender);
  const bloodGroup = clean(body.bloodGroup);
  const contactName = clean(body.emergencyContactName);
  const contactPhone = clean(body.emergencyContactPhone);

  if (!firstName || !lastName)
    return { error: 'First name and last name are required.' };
  if (firstName.length > 100 || lastName.length > 100) {
    return { error: 'Names are too long (max 100 characters).' };
  }
  if (dateOfBirth) {
    if (!isRealDate(dateOfBirth)) {
      return {
        error: 'Date of birth must be a real date in YYYY-MM-DD format.',
      };
    }
    if (dateOfBirth > today()) {
      return { error: 'Date of birth cannot be in the future.' };
    }
    if (dateOfBirth < EARLIEST_DATE)
      return { error: 'Date of birth is too far in the past.' };
  }
  if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) {
    return { error: `Blood group must be one of ${BLOOD_GROUPS.join(', ')}.` };
  }
  if (gender.length > 20)
    return { error: 'Gender is too long (max 20 characters).' };
  if (contactName.length > 150)
    return {
      error: 'Emergency contact name is too long (max 150 characters).',
    };
  if (contactPhone.length > 30)
    return {
      error: 'Emergency contact phone is too long (max 30 characters).',
    };

  return {
    value: {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
    },
  };
}

module.exports = { validateProfile };
