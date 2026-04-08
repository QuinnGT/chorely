import { streamText, stepCountIs, type LanguageModel } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ollama } from 'ollama-ai-provider';
import { chatRequestSchema } from '@/lib/validators';
import { buildSystemPrompt, type KidContext } from '@/lib/ai-context-builder';
import { buildAiTools } from '@/lib/ai-tools';

const DEFAULT_SYSTEM_PROMPT = `You are a friendly, helpful family assistant on the Chorely dashboard. 
You help kids with their chores, answer questions, and provide encouragement.
Keep responses short, positive, and age-appropriate.
Use emojis to make responses fun and engaging.
If asked about inappropriate topics, politely redirect to family-friendly subjects.

You can take actions for the kid:
- When a kid says they finished a chore, use the completeChore tool to mark it done. Match the chore name from their chore list.
- When a kid wants to save up for something, use the addSavingsGoal tool. Ask for the item name and target amount if not provided.
After using a tool, tell the kid what you did in a fun, encouraging way.`;

function buildEnrichedSystemPrompt(kidContext?: KidContext): string {
  if (!kidContext) {
    return DEFAULT_SYSTEM_PROMPT;
  }
  const contextPrompt = buildSystemPrompt(kidContext);
  return `${contextPrompt}\n${DEFAULT_SYSTEM_PROMPT}`;
}

async function retrieveKidMemories(
  kidId: string,
  messages: { role: string; content: string }[]
): Promise<string | null> {
  try {
    const mem0ApiKey = process.env.MEM0_API_KEY;
    if (!mem0ApiKey) {
      return null;
    }

    const { retrieveMemories } = await import('@mem0/vercel-ai-provider');
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage) {
      return null;
    }

    const memories = await retrieveMemories(lastUserMessage.content, {
      user_id: kidId,
      mem0ApiKey,
    });

    return memories || null;
  } catch (error: unknown) {
    console.error('Mem0 retrieveMemories error:', error);
    return null;
  }
}

async function storeKidMemories(
  kidId: string,
  messages: { role: string; content: string }[]
): Promise<void> {
  try {
    const mem0ApiKey = process.env.MEM0_API_KEY;
    if (!mem0ApiKey) {
      return;
    }

    const { addMemories } = await import('@mem0/vercel-ai-provider');
    const mem0Messages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: [{ type: 'text' as const, text: m.content }],
    }));

    await addMemories(mem0Messages, {
      user_id: kidId,
      mem0ApiKey,
    });
  } catch (error: unknown) {
    console.error('Mem0 addMemories error:', error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const parsed = chatRequestSchema.parse(body);
    const { messages, kidId, kidContext } = parsed;

    // Default to openrouter with a sensible model if not specified
    const provider = parsed.provider ?? (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'ollama');
    const model = parsed.model ?? (provider === 'openrouter' ? 'google/gemini-2.0-flash-001' : 'llama3.2');

    let modelInstance: LanguageModel;

    if (provider === 'openrouter') {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      modelInstance = openrouter(model) as LanguageModel;
    } else {
      modelInstance = ollama(model, {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      } as Record<string, unknown>) as unknown as LanguageModel;
    }

    const systemPrompt = buildEnrichedSystemPrompt(kidContext);

    // Retrieve Mem0 memories for the kid if available
    const memories = kidId
      ? await retrieveKidMemories(kidId, messages)
      : null;

    const enrichedSystemPrompt = memories
      ? `${systemPrompt}\n\nPrevious conversation context:\n${memories}`
      : systemPrompt;

    const tools = kidId ? buildAiTools(kidId) : undefined;

    const result = streamText({
      model: modelInstance,
      system: enrichedSystemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools,
      stopWhen: tools ? stepCountIs(3) : stepCountIs(1),
    });

    // Store memories asynchronously (fire-and-forget, don't block response)
    if (kidId) {
      storeKidMemories(kidId, messages).catch((error: unknown) => {
        console.error('Mem0 background store error:', error);
      });
    }

    return result.toUIMessageStreamResponse();
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
