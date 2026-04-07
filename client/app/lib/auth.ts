import { apiFetch } from "@/app/lib/api";

export function getDashboardPath(role?: string) {
  const normalizedRole = (role || "").toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "superadmin") {
    return "/admin/overview";
  }

  if (normalizedRole === "buyer") {
    return "/buyer/buyer-dashboard";
  }

  if (normalizedRole === "seller" || normalizedRole === "agent") {
    return "/seller/seller-dashboard";
  }

  return "/";
}

/**
 * Logs out current user (any role). Clears cookies on server.
 */
export async function logoutUser() {
  return apiFetch<{ success?: boolean; message?: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function logoutByRole(role?: string) {
  const normalizedRole = (role || "").toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "superadmin") {
    return apiFetch<{ success?: boolean; message?: string }>("/auth/admin/logout", {
      method: "POST",
    });
  }

  return logoutUser();
}
