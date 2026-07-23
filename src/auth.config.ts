import type { NextAuthConfig } from 'next-auth';
import type { Session } from 'next-auth';

type NextAuthTokenShape = {
  id?: string;
  roles?: string[];
  picture?: string;
  accessToken?: string;
  currentOrganizationId?: string | null;
  orgRole?: string;
  orgSlug?: string;
  orgName?: string | null;
};

const protectedPrefixes = [
  '/dashboard', '/projects', '/users', '/clients', '/tasks',
  '/notes', '/attendance', '/calendar', '/team', '/time-off',
  '/notifications', '/settings', '/profile', '/focus', '/announcements',
  '/wiki', '/search', '/decisions', '/waitlist', '/assistant',
];

function matchProtectedRoute(pathname: string): boolean {
  if (protectedPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const innerPath = '/' + segments.slice(1).join('/');
    return protectedPrefixes.some(p => innerPath === p || innerPath.startsWith(p + '/'));
  }
  return false;
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      if (matchProtectedRoute(nextUrl.pathname)) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
    async session({ session, token }: { session: Session; token: Record<string, unknown> }) {
      if (token) {
        const tk = token as NextAuthTokenShape;
        if (typeof tk.id === 'string') {
          session.user.id = tk.id;
        }
        if (Array.isArray(tk.roles)) {
          session.user.roles = tk.roles;
        }
        if (typeof tk.picture === 'string') {
            session.user.image = tk.picture;
        }
        if (typeof tk.accessToken === 'string') {
            (session.user as { accessToken?: string }).accessToken = tk.accessToken;
        }
        if (tk.currentOrganizationId !== undefined) {
            (session.user as { currentOrganizationId?: string | null }).currentOrganizationId = tk.currentOrganizationId;
        }
        if (typeof tk.orgRole === 'string') {
          (session.user as { orgRole?: string }).orgRole = tk.orgRole;
        }
        if (typeof tk.orgSlug === 'string') {
          (session.user as { orgSlug?: string }).orgSlug = tk.orgSlug;
        }
        if (tk.orgName !== undefined && tk.orgName !== null) {
          (session.user as { orgName?: string | null }).orgName = tk.orgName;
        }
      }
      return session;
    },
    async jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string; roles?: string[]; accessToken?: string; currentOrganizationId?: string | null; avatarUrl?: string | null; orgRole?: string; orgSlug?: string; orgName?: string | null } }) {
        if (user) {
            const newToken: Record<string, unknown> = {
                ...token,
                id: user.id as string,
                roles: user.roles || ['staff'],
            };
            if (user.accessToken) {
                newToken.accessToken = user.accessToken;
            }
            if (user.currentOrganizationId !== undefined) {
                newToken.currentOrganizationId = user.currentOrganizationId;
            }
            if (user.avatarUrl) {
                newToken.picture = user.avatarUrl;
            }
            if (user.orgRole) {
              newToken.orgRole = user.orgRole;
            }
            if (user.orgSlug) {
              newToken.orgSlug = user.orgSlug;
            }
            if (user.orgName !== undefined && user.orgName !== null) {
              newToken.orgName = user.orgName;
            }
            return newToken;
        }
        return token;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
