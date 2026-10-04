import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../lib/auth-context';
import logo from '../assets/logo.jpg';
import './AuthLayout.css';

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

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
      setFormError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-page">
        <div className="auth-brand">
          <div className="auth-brand-badge">
            <img src={logo} alt="MediTrack Gambia" />
          </div>
          <h2>Start Managing Your Health Records</h2>
          <p className="auth-tagline">
            One place for your diagnoses, medications, labs, and documents — private by default, shared only when you choose.
          </p>

          <div className="auth-feature">
            <div className="auth-feature-icon">🔗</div>
            <div className="auth-feature-text">
              <h4>Tokenless Sharing</h4>
              <p>Share selected records via a secure, time-limited link — no recipient account required.</p>
            </div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📶</div>
            <div className="auth-feature-text">
              <h4>Mobile Offline Access</h4>
              <p>The MediTrack mobile app keeps your records available even without a connection.</p>
            </div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🔒</div>
            <div className="auth-feature-text">
              <h4>Encrypted at Rest</h4>
              <p>Sensitive record fields are encrypted in storage. Only you decide what to share.</p>
            </div>
          </div>
        </div>

        <div className="auth-form-side">
          <form onSubmit={handleSubmit} className="auth-form-card">
            <div className="auth-form-logo">
              <img src={logo} alt="" />
            </div>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Start managing your health records</p>

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
          </form>
        </div>
      </div>
    </div>
  );
}