export type ApiError = {
  message?: string;
};

// Force localhost:5000 for development
const API_BASE = "http://localhost:5000";

async function coreFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  
  console.log("API Request:", { method: init.method || "GET", url, hasBody: !!init.body });

  const res = await fetch(url, {
    ...init,
    headers: {
      // If body is FormData, don't force JSON header
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
    credentials: "include", // Always include cookies, cannot be overridden
  });

  console.log("API Response:", { 
    status: res.status, 
    statusText: res.statusText,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries())
  });

  let data;
  let responseText;
  try {
    responseText = await res.text();
    console.log("Raw Response Text:", responseText);
    data = JSON.parse(responseText);
  } catch (jsonErr) {
    console.error("Failed to parse JSON response:", jsonErr);
    console.error("Response text that failed to parse:", responseText);
    data = {};
  }

  console.log("Parsed Response Data:", data);

  if (!res.ok) {
    const msg = (data as ApiError)?.message || `Request failed (${res.status})`;
    console.error("API Error:", { status: res.status, message: msg, data });
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
