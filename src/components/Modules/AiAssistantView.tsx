'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  User,
  Bot,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Target,
  LifeBuoy,
  Cpu,
  Layers,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  Zap,
  Clock,
  Gauge
} from 'lucide-react';
import { auth } from '../../services/auth';
import { storage } from '../../services/storage';
import { askAiAssistant, checkLiveTypo, AiChatMessage } from '../../services/aiAssistantService';

export const AiAssistantView: React.FC = () => {
  const currentUser = auth.getCurrentUser();
  const settings = storage.getSettings();
  const isAdmin = Boolean(currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'administrator');

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    const welcomeText = isAdmin
      ? `### Welcome to Logics AI

Hello **${currentUser?.fullName || 'Administrator'}**. I am **Logics AI**, your system copilot.

I can help with module access, daily work logs, helpdesk tickets, KPIs, and reports. Type naturally — I detect typos and respond from live system data.

How can Logics AI help you today?`
      : `### Welcome to Logics AI

Hello **${currentUser?.fullName || 'User'}**. I am **Logics AI**, your ICT assistant.

I can help you review your permitted modules, record daily activities, troubleshoot IT tickets, and understand ICT standard operating procedures. Type naturally — I detect typos and respond on time.`;

    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Logics AI Engine',
        responseTimeMs: 80
      }
    ];
  });

  const [liveTypo, setLiveTypo] = useState<{ hasTypo: boolean; suggestion?: string; corrections: Array<{ original: string; corrected: string }> }>({
    hasTypo: false,
    corrections: []
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Real-time keystroke typo detection
  useEffect(() => {
    const result = checkLiveTypo(input);
    setLiveTypo(result);
  }, [input]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const typoCheck = checkLiveTypo(query);
    const startTime = Date.now();

    const userMsg: AiChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detectedCorrections: typoCheck.corrections,
      suggestedCorrection: typoCheck.suggestion
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askAiAssistant(query, messages);
      const elapsed = Date.now() - startTime;
      const assistantMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detectedCorrections: response.detectedCorrections,
        suggestedCorrection: response.correctedText,
        source: response.source || 'Logics AI Engine',
        responseTimeMs: response.responseTimeMs || elapsed
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: AiChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: '⚠️ Logics AI encountered an unexpected interruption. Please re-enter your question.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Logics AI Fallback',
        responseTimeMs: Date.now() - startTime
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTypoFix = () => {
    if (liveTypo.suggestion) {
      setInput(liveTypo.suggestion);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'assistant',
        text: `### Logics AI Cleared\n\nHow can Logics AI help you right now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'Logics AI Engine',
        responseTimeMs: 30
      }
    ]);
  };

  const quickPrompts = isAdmin
    ? [
        { label: '👥 How many users and what modules can they access?', query: 'How many users are registered and what modules can they access?' },
        { label: '💡 Test Typo: "whos acces to moduls and kpiz?"', query: 'whos acces to moduls and kpiz?' },
        { label: '🎯 Summarize ICT KPIs & JD Scorecard', query: 'Summarize our strategic ICT KPIs and achievement progress.' },
        { label: '🎫 Open Helpdesk Tickets & SLA', query: 'What are the current open support tickets and SLA status?' },
        { label: '💻 Infrastructure Uptime', query: 'What is the current infrastructure and systems uptime status?' }
      ]
    : [
        { label: '🔐 What modules do I have access to?', query: 'What modules do I have access to in the system?' },
        { label: '📝 How do I log my daily work?', query: 'How do I log a daily activity and attach evidence?' },
        { label: '🎫 Helpdesk SLA & Ticket Rules', query: 'What is the expected resolution SLA for IT tickets?' },
        { label: '💡 Test Typo: "hw to submti a tickt"', query: 'hw to submti a tickt' }
      ];

  // Markdown-like text formatter
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5 flex items-center gap-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-xs font-bold text-teal-300 mt-2 mb-1">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-2 border-teal-500 pl-3 py-1 my-2 text-slate-300 bg-teal-500/5 rounded-r text-xs italic">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 text-xs text-slate-200">
            <span className="text-teal-400 mt-1">•</span>
            <span>{renderFormattedInline(content)}</span>
          </div>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-xs text-slate-200 pl-1 font-medium">
            <span>{renderFormattedInline(line)}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return <p key={idx} className="text-xs text-slate-200 my-0.5 leading-relaxed">{renderFormattedInline(line)}</p>;
    });
  };

  const renderFormattedInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-800 text-teal-300 px-1 py-0.5 rounded font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-slate-300 italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Top Logics AI Bar */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Logics AI</span>
                <span className="text-slate-400 font-normal">System Copilot</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sub-Second Speed
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              <span>
                Connected for {currentUser?.fullName} ({currentUser?.role})
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[10px] text-slate-300 font-mono">
            <Gauge className="w-3.5 h-3.5 text-teal-400" />
            <span>High Scalability Engine</span>
          </div>

          {isAdmin && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-950/60 border border-violet-800/40 text-[11px] text-violet-300">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Full Privileges</span>
            </div>
          )}

          <button
            onClick={handleResetChat}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/60 px-5 py-2 overflow-x-auto flex items-center gap-2 no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Logics Queries:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.query)}
            disabled={loading}
            className="shrink-0 text-xs px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className="space-y-1 max-w-[85%]">
              <div
                className={`p-4 rounded-2xl text-xs ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-none shadow-md'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none shadow-md'
                }`}
              >
                {formatText(msg.text)}
              </div>

              {/* Typo indicator if user typed mistakes */}
              {msg.sender === 'user' && msg.detectedCorrections && msg.detectedCorrections.length > 0 && (
                <div className="text-[10px] text-teal-300 flex items-center gap-1 justify-end font-mono">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  <span>Logics AI understood: {msg.detectedCorrections.map(c => `"${c.original}" -> "${c.corrected}"`).join(', ')}</span>
                </div>
              )}

              {/* Response timing, source, and timestamp */}
              <div
                className={`text-[10px] text-slate-500 flex items-center gap-2 px-1 ${
                  msg.sender === 'user' ? 'justify-end' : ''
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.sender === 'assistant' && (
                  <>
                    <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-teal-300 border border-slate-700/60 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-teal-400" />
                      <span>{msg.responseTimeMs ? (msg.responseTimeMs < 1000 ? `${msg.responseTimeMs}ms` : `${(msg.responseTimeMs / 1000).toFixed(2)}s`) : '<0.2s'}</span>
                    </span>
                    {msg.source && (
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400">
                        {msg.source}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 max-w-xl animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Zap className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-4 text-xs text-slate-300 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.15s]" />
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.3s]" />
              <span className="text-slate-300 font-mono text-[11px] ml-1">Logics AI generating real-time response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Real-time Human Typing / Typo Auto-Detection Banner */}
      {liveTypo.hasTypo && liveTypo.suggestion && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-5 py-2 flex items-center justify-between gap-3 text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Typo detected: Did you mean <strong className="text-white underline">"{liveTypo.suggestion}"</strong>?
            </span>
          </div>
          <button
            onClick={handleApplyTypoFix}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-[11px] font-bold transition-colors shrink-0"
          >
            Fix spelling
          </button>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Logics AI about modules, daily logging, tickets, or SOPs..."
            disabled={loading}
            className="w-full pl-4 pr-24 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1"
            >
              <span>Ask Logics</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
          <span>⚡ Logics AI responds on time • Typo auto-detection active</span>
          <span>Scalability: Memory Caching & Rate-Guarded</span>
        </div>
      </div>
    </div>
  );
};
