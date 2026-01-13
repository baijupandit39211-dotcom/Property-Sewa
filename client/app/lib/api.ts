export type ApiError = {
  message?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

async function coreFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      // If body is FormData, don't force JSON header
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
    credentials: "include", // ✅ cookie auth
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as ApiError)?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

/** ✅ Default (Buyer/Seller/Agent) */
export function apiFetch<T>(path: string, init: RequestInit = {}) {
  return coreFetch<T>(path, init);
}

/** ✅ Explicit user wrapper (optional) */
export function apiFetchUser<T>(path: string, init: RequestInit = {}) {
  return coreFetch<T>(path, init);
}

/** ✅ Admin wrapper: forces /auth/* calls to /auth/admin/* */
export function apiFetchAdmin<T>(path: string, init: RequestInit = {}) {
  // If you call /auth/me from admin UI by mistake, it will become /auth/admin/me
  if (path === "/auth/me") return coreFetch<T>("/auth/admin/me", init);

  // If you call /auth/login from admin UI by mistake, it will become /auth/admin/login
  if (path === "/auth/login") return coreFetch<T>("/auth/admin/login", init);

  return coreFetch<T>(path, init);
}
