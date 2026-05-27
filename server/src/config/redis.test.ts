import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, loggerInfoMock, loggerWarnMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock("redis", () => ({
  createClient: createClientMock,
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
  },
}));

describe("redis config (redis cache and performance)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
  });

  it("reports redis disabled when REDIS_URL is missing", async () => {
    const redisConfig = await import("./redis");
    expect(redisConfig.isRedisEnabled()).toBe(false);
    await redisConfig.connectRedis();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("connects redis and toggles readiness through ready/end events", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const handlers: Record<string, (...args: any[]) => void> = {};

    const client = {
      on: vi.fn((event: string, cb: (...args: any[]) => void) => {
        handlers[event] = cb;
      }),
      connect: vi.fn(async () => undefined),
      quit: vi.fn(async () => undefined),
    };
    createClientMock.mockReturnValueOnce(client as any);

    const redisConfig = await import("./redis");
    await redisConfig.connectRedis();
    expect(createClientMock).toHaveBeenCalledOnce();

    handlers.ready?.();
    expect(redisConfig.isRedisReady()).toBe(true);
    handlers.end?.();
    expect(redisConfig.isRedisReady()).toBe(false);

    await redisConfig.disconnectRedis();
    expect(client.quit).toHaveBeenCalledOnce();
  });
});
