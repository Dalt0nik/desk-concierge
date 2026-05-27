'use client';

import { useEffect, useState } from 'react';
import type { DeskState } from '@/types';
import { DeskMap } from '@/components/DeskMap';
import { ChatPanel } from '@/components/ChatPanel';

type StateMap = Record<string, DeskState>;

export default function Home() {
  const [states, setStates] = useState<StateMap>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/sse');

    es.onopen = () => setConnected(true);

    es.onmessage = (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as
        | { type: 'init'; desks: DeskState[] }
        | { type: 'update'; desk: DeskState };

      if (msg.type === 'init') {
        const map: StateMap = {};
        for (const d of msg.desks) map[d.id] = d;
        setStates(map);
      } else {
        setStates(prev => ({ ...prev, [msg.desk.id]: msg.desk }));
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  const reserve = (id: string) =>
    fetch(`/api/desks/${id}/reserve`, { method: 'POST' });

  const release = (id: string) =>
    fetch(`/api/desks/${id}/release`, { method: 'POST' });

  const counts = Object.values(states).reduce<Record<string, number>>(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    {}
  );
  const total = Object.keys(states).length;

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
    }}>
      {/* Left — desk map */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #1f2937', minWidth: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'baseline', gap: '1rem',
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            Desk Concierge
          </h1>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#22c55e' }}>{counts.free ?? 0} free</span>
            <span style={{ color: '#ef4444' }}>{counts.occupied ?? 0} occupied</span>
            <span style={{ color: '#eab308' }}>{counts.reserved ?? 0} reserved</span>
            <span style={{ color: '#374151' }}>/ {total} total</span>
          </div>
          {!connected && (
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280' }}>
              reconnecting…
            </span>
          )}
        </div>

        {/* Desk grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <DeskMap states={states} onReserve={reserve} onRelease={release} />
        </div>
      </div>

      {/* Right — chat */}
      <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid #1f2937',
          fontSize: '0.7rem', color: '#6b7280',
          textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0,
        }}>
          AI Concierge · Haiku
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
