import { useAuth } from '../../hooks/useAuth';

// Admin accounts exist (they verify doctors through the API) but have no screens yet.
export function AdminNoticePage() {
  const { signOut } = useAuth();
  return (
    <div style={{ maxWidth: 520, margin: '15vh auto', padding: 24, textAlign: 'center', color: 'var(--color-text)' }}>
      <h1>Admin account</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>The admin screens are not built yet. Admin tasks are done through the API for now.</p>
      <button type="button" className="a-btn" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
