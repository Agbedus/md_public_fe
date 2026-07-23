export type Client = {
    id: string;
    companyName: string;
    contactPersonName: string | null;
    contactEmail: string | null;
    websiteUrl: string | null;
    createdAt?: string | null;
};

export type ClientFormData = Omit<Client, 'id' | 'createdAt'>;

export function parseClientFormData(formData: FormData): Partial<Client> {
    const data = Object.fromEntries(formData);
    return {
        companyName: data.companyName as string,
        contactPersonName: data.contactPersonName as string,
        contactEmail: data.contactEmail as string,
        websiteUrl: data.websiteUrl as string,
    };
}
