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
  return seg[0] ?? null;
}

/**
 * Strip the orgSlug prefix from a pathname — useful when you need the
 * "inner" path within an org context.
 */
export function stripOrgSlug(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  return "/" + seg.slice(1).join("/");
}
