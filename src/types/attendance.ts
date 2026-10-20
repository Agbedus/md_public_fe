export type PresenceState = 'IN_OFFICE' | 'TEMPORARILY_OUT' | 'OUT_OF_OFFICE';
export type AttendanceState = 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT';

export type AttendanceRecord = {
    id: number;
    user_id: string;
    office_location_id?: number;
    work_date: string;              // "YYYY-MM-DD" from the backend
    date?: string;                  // alias kept for backward compat
    clock_in_at: string | null;     // ISO timestamp from backend
    clock_in?: string | null;       // alias
    clock_out_at: string | null;    // ISO timestamp from backend
    clock_out?: string | null;      // alias
    attendance_state: AttendanceState;
    presence_state?: PresenceState; // derived, may not be on the record
    first_seen_in_office_at?: string | null;
    last_seen_in_office_at?: string | null;
    total_seconds?: number;
    total_hours?: number | null;    // computed on frontend
    created_at?: string | null;
    updated_at?: string | null;
    // Hydrated on frontend
    userName?: string;
    userAvatar?: string | null;
};

export type OfficeLocation = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    in_office_radius_meters: number;
    temporarily_out_radius_meters: number;
    out_of_office_radius_meters: number;
    created_at?: string | null;
    updated_at?: string | null;
};

export type AttendancePolicy = {
    id: number;
    office_location_id: number;
    auto_clock_in: boolean;
    auto_clock_out: boolean;
    check_in_open_time: string | null;                   // HH:MM:SS
    check_in_close_time: string | null;                  // HH:MM:SS
    work_start_time: string | null;                      // HH:MM:SS
    work_end_time: string | null;                        // HH:MM:SS
    auto_clock_out_time: string | null;                  // HH:MM:SS
    temporarily_out_grace_minutes: number;
    out_of_office_grace_minutes: number;
    return_to_office_confirmation_minutes: number;
    auto_clock_in_delay_minutes: number;
    presence_audit_interval_minutes: number;
    created_at?: string | null;
    updated_at?: string | null;
};

export const presenceStateLabels: Record<PresenceState, string> = {
    IN_OFFICE: 'In office',
    TEMPORARILY_OUT: 'Temporarily out',
    OUT_OF_OFFICE: 'Out of office',
};

export const attendanceStateLabels: Record<AttendanceState, string> = {
    NOT_CLOCKED_IN: 'Not clocked in',
    CLOCKED_IN: 'Clocked in',
    CLOCKED_OUT: 'Clocked out',
};

export const presenceStateColors: Record<PresenceState, { text: string; bg: string; dot: string }> = {
    IN_OFFICE: { text: 'text-success-text', bg: 'bg-success/15', dot: 'bg-success' },
    TEMPORARILY_OUT: { text: 'text-warning-text', bg: 'bg-warning/15', dot: 'bg-warning' },
    OUT_OF_OFFICE: { text: 'text-danger-text', bg: 'bg-danger/12', dot: 'bg-danger' },
};

export const attendanceStateColors: Record<AttendanceState, { text: string; bg: string }> = {
    NOT_CLOCKED_IN: { text: 'text-text-muted', bg: 'bg-foreground/[0.06]' },
    CLOCKED_IN: { text: 'text-success-text', bg: 'bg-success/15' },
    CLOCKED_OUT: { text: 'text-accent-text', bg: 'bg-accent/12' },
};
