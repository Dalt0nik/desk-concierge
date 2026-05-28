'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DeskState } from '@/types';
import { DeskMap } from '@/components/DeskMap';
import { ChatPanel } from '@/components/ChatPanel';
import { DESKS, Feature } from '@/config/desks';

type StateMap = Record<string, DeskState>;

export default function Home() {
  const [states, setStates] = useState<StateMap>({});
  const [connected, setConnected] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Feature[]>([]);

  const allTags = useMemo<Feature[]>(() => {
    const set = new Set<Feature>();
    for (const d of DESKS) for (const f of d.features) set.add(f);
    return Array.from(set).sort();
  }, []);

  const toggleTag = (tag: Feature) =>
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );

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
            <span style={{ color: '#6b7280' }}>/ {total} total</span>
          </div>
          {!connected && (
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280' }}>
              reconnecting…
            </span>
          )}
        </div>

        {/* Tag filter bar */}
        <div style={{
          padding: '0.6rem 1.5rem', borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          flexWrap: 'wrap', flexShrink: 0,
        }}>
          <span style={{
            fontSize: '0.72rem', color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginRight: '0.25rem', fontWeight: 600,
          }}>
            Filter
          </span>
          {allTags.map(tag => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '0.25rem 0.65rem', fontSize: '0.75rem',
                  fontFamily: 'inherit', cursor: 'pointer',
                  background: active ? '#eab308' : '#1f2937',
                  color: active ? '#0f0f0f' : '#9ca3af',
                  border: `1px solid ${active ? '#eab308' : '#374151'}`,
                  borderRadius: '999px',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              style={{
                marginLeft: '0.25rem', padding: '0.25rem 0.65rem',
                fontSize: '0.75rem', fontFamily: 'inherit', cursor: 'pointer',
                background: 'transparent', color: '#6b7280',
                border: '1px solid transparent', borderRadius: '999px',
              }}
            >
              clear
            </button>
          )}
        </div>

        {/* Desk grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <DeskMap
            states={states}
            onReserve={reserve}
            onRelease={release}
            highlightTags={selectedTags}
          />
        </div>
      </div>

      {/* Right — chat */}
      <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid #1f2937',
          fontSize: '0.8rem', color: '#94a3b8',
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
