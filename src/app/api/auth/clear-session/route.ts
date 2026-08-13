import { NextRequest, NextResponse } from 'next/server';

function redirectToCleanLogout(request: NextRequest) {
  const requestedNext = request.nextUrl.searchParams.get('next');
  const safeNext = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/login';
  const logoutUrl = new URL('/logout', request.url);
  logoutUrl.searchParams.set('next', safeNext);
  return NextResponse.redirect(logoutUrl, { status: 303 });
}

export async function GET(request: NextRequest) {
  return redirectToCleanLogout(request);
}

export async function POST(request: NextRequest) {
  return redirectToCleanLogout(request);
}
