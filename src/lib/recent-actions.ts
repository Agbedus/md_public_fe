const recentActions = new Map<string, number>();

export function trackAction(resource: string, action: string) {
  const key = `${resource}:${action}`;
  recentActions.set(key, Date.now());
  setTimeout(() => recentActions.delete(key), 4000);
}

export function isRecentAction(resource: string, action: string): boolean {
  return recentActions.has(`${resource}:${action}`);
}
