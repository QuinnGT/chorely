import { NextResponse } from 'next/server';

interface AIModel {
  id: string;
  name: string;
  provider: 'openrouter' | 'ollama';
  description?: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

async function fetchOpenRouterModels(): Promise<AIModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as OpenRouterResponse;
    return data.data.map((model) => ({
      id: model.id,
      name: model.name,
      provider: 'openrouter' as const,
      description: model.description,
    }));
  } catch {
    console.error('Failed to fetch OpenRouter models');
    return [];
  }
}

async function fetchOllamaModels(): Promise<AIModel[]> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) return [];

    const data = (await response.json()) as OllamaTagsResponse;
    return data.models.map((model) => ({
      id: model.name,
      name: model.name,
      provider: 'ollama' as const,
    }));
  } catch {
    // Ollama not running — that's fine
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const [openrouterModels, ollamaModels] = await Promise.all([
      fetchOpenRouterModels(),
      fetchOllamaModels(),
    ]);

    return NextResponse.json({
      models: [...ollamaModels, ...openrouterModels],
      providers: {
        openrouter: openrouterModels.length > 0,
        ollama: ollamaModels.length > 0,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to fetch AI models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
