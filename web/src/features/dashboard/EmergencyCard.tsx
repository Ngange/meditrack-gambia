import { Link } from 'react-router-dom';
import type { Allergy } from '../../types/records';
import type { MyProfile } from '../../types/profile';

type EmergencyCardProps = { profile: MyProfile | null; activeAllergies: Allergy[] };

// Blood group, active allergies and emergency contact: what a doctor needs first.
export function EmergencyCard({ profile, activeAllergies }: EmergencyCardProps) {
  const allergyNames = activeAllergies.map((a) => a.allergen);
  const needsEmergencyInfo = profile !== null && (!profile.blood_group || !profile.emergency_contact_name);

  return (
    <section className="a-card a-card-dashed dash-card">
      <div className="dash-card-head">
        <h2>Emergency profile</h2>
        <span className={`dash-blood${profile?.blood_group ? '' : ' is-empty'}`}>{profile?.blood_group ?? 'Not set'}</span>
      </div>
      <div className="dash-lines">
        {allergyNames.length > 0 ? (
          <div className="dash-allergy">Allergy: {allergyNames.join(' & ')}</div>
        ) : (
          <div className="a-muted">No active allergies recorded</div>
        )}
        <div className="a-muted">
          {profile?.emergency_contact_name
            ? `Emergency: ${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` - ${profile.emergency_contact_phone}` : ''}`
            : 'No emergency contact yet'}
        </div>
      </div>
      <div className="dash-card-foot">
        <span />
        <Link to="/profile" className="dash-link">
          {needsEmergencyInfo ? 'Complete profile ›' : 'View profile ›'}
        </Link>
      </div>
    </section>
  );
}
