"use client";

import { useSyncExternalStore } from "react";
import {
  formatNoteRelativeTime,
  parseNoteTimestamp,
} from "@/lib/note-relative-time";

const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, 60_000);
  return () => clearInterval(timer);
};
const snapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = () => 0;

export function NoteUpdatedTime({ value }: { value?: string | null }) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (!value) return null;
  const date = parseNoteTimestamp(value);
  if (!Number.isFinite(date.getTime())) return null;
  return (
    <time dateTime={date.toISOString()} title={date.toUTCString()}>
      Last updated {now ? formatNoteRelativeTime(value, now) : "…"}
    </time>
  );
}
