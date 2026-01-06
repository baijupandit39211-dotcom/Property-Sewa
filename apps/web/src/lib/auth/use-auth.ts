"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	changePassword as changePasswordApi,
	getMe,
	googleLogin as googleLoginApi,
	login as loginApi,
	logout as logoutApi,
	type RegisterPayload,
	register as registerApi,
	updateMe as updateMeApi,
} from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

type AuthError = string | null;

export interface UseAuthResult {
	user: AuthUser | null;
	loading: boolean;
	error: AuthError;
	isAuthenticated: boolean;
	refresh: () => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	register: (payload: RegisterPayload) => Promise<boolean>;
	googleLogin: (credential: string) => Promise<boolean>;
	logout: () => Promise<void>;
	updateMe: (
		payload: Partial<Pick<AuthUser, "name">> & { address?: string },
	) => Promise<void>;
	changePassword: (
		currentPassword: string,
		newPassword: string,
	) => Promise<void>;
}

export const useAuth = (): UseAuthResult => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<AuthError>(null);

	const refresh = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const me = await getMe();
			setUser((me as AuthUser | null) ?? null);
		} catch (err: any) {
			if (err?.status === 401) {
				setUser(null);
				setError(null);
			} else {
				const message = err?.message ?? "Failed to load user";
				setError(message);
				toast.error(message);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	// ✅ FIXED: Login now uses backend API (loginApi) not /api/auth/login
	const login = useCallback(
		async (email: string, password: string) => {
			try {
				setLoading(true);
				setError(null);

				await loginApi({ email, password }); // ✅ backend call
				await refresh(); // ✅ load user from /auth/me

				toast.success("Logged in successfully");
			} catch (err: any) {
				const message = err?.message ?? "Login failed";
				setError(message);
				toast.error(message);
			} finally {
				setLoading(false);
			}
		},
		[refresh],
	);

	// ✅ Register stays same, but you can optionally auto-login later
	const register = useCallback(async (payload: RegisterPayload) => {
		try {
			setLoading(true);
			setError(null);
			await registerApi(payload);
			toast.success("Account created successfully");
			return true;
		} catch (err: any) {
			const message = err?.message ?? "Registration failed";
			setError(message);
			toast.error(message);
			return false;
		} finally {
			setLoading(false);
		}
	}, []);

	// ✅ Google Login: call backend then refresh user
	const googleLogin = useCallback(
		async (credential: string) => {
			try {
				setLoading(true);
				setError(null);

				await googleLoginApi({ credential });
				await refresh();

				toast.success("Logged in with Google");
				return true;
			} catch (err: any) {
				const message = err?.message ?? "Google login failed";
				setError(message);
				toast.error(message);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[refresh],
	);

	const logout = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			await logoutApi();
			setUser(null);
			toast.success("Logged out");
		} catch (err: any) {
			const message = err?.message ?? "Logout failed";
			setError(message);
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, []);

	const updateMe = useCallback(
		async (payload: Partial<Pick<AuthUser, "name">> & { address?: string }) => {
			try {
				setLoading(true);
				setError(null);
				const updated = await updateMeApi(payload);
				setUser((prev) =>
					prev
						? ({ ...prev, ...updated } as AuthUser)
						: (updated as AuthUser | null),
				);
				toast.success("Profile updated");
			} catch (err: any) {
				const message = err?.message ?? "Update profile failed";
				setError(message);
				toast.error(message);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const changePassword = useCallback(
		async (currentPassword: string, newPassword: string) => {
			try {
				setLoading(true);
				setError(null);
				await changePasswordApi({ currentPassword, newPassword });
				toast.success("Password changed successfully");
			} catch (err: any) {
				const message = err?.message ?? "Change password failed";
				setError(message);
				toast.error(message);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	return {
		user,
		loading,
		error,
		isAuthenticated: !!user,
		refresh,
		login,
		register,
		googleLogin,
		logout,
		updateMe,
		changePassword,
	};
};
