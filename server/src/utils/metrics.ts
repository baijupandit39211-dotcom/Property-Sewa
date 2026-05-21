import { Counter, Registry, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register, prefix: "property_sewa_" });

export const propertyCacheRequestsTotal = new Counter({
  name: "property_sewa_cache_requests_total",
  help: "Total cache result events for property read endpoints",
  labelNames: ["endpoint", "result"] as const,
  registers: [register],
});

export const adminDashboardCacheRequestsTotal = new Counter({
  name: "property_sewa_admin_dashboard_cache_requests_total",
  help: "Total cache result events for admin dashboard endpoints",
  labelNames: ["endpoint", "result"] as const,
  registers: [register],
});

export const adminPendingPropertiesCacheRequestsTotal = new Counter({
  name: "property_sewa_admin_pending_properties_cache_requests_total",
  help: "Total cache result events for admin pending properties endpoint",
  labelNames: ["endpoint", "result"] as const,
  registers: [register],
});

export function recordPropertyCacheResult(
  endpoint: "listApproved" | "listSuggestions" | "getApprovedById",
  result: "hit" | "miss"
) {
  propertyCacheRequestsTotal.inc({ endpoint, result });
}

export function recordAdminDashboardCacheResult(
  endpoint: "adminOverview" | "adminActivity",
  result: "hit" | "miss"
) {
  adminDashboardCacheRequestsTotal.inc({ endpoint, result });
}

export function recordAdminPendingPropertiesCacheResult(
  endpoint: "adminPendingProperties",
  result: "hit" | "miss"
) {
  adminPendingPropertiesCacheRequestsTotal.inc({ endpoint, result });
}

export function getMetricsRegistry() {
  return register;
}
