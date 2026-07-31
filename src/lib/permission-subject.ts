import { auth } from '@/auth';

/**
 * The minimum a component needs in order to answer "may I edit this record?".
 *
 * There is no client-side `SessionProvider` in this app — the session is read on
 * the server and passed down as props — so pages hand this object to their
 * client components rather than each one reaching for the session itself.
 * It is deliberately plain and serializable so it crosses the server/client
 * boundary without ceremony.
 */
export interface PermissionSubjectProps {
    id?: string | null;
    roles?: string[] | null;
    orgRole?: string | null;
}

/** Build the permission subject for the signed-in user. */
export async function getPermissionSubject(): Promise<PermissionSubjectProps | null> {
    const session = await auth();
    if (!session?.user?.id) return null;
    return {
        id: session.user.id,
        roles: session.user.roles ?? [],
        orgRole: session.user.orgRole ?? null,
    };
}
