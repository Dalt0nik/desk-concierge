'use client';

import { DESKS, DeskConfig } from '@/config/desks';
import type { DeskState, DeskStatus } from '@/types';

const COLOR: Record<DeskStatus, string> = {
  free: '#22c55e',
  occupied: '#ef4444',
  reserved: '#eab308',
};

interface Props {
  states: Record<string, DeskState>;
  onReserve: (id: string) => void;
  onRelease: (id: string) => void;
}

export function DeskMap({ states, onReserve, onRelease }: Props) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {DESKS.map(desk => (
        <DeskCard
          key={desk.id}
          desk={desk}
          status={states[desk.id]?.status ?? 'free'}
          onReserve={() => onReserve(desk.id)}
          onRelease={() => onRelease(desk.id)}
        />
      ))}
    </div>
  );
}

function DeskCard({
  desk,
  status,
  onReserve,
  onRelease,
}: {
  desk: DeskConfig;
  status: DeskStatus;
  onReserve: () => void;
  onRelease: () => void;
}) {
  const color = COLOR[status];

  const tags = [
    desk.zone,
    ...desk.features,
    ...(desk.physical ? ['sensor'] : []),
  ];

  return (
    <div style={{
      width: '128px',
      border: `1.5px solid ${color}`,
      borderRadius: '8px',
      padding: '0.75rem',
      background: '#161616',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Label + indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{desk.label}</span>
        <span style={{
          width: '9px', height: '9px', borderRadius: '50%',
          background: color, flexShrink: 0,
          boxShadow: `0 0 6px ${color}`,
        }} />
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {tags.map(tag => (
          <span key={tag} style={{
            fontSize: '0.6rem', padding: '0.1rem 0.35rem',
            background: '#1f2937', borderRadius: '3px', color: '#9ca3af',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Status + button pinned to bottom */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>{status}</div>

        {status === 'free' && (
          <button
            onClick={onReserve}
            style={{
              padding: '0.25rem 0', fontSize: '0.65rem', fontFamily: 'inherit',
              background: '#eab308', color: '#0f0f0f',
              border: 'none', borderRadius: '4px', fontWeight: 700,
            }}
          >
            Reserve
          </button>
        )}
        {status === 'reserved' && (
          <button
            onClick={onRelease}
            style={{
              padding: '0.25rem 0', fontSize: '0.65rem', fontFamily: 'inherit',
              background: '#1f2937', color: '#9ca3af',
              border: '1px solid #374151', borderRadius: '4px',
            }}
          >
            Release
          </button>
        )}
      </div>
    </div>
  );
}
