import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}));

vi.mock("../services/auth.services", () => ({
  default: {
    login: loginMock,
  },
}));

import { login } from "./auth.controller";

function createRes() {
  const res: Partial<Response> = {};
  res.cookie = vi.fn();
  res.clearCookie = vi.fn();
  res.status = vi.fn(() => res as Response);
  res.json = vi.fn(() => res as Response);
  return res as Response;
}

describe("auth.controller login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.COOKIE_NAME;
    delete process.env.ADMIN_COOKIE_NAME;
  });

  it("logs in with valid credentials, returns user, and sets auth cookie", async () => {
    const req = {
      body: { email: "buyer@example.com", password: "CorrectPass123" },
    } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    const safeUser = {
      id: "u1",
      name: "Buyer One",
      email: "buyer@example.com",
      role: "buyer",
      provider: "local",
    };

    loginMock.mockResolvedValue({
      token: "jwt-access-token",
      user: safeUser,
    });

    await login(req, res, next);

    expect(loginMock).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: "CorrectPass123",
    });
    expect(res.cookie).toHaveBeenCalledWith(
      "accessToken",
      "jwt-access-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
      })
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "adminToken",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      user: safeUser,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects login with valid email and wrong password, without setting auth cookie", async () => {
    const req = {
      body: { email: "buyer@example.com", password: "WrongPass999" },
    } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const invalidCredentialsError = new ApiError(400, "Invalid email or password");

    loginMock.mockRejectedValue(invalidCredentialsError);

    await login(req, res, next);

    expect(loginMock).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: "WrongPass999",
    });
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(invalidCredentialsError);
  });
});
