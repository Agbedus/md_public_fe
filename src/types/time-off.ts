export type TimeOffType = 'leave' | 'off' | 'sick' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffRequest {
    id: number;
    user_id: string;
    type: TimeOffType;
    start_date: string;
    end_date: string;
    status: TimeOffStatus;
    justification: string | null;
    requested_at: string;
}
