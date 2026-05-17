export function isDevTimingEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function nowMs() {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

export function payloadSizeBytes(payload: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch {
    return 0;
  }
}

export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ value: T; ms: number; label: string }> {
  const started = nowMs();
  const value = await fn();
  return { label, value, ms: nowMs() - started };
}

export function logDevTiming(scope: string, meta: Record<string, unknown>) {
  if (!isDevTimingEnabled()) return;
  console.log(`[dev-timing] ${scope}`, meta);
}
