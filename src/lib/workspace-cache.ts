export function workspaceCacheKey(
  resource: string,
  workspaceScope: string | null | undefined,
  ...parts: Array<string | number | boolean | null>
) {
  return [resource, workspaceScope || 'no-workspace', ...parts] as const;
}

export function workspaceStorageKey(baseKey: string, workspaceScope: string | null | undefined) {
  return `${baseKey}:${workspaceScope || 'no-workspace'}`;
}
