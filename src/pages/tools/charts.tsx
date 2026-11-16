import { useId } from 'react';
import type { Bucket } from '../../domain/analytics';
import { formatDuration } from './util';

/**
 * Dependency-free charts. Each one has a text alternative: the SVG carries a title/description
 * and the same numbers are available as a table.
 */

const SLOT = 30;
const HEIGHT = 120;

export function BarChart({ points, title, empty }: { points: Bucket[]; title: string; empty: string }) {
  const id = useId();
  const max = Math.max(...points.map(point => point.ms), 0);
  if (max === 0) return <p className="empty">{empty}</p>;
  const width = points.length * SLOT;
  const total = points.reduce((sum, point) => sum + point.ms, 0);
  const labelEvery = points.length > 16 ? 2 : 1;
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${HEIGHT + 34}`} role="img" aria-labelledby={`${id}-t ${id}-d`} style={{ width: '100%', height: 'auto', maxHeight: 240 }}>
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{`Total ${formatDuration(total)}. Maior valor: ${formatDuration(max)}.`}</desc>
        <line x1="0" x2={width} y1={HEIGHT + 0.5} y2={HEIGHT + 0.5} stroke="currentColor" opacity="0.25" />
        {points.map((point, index) => {
          const barHeight = Math.max(point.ms > 0 ? 3 : 0, Math.round((point.ms / max) * (HEIGHT - 18)));
          const x = index * SLOT + 5;
          return (
            <g key={point.start} className="chart-bar">
              <rect x={x} y={HEIGHT - barHeight} width={SLOT - 10} height={barHeight} rx="3" fill="#6658df">
                <title>{`${point.label}: ${formatDuration(point.ms)}`}</title>
              </rect>
              {points.length <= 10 && point.ms > 0 && (
                <text x={x + (SLOT - 10) / 2} y={HEIGHT - barHeight - 4} textAnchor="middle" fontSize="9" fill="currentColor">{Math.round(point.ms / 60_000)}</text>
              )}
              {index % labelEvery === 0 && (
                <text x={x + (SLOT - 10) / 2} y={HEIGHT + 16} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.75">{point.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="muted" style={{ fontSize: '.85rem' }}>Eixo vertical em minutos de foco.</figcaption>
      <details>
        <summary>Ver valores em tabela</summary>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Período</th><th scope="col">Foco</th></tr></thead>
            <tbody>{points.map(point => <tr key={point.start}><th scope="row">{point.label}</th><td>{formatDuration(point.ms)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Native progress bar with a visible text value. `max` of 0 renders no bar. */
export function Meter({ value, max, label, text }: { value: number; max: number; label: string; text: string }) {
  return (
    <div className="meter">
      {max > 0 && <progress className="progress" value={Math.min(value, max)} max={max} aria-label={label} style={{ width: '100%' }} />}
      <small className="muted">{text}</small>
    </div>
  );
}
