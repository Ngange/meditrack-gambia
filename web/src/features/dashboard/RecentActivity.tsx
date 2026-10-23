import { Link } from 'react-router-dom';
import { Pill } from '../../components/ui/Pill';
import type { Activity } from './activity';

export function RecentActivity({ activity }: { activity: Activity[] }) {
  return (
    <section className="a-card dash-activity">
      <div className="dash-activity-head">
        <div>
          <h2>Recent activity</h2>
          <p className="page-sub">Your latest visits, medications, allergies and conditions</p>
        </div>
        <div className="a-actions">
          <Link to="/allergies" className="a-btn">
            + Add allergy
          </Link>
          <Link to="/conditions" className="a-btn">
            + Add condition
          </Link>
          <Link to="/visits" className="a-btn a-btn-dark">
            + Record visit
          </Link>
        </div>
      </div>

      {activity.length === 0 ? (
        <p className="a-muted dash-empty">
          No records yet. Start with your allergies, conditions and visits — they are the first things a doctor will ask
          about.
        </p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Summary</th>
                <th className="dash-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((r) => (
                <tr key={`${r.type}-${r.id}`}>
                  <td className="dash-mono">{r.date}</td>
                  <td>
                    <Pill>{r.type}</Pill>
                  </td>
                  <td>
                    <div className="dash-title">{r.title}</div>
                    <div className="a-muted dash-detail">{r.detail}</div>
                  </td>
                  <td className="dash-right">
                    <Link to={r.to} className="dash-details">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
