import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

const dashboardPrefixes = [
  '/dashboard', '/projects', '/users', '/clients', '/tasks',
  '/notes', '/attendance', '/calendar', '/team', '/time-off',
  '/notifications', '/settings', '/profile', '/focus', '/announcements',
  '/wiki', '/search', '/decisions', '/waitlist', '/assistant',
];

function isRootDashboardPath(pathname: string): boolean {
  return dashboardPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export default auth((req) => {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;
    const isLoggedIn = !!req.auth?.user;

    if (isLoggedIn && isRootDashboardPath(pathname)) {
      const orgSlug = (req.auth?.user as any)?.orgSlug;
      if (orgSlug && !pathname.startsWith(`/${orgSlug}`)) {
        return Response.redirect(new URL(`/${orgSlug}${pathname}`, req.url));
      }
    }

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register') || nextUrl.pathname.startsWith('/verify-otp');

    const isLandingPage = nextUrl.pathname === '/';
    const isWiki = nextUrl.pathname.startsWith('/wiki');
    const isPublicRoute = isLandingPage || isWiki || nextUrl.pathname.startsWith('/invite') || nextUrl.pathname.startsWith('/api') || nextUrl.pathname.startsWith('/_next') || nextUrl.pathname.startsWith('/static') || nextUrl.pathname.includes('.');

    if (isLandingPage && isLoggedIn && nextUrl.searchParams.get('home') !== 'true') {
        return Response.redirect(new URL('/dashboard', nextUrl));
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return;
    }

    if (!isLoggedIn && !isPublicRoute) {
        let callbackUrl = nextUrl.pathname;
        if (nextUrl.search) {
            callbackUrl += nextUrl.search;
        }
        const encodedCallbackUrl = encodeURIComponent(callbackUrl);
        return Response.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
    }

    if (nextUrl.pathname.startsWith('/users')) {
        const hasAccess = req.auth?.user?.roles?.includes('super_admin');
        if (!hasAccess) {
             return Response.redirect(new URL('/dashboard', nextUrl));
        }
    }

    if (nextUrl.pathname.startsWith('/waitlist')) {
        const isSuperAdmin = req.auth?.user?.roles?.includes('super_admin');
        if (!isSuperAdmin) {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
    }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
