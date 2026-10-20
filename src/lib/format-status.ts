/**
 * Human status labels in sentence case: "IN_PROGRESS" → "In progress",
 * "pending" → "Pending". Short acronyms such as QA stay as they are.
 */
export function formatStatus(status?: string | null): string {
  if (!status) return '';
  if (/^[A-Z]{2,3}$/.test(status)) return status;
  const words = status.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
