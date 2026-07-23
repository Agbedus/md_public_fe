'use client';

const SOUND_MAP: Record<string, string> = {
  info: '/sounds/info_note.mp3',
  success: '/sounds/sucess_note.mp3',
  warning: '/sounds/info_note.mp3',
  error: '/sounds/error_note.mp3',
};

let currentAudio: HTMLAudioElement | null = null;

export function getSoundEffectsEnabled(user?: { email?: string | null; id?: string | null }): boolean {
  if (typeof window === 'undefined') return false;
  const userKey = user?.email || user?.id || 'guest';
  try {
    const saved = localStorage.getItem(`md_settings_${userKey}`);
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.soundEffects === true;
    }
  } catch {
    // ignore
  }
  return true;
}

export function playNotificationSound(type: string): void {
  const src = SOUND_MAP[type] || SOUND_MAP.info;
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(src);
    currentAudio.volume = 0.4;
    currentAudio.play().catch(() => {});
  } catch {
    // Silently fail
  }
}
