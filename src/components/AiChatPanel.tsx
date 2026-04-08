'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useAiChat, type AiModel } from '@/hooks/useAiChat';

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  kidId?: string;
  kidName?: string;
  choreStatus?: { name: string; completed: boolean; frequency: string }[];
}

const QUICK_ACTIONS = [
  { label: '✅ Mark chore done', message: 'I want to mark a chore as done' },
  { label: '💰 Check my allowance', message: 'How much allowance have I earned this week?' },
] as const;

export function AiChatPanel({ isOpen, onClose, kidId, kidName, choreStatus }: AiChatPanelProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    selectedModel,
    setSelectedModel,
    availableModels,
    error,
  } = useAiChat({ kidId, kidName, choreStatus });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleQuickAction = useCallback(
    (message: string) => {
      sendMessage(message);
    },
    [sendMessage]
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const model = availableModels.find((m) => m.id === e.target.value);
      if (model) setSelectedModel(model);
    },
    [availableModels, setSelectedModel]
  );

  const groupedModels = useMemo(() => {
    const groups: Record<string, AiModel[]> = {};
    for (const model of availableModels) {
      const key = model.provider;
      if (!groups[key]) groups[key] = [];
      groups[key] = [...groups[key], model];
    }
    return groups;
  }, [availableModels]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/30"
        style={{ zIndex: 200 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="animate-slide-in fixed right-0 top-0 flex h-full w-[400px] max-w-full flex-col bg-white shadow-2xl"
        style={{ zIndex: 201 }}
        role="dialog"
        aria-label="AI Chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--kid-primary)' }}>
            AI Assistant 🤖
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-xl text-2xl text-gray-500 transition-colors hover:text-gray-800"
            style={{ minWidth: 'var(--touch-min)', minHeight: 'var(--touch-min)' }}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Model selector */}
        <div className="border-b border-gray-100 px-4 py-2">
          <select
            value={selectedModel?.id ?? ''}
            onChange={handleModelChange}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
            aria-label="Select AI model"
          >
            {availableModels.length === 0 && (
              <option value="">No models available</option>
            )}
            {Object.entries(groupedModels).map(([provider, models]) => (
              <optgroup key={provider} label={provider}>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              Oops, I couldn&apos;t connect. Try again in a moment. 🤖
            </div>
          )}

          {messages.length === 0 && !error && (
            <p className="text-center text-base text-gray-400">
              Say hi! I&apos;m here to help with your chores. 😊
            </p>
          )}

          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-base ${
                  msg.role === 'user'
                    ? 'ml-auto bg-gray-100 text-gray-800'
                    : 'mr-auto text-gray-800'
                }`}
                style={
                  msg.role === 'assistant'
                    ? { backgroundColor: 'var(--kid-primary-alpha)' }
                    : undefined
                }
              >
                {msg.parts
                  ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p) => p.text)
                  .join('') || ''}
              </div>
            ))}
            {isLoading && (
              <div
                className="mr-auto max-w-[85%] rounded-2xl px-4 py-2 text-base text-gray-500"
                style={{ backgroundColor: 'var(--kid-primary-alpha)' }}
              >
                Thinking…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick actions + Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleQuickAction(action.message)}
                disabled={isLoading}
                className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors active:scale-95 disabled:opacity-50"
                style={{ minHeight: 'var(--touch-min)' }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-transparent focus:ring-2"
              style={{ minHeight: 'var(--touch-min)' }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl px-5 font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
              style={{
                minHeight: 'var(--touch-min)',
                minWidth: 'var(--touch-min)',
                backgroundColor: 'var(--kid-primary)',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
