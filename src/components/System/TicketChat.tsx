'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { notify } from '@/lib/systemNotify';

type ChatMessage = { id: string; sender: string; mine: boolean; message: string; createdAt: string };

export function TicketChat({ ticketId }: { ticketId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/rms/tickets/chat?id=${encodeURIComponent(ticketId)}`, {
      credentials: 'include',
      cache: 'no-store'
    });
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      messages?: ChatMessage[];
    };
    setLoading(false);
    if (!response.ok || !data.ok) {
      setError(data.error || 'Could not load chat.');
      return;
    }
    setError('');
    setMessages(data.messages || []);
  }, [ticketId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const response = await fetch('/api/rms/tickets/chat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticketId, message: text })
    });
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      emailed?: boolean;
      messages?: ChatMessage[];
    };
    setSending(false);
    if (!response.ok || !data.ok) {
      notify.error('Message not sent', data.error || 'Try again.');
      return;
    }
    setText('');
    setMessages(data.messages || []);
    notify.success(
      'Message sent',
      data.emailed ? 'Posted on Help Desk and emailed to the customer.' : 'Posted on Help Desk.'
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60">
      <p className="px-3 py-2 border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
        Chat with customer
      </p>
      <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-2">
        {loading ? <p className="text-xs text-slate-500">Loading chat...</p> : null}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        {!loading && !error && messages.length === 0 ? <p className="text-xs text-slate-500">No messages yet.</p> : null}
        {messages.map((item) => (
          <div key={item.id} className={`flex ${item.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 ${
                item.mine ? 'bg-teal-700/60 text-white' : 'bg-slate-800 text-slate-100'
              }`}
            >
              <p className="text-[10px] text-slate-300/80">
                {item.mine ? 'You' : item.sender} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
              </p>
              <p className="text-xs whitespace-pre-wrap break-words mt-0.5">{item.message}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-2 border-t border-slate-800">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write to the customer..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
