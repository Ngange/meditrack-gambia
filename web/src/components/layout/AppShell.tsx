import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import type { ShellContext } from '../../hooks/useShell';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './AppShell.css';

// The frame around every signed-in page: sidebar, header and the page itself.
// It loads the patient's profile once and hands it to the pages through the outlet context.
export function AppShell() {
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, profileLoading, profileError, setProfile, reloadProfile } = useProfile();

  const context: ShellContext = { profile, profileLoading, profileError, setProfile, reloadProfile };

  return (
    <div className="shell">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} onSignOut={signOut} />
      <div className="shell-body">
        <Header profile={profile} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((o) => !o)} />
        <main className="shell-main">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
