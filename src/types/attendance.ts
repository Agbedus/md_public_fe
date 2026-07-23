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
    IN_OFFICE: 'In Office',
    TEMPORARILY_OUT: 'Temporarily Out',
    OUT_OF_OFFICE: 'Out of Office',
};

export const attendanceStateLabels: Record<AttendanceState, string> = {
    NOT_CLOCKED_IN: 'Not Clocked In',
    CLOCKED_IN: 'Clocked In',
    CLOCKED_OUT: 'Clocked Out',
};

export const presenceStateColors: Record<PresenceState, { text: string; bg: string; dot: string }> = {
    IN_OFFICE: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
    TEMPORARILY_OUT: { text: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
    OUT_OF_OFFICE: { text: 'text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-400' },
};

export const attendanceStateColors: Record<AttendanceState, { text: string; bg: string }> = {
    NOT_CLOCKED_IN: { text: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    CLOCKED_IN: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    CLOCKED_OUT: { text: 'text-blue-400', bg: 'bg-blue-500/10' },
};
