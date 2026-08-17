import { getSearchEntries } from '../../lib/content';

export const dynamic = 'force-static';

export async function GET() {
  return Response.json(await getSearchEntries(), {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
