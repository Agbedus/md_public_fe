import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { getSessionHeaders } from '@/lib/server-auth';

const BACKEND_URL =
  process.env.BASE_URL_LOCAL ||
  process.env.BASE_URL_PRODUCTION ||
  'http://127.0.0.1:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const session = await auth();
  if (!session?.user?.accessToken) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { requestId } = await params;
  if (!/^\d+$/.test(requestId)) {
    return NextResponse.json({ error: 'Invalid attachment request.' }, { status: 400 });
  }

  const response = await fetch(`${BACKEND_URL}/api/v1/time-off/${requestId}/attachment`, {
    headers: await getSessionHeaders(),
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: response.status === 404 ? 'Attachment not found.' : 'Could not open the attachment.' },
      { status: response.status },
    );
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': response.headers.get('content-disposition') || 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
