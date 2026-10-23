import { Link } from 'react-router-dom';
import { Pill } from '../../components/ui/Pill';

type SummaryCardProps = {
  title: string;
  /** Number of active records, shown in the pill. */
  count: number;
  tone: 'green' | 'blue';
  /** The first few active records: a name and an optional right-hand detail. */
  rows: { key: string; name: string; detail?: string }[];
  to: string;
};

// One dashboard card: a title, how many are active, a couple of examples, and Add / Manage links.
export function SummaryCard({ title, count, tone, rows, to }: SummaryCardProps) {
  return (
    <section className="a-card a-card-dashed dash-card">
      <div className="dash-card-head">
        <h2>{title}</h2>
        <Pill tone={tone}>{count} active</Pill>
      </div>
      <div className="dash-lines">
        {rows.map((r) => (
          <div key={r.key} className="dash-row">
            <span>{r.name}</span>
            <span className="a-muted">{r.detail ?? ''}</span>
          </div>
        ))}
        {rows.length === 0 ? <div className="a-muted">Nothing recorded yet</div> : null}
      </div>
      <div className="dash-card-foot">
        <Link to={to} className="dash-plain">
          + Add
        </Link>
        <Link to={to} className="dash-link">
          Manage ›
        </Link>
      </div>
    </section>
  );
}
