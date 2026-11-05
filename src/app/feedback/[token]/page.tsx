'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Comment = {
  id: string;
  role: 'boss' | 'ibrahim';
  author: string;
  body: string;
  createdAt: string;
};

export default function ReportFeedbackPage() {
  const params = useParams();
  const token = String(params.token || '');
  const [period, setPeriod] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/share/feedback?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || 'This feedback link is not valid.');
        setLoading(false);
        return;
      }
      setPeriod(data.period || data.month || '');
      setCompanyName(data.companyName || '');
      setComments(data.comments || []);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    const res = await fetch('/api/share/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, author, email, body: message })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not send feedback.');
      return;
    }
    setComments(data.comments || []);
    setMessage('');
    setStatus('Thank you. Your comment was sent for this report.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <p className="text-[11px] uppercase tracking-wide text-teal-400 font-bold">Report feedback</p>
        <h1 className="text-xl font-black text-white">{period || 'Monthly report'}</h1>
        <p className="text-xs text-slate-400">{companyName}</p>
        {loading ? <p className="text-sm text-slate-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {status ? <p className="text-sm text-teal-300">{status}</p> : null}
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {comments.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[11px] text-slate-500">
                {item.author} · {item.role === 'ibrahim' ? 'Ibrahim' : 'Reviewer'}
              </p>
              <p className="text-sm text-slate-200 mt-1">{item.body}</p>
            </div>
          ))}
        </div>
        {!error ? (
          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Comment on this monthly report"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold">
              Send feedback
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
