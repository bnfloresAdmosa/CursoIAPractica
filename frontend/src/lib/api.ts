// API client del backend Mini Jira.
// El usuario debe hacer login explícito vía LoginScreen — no hay auto-login.
// En 401 el cliente intenta refresh con el refresh_token; si falla, limpia
// la sesión y dispara `auth-changed` para que useAuth redirija a /login.

import type { Tag, Ticket, TicketId, TicketPriority, TicketStatus, User } from './types';

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3030/api/v1';

const ACCESS_KEY = 'mj.access';
const REFRESH_KEY = 'mj.refresh';
const USER_KEY = 'mj.user';
const ROLES_KEY = 'mj.roles';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Auth user shape ───────────────────────────────────────────────────────

export type AuthedUser = {
  id: number;
  name: string;
  email: string;
};

export type StoredAuth = {
  token: string;
  refreshToken: string;
  user: AuthedUser;
  roles: Record<string, 'ADMIN' | 'USER'>;
};

// ── Auth storage ──────────────────────────────────────────────────────────

function emitAuthChanged(): void {
  window.dispatchEvent(new Event('auth-changed'));
}

function getStoredAuth(): StoredAuth | null {
  const token = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  const rolesRaw = localStorage.getItem(ROLES_KEY);
  if (!token || !refreshToken || !userRaw || !rolesRaw) return null;
  try {
    const user = JSON.parse(userRaw) as AuthedUser;
    const roles = JSON.parse(rolesRaw) as Record<string, 'ADMIN' | 'USER'>;
    return { token, refreshToken, user, roles };
  } catch {
    return null;
  }
}

function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(ACCESS_KEY, auth.token);
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  localStorage.setItem(ROLES_KEY, JSON.stringify(auth.roles));
  emitAuthChanged();
}

function clearStoredAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLES_KEY);
  emitAuthChanged();
}

// ── Refresh flow (silent reauth) ──────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!r.ok) return false;
      const data = (await r.json()) as { accessToken: string; refreshToken: string };
      localStorage.setItem(ACCESS_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ── Fetcher ───────────────────────────────────────────────────────────────

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Si true, no agrega Authorization header ni intenta refresh on 401. */
  skipAuth?: boolean;
};

async function apiFetch<T>(path: string, opts: FetchOpts = {}, attempt = 0): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!opts.skipAuth) {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      throw new ApiError(401, 'Sin sesión activa', 'unauthorized');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && !opts.skipAuth && attempt < 1) {
    // Intenta refresh silencioso una sola vez
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch(path, opts, attempt + 1);
    }
    clearStoredAuth();
    throw new ApiError(401, 'Sesión expirada', 'unauthorized');
  }

  if (res.status === 204) return undefined as T;

  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.message ?? res.statusText, err?.code);
  }
  return payload as T;
}

// ── Backend types (raw) ───────────────────────────────────────────────────

type ApiTicket = {
  id: number;
  title: string;
  description: string | null;
  status: 'Por hacer' | 'En progreso' | 'Listo';
  priority: { id: number; name: string; order: number };
  projectId: number;
  createdBy: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string; color: string }>;
  commentCount: number;
  lock:
    | { lockedBy: { id: number; name: string }; lockedAt: string; expiresAt: string }
    | null;
};

type ApiTicketListResponse = {
  items: ApiTicket[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApiProject = {
  id: number;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdBy: number;
  createdAt: string;
  myRole: 'ADMIN' | 'USER';
  memberCount: number;
  openTicketCount: number;
  lastActivityAt: string | null;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthedUser;
  roles: Record<string, 'ADMIN' | 'USER'>;
};

// ── Mappers ───────────────────────────────────────────────────────────────

const STATUS_API_TO_FE: Record<string, TicketStatus> = {
  'Por hacer': 'todo',
  'En progreso': 'progress',
  Listo: 'done',
};

const STATUS_FE_TO_API: Record<TicketStatus, 'Por hacer' | 'En progreso' | 'Listo'> = {
  todo: 'Por hacer',
  progress: 'En progreso',
  done: 'Listo',
};

const PRIORITY_API_TO_FE: Record<string, TicketPriority> = {
  Alta: 'high',
  Media: 'med',
  Baja: 'low',
};

const PRIORITY_FE_TO_API: Record<TicketPriority, 'Alta' | 'Media' | 'Baja'> = {
  high: 'Alta',
  med: 'Media',
  low: 'Baja',
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function mapTicket(t: ApiTicket): Ticket {
  return {
    id: String(t.id),
    title: t.title,
    status: STATUS_API_TO_FE[t.status] ?? 'todo',
    priority: PRIORITY_API_TO_FE[t.priority.name] ?? 'med',
    assignees: t.assignees.map((a) => String(a.id)),
    tags: t.tags.map((tag) => String(tag.id)),
    comments: t.commentCount,
    updated: relativeTime(t.updatedAt),
  };
}

function extractEntities(items: ApiTicket[]): {
  users: Record<string, User>;
  tags: Record<string, Tag>;
} {
  const users: Record<string, User> = {};
  const tags: Record<string, Tag> = {};
  for (const t of items) {
    for (const a of t.assignees) {
      const id = String(a.id);
      if (!users[id]) {
        const handle = a.name.toLowerCase().split(/\s+/)[0] ?? '';
        users[id] = { id, name: a.name, handle, email: '' };
      }
    }
    for (const tag of t.tags) {
      const id = String(tag.id);
      if (!tags[id]) {
        tags[id] = { id, name: tag.name, color: tag.color };
      }
    }
  }
  return { users, tags };
}

export type TicketsResult = {
  tickets: Ticket[];
  users: Record<string, User>;
  tags: Record<string, Tag>;
  nextCursor: string | null;
  hasMore: boolean;
};

// ── Public API ────────────────────────────────────────────────────────────

export const api = {
  auth: {
    /**
     * Login con email/password. Persiste tokens + user en localStorage y dispara
     * 'auth-changed'. Si falla, lanza ApiError sin tocar el storage.
     */
    login: async (email: string, password: string): Promise<StoredAuth> => {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });
      const stored: StoredAuth = {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        roles: result.roles,
      };
      setStoredAuth(stored);
      return stored;
    },

    /**
     * Cierra la sesión: notifica al backend (best-effort) y limpia el storage.
     */
    logout: async (): Promise<void> => {
      try {
        await apiFetch<void>('/auth/logout', { method: 'POST' });
      } catch {
        // si el backend ya no acepta el token, igual limpiamos local
      }
      clearStoredAuth();
    },

    getStored: getStoredAuth,
    setStored: setStoredAuth,
    clear: clearStoredAuth,
    isAuthenticated: () => Boolean(localStorage.getItem(ACCESS_KEY)),
  },

  projects: {
    list: (filters?: { archived?: boolean; q?: string }) =>
      apiFetch<{ items: ApiProject[]; nextCursor: string | null; hasMore: boolean }>(
        '/projects',
        {
          query: {
            archived: filters?.archived ? 'true' : undefined,
            q: filters?.q,
          },
        },
      ),

    get: (id: number) => apiFetch<ApiProject>(`/projects/${id}`),

    create: (body: { name: string; description?: string }) =>
      apiFetch<ApiProject>('/projects', { method: 'POST', body }),

    update: (id: number, body: { name?: string; description?: string | null }) =>
      apiFetch<ApiProject>(`/projects/${id}`, { method: 'PATCH', body }),

    archive: (id: number) =>
      apiFetch<{ id: number; archivedAt: string }>(`/projects/${id}/archive`, {
        method: 'PATCH',
      }),
  },

  tickets: {
    list: async (
      projectId: number,
      filters?: {
        status?: TicketStatus[];
        priority?: TicketPriority[];
        tag?: string[];
        assignee?: string[];
        q?: string;
      },
    ): Promise<TicketsResult> => {
      const r = await apiFetch<ApiTicketListResponse>(`/projects/${projectId}/tickets`, {
        query: {
          status: filters?.status?.map((s) => STATUS_FE_TO_API[s]).join(','),
          priority: filters?.priority?.map((p) => PRIORITY_FE_TO_API[p]).join(','),
          tag: filters?.tag?.join(','),
          assignee: filters?.assignee?.join(','),
          q: filters?.q,
          limit: 100,
        },
      });
      const { users, tags } = extractEntities(r.items);
      return {
        tickets: r.items.map(mapTicket),
        users,
        tags,
        nextCursor: r.nextCursor,
        hasMore: r.hasMore,
      };
    },

    get: async (ticketId: TicketId): Promise<Ticket> => {
      const t = await apiFetch<ApiTicket>(`/tickets/${ticketId}`);
      return mapTicket(t);
    },

    create: async (
      projectId: number,
      body: {
        title: string;
        description?: string;
        priorityId: number;
        assigneeIds?: number[];
        tagIds?: number[];
      },
    ): Promise<Ticket> => {
      const t = await apiFetch<ApiTicket>(`/projects/${projectId}/tickets`, {
        method: 'POST',
        body,
      });
      return mapTicket(t);
    },

    changeStatus: async (ticketId: TicketId, newStatus: TicketStatus): Promise<Ticket> => {
      const t = await apiFetch<ApiTicket>(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: { status: STATUS_FE_TO_API[newStatus] },
      });
      return mapTicket(t);
    },

    archive: (ticketId: TicketId) =>
      apiFetch<{ id: number; archivedAt: string }>(`/tickets/${ticketId}/archive`, {
        method: 'PATCH',
      }),
  },
};
