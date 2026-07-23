export interface WaitlistData {
    name: string;
    company: string;
    role: string;
    source: string;
    phone: string;
    email: string;
}

export interface WaitlistResult {
    success: boolean;
    error?: string;
}

export interface WaitlistEntry extends WaitlistData {
    id: string;
    created_at: string;
}
