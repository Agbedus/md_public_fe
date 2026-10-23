"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { FiClock, FiLogIn, FiLogOut, FiMapPin } from "react-icons/fi";
import { fetchMyAttendanceLive } from "@/app/(dashboard)/[orgSlug]/attendance/actions";
import type { AttendanceRecord } from "@/types/attendance";
import { attendanceStateLabels } from "@/types/attendance";
import { useOrgSlug } from "@/hooks/use-org-slug";
import { workspaceCacheKey } from "@/lib/workspace-cache";
import { useLocation } from "@/providers/location-provider";

export function AttendanceDayTimeline({
  record: initialRecord,
}: {
  record: AttendanceRecord | null;
}) {
  const slug = useOrgSlug();
  const { data: record } = useSWR(
    workspaceCacheKey("my-attendance-today", slug),
    fetchMyAttendanceLive,
    { fallbackData: initialRecord, revalidateOnFocus: true },
  );
  const { attendanceState, clockInTime, clockOutTime } = useLocation();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);
  const state = attendanceState || record?.attendance_state || "NOT_CLOCKED_IN";
  const started = clockInTime || record?.clock_in_at || record?.clock_in;
  const ended =
    state === "CLOCKED_OUT"
      ? clockOutTime || record?.clock_out_at || record?.clock_out
      : null;
  const points = [
    {
      label: "First seen in office",
      time: record?.first_seen_in_office_at,
      icon: FiMapPin,
    },
    { label: "Clocked in", time: started, icon: FiLogIn },
    {
      label: "Last seen in office",
      time: record?.last_seen_in_office_at,
      icon: FiMapPin,
    },
    { label: "Clocked out", time: ended, icon: FiLogOut },
  ]
    .filter(
      (point) => point.time && Number.isFinite(new Date(point.time).getTime()),
    )
    .sort((a, b) => new Date(a.time!).getTime() - new Date(b.time!).getTime());
  const elapsed =
    started && now && state === "CLOCKED_IN"
      ? Math.max(0, now - new Date(started).getTime())
      : null;
  const seconds =
    elapsed != null
      ? Math.floor(elapsed / 1000) + (record?.total_seconds ?? 0)
      : (record?.total_seconds ??
        (record?.total_hours != null ? record.total_hours * 3600 : null));
  const timeLabel =
    seconds != null
      ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
      : "—";

  return (
    <section
      className="mb-5 rounded-[28px] border border-card-border bg-card p-5 sm:p-6"
      aria-label="Today’s attendance timeline"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Your day</h2>
          <p className="mt-1 text-xs text-text-muted">
            {attendanceStateLabels[state]}
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-numbers text-2xl font-semibold tracking-tight text-foreground"
            suppressHydrationWarning
          >
            {timeLabel}
          </p>
          <p className="mt-1 text-xs text-text-muted">Time recorded today</p>
        </div>
      </div>
      {points.length ? (
        <ol className="mt-5 space-y-0">
          {points.map(({ label, time, icon: Icon }, index) => (
            <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
              {index < points.length - 1 && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-4 top-8 w-px bg-card-border"
                />
              )}
              <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground/[0.04] text-text-muted">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">{label}</span>
                <time
                  dateTime={new Date(time!).toISOString()}
                  className="font-numbers text-xs text-text-muted"
                  suppressHydrationWarning
                >
                  {now
                    ? new Date(time!).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </time>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-foreground/[0.025] p-4 text-sm text-text-muted">
          <FiClock className="shrink-0" />
          Your timeline starts when attendance is recorded.
        </p>
      )}
    </section>
  );
}
