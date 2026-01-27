export type ApiError = {
  success?: boolean;
  message?: string;
  error?: string;
  stack?: string;
};

/**
 * Force localhost:5000 for development
 * (Keep your setup as-is)
 */
const API_BASE = "http://localhost:5000";

/**
 * Parse helper: tries JSON first, otherwise returns null
 */
function tryParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * ✅ Senior-grade fetch wrapper:
 * - Reads response body ONCE as text (no double-consume bugs)
 * - Parses JSON even if server forgot content-type
 * - Preserves raw text for HTML/empty cases
 * - Produces meaningful error messages instead of {}
 */
async function coreFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const method = init.method || "GET";

  // Optional debug (keep if you want)
  console.log("API Request:", {
    method,
    url,
    hasBody: !!init.body,
    bodyType: init.body instanceof FormData ? "FormData" : typeof init.body,
  });

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";

  // ✅ Read body ONCE as text (works for JSON, HTML, empty, anything)
  let raw = "";
  try {
    // Some responses may be empty; res.text() is still safe.
    raw = await res.text();
  } catch {
    raw = "";
  }

  // ✅ Build "data" safely
  // - If raw is JSON -> object
  // - If raw is not JSON -> { raw: "..." }
  // - If raw empty -> null
  const parsedJson = raw ? tryParseJson(raw) : null;
  const data: any = parsedJson ?? (raw ? { raw } : null);

  // ✅ If not OK, throw meaningful error message
  if (!res.ok) {
    const msg =
      (data as ApiError)?.message ||
      (data as ApiError)?.error ||
      (typeof data?.raw === "string" ? data.raw : "") ||
      `Request failed (${res.status})`;

    // ✅ Better error logging (you’ll now see real message + raw body)
    console.error("API Error:", url, method, res.status, res.statusText, {
  contentType,
  message: msg,
  data,
  raw,
});

    throw new Error(msg);
  }

  // ✅ If success and server returns empty, return null
  return (data as T) ?? (null as any as T);
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

/**
 * ✅ Safe fetch:
 * - returns null on non-OK
 * - does NOT throw
 * - does NOT spam console
 */
export async function apiFetchSafe<T>(
  path: string,
  init: RequestInit = {}
): Promise<T | null> {
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

  let raw = "";
  try {
    raw = await res.text();
  } catch {
    raw = "";
  }

  const parsedJson = raw ? tryParseJson(raw) : null;
  return (parsedJson as T) ?? (raw ? ({ raw } as any as T) : null);
}
