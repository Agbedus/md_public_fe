/**
 * Organization-scoped permission helpers.
 *
 * These mirror the backend rules in `md_public_be/app/api/deps.py`
 * (`ORG_ADMIN_ROLES`, `ORG_READ_ALL_ROLES`, `ORG_CREATE_ROLES`,
 * `is_org_admin`, `can_read_all`, `can_modify_record`). Keep the two in step —
 * the frontend gate decides what the UI offers, the backend gate decides what
 * actually succeeds. When they drift, users see buttons that 403.
 *
 * The two role layers are independent:
 *   - global platform roles: super_admin, manager, staff, client, user
 *   - org roles (per membership): owner, admin, manager, member, guest
 *
 * A global role never grants within-org access, with one exception: super_admin
 * bypasses org scoping entirely, and manager keeps platform-wide operational
 * access. Everyone else is judged purely on their org role.
 *
 * The four rules, applied uniformly to every org-scoped feature:
 *   1. Read    — owner/admin/manager see everything in the org; member sees own
 *                plus assigned/shared; guest sees only what was shared.
 *   2. Create  — owner/admin/manager/member. Never guest.
 *   3. Update  — owner/admin on any record; everyone below admin only on
 *      /Delete   records they created. Guest never.
 *   4. Admin   — org settings, members, office locations, policies: owner/admin.
 *
 * The dividing line is ADMIN. Manager differs from Member by *visibility*, not
 * by power.
 */

import { toOrgRole, type OrgRole } from '@/types/organization';

/** Org roles, ordered lowest to highest. */
export const ORG_ROLE_RANK: Record<OrgRole, number> = {
    guest: 0,
    member: 1,
    manager: 2,
    admin: 3,
    owner: 4,
};

/** May administer the org and act on anyone's records (backend: ORG_ADMIN_ROLES). */
export const ORG_ADMIN_ROLES: OrgRole[] = ['owner', 'admin'];

/** Sees every record in the org (backend: ORG_READ_ALL_ROLES). */
export const ORG_READ_ALL_ROLES: OrgRole[] = ['owner', 'admin', 'manager'];

/** May create records (backend: ORG_CREATE_ROLES). */
export const ORG_CREATE_ROLES: OrgRole[] = ['owner', 'admin', 'manager', 'member'];

/** Any active membership, guest included (backend: ORG_ANY_ROLE). */
export const ORG_ANY_ROLE: OrgRole[] = [...ORG_CREATE_ROLES, 'guest'];

/** @deprecated Use ORG_ADMIN_ROLES. Kept so existing imports keep compiling. */
export const ORG_MANAGE_ROLES = ORG_ADMIN_ROLES;
/** @deprecated Use ORG_CREATE_ROLES. */
export const ORG_COLLABORATOR_ROLES = ORG_CREATE_ROLES;

export interface PermissionSubject {
    /** Global platform roles from the session. */
    roles?: string[] | null;
    /** Org role for the org currently in context. */
    orgRole?: string | null;
}

function normalize(role: string | null | undefined): string {
    return (role || '').trim().toLowerCase();
}

/** Global SUPER_ADMIN — bypasses org scoping entirely. */
export function isPlatformAdmin(roles: string[] | null | undefined): boolean {
    return (roles || []).some((r) => normalize(r) === 'super_admin');
}

/** Global SUPER_ADMIN or MANAGER — platform-wide operational access. */
export function isPlatformManager(roles: string[] | null | undefined): boolean {
    return (roles || []).some((r) => {
        const n = normalize(r);
        return n === 'super_admin' || n === 'manager';
    });
}

function hasOrgRole(subject: PermissionSubject | null | undefined, allowed: OrgRole[]): boolean {
    if (!subject) return false;
    if (isPlatformManager(subject.roles)) return true;
    const role = toOrgRole(subject.orgRole);
    return role !== null && allowed.includes(role);
}

/**
 * Whether an org role meets a minimum level in the
 * owner > admin > manager > member > guest hierarchy.
 */
export function orgRoleAtLeast(
    orgRole: string | null | undefined,
    minimum: OrgRole | string,
): boolean {
    const have = toOrgRole(orgRole);
    const need = toOrgRole(minimum);
    if (have === null || need === null) return false;
    return ORG_ROLE_RANK[have] >= ORG_ROLE_RANK[need];
}

/**
 * Rule 4 — may administer this organization: manage members and settings, and
 * act on **any** record in the org regardless of who created it.
 *
 * Org OWNER/ADMIN, or a global MANAGER/SUPER_ADMIN.
 */
export function isOrgAdmin(subject: PermissionSubject | null | undefined): boolean {
    return hasOrgRole(subject, ORG_ADMIN_ROLES);
}

/**
 * Rule 1 — sees every record in the org.
 *
 * Org OWNER/ADMIN/MANAGER. This is *visibility only*: a MANAGER who can see a
 * record they did not create still cannot change it — use `canModifyRecord`
 * for that.
 */
export function canReadAll(subject: PermissionSubject | null | undefined): boolean {
    return hasOrgRole(subject, ORG_READ_ALL_ROLES);
}

/**
 * Rule 2 — may create work in this organization: tasks, notes, projects,
 * events, time-off requests. Holds all the way down to MEMBER, because
 * creating is the baseline capability of belonging to an org. GUESTs are
 * excluded — they only read what is explicitly shared with them.
 */
export function canCreate(subject: PermissionSubject | null | undefined): boolean {
    return hasOrgRole(subject, ORG_CREATE_ROLES);
}

/**
 * Rule 3 — may update or delete one specific record.
 *
 * Org admins may act on anything. Everyone below them — MANAGER included —
 * may only act on records they created. Pass the record's owner id
 * (`user_id` / `owner_id` / `creator_id`, depending on the resource).
 */
export function canModifyRecord(
    subject: (PermissionSubject & { id?: string | number | null }) | null | undefined,
    ownerId: string | number | null | undefined,
): boolean {
    if (!subject) return false;
    if (isOrgAdmin(subject)) return true;
    if (ownerId === null || ownerId === undefined || subject.id === null || subject.id === undefined) {
        return false;
    }
    return String(ownerId) === String(subject.id);
}

/** Read-only org GUEST — sees only what has been explicitly shared. */
export function isOrgGuest(subject: PermissionSubject | null | undefined): boolean {
    if (!subject) return false;
    if (isPlatformManager(subject.roles)) return false;
    return toOrgRole(subject.orgRole) === 'guest';
}

/**
 * May administer this organization's data.
 * @deprecated Prefer `isOrgAdmin` — same behaviour, clearer name.
 */
export const canManageOrg = isOrgAdmin;

/**
 * May create work in this organization.
 * @deprecated Prefer `canCreate` — same behaviour, clearer name.
 */
export const canCollaborate = canCreate;

/** @deprecated The org `client` role is now `guest`. */
export const isOrgClient = isOrgGuest;

/** May approve/reject time-off. Administration, so org OWNER/ADMIN only. */
export const canApproveRequests = isOrgAdmin;

/** May view the org-wide roster — a visibility concern, so MANAGER and above. */
export const canViewOrgMembers = canReadAll;

/** May add, remove, or change the role of a member. Administration. */
export const canManageMembers = isOrgAdmin;
