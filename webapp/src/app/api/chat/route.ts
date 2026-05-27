import Anthropic from '@anthropic-ai/sdk';
import { getAllStates, reserveDesk, releaseDesk } from '@/lib/state';
import { DESKS } from '@/config/desks';
import type { DeskState } from '@/types';

export const runtime = 'nodejs';

const anthropic = new Anthropic();

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'reserve_desk',
    description: 'Reserve a free desk. Sets its LED to yellow and marks it reserved.',
    input_schema: {
      type: 'object' as const,
      properties: {
        desk_id: { type: 'string', description: 'Desk ID, e.g. "3"' },
      },
      required: ['desk_id'],
    },
  },
  {
    name: 'release_desk',
    description: 'Release a reservation, making the desk free again.',
    input_schema: {
      type: 'object' as const,
      properties: {
        desk_id: { type: 'string', description: 'Desk ID, e.g. "3"' },
      },
      required: ['desk_id'],
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
  const { messages }: { messages: ChatMessage[] } = await request.json();

  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildSystem(getAllStates()),
    tools: TOOLS,
    messages: apiMessages,
  });

  // Agentic loop — handle all tool calls before replying
  while (res.stop_reason === 'tool_use') {
    const toolBlocks = res.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
    );

    const results: Anthropic.Messages.ToolResultBlockParam[] = toolBlocks.map(block => {
      const { desk_id } = block.input as { desk_id: string };
      const result =
        block.name === 'reserve_desk' ? reserveDesk(desk_id) :
        block.name === 'release_desk' ? releaseDesk(desk_id) :
        { ok: false, reason: 'Unknown tool' };

      return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
    });

    apiMessages.push(
      { role: 'assistant', content: res.content },
      { role: 'user', content: results }
    );

    res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: buildSystem(getAllStates()),
      tools: TOOLS,
      messages: apiMessages,
    });
  }

  const text = res.content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text');
  return Response.json({ reply: text?.text ?? '' });
}
