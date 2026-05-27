import { AzureOpenAI } from 'openai';
import { getAllStates, reserveDesk, releaseDesk } from '@/lib/state';
import { DESKS, PODS } from '@/config/desks';
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

  const podSections = PODS.map(pod => {
    const desks = DESKS.filter(d => d.pod === pod.id);
    const lines = desks.map(d => {
      const status = byId[d.id] ?? 'free';
      const feats = d.features.length ? d.features.join(', ') : 'none';
      const tag = d.physical ? ' [physical sensor]' : '';
      return `    ${d.id} (${d.label}): features=${feats}, status=${status}${tag}`;
    }).join('\n');
    const free = desks.filter(d => (byId[d.id] ?? 'free') === 'free').length;
    return `  Pod ${pod.name} (${pod.zone}, ${free}/${desks.length} free):\n${lines}`;
  }).join('\n');

  return `You are the Desk Concierge for a hot-desking office with 40 desks across 8 team pods.

${podSections}

Answer questions about availability, recommend desks based on preferences (quiet, window, standing, near kitchen, dual-monitor, etc.), and reserve or release desks when asked. Reference desks by label (e.g. "A1") or ID. Only recommend free desks unless asked otherwise. Be concise.`;
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

    const apiMessages = [
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
    while (res.choices[0]?.finish_reason === 'tool_calls') {
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

      apiMessages.push(
        { role: 'assistant', content: res.choices[0].message.content ?? '' },
        ...toolResults
      );

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
