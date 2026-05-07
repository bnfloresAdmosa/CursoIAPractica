import { useSyncExternalStore } from 'react';
import { api, type StoredAuth } from '@/lib/api';

// Hook reactivo que sigue el estado de auth en localStorage.
// Re-renderiza componentes cuando algún tab hace login/logout (storage event)
// o cuando esta tab dispatcha 'auth-changed' (mismo-tab no recibe storage).

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener('auth-changed', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('auth-changed', cb);
  };
}

// CRÍTICO: useSyncExternalStore exige que getSnapshot devuelva una referencia
// ESTABLE cuando el state no cambió (compara con Object.is). Si devolvemos un
// objeto nuevo en cada llamada, React entra en loop "snapshot keeps changing".
// Cacheamos por la firma raw (los 4 strings de localStorage) — si la firma
// no cambió, retornamos el mismo objeto.

let cachedSignature: string | null = null;
let cachedSnapshot: StoredAuth | null = null;

function getSnapshot(): StoredAuth | null {
  const stored = api.auth.getStored();
  const signature = stored
    ? `${stored.token}|${stored.refreshToken}|${stored.user.id}|${JSON.stringify(stored.roles)}`
    : null;
  if (signature === cachedSignature) {
    return cachedSnapshot;
  }
  cachedSignature = signature;
  cachedSnapshot = stored;
  return cachedSnapshot;
}

function getServerSnapshot(): StoredAuth | null {
  return null;
}

type UseAuthResult = {
  auth: StoredAuth | null;
  isAuthenticated: boolean;
  currentUser: StoredAuth['user'] | null;
  roles: Record<string, 'ADMIN' | 'USER'>;
  /** Cierra sesión (notifica backend best-effort + limpia storage). */
  logout: () => Promise<void>;
};

export function useAuth(): UseAuthResult {
  const auth = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    auth,
    isAuthenticated: auth !== null,
    currentUser: auth?.user ?? null,
    roles: auth?.roles ?? {},
    logout: () => api.auth.logout(),
  };
}
