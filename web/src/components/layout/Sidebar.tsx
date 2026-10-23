import { NavLink } from 'react-router-dom';
import { IconLogout } from './icons';
import { NAV } from './nav';

type SidebarProps = { open: boolean; onNavigate: () => void; onSignOut: () => void };

export function Sidebar({ open, onNavigate, onSignOut }: SidebarProps) {
  return (
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
              onClick={onNavigate}
              className={({ isActive }) => `sb-link${isActive ? ' is-active' : ''}`}>
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>
      <div className="sb-foot">
        <button type="button" className="sb-link sb-signout" onClick={onSignOut}>
          <IconLogout />
          <span>Sign out</span>
        </button>
        <div className="sb-status">
          <span className="sb-dot" /> Online mode (live API)
        </div>
        <div className="sb-version">MediTrack Gambia PHR v1.0</div>
      </div>
    </aside>
  );
}
