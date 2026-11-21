import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout } from './AuthLayout';

type Fields = { firstName: string; lastName: string; licenceNumber: string; facilityName: string; specialty: string; email: string; password: string };
type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = { firstName: '', lastName: '', licenceNumber: '', facilityName: '', specialty: '', email: '', password: '' };

export function RegisterProviderPage() {
  const { signUpProvider } = useAuth();
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof Fields) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [key]: e.target.value }));

  function validate() {
    const e: Errors = {};
    if (!f.firstName.trim()) e.firstName = 'First name is required.';
    if (!f.lastName.trim()) e.lastName = 'Last name is required.';
    if (f.licenceNumber.trim().length < 3) e.licenceNumber = 'Enter your licence number as printed on your licence.';
    if (!f.facilityName.trim()) e.facilityName = 'Enter the name of your clinic or hospital.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    if (f.password.length < 8) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await signUpProvider({
        email: f.email.trim(),
        password: f.password,
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        licenceNumber: f.licenceNumber.trim(),
        facilityName: f.facilityName.trim(),
        specialty: f.specialty.trim() || undefined,
      });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="MediTrack for Doctors"
      tagline="Open a patient's record with the code and PIN they give you, and add what you find, with their say in what you can change."
      title="Doctor registration"
      subtitle="An administrator checks your licence before you can open patient records"
      onSubmit={handleSubmit}
      form={
        <>
          <Input label="First name" autoComplete="given-name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} />
          <Input label="Last name" autoComplete="family-name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} />
          <Input label="Licence number" value={f.licenceNumber} onChange={set('licenceNumber')} error={errors.licenceNumber} />
          <Input label="Clinic or hospital" autoComplete="organization" value={f.facilityName} onChange={set('facilityName')} error={errors.facilityName} />
          <Input label="Specialty (optional)" value={f.specialty} onChange={set('specialty')} error={errors.specialty} />
          <Input label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} />

          {formError && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>⚠ {formError}</p>}

          <Button type="submit" loading={loading}>Register as a doctor</Button>

          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--color-text-secondary)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Log in</Link>
            {' · '}
            <Link to="/register" style={{ color: 'var(--color-primary)' }}>I am a patient</Link>
          </p>
        </>
      }
    />
  );
}
