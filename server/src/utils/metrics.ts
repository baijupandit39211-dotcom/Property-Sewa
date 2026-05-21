import { Counter, Registry, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register, prefix: "property_sewa_" });

export const propertyCacheRequestsTotal = new Counter({
  name: "property_sewa_cache_requests_total",
  help: "Total cache result events for property read endpoints",
  labelNames: ["endpoint", "result"] as const,
  registers: [register],
});

export function recordPropertyCacheResult(
  endpoint: "listApproved" | "listSuggestions" | "getApprovedById",
  result: "hit" | "miss"
) {
  propertyCacheRequestsTotal.inc({ endpoint, result });
}

export function getMetricsRegistry() {
  return register;
}
