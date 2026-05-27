'use client';

import { DESKS, PODS, DeskConfig } from '@/config/desks';
import type { DeskState, DeskStatus } from '@/types';

const STATUS_COLOR: Record<DeskStatus, string> = {
  free:     '#22c55e',
  occupied: '#ef4444',
  reserved: '#eab308',
};

const POD_STYLE: Record<string, { bg: string; border: string }> = {
  quiet:         { bg: 'rgba(34,197,94,0.04)',   border: '#1a3a1a' },
  collaborative: { bg: 'rgba(59,130,246,0.04)',  border: '#1a1e3a' },
  open:          { bg: 'rgba(234,179,8,0.04)',   border: '#3a2e1a' },
};

interface Props {
  states: Record<string, DeskState>;
  onReserve: (id: string) => void;
  onRelease: (id: string) => void;
}

export function DeskMap({ states, onReserve, onRelease }: Props) {
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
              fontSize: '0.58rem', color: '#4b5563',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '0.5rem',
            }}>
              {pod.name} · {desks.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {desks.map(desk => (
                <DeskCard
                  key={desk.id}
                  desk={desk}
                  status={states[desk.id]?.status ?? 'free'}
                  onReserve={() => onReserve(desk.id)}
                  onRelease={() => onRelease(desk.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeskCard({ desk, status, onReserve, onRelease }: {
  desk: DeskConfig;
  status: DeskStatus;
  onReserve: () => void;
  onRelease: () => void;
}) {
  const color = STATUS_COLOR[status];

  return (
    <div style={{
      width: 'calc(50% - 0.2rem)',
      minHeight: 82,
      border: `1.5px solid ${color}`,
      borderRadius: '5px',
      padding: '0.35rem 0.4rem',
      background: '#161616',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Label + LED */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{desk.label}</span>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: color, boxShadow: `0 0 4px ${color}`, flexShrink: 0,
        }} />
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15rem', marginBottom: '0.2rem' }}>
        {desk.features.slice(0, 2).map(f => (
          <span key={f} style={{
            fontSize: '0.48rem', padding: '0.05rem 0.2rem',
            background: '#1f2937', borderRadius: '3px', color: '#6b7280',
          }}>
            {f}
          </span>
        ))}
        {desk.physical && (
          <span style={{ fontSize: '0.48rem', color: '#3b82f6' }} title="Physical sensor">●</span>
        )}
      </div>

      {/* Status + button pinned to bottom */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <div style={{ fontSize: '0.58rem', color, fontWeight: 600 }}>{status}</div>
        {status === 'free' && (
          <button onClick={onReserve} style={{
            padding: '0.15rem 0', fontSize: '0.55rem', fontFamily: 'inherit',
            background: '#eab308', color: '#0f0f0f',
            border: 'none', borderRadius: '3px', fontWeight: 700,
          }}>
            Reserve
          </button>
        )}
        {status === 'reserved' && (
          <button onClick={onRelease} style={{
            padding: '0.15rem 0', fontSize: '0.55rem', fontFamily: 'inherit',
            background: '#1f2937', color: '#9ca3af',
            border: '1px solid #374151', borderRadius: '3px',
          }}>
            Release
          </button>
        )}
      </div>
    </div>
  );
}
