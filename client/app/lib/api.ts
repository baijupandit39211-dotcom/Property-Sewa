export type ApiError = {
  message?: string;
  error?: string;
};

// Force localhost:5000 for development
const API_BASE = "http://localhost:5000";

async function coreFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  console.log("API Request:", {
    method: init.method || "GET",
    url,
    hasBody: !!init.body,
    bodyType: init.body instanceof FormData ? "FormData" : typeof init.body,
  });

  const res = await fetch(url, {
    ...init,
    headers: {
      // If body is FormData, don't force JSON header
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
    credentials: "include", // Always include cookies
  });

  const contentType = res.headers.get("content-type") || "";

  let data: any = null;

  // Robust body parsing (JSON OR text OR empty)
  if (res.status !== 204) {
    if (contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await res.text();
        data = text ? { raw: text } : null;
      } catch {
        data = null;
      }
    }
  }

  if (!res.ok) {
    const msg =
      (data as ApiError)?.message ||
      (data as ApiError)?.error ||
      (data as any)?.raw ||
      `Request failed (${res.status})`;

    console.error("API Error:", {
      url,
      method: init.method || "GET",
      status: res.status,
      statusText: res.statusText,
      contentType,
      message: msg,
      data,
    });

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
  if (path === "/auth/me") return coreFetch<T>("/auth/admin/me", init);
  if (path === "/auth/login") return coreFetch<T>("/auth/admin/login", init);
  return coreFetch<T>(path, init);
}

/** ✅ Safe fetch: returns null instead of throwing/logging for non-OK (useful for "check session" calls) */
export async function apiFetchSafe<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    return (text ? ({ raw: text } as any as T) : null);
  } catch {
    return null;
  }
}
