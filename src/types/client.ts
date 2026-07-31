export type Client = {
    id: string;
    companyName: string;
    contactPersonName: string | null;
    contactEmail: string | null;
    websiteUrl: string | null;
    /** API: owner_id — who created the client. Drives edit/delete gating. */
    ownerId?: string | null;
    createdAt?: string | null;
};

export type ClientFormData = Omit<Client, 'id' | 'createdAt' | 'ownerId'>;

export function parseClientFormData(formData: FormData): Partial<Client> {
    const data = Object.fromEntries(formData);
    return {
        companyName: data.companyName as string,
        contactPersonName: data.contactPersonName as string,
        contactEmail: data.contactEmail as string,
        websiteUrl: data.websiteUrl as string,
    };
}
