export function getScopedStorageKey(baseKey: string, scopeId?: string | null) {
  if (scopeId) {
    return `user:${scopeId}:${baseKey}`
  }

  if (typeof window === 'undefined') {
    return baseKey
  }

  const storedScope = localStorage.getItem('auth_user_id')
  return storedScope ? `user:${storedScope}:${baseKey}` : baseKey
}