"use client";

import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/app/lib/api";

type ChatMessage = {
  _id: string;
  leadId: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  senderRole: "seller" | "buyer";
  text: string;
  createdAt: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
};

type ChatNewMessagePayload = {
  message: ChatMessage;
  senderId: string;
  receiverId: string;
};

type ChatTypingPayload = {
  leadId: string;
  senderId: string;
  senderRole: "seller" | "buyer";
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

type ChatSocketHandlers = {
  onConnect?: () => void;
  onNewMessage?: (payload: ChatNewMessagePayload) => void;
  onMessageDelivered?: (payload: ChatStatusPayload) => void;
  onMessageSeen?: (payload: ChatStatusPayload) => void;
  onUserOnline?: (payload: ChatPresencePayload) => void;
  onUserOffline?: (payload: ChatPresencePayload) => void;
  onTypingStart?: (payload: ChatTypingPayload) => void;
  onTypingStop?: (payload: ChatTypingPayload) => void;
};

let socket: Socket | null = null;
let socketDebugBound = false;
const isTypingDebugEnabled = process.env.NODE_ENV !== "production";

function logTypingDebug(event: string, details: Record<string, unknown>) {
  if (!isTypingDebugEnabled) return;
  console.log(`[chatSocket] ${event}`, details);
}

function getChatSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: false,
      path: "/socket.io",
    });
  }

  if (socket && !socketDebugBound) {
    socket.on("connect", () => {
      logTypingDebug("socket_connected", {
        socketId: socket?.id || "",
      });
    });
    socketDebugBound = true;
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function subscribeToChatSocket(handlers: ChatSocketHandlers) {
  const activeSocket = getChatSocket();
  if (!activeSocket) return () => {};

  const handleConnect = () => handlers.onConnect?.();
  const handleNewMessage = (payload: ChatNewMessagePayload) =>
    handlers.onNewMessage?.(payload);
  const handleMessageDelivered = (payload: ChatStatusPayload) =>
    handlers.onMessageDelivered?.(payload);
  const handleMessageSeen = (payload: ChatStatusPayload) =>
    handlers.onMessageSeen?.(payload);
  const handleUserOnline = (payload: ChatPresencePayload) =>
    handlers.onUserOnline?.(payload);
  const handleUserOffline = (payload: ChatPresencePayload) =>
    handlers.onUserOffline?.(payload);
  const handleTypingStart = (payload: ChatTypingPayload) => {
    logTypingDebug("typing_start_received", payload);
    handlers.onTypingStart?.(payload);
  };
  const handleTypingStop = (payload: ChatTypingPayload) => {
    logTypingDebug("typing_stop_received", payload);
    handlers.onTypingStop?.(payload);
  };

  activeSocket.on("connect", handleConnect);
  activeSocket.on("chat:new_message", handleNewMessage);
  activeSocket.on("chat:message_delivered", handleMessageDelivered);
  activeSocket.on("chat:message_seen", handleMessageSeen);
  activeSocket.on("chat:user_online", handleUserOnline);
  activeSocket.on("chat:user_offline", handleUserOffline);
  activeSocket.on("chat:typing_start", handleTypingStart);
  activeSocket.on("chat:typing_stop", handleTypingStop);

  return () => {
    activeSocket.off("connect", handleConnect);
    activeSocket.off("chat:new_message", handleNewMessage);
    activeSocket.off("chat:message_delivered", handleMessageDelivered);
    activeSocket.off("chat:message_seen", handleMessageSeen);
    activeSocket.off("chat:user_online", handleUserOnline);
    activeSocket.off("chat:user_offline", handleUserOffline);
    activeSocket.off("chat:typing_start", handleTypingStart);
    activeSocket.off("chat:typing_stop", handleTypingStop);
  };
}

export function emitChatTypingStart(leadId: string) {
  const activeSocket = getChatSocket();
  if (!activeSocket || !leadId) return;
  logTypingDebug("typing_start_emitted", { leadId });
  activeSocket.emit("chat:typing_start", { leadId });
}

export function emitChatTypingStop(leadId: string) {
  const activeSocket = getChatSocket();
  if (!activeSocket || !leadId) return;
  logTypingDebug("typing_stop_emitted", { leadId });
  activeSocket.emit("chat:typing_stop", { leadId });
}

export function emitChatDelivered(leadId: string) {
  const activeSocket = getChatSocket();
  if (!activeSocket || !leadId) return;
  activeSocket.emit("chat:deliver_messages", { leadId });
}

export function emitChatSeen(leadId: string) {
  const activeSocket = getChatSocket();
  if (!activeSocket || !leadId) return;
  activeSocket.emit("chat:see_messages", { leadId });
}

export function subscribeToChatPresence(leadId: string) {
  const activeSocket = getChatSocket();
  if (!activeSocket || !leadId) return;
  activeSocket.emit("chat:presence_subscribe", { leadId });
}
