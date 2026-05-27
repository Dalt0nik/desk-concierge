import { releaseDesk } from '@/lib/state';

export const runtime = 'nodejs';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = releaseDesk(id);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
