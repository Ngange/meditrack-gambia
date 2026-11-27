import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../../components/layout/Logo';
import '../../components/layout/AppShell.css';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import './Admin.css';

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/doctors', label: 'Doctors' },
  { to: '/users', label: 'Users' },
  { to: '/activity', label: 'Activity' },
  { to: '/security', label: 'Security' },
  { to: '/admins', label: 'Admins' },
  { to: '/account', label: 'My password' },
];

// The administrator's frame: a header, a side menu (a row of tabs on a phone) and the page.
export function AdminShell() {
  const { signOut } = useAuth();
  return (
    <div className="shell">
      <div className="shell-body">
        <header className="shell-head">
          <div className="shell-logo">
            <Logo />
          </div>
          <div className="shell-title">
            <h1>MediTrack Gambia</h1>
            <p>Administration</p>
          </div>
          <div className="shell-hi dr-actions">
            <ThemeToggle />
            <button type="button" className="a-btn a-btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <div className="ad-frame">
          <nav className="ad-nav" aria-label="Administration">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `ad-link${isActive ? ' is-on' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <main className="shell-main ad-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
