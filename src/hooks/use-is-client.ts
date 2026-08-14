'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** Returns false for SSR and true once React is running in the browser. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
