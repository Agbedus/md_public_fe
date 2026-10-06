import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Identity only: never expose the backend bearer token to this public check. */
export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json(session?.user?.id ? {
      user: { id: session.user.id, email: session.user.email ?? null },
    } : {}, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'Could not check your session.' }, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }
}
