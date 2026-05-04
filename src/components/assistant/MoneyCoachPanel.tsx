import React, { useEffect, useRef, useState } from 'react';
import { useMoneyCoach } from '../../context/MoneyCoachContext';
import type { ChatMessage } from '../../hooks/useAssistantChat';

type MoneyCoachPanelProps = {
  messages: ChatMessage[];
  loading: boolean;
  loadingHistory: boolean;
  error: string | null;
  onDismissError: () => void;
  onSend: (text: string) => void;
};

export default function MoneyCoachPanel({
  messages,
  loading,
  loadingHistory,
  error,
  onDismissError,
  onSend,
}: MoneyCoachPanelProps) {
  const { isOpen, closeCoach, draftSeed, clearDraftSeed, referenceDate } = useMoneyCoach();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setInput('');
      return;
    }
    if (draftSeed) {
      setInput(draftSeed);
      clearDraftSeed();
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isOpen, draftSeed, clearDraftSeed]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, loading]);

  if (!isOpen) return null;

  const monthLabel = referenceDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    onSend(t);
  };

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="money-coach-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Close coach"
        onClick={closeCoach}
      />
      <div className="relative flex max-h-[min(640px,92vh)] w-full max-w-lg flex-col rounded-t-2xl border border-border-subtle bg-surface-1 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div>
            <h2 id="money-coach-title" className="font-display text-sm font-semibold tracking-wide text-text-primary">
              Money Coach
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">Snapshot: {monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={closeCoach}
            className="rounded-lg px-2 py-1 text-sm text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
          >
            Close
          </button>
        </div>

        <p className="border-b border-border-subtle bg-surface-2/80 px-4 py-2 text-[11px] leading-relaxed text-text-muted">
          Tips and education only — not tax, legal, or investment advice. The coach can be wrong; verify important
          numbers in the app.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loadingHistory && messages.length === 0 ? (
            <p className="text-center text-sm text-text-muted">Loading conversation…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-text-secondary">
              Ask for budgeting tips, help reading your snapshot, or habits to try this week.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto bg-accent/15 text-text-primary'
                      : 'mr-auto border border-border-subtle bg-surface-2 text-text-primary'
                  }`}
                >
                  {m.content}
                </li>
              ))}
            </ul>
          )}
          {loading && (
            <p className="mt-3 text-center text-xs text-text-muted" aria-live="polite">
              Thinking…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <span>{error}</span>
            <button type="button" className="shrink-0 underline" onClick={onDismissError}>
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-border-subtle p-3">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder="Ask the coach…"
              disabled={loading}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-0 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="self-end rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
