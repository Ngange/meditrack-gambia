import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout } from './AuthLayout';

type FieldErrors = { firstName?: string; lastName?: string; email?: string; password?: string };

export function RegisterPage() {
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors: FieldErrors = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!email.trim()) errors.email = 'Email is required.';
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Start Managing Your Health Records"
      tagline="One place for your diagnoses, medications, labs, and documents — private by default, shared only when you choose."
      title="Create account"
      subtitle="Start managing your health records"
      onSubmit={handleSubmit}
      form={
        <>
          <Input label="First name" autoComplete="given-name" value={firstName}
            onChange={(e) => setFirstName(e.target.value)} error={fieldErrors.firstName} />
          <Input label="Last name" autoComplete="family-name" value={lastName}
            onChange={(e) => setLastName(e.target.value)} error={fieldErrors.lastName} />
          <Input label="Email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
          <Input label="Password" type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />

          {formError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>⚠ {formError}</p>}

          <Button type="submit" loading={loading}>Create account</Button>

          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--color-text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Log in</Link>
          </p>
        </>
      }
    />
  );
}
