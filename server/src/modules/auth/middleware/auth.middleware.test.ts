import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

const {
  verifyMock,
  leanMock,
  selectMock,
  findByIdMock,
} = vi.hoisted(() => {
  const lean = vi.fn();
  const select = vi.fn(() => ({ lean }));
  const findById = vi.fn(() => ({ select }));
  const verify = vi.fn();
  return {
    verifyMock: verify,
    leanMock: lean,
    selectMock: select,
    findByIdMock: findById,
  };
});

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: verifyMock,
  },
}));

vi.mock("../../../models/User.model", () => ({
  default: {
    findById: findByIdMock,
  },
}));

import { optionalAuth, requireAdminAuth, requireUserAuth } from "./auth.middleware";

function createRes() {
  const res: Partial<Response> & {
    statusCode?: number;
    body?: unknown;
  } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = vi.fn((payload: unknown) => {
    res.body = payload;
    return res as Response;
  });
  return res as Response & { statusCode?: number; body?: unknown };
}

describe("auth.middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.COOKIE_NAME = "accessToken";
    process.env.ADMIN_COOKIE_NAME = "adminToken";
  });

  it("requireUserAuth returns 401 when token is missing", async () => {
    const req = { cookies: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await requireUserAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("requireUserAuth attaches user and calls next for active token", async () => {
    verifyMock.mockReturnValueOnce({ userId: "u1" });
    leanMock.mockResolvedValueOnce({
      _id: "u1",
      email: "u1@test.com",
      role: "buyer",
      status: "active",
    });

    const req = { cookies: { accessToken: "ok-token" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await requireUserAuth(req, res, next);

    expect(req.user?.userId).toBe("u1");
    expect(req.user?.role).toBe("buyer");
    expect(next).toHaveBeenCalledOnce();
  });

  it("requireAdminAuth denies non-admin role", async () => {
    verifyMock.mockReturnValueOnce({ userId: "u2" });
    leanMock.mockResolvedValueOnce({
      _id: "u2",
      email: "u2@test.com",
      role: "buyer",
      status: "active",
    });

    const req = { cookies: { adminToken: "admin-token" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await requireAdminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("optionalAuth keeps request anonymous for invalid token and still continues", async () => {
    verifyMock.mockImplementationOnce(() => {
      throw new Error("bad token");
    });

    const req = { cookies: { accessToken: "bad-token" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});
