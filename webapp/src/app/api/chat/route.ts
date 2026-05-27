import { AzureOpenAI } from 'openai';
import { getAllStates, reserveDesk, releaseDesk } from '@/lib/state';
import { DESKS } from '@/config/desks';
import type { DeskState } from '@/types';

export const runtime = 'nodejs';

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-08-01-preview',
});

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'reserve_desk',
      description: 'Reserve a free desk. Sets its LED to yellow and marks it reserved.',
      parameters: {
        type: 'object' as const,
        properties: {
          desk_id: { type: 'string', description: 'Desk ID, e.g. "3"' },
        },
        required: ['desk_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'release_desk',
      description: 'Release a reservation, making the desk free again.',
      parameters: {
        type: 'object' as const,
        properties: {
          desk_id: { type: 'string', description: 'Desk ID, e.g. "3"' },
        },
        required: ['desk_id'],
      },
    },
  },
];

function buildSystem(states: DeskState[]): string {
  const byId = Object.fromEntries(states.map(s => [s.id, s.status]));
  const lines = DESKS.map(d => {
    const status = byId[d.id] ?? 'free';
    const feats = d.features.length ? d.features.join(', ') : 'basic';
    const tag = d.physical ? ' [physical sensor]' : '';
    return `  Desk ${d.id} (${d.label}) — zone: ${d.zone}, features: ${feats}, status: ${status}${tag}`;
  }).join('\n');

  return `You are the Desk Concierge for a hot-desking office.

Current desk map:
${lines}

Answer questions about availability, recommend desks based on preferences (quiet zone, window, standing desk, near kitchen, etc.), and reserve or release desks when asked. Only recommend free desks unless asked otherwise. Be concise.`;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      return Response.json(
        { error: 'Missing Azure OpenAI configuration. Set AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT in .env.local' },
        { status: 500 }
      );
    }

    const { messages }: { messages: ChatMessage[] } = await request.json();

    const apiMessages : any[]= [
      { role: 'system' as const, content: buildSystem(getAllStates()) },
      ...messages.map(m => ({
        role: m.role,
        content: m.content ?? '',
      })),
    ];

    let res = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_MODEL || 'gpt-5.4-nano',
      max_completion_tokens: 1024,
      tools: TOOLS,
      messages: apiMessages,
    } as any);

    // Agentic loop — handle all tool calls before replying
    while (
      res.choices[0]?.finish_reason === 'tool_calls' ||
      res.choices[0]?.finish_reason === 'function_call'
    ){
      const toolCalls = res.choices[0].message.tool_calls || [];

      const toolResults = toolCalls.map(toolCall => {
        const { desk_id } = JSON.parse(toolCall.function.arguments);
        const result =
          toolCall.function.name === 'reserve_desk' ? reserveDesk(desk_id) :
          toolCall.function.name === 'release_desk' ? releaseDesk(desk_id) :
          { ok: false, reason: 'Unknown tool' };

        return {
          role: 'tool' as const,
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        };
      });

      apiMessages.push(res.choices[0].message as any, ...toolResults);

      res = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_MODEL || 'gpt-5.4-nano',
        max_completion_tokens: 1024,
        tools: TOOLS,
        messages: apiMessages,
      } as any);
    }

    const reply = res.choices[0].message.content ?? '';
    return Response.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
