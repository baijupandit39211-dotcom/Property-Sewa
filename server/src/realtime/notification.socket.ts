import type { Server as HttpServer } from "http";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import { Server } from "socket.io";
import Lead from "../models/Lead.model";
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

type ChatNewMessagePayload = {
  message: Record<string, unknown>;
  senderId: string;
  receiverId: string;
};

type ChatTypingPayload = {
  leadId: string;
  senderId: string;
  senderRole: "buyer" | "seller";
};

let io: Server | null = null;
const isTypingDebugEnabled = process.env.NODE_ENV !== "production";

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

function logTypingDebug(event: string, details: Record<string, unknown>) {
  if (!isTypingDebugEnabled) return;
  console.log(`[socket][typing] ${event}`, details);
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

async function resolveChatParticipants(leadId: string, userId: string) {
  const lead = await Lead.findById(leadId).select("sellerId buyerId").lean();
  if (!lead?.sellerId || !lead?.buyerId) return null;

  const sellerId = String(lead.sellerId);
  const buyerId = String(lead.buyerId);

  if (sellerId === userId) {
    return {
      receiverId: buyerId,
      senderRole: "seller" as const,
    };
  }

  if (buyerId === userId) {
    return {
      receiverId: sellerId,
      senderRole: "buyer" as const,
    };
  }

  return null;
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
    logTypingDebug("socket_connected", {
      socketId: socket.id,
      userId,
      room: getSocketRoom(userId),
    });

    socket.on("chat:typing_start", async (payload: { leadId?: string } = {}) => {
      try {
        const leadId = String(payload?.leadId || "").trim();
        if (!leadId) return;
        logTypingDebug("typing_start_received", {
          socketId: socket.id,
          userId,
          leadId,
        });

        const participants = await resolveChatParticipants(leadId, userId);
        if (!participants?.receiverId) return;

        const room = getSocketRoom(participants.receiverId);
        io?.to(room).emit("chat:typing_start", {
          leadId,
          senderId: userId,
          senderRole: participants.senderRole,
        } satisfies ChatTypingPayload);
        logTypingDebug("typing_start_forwarded", {
          leadId,
          senderId: userId,
          senderRole: participants.senderRole,
          receiverId: participants.receiverId,
          room,
        });
      } catch {}
    });

    socket.on("chat:typing_stop", async (payload: { leadId?: string } = {}) => {
      try {
        const leadId = String(payload?.leadId || "").trim();
        if (!leadId) return;
        logTypingDebug("typing_stop_received", {
          socketId: socket.id,
          userId,
          leadId,
        });

        const participants = await resolveChatParticipants(leadId, userId);
        if (!participants?.receiverId) return;

        const room = getSocketRoom(participants.receiverId);
        io?.to(room).emit("chat:typing_stop", {
          leadId,
          senderId: userId,
          senderRole: participants.senderRole,
        } satisfies ChatTypingPayload);
        logTypingDebug("typing_stop_forwarded", {
          leadId,
          senderId: userId,
          senderRole: participants.senderRole,
          receiverId: participants.receiverId,
          room,
        });
      } catch {}
    });
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

export function emitChatNewMessage(userId: string, payload: ChatNewMessagePayload) {
  if (!io) return;
  io.to(getSocketRoom(userId)).emit("chat:new_message", payload);
}
