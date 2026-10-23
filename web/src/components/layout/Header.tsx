import type { MyProfile } from '../../types/profile';
import { IconMenu } from './icons';
import { Logo } from './Logo';

type HeaderProps = { profile: MyProfile | null; menuOpen: boolean; onToggleMenu: () => void };

export function Header({ profile, menuOpen, onToggleMenu }: HeaderProps) {
  return (
    <header className="shell-head">
      <button type="button" className="shell-toggle" aria-label="Menu" aria-expanded={menuOpen} onClick={onToggleMenu}>
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
  );
}
