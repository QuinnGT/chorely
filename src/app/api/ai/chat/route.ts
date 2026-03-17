import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ollama } from 'ollama-ai-provider';
import { chatRequestSchema } from '@/lib/validators';

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const { messages, model, provider } = chatRequestSchema.parse(body);

    let modelInstance;

    if (provider === 'openrouter') {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      modelInstance = openrouter(model);
    } else {
      modelInstance = ollama(model, {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      } as Record<string, unknown>);
    }

    const result = streamText({
      model: modelInstance,
      system: `You are a friendly, helpful family assistant on a Family Command Center dashboard. 
You help kids with their chores, answer questions, and provide encouragement.
Keep responses short, positive, and age-appropriate.
Use emojis to make responses fun and engaging.
If asked about inappropriate topics, politely redirect to family-friendly subjects.`,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('AI chat error:', error);
    return new Response(JSON.stringify({ error: 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
