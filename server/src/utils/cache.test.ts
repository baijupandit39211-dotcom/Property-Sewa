import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isRedisReadyMock,
  getRedisClientMock,
  clientGetMock,
  clientSetMock,
  clientDelMock,
  scanIteratorMock,
} = vi.hoisted(() => ({
  isRedisReadyMock: vi.fn(),
  getRedisClientMock: vi.fn(),
  clientGetMock: vi.fn(),
  clientSetMock: vi.fn(),
  clientDelMock: vi.fn(),
  scanIteratorMock: vi.fn(),
}));

vi.mock("../config/redis", () => ({
  isRedisReady: isRedisReadyMock,
  getRedisClient: getRedisClientMock,
}));

import { deleteByPattern, getJsonCache, makeCacheKey, setJsonCache } from "./cache";

describe("cache utils (redis cache and performance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PROPERTY_CACHE_NAMESPACE = "property:v1";
  });

  it("makeCacheKey is stable regardless of payload key order", () => {
    const a = makeCacheKey("property:list", { b: 2, a: 1, c: { z: 1, y: 2 } });
    const b = makeCacheKey("property:list", { c: { y: 2, z: 1 }, a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it("getJsonCache returns parsed JSON when redis has value", async () => {
    isRedisReadyMock.mockReturnValueOnce(true);
    getRedisClientMock.mockReturnValueOnce({ get: clientGetMock });
    clientGetMock.mockResolvedValueOnce(JSON.stringify({ total: 3 }));

    const value = await getJsonCache<{ total: number }>("k1");
    expect(value?.total).toBe(3);
  });

  it("setJsonCache writes JSON with EX ttl", async () => {
    isRedisReadyMock.mockReturnValueOnce(true);
    getRedisClientMock.mockReturnValueOnce({ set: clientSetMock });
    clientSetMock.mockResolvedValueOnce("OK");

    await setJsonCache("k2", { ok: true }, 120);
    expect(clientSetMock).toHaveBeenCalledWith("k2", JSON.stringify({ ok: true }), { EX: 120 });
  });

  it("deleteByPattern scans and deletes matched keys", async () => {
    async function* iterator() {
      yield "a";
      yield "b";
    }
    scanIteratorMock.mockReturnValueOnce(iterator());

    isRedisReadyMock.mockReturnValueOnce(true);
    getRedisClientMock.mockReturnValueOnce({
      scanIterator: scanIteratorMock,
      del: clientDelMock,
    });

    await deleteByPattern("property:*");
    expect(clientDelMock).toHaveBeenCalledWith(["a", "b"]);
  });
});
