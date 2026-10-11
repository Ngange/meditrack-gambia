import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { getMyProfile, type MyProfile } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getToken } from '../lib/auth-storage';
import {
  IconAllergy,
  IconClock,
  IconCondition,
  IconDashboard,
  IconFile,
  IconFlask,
  IconLogout,
  IconMenu,
  IconPill,
  IconShare,
  IconUser,
} from './icons';
import './AppShell.css';

// Pages inside the shell read the signed-in patient's profile from here instead of each
// fetching it, so editing the profile updates the "Hi, ..." greeting immediately.
export type ShellContext = {
  profile: MyProfile | null;
  profileLoading: boolean;
  profileError: string;
  setProfile: (p: MyProfile) => void;
  reloadProfile: () => void;
};

export function useShell() {
  return useOutletContext<ShellContext>();
}

type NavItem = { to: string; label: string; icon: () => React.JSX.Element; end?: boolean; soon?: boolean };

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/allergies', label: 'Allergies', icon: IconAllergy },
  { to: '/conditions', label: 'Conditions', icon: IconCondition },
  { to: '/medications', label: 'Medications', icon: IconPill, soon: true },
  { to: '/labs', label: 'Lab Results', icon: IconFlask, soon: true },
  { to: '/documents', label: 'Documents', icon: IconFile, soon: true },
  { to: '/timeline', label: 'Timeline', icon: IconClock, soon: true },
  { to: '/share', label: 'Share Records', icon: IconShare, soon: true },
  { to: '/profile', label: 'Profile', icon: IconUser },
];

function Logo() {
  const [failed, setFailed] = useState(false);
  // Put your logo at web/public/logo.png and it is used here; otherwise a plain shield mark shows.
  if (!failed) {
    return <img className="shell-logo-img" src="/logo.png" alt="" onError={() => setFailed(true)} />;
  }
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" strokeLinejoin="round" />
      <path d="M12 8v6M9 11h6" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const reloadProfile = useCallback(async () => {
    setProfileError('');
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      const result = await getMyProfile(token);
      setProfile(result.profile);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        signOutRef.current();
        return;
      }
      setProfileError((err as Error).message);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  const context: ShellContext = { profile, profileLoading, profileError, setProfile, reloadProfile };

  return (
    <div className="shell">
      <aside className={`sb${open ? ' is-open' : ''}`} aria-label="Main navigation">
        <nav className="sb-nav">
          {NAV.map((item) =>
            item.soon ? (
              <span key={item.to} className="sb-link is-soon" aria-disabled="true" title="Coming soon">
                <item.icon />
                <span>{item.label}</span>
                <em className="sb-soon">Soon</em>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `sb-link${isActive ? ' is-active' : ''}`}>
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>
        <div className="sb-foot">
          <button type="button" className="sb-link sb-signout" onClick={signOut}>
            <IconLogout />
            <span>Sign out</span>
          </button>
          <div className="sb-status">
            <span className="sb-dot" /> Online mode (live API)
          </div>
          <div className="sb-version">MediTrack Gambia PHR v1.0</div>
        </div>
      </aside>

      <div className="shell-body">
        <header className="shell-head">
          <button type="button" className="shell-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <IconMenu />
          </button>
          <div className="shell-logo">
            <Logo />
          </div>
          <div className="shell-title">
            <h1>MediTrack Gambia</h1>
            <p>Patient Personal Health Record Management System</p>
          </div>
          <div className="shell-hi">
            Hi, <strong>{profile ? `${profile.first_name} ${profile.last_name}` : '…'}</strong>
          </div>
        </header>
        <main className="shell-main">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}