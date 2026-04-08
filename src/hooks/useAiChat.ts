'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { formatDate } from '@/lib/date-utils';

export interface AiModel {
  id: string;
  name: string;
  provider: 'openrouter' | 'ollama';
}

interface UseAiChatOptions {
  kidId?: string;
  kidName?: string;
  choreStatus?: { name: string; completed: boolean; frequency: string }[];
}

interface UseAiChatResult {
  messages: UIMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  selectedModel: AiModel | null;
  setSelectedModel: (model: AiModel) => void;
  availableModels: AiModel[];
  error: string | null;
}

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatResult {
  const [availableModels, setAvailableModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModelState] = useState<AiModel | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Fetch available models on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchModels() {
      try {
        const res = await fetch('/api/ai/models');
        if (!res.ok) throw new Error('Failed to fetch models');

        const data = (await res.json()) as {
          models: AiModel[];
          providers: { openrouter: boolean; ollama: boolean };
        };

        if (!cancelled) {
          setAvailableModels(data.models);
          if (data.models.length > 0) {
            setSelectedModelState(data.models[0]);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load models';
          setModelsError(message);
        }
      }
    }

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const kidContext = useMemo(() => {
    if (!options.kidId || !options.kidName) return undefined;
    return {
      kidName: options.kidName,
      currentDate: formatDate(new Date()),
      choreStatus: options.choreStatus ?? [],
      allowanceBalance: { base: 0, bonus: 0, total: 0 },
      streakDays: 0,
      savingsGoals: [],
      spendingCategories: [],
      achievements: [],
    };
  }, [options.kidId, options.kidName, options.choreStatus]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        body: {
          model: selectedModel?.id ?? '',
          provider: selectedModel?.provider ?? 'ollama',
          kidId: options.kidId,
          kidContext,
        },
      }),
    [selectedModel, options.kidId, kidContext]
  );

  const chat = useChat({ transport });

  const isLoading = chat.status === 'submitted' || chat.status === 'streaming';

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setInput('');
      await chat.sendMessage({ text });
    },
    [chat]
  );

  const handleSetSelectedModel = useCallback((model: AiModel) => {
    setSelectedModelState(model);
  }, []);

  const chatError = chat.error ? chat.error.message : null;
  const combinedError = modelsError ?? chatError ?? null;

  return {
    messages: chat.messages,
    input,
    setInput,
    sendMessage: handleSendMessage,
    isLoading,
    selectedModel,
    setSelectedModel: handleSetSelectedModel,
    availableModels,
    error: combinedError,
  };
}
