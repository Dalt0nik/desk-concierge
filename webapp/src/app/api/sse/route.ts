import { sseEmitter, getAllStates } from '@/lib/state';
import type { DeskState } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const encoder = new TextEncoder();
  let onUpdate: (desk: DeskState) => void;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      send({ type: 'init', desks: getAllStates() });

      onUpdate = (desk) => send({ type: 'update', desk });
      sseEmitter.on('desk-update', onUpdate);

      // Heartbeat keeps proxies from closing idle connections
      const heartbeat = setInterval(
        () => controller.enqueue(encoder.encode(': ping\n\n')),
        30_000
      );

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        sseEmitter.off('desk-update', onUpdate);
      });
    },
    cancel() {
      sseEmitter.off('desk-update', onUpdate);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
