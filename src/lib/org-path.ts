/**
 * Canonical organization-scoped URL builder.
 *
 * Every protected route in the app must be wrapped through `orgPath()`
 * so a user always knows which organization context they're in. The
 * backend is multi-tenant (Organization-scoped), and the App Router uses
 * `[orgSlug]` as the dynamic top-level segment, so every internal link
 * needs that prefix.
 *
 * Rules:
 *  - If an `orgSlug` is provided (truthy string), prepend `/{slug}`.
 *  - Otherwise return the path unchanged. This keeps public pages
 *    (/login, /register, /verify-otp, /no-organization, /privacy, /terms,
 *    the marketing root, etc.) untouched.
 *  - Always normalizes trailing slashes and collapses double slashes.
 */

export type ProtectedSegment =
  | "" | "dashboard" | "projects" | "tasks" | "notes" | "calendar"
  | "team" | "attendance" | "focus" | "wiki" | "profile" | "settings"
  | "users" | "clients" | "time-off" | "notifications" | "announcements"
  | "decisions" | "search" | "waitlist" | "assistant";

const PUBLIC_PREFIXES = [
  "/login", "/register", "/verify-otp", "/no-organization",
  "/privacy", "/terms", "/api", "/_next", "/favicon", "/logo", "/uploads",
  "/homepage",
];

// Mirrors `dashboardPrefixes` in `src/proxy.ts` — the set of top-level
// segments the middleware redirects to `/{orgSlug}/{segment}` when they
// arrive without an org prefix. `slugFromPath` must reject these as slug
// candidates for the same reason: `usePathname()` can transiently return a
// bare path like `/dashboard` (e.g. mid-flight during the post-login
// redirect, before the org-prefixed URL has settled), and without this
// guard the first segment — "dashboard" — gets treated as the org slug,
// producing a broken path like `/dashboard/settings` that the middleware
// then "fixes" into `/{realOrgSlug}/dashboard/settings`. Returning `null`
// here instead falls back to a bare path (e.g. `/settings`), which the
// middleware's own legacy-redirect already knows how to resolve correctly.
const RESERVED_TOP_LEVEL_SEGMENTS = new Set<ProtectedSegment>([
  "dashboard", "projects", "tasks", "notes", "calendar",
  "team", "attendance", "focus", "wiki", "profile", "settings",
  "users", "clients", "time-off", "notifications", "announcements",
  "decisions", "search", "waitlist", "assistant",
]);

function normalize(slug: string | null | undefined, ...segments: Array<string | number | undefined | null>): string {
  const cleaned = segments
    .filter((s): s is string | number => s !== undefined && s !== null && String(s).length > 0)
    .map((s) => String(s).replace(/^\/+|\/+$/g, "")); // strip leading/trailing slashes
  const tail = cleaned.length ? `/${cleaned.join("/")}` : "";
  const prefix = typeof slug === "string" && slug.length > 0 ? `/${slug}` : "";
  const full = `${prefix}${tail}`;
  // Collapse any accidental "//" that came from empty segments.
  return full.replace(/\/{2,}/g, "/") || "/";
}

export function orgPath(slug: string | null | undefined, ...segments: Array<string | number | undefined | null>): string {
  return normalize(slug, ...segments);
}

/**
 * Same as `orgPath`, but always returns a non-org path — useful when
 * you specifically want the public/unscoped version of a route.
 */
export function unOrgPath(...segments: Array<string | number | undefined | null>): string {
  return normalize(undefined, ...segments);
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

/**
 * Extract the orgSlug from a pathname like `/acme-corp/users/123` → `"acme-corp"`.
 * Returns `null` for public paths so the caller can decide.
 */
export function slugFromPath(pathname: string): string | null {
  if (isPublicRoute(pathname)) return null;
  const seg = pathname.split("/").filter(Boolean);
  const candidate = seg[0] ?? null;
  if (candidate && RESERVED_TOP_LEVEL_SEGMENTS.has(candidate as ProtectedSegment)) return null;
  return candidate;
}

/**
 * Strip the orgSlug prefix from a pathname — useful when you need the
 * "inner" path within an org context.
 */
export function stripOrgSlug(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  return "/" + seg.slice(1).join("/");
}
