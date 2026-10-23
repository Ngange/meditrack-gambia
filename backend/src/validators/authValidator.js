function validateRegister(body) {
  const { email, password, firstName, lastName } = body;
  if (!email || !password || !firstName || !lastName) {
    return {
      error: 'Email, password, first name, and last name are required.',
    };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  return { value: { email, password, firstName, lastName } };
}

function validateLogin(body) {
  const { email, password } = body;
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  return { value: { email, password } };
}

module.exports = { validateRegister, validateLogin };
