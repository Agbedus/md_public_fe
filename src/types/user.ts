export type User = {
    id: string;
    email: string;
    fullName: string | null;
    roles: string[];
    avatarUrl: string | null;
    createdAt?: string | null;
};

export type UserFormData = Omit<User, 'id' | 'createdAt'>;

export function parseUserFormData(formData: FormData): Partial<User> {
    const data = Object.fromEntries(formData);
    // Handle roles from FormData (could be JSON string or multiple entries)
    // For now, assume it might be passed as a JSON string 'roles'
    let roles: string[] = ['staff'];
    if (typeof data.roles === 'string') {
        try {
            roles = JSON.parse(data.roles);
        } catch {
            // If not JSON, maybe it's a single value?
            roles = [data.roles];
        }
    }
    
    return {
        email: data.email as string,
        fullName: data.fullName as string,
        roles: roles,
        avatarUrl: data.avatarUrl as string,
    };
}

export const roleMapping: { [key: string]: string } = {
    user: "User",
    client: "Client",
    staff: "Staff",
    manager: "Manager",
    super_admin: "Super Admin",
};
