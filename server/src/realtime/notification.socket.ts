import type { Server as HttpServer } from "http";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/User.model";

type JwtPayloadShape = JwtPayload & {
  userId: string;
  email?: string;
  role?: string;
};

type NotificationRealtimePayload = {
  notification: Record<string, unknown>;
  unreadCount: number;
};

type NotificationReadPayload = {
  notificationId: string;
  unreadCount: number;
  readAt: string;
};

type NotificationReadAllPayload = {
  unreadCount: number;
  readAt: string;
};

let io: Server | null = null;

function getAllowedOrigins() {
  return [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5000",
    process.env.CORS_ORIGIN,
  ].filter(Boolean) as string[];
}

function getSocketRoom(userId: string) {
  return `user:${userId}`;
}

function getCookieValue(rawCookie: string | undefined, name: string) {
  if (!rawCookie) return "";

  const pairs = rawCookie.split(";").map((item) => item.trim());
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (key === name) return decodeURIComponent(value);
  }

  return "";
}

function getSecret() {
  const secret = process.env.JWT_SECRET as Secret;
  if (!secret) throw new Error("JWT_SECRET not set");
  return secret;
}

function verify(token: string) {
  return jwt.verify(token, getSecret()) as JwtPayloadShape;
}

export function initNotificationSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookieName = process.env.COOKIE_NAME || "accessToken";
      const rawCookie = socket.handshake.headers.cookie;
      const token = getCookieValue(rawCookie, cookieName);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = verify(token);
      const user = await User.findById(decoded.userId).select("_id email role status").lean();

      if (!user) {
        return next(new Error("Authentication required"));
      }

      const status = String(user.status || "active").toLowerCase();
      if (status === "suspended" || status === "inactive" || status === "archived") {
        return next(new Error("Access denied"));
      }

      socket.data.user = {
        userId: String(user._id),
        email: String(user.email || ""),
        role: String(user.role || ""),
      };

      return next();
    } catch (error) {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.userId as string | undefined;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(getSocketRoom(userId));
  });

  return io;
}

export function emitNotificationCreated(userId: string, payload: NotificationRealtimePayload) {
  if (!io) return;
  io.to(getSocketRoom(userId)).emit("notification:new", payload);
}

export function emitNotificationRead(userId: string, payload: NotificationReadPayload) {
  if (!io) return;
  io.to(getSocketRoom(userId)).emit("notification:read", payload);
}

export function emitNotificationReadAll(userId: string, payload: NotificationReadAllPayload) {
  if (!io) return;
  io.to(getSocketRoom(userId)).emit("notification:read_all", payload);
}
