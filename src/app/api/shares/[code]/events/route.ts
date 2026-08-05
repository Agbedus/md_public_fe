import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || 'http://127.0.0.1:8000';
const FORWARDED_TELEMETRY_HEADERS = [
  'user-agent',
  'accept-language',
  'referer',
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ipcountry',
  'x-vercel-ip-country',
] as const;

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = await auth();
  const payload = await request.json();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  for (const name of FORWARDED_TELEMETRY_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }

  if (session?.user?.accessToken) {
    headers.Authorization = `Bearer ${session.user.accessToken}`;
  }

  const response = await fetch(`${BACKEND_URL}/api/v1/shares/${encodeURIComponent(code)}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
