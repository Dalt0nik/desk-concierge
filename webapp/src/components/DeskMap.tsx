'use client';

import { DESKS, PODS, DeskConfig, Feature } from '@/config/desks';
import type { DeskState, DeskStatus } from '@/types';

const STATUS_COLOR: Record<DeskStatus, string> = {
  free:     '#22c55e',
  occupied: '#ef4444',
  reserved: '#eab308',
};

const POD_STYLE: Record<string, { bg: string; border: string }> = {
  quiet:         { bg: 'rgba(34,197,94,0.06)',   border: '#1f4d22' },
  collaborative: { bg: 'rgba(59,130,246,0.06)',  border: '#1e2d5c' },
  open:          { bg: 'rgba(234,179,8,0.06)',   border: '#4d3c14' },
};

interface Props {
  states: Record<string, DeskState>;
  onReserve: (id: string) => void;
  onRelease: (id: string) => void;
  highlightTags?: Feature[];
}

export function DeskMap({ states, onReserve, onRelease, highlightTags = [] }: Props) {
  const filtering = highlightTags.length > 0;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.875rem',
    }}>
      {PODS.map(pod => {
        const desks = DESKS.filter(d => d.pod === pod.id);
        const s = POD_STYLE[pod.zone];
        return (
          <div key={pod.id} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: '8px',
            padding: '0.6rem',
          }}>
            <div style={{
              fontSize: '0.72rem', color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '0.5rem', fontWeight: 600,
            }}>
              {pod.name} · {desks.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {desks.map(desk => {
                const matches =
                  filtering &&
                  highlightTags.every(t => desk.features.includes(t));
                return (
                  <DeskCard
                    key={desk.id}
                    desk={desk}
                    status={states[desk.id]?.status ?? 'free'}
                    onReserve={() => onReserve(desk.id)}
                    onRelease={() => onRelease(desk.id)}
                    highlighted={matches}
                    dimmed={filtering && !matches}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeskCard({ desk, status, onReserve, onRelease, highlighted, dimmed }: {
  desk: DeskConfig;
  status: DeskStatus;
  onReserve: () => void;
  onRelease: () => void;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const color = STATUS_COLOR[status];

  return (
    <div style={{
      width: 'calc(50% - 0.2rem)',
      minHeight: 96,
      border: `1.5px solid ${highlighted ? '#eab308' : color}`,
      borderRadius: '5px',
      padding: '0.35rem 0.4rem',
      background: highlighted ? 'rgba(234,179,8,0.12)' : '#161616',
      boxShadow: highlighted ? '0 0 0 1px #eab308, 0 0 10px rgba(234,179,8,0.45)' : 'none',
      opacity: dimmed ? 0.3 : 1,
      transition: 'opacity 120ms, box-shadow 120ms, background 120ms',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Label + LED */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{desk.label}</span>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: color, boxShadow: `0 0 4px ${color}`, flexShrink: 0,
        }} />
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15rem', marginBottom: '0.2rem' }}>
        {desk.features.slice(0, 2).map(f => (
          <span key={f} style={{
            fontSize: '0.65rem', padding: '0.1rem 0.3rem',
            background: '#1f2937', borderRadius: '3px', color: '#94a3b8',
          }}>
            {f}
          </span>
        ))}
        {desk.physical && (
          <span style={{ fontSize: '0.65rem', color: '#60a5fa' }} title="Physical sensor">●</span>
        )}
      </div>

      {/* Status + button pinned to bottom */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <div style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>{status}</div>
        {status === 'free' && (
          <button onClick={onReserve} style={{
            padding: '0.3rem 0', fontSize: '0.7rem', fontFamily: 'inherit',
            background: '#eab308', color: '#0f0f0f',
            border: 'none', borderRadius: '4px', fontWeight: 700,
          }}>
            Reserve
          </button>
        )}
        {status === 'reserved' && (
          <button onClick={onRelease} style={{
            padding: '0.3rem 0', fontSize: '0.7rem', fontFamily: 'inherit',
            background: '#1f2937', color: '#cbd5e1',
            border: '1px solid #4b5563', borderRadius: '4px',
          }}>
            Release
          </button>
        )}
      </div>
    </div>
  );
}
