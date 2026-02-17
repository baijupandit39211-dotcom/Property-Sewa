import { apiFetch } from "@/app/lib/api";

/**
 * Logs out current user (any role). Clears cookies on server.
 */
export async function logoutUser() {
  return apiFetch<{ success?: boolean; message?: string }>("/auth/logout", {
    method: "POST",
  });
}
