/**
 * Org-scoped role types and presentation constants.
 *
 * `OrgRole` is the lowercase string returned by the frontend shim
 * (kept for backward compatibility with existing call sites).
 *
 * `OrgRoleValue` matches the backend enum strings exactly so it can be
 * compared against raw API payloads without lowercasing gymnastics.
 */

export type OrgRole = "owner" | "admin" | "member" | "client";
export type MembershipStatus = "pending" | "active" | "suspended";

export const OrgRoleValue = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  CLIENT: "CLIENT",
} as const;
export type OrgRoleValueType = typeof OrgRoleValue[keyof typeof OrgRoleValue];

export const MembershipStatusValue = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;
export type MembershipStatusValueType =
  typeof MembershipStatusValue[keyof typeof MembershipStatusValue];

/** Anything that should gate org-management actions. */
export const PRIVILEGED_ORG_ROLES: string[] = ["OWNER", "ADMIN"];
export const PRIVILEGED_ORG_ROLES_LOWER: string[] = ["owner", "admin"];

export function isPrivilegedOrgRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return PRIVILEGED_ORG_ROLES.includes(role.toUpperCase());
}

export const orgRoleLabels: Record<string, { label: string; tone: string; rank: number }> = {
  OWNER:  { label: "Owner",  tone: "rose",    rank: 4 },
  ADMIN:  { label: "Admin",  tone: "amber",   rank: 3 },
  MEMBER: { label: "Member", tone: "sky",     rank: 2 },
  CLIENT: { label: "Client", tone: "violet",  rank: 1 },
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
  const key = (role || "").toUpperCase();
  const found = orgRoleLabels[key];
  if (found) return { label: found.label, tone: found.tone };
  return { label: role || "Member", tone: "zinc" };
}

export function normalizeRoleValue(raw: string | null | undefined): OrgRoleValueType | null {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u === "OWNER" || u === "ADMIN" || u === "MEMBER" || u === "CLIENT") return u;
  return null;
}

export interface UserBrief {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
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
  role: string;             // OWNER | ADMIN | MEMBER | CLIENT — matches backend enum
  status: MembershipStatus; // pending | active | suspended
  joined_at?: string | null;
  member_count?: number;
  invite_code?: string | null;
  is_public?: boolean;
}
