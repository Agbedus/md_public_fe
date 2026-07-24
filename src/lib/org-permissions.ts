/**
 * Organization-scoped permission helpers.
 *
 * These mirror the backend rules in `md_public_be/app/api/deps.py`
 * (`has_org_role`, `ORG_MANAGE_ROLES`, `ORG_COLLABORATOR_ROLES`). Keep the two
 * in step — the frontend gate decides what the UI offers, the backend gate
 * decides what actually succeeds.
 *
 * The two role layers are independent:
 *   - global platform roles: super_admin, manager, staff, client, user
 *   - org roles (per membership): owner, admin, member, client
 *
 * A global role never grants within-org access, with one exception: super_admin
 * bypasses org scoping entirely, and manager keeps platform-wide operational
 * access. Everyone else is judged purely on their org role.
 */

/** Org roles, ordered lowest to highest. */
export const ORG_ROLE_RANK: Record<string, number> = {
    client: 0,
    member: 1,
    admin: 2,
    owner: 3,
};

/** Org roles allowed to administer the org's data (backend: ORG_MANAGE_ROLES). */
export const ORG_MANAGE_ROLES = ['owner', 'admin'];

/** Org roles allowed to create work (backend: ORG_COLLABORATOR_ROLES). */
export const ORG_COLLABORATOR_ROLES = ['owner', 'admin', 'member'];

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

/** Whether an org role meets a minimum level in the owner > admin > member > client hierarchy. */
export function orgRoleAtLeast(
    orgRole: string | null | undefined,
    minimum: keyof typeof ORG_ROLE_RANK | string,
): boolean {
    const have = ORG_ROLE_RANK[normalize(orgRole)];
    const need = ORG_ROLE_RANK[normalize(minimum)];
    if (have === undefined || need === undefined) return false;
    return have >= need;
}

/**
 * May administer this organization's data — manage members and settings, and
 * read/write every resource in the org.
 *
 * Org OWNER/ADMIN, or a global MANAGER/SUPER_ADMIN.
 */
export function canManageOrg(subject: PermissionSubject | null | undefined): boolean {
    if (!subject) return false;
    if (isPlatformManager(subject.roles)) return true;
    return ORG_MANAGE_ROLES.includes(normalize(subject.orgRole));
}

/**
 * May create work in this organization — tasks, notes, events, time-off
 * requests. This is the baseline capability of belonging to an org, so it holds
 * all the way down to MEMBER. Org CLIENTs are excluded: they are external
 * collaborators who only see what is explicitly shared with them.
 */
export function canCollaborate(subject: PermissionSubject | null | undefined): boolean {
    if (!subject) return false;
    if (isPlatformManager(subject.roles)) return true;
    return ORG_COLLABORATOR_ROLES.includes(normalize(subject.orgRole));
}

/** External org CLIENT — read-only access to explicitly shared data. */
export function isOrgClient(subject: PermissionSubject | null | undefined): boolean {
    if (!subject) return false;
    if (isPlatformManager(subject.roles)) return false;
    return normalize(subject.orgRole) === 'client';
}

/**
 * May approve/reject time-off and act on other members' requests.
 * Same level as org administration.
 */
export const canApproveRequests = canManageOrg;

/** May view the org-wide roster and per-member detail. */
export const canViewOrgMembers = canManageOrg;
