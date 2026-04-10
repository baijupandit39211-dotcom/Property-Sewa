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

type ChatSocketHandlers = {
  onNewMessage?: (payload: ChatNewMessagePayload) => void;
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

  const handleNewMessage = (payload: ChatNewMessagePayload) =>
    handlers.onNewMessage?.(payload);
  const handleTypingStart = (payload: ChatTypingPayload) => {
    logTypingDebug("typing_start_received", payload);
    handlers.onTypingStart?.(payload);
  };
  const handleTypingStop = (payload: ChatTypingPayload) => {
    logTypingDebug("typing_stop_received", payload);
    handlers.onTypingStop?.(payload);
  };

  activeSocket.on("chat:new_message", handleNewMessage);
  activeSocket.on("chat:typing_start", handleTypingStart);
  activeSocket.on("chat:typing_stop", handleTypingStop);

  return () => {
    activeSocket.off("chat:new_message", handleNewMessage);
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
