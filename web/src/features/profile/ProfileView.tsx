import type { ReactNode } from 'react';
import type { MyProfile } from '../../types/profile';
import { formatDate } from '../../utils/dates';

type ItemProps = { label: string; value?: string | null; children?: ReactNode };

function Item({ label, value, children }: ItemProps) {
  return (
    <div className="profile-item">
      <dt>{label}</dt>
      <dd className={value || children ? undefined : 'is-empty'}>{children ?? value ?? 'Not provided'}</dd>
    </div>
  );
}

export function ProfileView({ profile }: { profile: MyProfile }) {
  const contact = profile.emergency_contact_name
    ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` - ${profile.emergency_contact_phone}` : ''}`
    : null;

  return (
    <dl className="profile-grid">
      <Item label="Full name" value={`${profile.first_name} ${profile.last_name}`} />
      <Item label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
      <Item label="Blood group">
        {profile.blood_group ? <span className="profile-blood">{profile.blood_group}</span> : undefined}
      </Item>
      <Item label="Gender" value={profile.gender} />
      <Item label="Email" value={profile.email} />
      <Item label="Emergency contact" value={contact} />
    </dl>
  );
}
