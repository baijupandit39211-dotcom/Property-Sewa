import type { Server as HttpServer } from "http";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import { Server } from "socket.io";
import Lead from "../models/Lead.model";
import Message from "../models/Message.model";
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

type ChatStatusPayload = {
  leadId: string;
  messageIds: string[];
  deliveredAt?: string;
  seenAt?: string;
};

type ChatPresencePayload = {
  leadId: string;
  userId: string;
  isOnline: boolean;
};

type ChatTypingPayload = {
  leadId: string;
  senderId: string;
  senderRole: "buyer" | "seller";
};

let io: Server | null = null;
const isTypingDebugEnabled = process.env.NODE_ENV !== "production";
const connectedSocketsByUser = new Map<string, Set<string>>();

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

function logPresenceDebug(event: string, details: Record<string, unknown>) {
  if (!isTypingDebugEnabled) return;
  console.log(`[socket][presence] ${event}`, details);
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

async function emitPresenceForUser(userId: string, isOnline: boolean) {
  if (!io) return;

  const leads = await Lead.find({
    buyerId: { $ne: null },
    $or: [{ sellerId: userId }, { buyerId: userId }],
  })
    .select("_id sellerId buyerId")
    .lean();

  for (const lead of leads) {
    if (!lead?.sellerId || !lead?.buyerId) continue;

    const sellerId = String(lead.sellerId);
    const buyerId = String(lead.buyerId);
    const receiverId = sellerId === userId ? buyerId : buyerId === userId ? sellerId : "";

    if (!receiverId) continue;

    const payload = {
      leadId: String(lead._id),
      userId,
      isOnline,
    } satisfies ChatPresencePayload;

    io.to(getSocketRoom(receiverId)).emit(isOnline ? "chat:user_online" : "chat:user_offline", payload);
    logPresenceDebug(isOnline ? "presence_emitted_online" : "presence_emitted_offline", {
      leadId: String(lead._id),
      userId,
      receiverId,
    });
  }
}

function markUserSocketConnected(userId: string, socketId: string) {
  const existing = connectedSocketsByUser.get(userId) || new Set<string>();
  const wasOffline = existing.size === 0;
  existing.add(socketId);
  connectedSocketsByUser.set(userId, existing);
  logPresenceDebug("socket_connected", {
    userId,
    socketId,
    socketCount: existing.size,
  });
  return wasOffline;
}

function markUserSocketDisconnected(userId: string, socketId: string) {
  const existing = connectedSocketsByUser.get(userId);
  if (!existing) return true;

  existing.delete(socketId);
  const isOffline = existing.size === 0;

  if (isOffline) {
    connectedSocketsByUser.delete(userId);
  } else {
    connectedSocketsByUser.set(userId, existing);
  }

  logPresenceDebug("socket_disconnected", {
    userId,
    socketId,
    socketCount: existing.size,
  });

  return isOffline;
}

function isUserOnline(userId: string) {
  return (connectedSocketsByUser.get(userId)?.size || 0) > 0;
}

async function updateMessageReceiptStatus(
  leadId: string,
  userId: string,
  status: "delivered" | "seen"
) {
  const lead = await Lead.findById(leadId).select("sellerId buyerId").lean();
  if (!lead?.sellerId || !lead?.buyerId) {
    throw new Error("Lead not found or incomplete");
  }

  const sellerId = String(lead.sellerId);
  const buyerId = String(lead.buyerId);

  let senderId = "";

  if (sellerId === userId) {
    senderId = buyerId;
  } else if (buyerId === userId) {
    senderId = sellerId;
  } else {
    throw new Error("User is not a participant in this lead");
  }

  const timestamp = new Date();
  const updatedMessages = await Message.find(
    status === "delivered"
      ? { leadId, senderId, deliveredAt: null }
      : { leadId, senderId, seenAt: null }
  )
    .select("_id")
    .lean();

  if (!updatedMessages.length) return null;

  await Message.updateMany(
    { _id: { $in: updatedMessages.map((message) => message._id) } },
    status === "delivered"
      ? { $set: { deliveredAt: timestamp } }
      : { $set: { deliveredAt: timestamp, seenAt: timestamp } }
  );

  return {
    senderId,
    messageIds: updatedMessages.map((message) => String(message._id)),
    deliveredAt: timestamp.toISOString(),
    seenAt: status === "seen" ? timestamp.toISOString() : undefined,
  };
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
    const becameOnline = markUserSocketConnected(userId, socket.id);
    logTypingDebug("socket_connected", {
      socketId: socket.id,
      userId,
      room: getSocketRoom(userId),
    });

    if (becameOnline) {
      void emitPresenceForUser(userId, true);
    }

    socket.on("chat:presence_subscribe", async (payload: { leadId?: string } = {}) => {
      try {
        const leadId = String(payload?.leadId || "").trim();
        if (!leadId) return;

        const participants = await resolveChatParticipants(leadId, userId);
        if (!participants?.receiverId) return;

        const presencePayload = {
          leadId,
          userId: participants.receiverId,
          isOnline: isUserOnline(participants.receiverId),
        } satisfies ChatPresencePayload;

        socket.emit(
          presencePayload.isOnline ? "chat:user_online" : "chat:user_offline",
          presencePayload
        );
        logPresenceDebug("presence_subscribed", {
          socketId: socket.id,
          userId,
          leadId,
          otherUserId: participants.receiverId,
          isOnline: presencePayload.isOnline,
        });
      } catch (error) {
        console.error("[socket][chat] presence_subscribe_failed", {
          socketId: socket.id,
          userId,
          payload,
          error,
        });
      }
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

    socket.on("chat:deliver_messages", async (payload: { leadId?: string } = {}) => {
      try {
        const leadId = String(payload?.leadId || "").trim();
        if (!leadId) return;

        const result = await updateMessageReceiptStatus(leadId, userId, "delivered");
        if (!result?.senderId || !result.messageIds.length || !result.deliveredAt) return;

        io?.to(getSocketRoom(result.senderId)).emit("chat:message_delivered", {
          leadId,
          messageIds: result.messageIds,
          deliveredAt: result.deliveredAt,
        } satisfies ChatStatusPayload);
      } catch (error) {
        console.error("[socket][chat] deliver_messages_failed", {
          socketId: socket.id,
          userId,
          payload,
          error,
        });
      }
    });

    socket.on("chat:see_messages", async (payload: { leadId?: string } = {}) => {
      try {
        const leadId = String(payload?.leadId || "").trim();
        if (!leadId) return;

        const result = await updateMessageReceiptStatus(leadId, userId, "seen");
        if (!result?.senderId || !result.messageIds.length || !result.deliveredAt || !result.seenAt) return;

        io?.to(getSocketRoom(result.senderId)).emit("chat:message_seen", {
          leadId,
          messageIds: result.messageIds,
          deliveredAt: result.deliveredAt,
          seenAt: result.seenAt,
        } satisfies ChatStatusPayload);
      } catch (error) {
        console.error("[socket][chat] see_messages_failed", {
          socketId: socket.id,
          userId,
          payload,
          error,
        });
      }
    });

    socket.on("disconnect", () => {
      const becameOffline = markUserSocketDisconnected(userId, socket.id);
      if (becameOffline) {
        void emitPresenceForUser(userId, false);
      }
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
