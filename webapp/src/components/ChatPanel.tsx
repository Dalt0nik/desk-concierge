'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hi! I can find you a free desk, make recommendations, or reserve a spot. What do you need?",
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Skip the local greeting — API conversation starts from first user message
        body: JSON.stringify({ messages: withUser.slice(1) }),
      });
      const { reply } = await res.json() as { reply: string };
      setMessages([...withUser, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...withUser, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) send();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            padding: '0.55rem 0.85rem',
            borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            background: m.role === 'user' ? '#1d4ed8' : '#1f2937',
            fontSize: '0.8rem',
            lineHeight: 1.55,
          }}>
            {m.role === 'assistant' ? (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p style={{ margin: '0 0 0.4em' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: '0.2em 0', paddingLeft: '1.2em' }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: '0.15em' }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                }}
              >
                {m.content}
              </ReactMarkdown>
            ) : m.content}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start', padding: '0.55rem 0.85rem',
            background: '#1f2937', borderRadius: '12px 12px 12px 2px',
            fontSize: '0.8rem', color: '#6b7280',
          }}>
            ...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem', borderTop: '1px solid #1f2937',
        display: 'flex', gap: '0.5rem',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask about desks..."
          disabled={loading}
          style={{
            flex: 1, padding: '0.55rem 0.75rem',
            background: '#111827', border: '1px solid #374151',
            borderRadius: '6px', color: '#f1f5f9',
            fontSize: '0.8rem', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: '0.55rem 1rem',
            background: loading || !input.trim() ? '#1f2937' : '#1d4ed8',
            border: 'none', borderRadius: '6px',
            color: loading || !input.trim() ? '#6b7280' : '#fff',
            fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: 600,
            transition: 'background 0.15s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
