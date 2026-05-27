import { getAllStates } from '@/lib/state';

export const runtime = 'nodejs';

export function GET() {
  return Response.json(getAllStates());
}
