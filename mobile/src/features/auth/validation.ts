export type LoginValues = { email: string; password: string };
export type LoginErrors = { email?: string; password?: string };

export function validateLogin(v: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!v.email.trim()) errors.email = 'Email is required.';
  if (!v.password) errors.password = 'Password is required.';
  return errors;
}

export type RegisterValues = { firstName: string; lastName: string; email: string; password: string };
export type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

export function validateRegister(v: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!v.firstName.trim()) errors.firstName = 'First name is required.';
  if (!v.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!v.email.trim()) errors.email = 'Email is required.';
  if (!v.password) errors.password = 'Password is required.';
  else if (v.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
}
