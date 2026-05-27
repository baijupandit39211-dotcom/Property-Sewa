import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { requireAdminRole, requireRoles } from "./role.middleware";
import { requireSuperAdmin } from "../modules/auth/middleware/superadmin.middleware";

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

describe("role and superadmin middleware", () => {
  it("returns 401 when user role is missing", () => {
    const middleware = requireRoles(["buyer", "seller"]);
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role is not allowed", () => {
    const middleware = requireRoles(["admin"]);
    const req = { user: { role: "buyer" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows admin role for requireAdminRole", () => {
    const req = { user: { role: "admin" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireAdminRole(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("requires superadmin role for requireSuperAdmin", () => {
    const req = { user: { role: "admin" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireSuperAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows superadmin role for requireSuperAdmin", () => {
    const req = { user: { role: "superadmin" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireSuperAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
