const RELOAD_GUARD_KEY = 'nova_chunk_reload_guard';
const RELOAD_COOLDOWN_MS = 15_000;

/**
 * Detects stale Vite chunk / ES dynamic import failures that happen after a
 * deployment when an older HTML shell or stale Service Worker points to hashed
 * asset filenames that no longer exist on the server.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? `${error.name} ${error.message}`
        : String((error as any)?.message || error);

  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('loading chunk') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes('unable to preload css')
  );
}

/**
 * Purges stale Service Worker registrations and Cache Storage entries, then
 * performs a single cache-bypassed navigation reload (guarded by cooldown to
 * prevent infinite reload loops if offline).
 */
export async function recoverFromStaleDeployment(forceUserReload = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (!forceUserReload) {
      const lastAttempt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
      if (Date.now() - lastAttempt < RELOAD_COOLDOWN_MS) {
        return false;
      }
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } else {
      window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
    }

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(
        regs.map((reg) => reg.update().catch(() => undefined))
      );
      if (forceUserReload) {
        await Promise.all(
          regs.map((reg) => reg.unregister().catch(() => false))
        );
      }
    }

    if ('caches' in window) {
      const keys = await window.caches.keys().catch(() => []);
      await Promise.all(keys.map((key) => window.caches.delete(key).catch(() => false)));
    }
  } catch {
    // Ignore storage access errors in restricted contexts and proceed to reload
  }

  window.location.reload();
  return true;
}
