import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { providerApi } from '../../api/provider';
import { Logo } from '../../components/layout/Logo';
import '../../components/layout/AppShell.css';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import type { ProviderProfile } from '../../types/provider';

export type DoctorContext = { provider: ProviderProfile; reload: () => void };

const fetchMe = () => providerApi.getMe();

// The frame around the doctor's pages. It loads the doctor's profile once and hands it to them.
export function DoctorShell() {
  const { signOut } = useAuth();
  const [fetcher] = useState(() => fetchMe);
  const { data, loading, error, reload } = useFetch(fetcher);

  return (
    <div className="shell">
      <div className="shell-body">
        <header className="shell-head">
          <div className="shell-logo">
            <Logo />
          </div>
          <div className="shell-title">
            <h1>MediTrack Gambia</h1>
            <p>Doctor portal</p>
          </div>
          <div className="shell-hi dr-actions">
            {data && (
              <span>
                Hi, <strong>Dr {data.last_name}</strong>
              </span>
            )}
            <ThemeToggle />
            <button type="button" className="a-btn a-btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="shell-main">
          {loading ? (
            <Loading />
          ) : error || !data ? (
            <ErrorCard message={error || 'Could not load your profile.'} onRetry={reload} />
          ) : (
            <Outlet context={{ provider: data, reload } satisfies DoctorContext} />
          )}
        </main>
      </div>
    </div>
  );
}
