import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout } from './AuthLayout';

type FieldErrors = { email?: string; password?: string };

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Your Complete Medical History, in Your Hands"
      tagline="Store diagnoses, medications, labs, and documents in one place — and decide exactly what to share, with whom, and for how long."
      title="MediTrack Gambia"
      subtitle="Sign in to your account"
      onSubmit={handleSubmit}
      form={
        <>
          <Input label="Email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
          <Input label="Password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />

          {formError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>⚠ {formError}</p>}

          <Button type="submit" loading={loading}>Log in</Button>

          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--color-text-secondary)' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)' }}>Register</Link>
          </p>
        </>
      }
    />
  );
}
