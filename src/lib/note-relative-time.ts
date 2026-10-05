/** Backend timestamps without a timezone are UTC, not the browser's local time. */
export function parseNoteTimestamp(value: string): Date {
  const normalized = value.trim().replace(" ", "T");
  return new Date(
    /^\d{4}-\d{2}-\d{2}T/.test(normalized) &&
      !/(Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
      ? `${normalized}Z`
      : normalized,
  );
}

export function formatNoteRelativeTime(
  value: string,
  now: number,
): string | null {
  const timestamp = parseNoteTimestamp(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const units = [
    [31536000, "yr", "yr"],
    [2592000, "mo", "mo"],
    [604800, "week", "weeks"],
    [86400, "day", "days"],
    [3600, "hr", "hr"],
    [60, "min", "min"],
  ] as const;
  for (const [size, singular, plural] of units) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${count === 1 ? singular : plural} ago`;
    }
  }
  return "just now";
}
