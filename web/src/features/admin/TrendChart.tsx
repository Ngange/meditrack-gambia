import { useId, useState } from 'react';

export type TrendSeries = { name: string; values: number[]; slot: 1 | 2 | 3 };

type Props = { title: string; days: string[]; series: TrendSeries[] };

const W = 720;
const H = 260;
const PAD = { l: 36, r: 12, t: 12, b: 28 };
const short = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// A small line chart for counts per day. One y-axis, a legend, a hover readout, and a table view for anyone
// who cannot tell the lines apart by colour. The colours are CSS variables (see Admin.css) so dark mode swaps them.
export function TrendChart({ title, days, series }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const id = useId();
  const max = Math.max(4, ...series.flatMap((s) => s.values));
  const top = Math.ceil(max / 4) * 4;
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(days.length - 1, 1);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const ticks = [0, 1, 2, 3, 4].map((n) => (top * n) / 4);
  const empty = series.every((s) => s.values.every((v) => v === 0));

  function move(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (days.length - 1));
    setHover(Math.min(Math.max(i, 0), days.length - 1));
  }

  return (
    <figure className="ad-chart" aria-labelledby={`${id}-t`}>
      <div className="ad-chart-head">
        <figcaption id={`${id}-t`}>{title}</figcaption>
        <button type="button" className="a-btn a-btn-sm" onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      <ul className="ad-legend">
        {series.map((s) => (
          <li key={s.name}>
            <span className={`ad-swatch ad-s${s.slot}`} aria-hidden="true" /> {s.name}
          </li>
        ))}
      </ul>

      {table ? (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Day</th>
                {series.map((s) => (
                  <th key={s.name}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...days.keys()].reverse().map((i) => (
                <tr key={days[i]}>
                  <td>{short(days[i])}</td>
                  {series.map((s) => (
                    <td key={s.name}>{s.values[i]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ad-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}, last ${days.length} days`} onMouseMove={move} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="ad-grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
                <text className="ad-axis" x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {[0, Math.floor((days.length - 1) / 2), days.length - 1].map((i) => (
              <text key={i} className="ad-axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}>
                {short(days[i])}
              </text>
            ))}
            {series.map((s) => (
              <polyline key={s.name} className={`ad-line ad-st${s.slot}`} fill="none" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            ))}
            {hover !== null && (
              <g>
                <line className="ad-cross" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} />
                {series.map((s) => (
                  <circle key={s.name} className={`ad-dot ad-sf${s.slot}`} cx={x(hover)} cy={y(s.values[hover])} r="4.5" />
                ))}
              </g>
            )}
          </svg>
          {hover !== null && (
            <div className="ad-tip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
              <strong>{short(days[hover])}</strong>
              {series.map((s) => (
                <span key={s.name}>
                  <span className={`ad-swatch ad-s${s.slot}`} aria-hidden="true" /> {s.name}: {s.values[hover]}
                </span>
              ))}
            </div>
          )}
          {empty && <p className="ad-empty a-meta">Nothing to show yet. Activity appears here as people use the system.</p>}
        </div>
      )}
    </figure>
  );
}
