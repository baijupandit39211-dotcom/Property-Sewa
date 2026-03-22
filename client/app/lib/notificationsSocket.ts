"use client";

import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/app/lib/api";

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  category: "message" | "order" | "payment" | "alert";
  priority?: "low" | "medium" | "high";
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationNewPayload = {
  notification: NotificationItem;
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

type NotificationSocketHandlers = {
  onNew?: (payload: NotificationNewPayload) => void;
  onRead?: (payload: NotificationReadPayload) => void;
  onReadAll?: (payload: NotificationReadAllPayload) => void;
};

let socket: Socket | null = null;

function getNotificationSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: false,
      path: "/socket.io",
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function subscribeToNotificationSocket(handlers: NotificationSocketHandlers) {
  const activeSocket = getNotificationSocket();
  if (!activeSocket) return () => {};

  const handleNew = (payload: NotificationNewPayload) => handlers.onNew?.(payload);
  const handleRead = (payload: NotificationReadPayload) => handlers.onRead?.(payload);
  const handleReadAll = (payload: NotificationReadAllPayload) => handlers.onReadAll?.(payload);

  activeSocket.on("notification:new", handleNew);
  activeSocket.on("notification:read", handleRead);
  activeSocket.on("notification:read_all", handleReadAll);

  return () => {
    activeSocket.off("notification:new", handleNew);
    activeSocket.off("notification:read", handleRead);
    activeSocket.off("notification:read_all", handleReadAll);
  };
}
