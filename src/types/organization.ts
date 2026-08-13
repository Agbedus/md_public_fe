/**
 * Org-scoped role types and presentation constants.
 *
 * `OrgRole` is the lowercase string returned by the frontend shim
 * (kept for backward compatibility with existing call sites).
 *
 * `OrgRoleValue` matches the backend enum strings exactly so it can be
 * compared against raw API payloads without lowercasing gymnastics.
 */

export type OrgRole = "owner" | "admin" | "manager" | "member" | "guest";
export type MembershipStatus = "pending" | "active" | "suspended";

export const OrgRoleValue = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
} as const;
export type OrgRoleValueType = typeof OrgRoleValue[keyof typeof OrgRoleValue];

/** Every org role, most privileged first. */
export const ORG_ROLES: OrgRole[] = ["owner", "admin", "manager", "member", "guest"];

/**
 * `client` was an org role the frontend once anticipated; the backend enum went
 * straight from OWNER/ADMIN/MEMBER to the five roles above and never stored it.
 * `guest` is its successor, so anything stale that still says "client" is read
 * as a guest rather than falling through to an unknown role.
 */
const LEGACY_ROLE_ALIASES: Record<string, OrgRole> = { client: "guest" };

export const MembershipStatusValue = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;
export type MembershipStatusValueType =
  typeof MembershipStatusValue[keyof typeof MembershipStatusValue];

/**
 * Normalize any casing or legacy spelling to the canonical lowercase role.
 * Returns null when the value is not a role we recognize.
 */
export function toOrgRole(raw: string | null | undefined): OrgRole | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if ((ORG_ROLES as string[]).includes(key)) return key as OrgRole;
  return LEGACY_ROLE_ALIASES[key] ?? null;
}

export function isPrivilegedOrgRole(role: string | null | undefined): boolean {
  const normalized = toOrgRole(role);
  return normalized === "owner" || normalized === "admin";
}

export const orgRoleLabels: Record<string, { label: string; tone: string; rank: number }> = {
  OWNER:   { label: "Owner",   tone: "rose",    rank: 5 },
  ADMIN:   { label: "Admin",   tone: "amber",   rank: 4 },
  MANAGER: { label: "Manager", tone: "emerald", rank: 3 },
  MEMBER:  { label: "Member",  tone: "sky",     rank: 2 },
  GUEST:   { label: "Guest",   tone: "zinc",    rank: 1 },
};

/** One-line explanation of each role, for role pickers and settings copy. */
export const orgRoleDescriptions: Record<OrgRole, string> = {
  owner:   "Full control of the organization, including billing and ownership transfer.",
  admin:   "Administers the organization and can edit or remove anyone's work.",
  manager: "Sees everything across the organization, but only changes their own work.",
  member:  "Creates and manages their own work, plus anything shared with them.",
  guest:   "Read-only access, limited to what has been explicitly shared with them.",
};

export const orgRoleToneClasses: Record<string, string> = {
  rose:   "bg-rose-500/10 text-rose-400 border-rose-500/20",
  amber:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sky:    "bg-sky-500/10 text-sky-400 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  zinc:   "bg-zinc-700/50 text-zinc-400 border-white/5",
};

export const membershipStatusToneClasses: Record<string, string> = {
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  suspended: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function presentOrgRole(role: string | null | undefined): { label: string; tone: string } {
  const normalized = toOrgRole(role);
  const found = normalized ? orgRoleLabels[normalized.toUpperCase()] : undefined;
  if (found) return { label: found.label, tone: found.tone };
  return { label: role || "Member", tone: "zinc" };
}

export function normalizeRoleValue(raw: string | null | undefined): OrgRoleValueType | null {
  const normalized = toOrgRole(raw);
  return normalized ? (normalized.toUpperCase() as OrgRoleValueType) : null;
}

export interface UserBrief {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  job_title?: string | null;
}

export interface OrganizationMembershipWithUser {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrgRole;
  status: MembershipStatus;
  joined_at: string;
  user: UserBrief;
}

export interface OrgBrief {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  description?: string | null;
  role?: string;
  membershipStatus?: MembershipStatus;
  joined_at?: string | null;
  member_count?: number;
  invite_code?: string | null;
  onboarding_invite_dismissed_at?: string | null;
  onboarding_checklist_dismissed_at?: string | null;
}

export interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  status: MembershipStatus;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Rich shape used by the Org Switcher and Profile Page — every piece
 * of context the front-end wants to show "you are in org X".
 */
export interface CurrentOrgContext {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  role: string;             // OWNER | ADMIN | MANAGER | MEMBER | GUEST — matches backend enum
  status: MembershipStatus; // pending | active | suspended
  joined_at?: string | null;
  member_count?: number;
  invite_code?: string | null;
  is_public?: boolean;
}
