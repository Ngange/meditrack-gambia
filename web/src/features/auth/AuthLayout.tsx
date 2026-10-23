import type { FormEventHandler, ReactNode } from 'react';
import logo from '../../assets/logo.jpg';
import './AuthLayout.css';

const FEATURES = [
  { icon: '🔗', title: 'Tokenless Sharing', text: 'Share selected records via a secure, time-limited link — no recipient account required.' },
  { icon: '📶', title: 'Mobile Offline Access', text: 'The MediTrack mobile app keeps your records available even without a connection.' },
  { icon: '🔒', title: 'Encrypted at Rest', text: 'Sensitive record fields are encrypted in storage. Only you decide what to share.' },
];

type AuthLayoutProps = {
  /** Big heading and short text on the left panel. */
  heading: string;
  tagline: string;
  /** Heading and subtitle above the form. */
  title: string;
  subtitle: string;
  /** The form's inputs and links. */
  form: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

// The two-panel layout shared by the login and register pages.
export function AuthLayout({ heading, tagline, title, subtitle, form, onSubmit }: AuthLayoutProps) {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-page">
        <div className="auth-brand">
          <div className="auth-brand-badge">
            <img src={logo} alt="MediTrack Gambia" />
          </div>
          <h2>{heading}</h2>
          <p className="auth-tagline">{tagline}</p>

          {FEATURES.map((f) => (
            <div key={f.title} className="auth-feature">
              <div className="auth-feature-icon">{f.icon}</div>
              <div className="auth-feature-text">
                <h4>{f.title}</h4>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-form-side">
          <form onSubmit={onSubmit} className="auth-form-card">
            <div className="auth-form-logo">
              <img src={logo} alt="" />
            </div>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
            {form}
          </form>
        </div>
      </div>
    </div>
  );
}
