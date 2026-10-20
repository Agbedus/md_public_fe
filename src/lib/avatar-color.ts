import type { CSSProperties } from 'react';

/**
 * Bright solid colours for initials avatars, drawn from the palette tokens
 * (accent blue, status violet and pink, priority orange, success green …).
 * Each entry carries the initials ink that reads best on it.
 */
const AVATAR_COLORS: ReadonlyArray<readonly [background: string, ink: string]> = [
  ['#1a7dff', '#ffffff'], // accent blue
  ['#6366f1', '#ffffff'], // indigo
  ['#8b5cf6', '#ffffff'], // violet
  ['#ec4899', '#ffffff'], // pink
  ['#ff8a00', '#1a1205'], // orange
  ['#10d48e', '#062a1c'], // green
  ['#14b8a6', '#ffffff'], // teal
  ['#0ea5e9', '#ffffff'], // sky
  ['#ffd60a', '#2a2300'], // yellow
];

/**
 * The same person always gets the same colour: the seed (a name, email or
 * id) is hashed to a stable palette slot, so a stack of avatars shows a
 * spread of colours without anything stored per user.
 */
export function avatarStyle(seed?: string | null): CSSProperties {
  const key = (seed ?? '').trim().toLowerCase();
  let hash = 0;
  for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const [backgroundColor, color] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { backgroundColor, color };
}
