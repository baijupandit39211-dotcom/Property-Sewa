const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const defaultHeaders: HeadersInit = {
	"Content-Type": "application/json",
};

const buildUrl = (path: string): string => {
	const base = API_BASE_URL.replace(/\/+$/, "");
	const cleanPath = path.replace(/^\/+/, "");
	return `${base}/${cleanPath}`;
};

const handleJsonResponse = async <T = unknown>(res: Response): Promise<T> => {
	const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
	const isJson = contentType.includes("application/json");

	const data = isJson ? await res.json().catch(() => null) : null;

	if (!res.ok) {
		const message =
			(data && ((data as any).message || (data as any).error)) ||
			`Request failed with status ${res.status}`;

		const error = new Error(message) as Error & {
			status?: number;
			data?: unknown;
		};
		error.status = res.status;
		error.data = data ?? undefined;
		throw error;
	}

	return data as T;
};

export interface RegisterPayload {
	name: string;
	email: string;
	password: string;
	address: string;
	phone?: string;
	role?: "buyer" | "seller" | "agent" | "admin";
}

export interface LoginPayload {
	email: string;
	password: string;
}

export interface GoogleLoginPayload {
	credential: string;
}

export interface ChangePasswordPayload {
	currentPassword: string;
	newPassword: string;
}

export interface UpdateProfilePayload {
	name?: string;
	address?: string;
}

/* ---------------------------
   Auth APIs
--------------------------- */

export const register = async (payload: RegisterPayload) => {
	const res = await fetch(buildUrl("/auth/register"), {
		method: "POST",
		headers: defaultHeaders,
		credentials: "include",
		body: JSON.stringify(payload),
	});
	return handleJsonResponse(res);
};

export const login = async (payload: LoginPayload) => {
	const res = await fetch(buildUrl("/auth/login"), {
		method: "POST",
		headers: defaultHeaders,
		credentials: "include",
		body: JSON.stringify(payload),
	});
	return handleJsonResponse(res);
};

export const googleLogin = async (payload: GoogleLoginPayload) => {
	const res = await fetch(buildUrl("/auth/google"), {
		method: "POST",
		headers: defaultHeaders,
		credentials: "include",
		body: JSON.stringify(payload),
	});
	return handleJsonResponse(res);
};

export const logout = async () => {
	const res = await fetch(buildUrl("/auth/logout"), {
		method: "POST",
		headers: defaultHeaders,
		credentials: "include",
	});
	return handleJsonResponse(res);
};

export const getMe = async () => {
	const res = await fetch(buildUrl("/auth/me"), {
		method: "GET",
		headers: defaultHeaders,
		credentials: "include",
	});
	return handleJsonResponse(res);
};

export const updateMe = async (payload: UpdateProfilePayload) => {
	const res = await fetch(buildUrl("/auth/me"), {
		method: "PATCH",
		headers: defaultHeaders,
		credentials: "include",
		body: JSON.stringify(payload),
	});
	return handleJsonResponse(res);
};

export const changePassword = async (payload: ChangePasswordPayload) => {
	const res = await fetch(buildUrl("/auth/change-password"), {
		method: "PATCH",
		headers: defaultHeaders,
		credentials: "include",
		body: JSON.stringify(payload),
	});
	return handleJsonResponse(res);
};
