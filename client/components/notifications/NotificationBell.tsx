"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  ChevronRight,
  Mail,
  MessageSquare,
  ReceiptText,
} from "lucide-react";
import { apiFetch, apiFetchAdmin } from "@/app/lib/api";
import { subscribeToNotificationSocket } from "@/app/lib/notificationsSocket";

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  category: "message" | "order" | "payment" | "contact" | "alert";
  type?: string;
  link?: string | null;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

type NotificationListResponse = {
  success: boolean;
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type UnreadCountResponse = {
  success: boolean;
  count: number;
};

type Props = {
  notificationsPageHref: string;
  buttonClassName: string;
  panelAlignClassName?: string;
  endpointBase?: string;
  authMode?: "user" | "admin";
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getNotificationIcon(category: NotificationItem["category"]) {
  if (category === "message") return MessageSquare;
  if (category === "order" || category === "payment") return ReceiptText;
  if (category === "contact") return Mail;
  return AlertCircle;
}

function notifyNotificationStateChanged() {
  window.dispatchEvent(new Event("notifications:refresh"));
}

export default function NotificationBell({
  notificationsPageHref,
  buttonClassName,
  panelAlignClassName = "right-0",
  endpointBase = "/notifications",
  authMode = "user",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenNotificationIdsRef = useRef(new Set<string>());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);

  const fetcher = authMode === "admin" ? apiFetchAdmin : apiFetch;

  const playNotificationSound = async (notificationId?: string) => {
    const cleanId = String(notificationId || "").trim();
    if (!cleanId || seenNotificationIdsRef.current.has(cleanId)) return;

    seenNotificationIdsRef.current.add(cleanId);

    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Browser autoplay restrictions are expected until the user interacts.
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio("/sounds/message.mp3?v=20260416-notify");
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetcher<UnreadCountResponse>(`${endpointBase}/unread-count`);
      setUnreadCount(response.count || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  const fetchLatestNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetcher<NotificationListResponse>(`${endpointBase}?limit=8`);
      setNotifications(response.items || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = window.setInterval(fetchUnreadCount, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return subscribeToNotificationSocket({
      onNew: async ({ notification, unreadCount: nextUnreadCount }) => {
        setUnreadCount(nextUnreadCount);
        setNotifications((prev) => {
          const deduped = prev.filter((item) => item._id !== notification._id);
          return [notification, ...deduped].slice(0, 8);
        });
        await playNotificationSound(notification._id);
        notifyNotificationStateChanged();
      },
      onRead: ({ notificationId, unreadCount: nextUnreadCount }) => {
        setUnreadCount(nextUnreadCount);
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notificationId ? { ...item, isRead: true } : item
          )
        );
        notifyNotificationStateChanged();
      },
      onReadAll: ({ unreadCount: nextUnreadCount }) => {
        setUnreadCount(nextUnreadCount);
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        notifyNotificationStateChanged();
      },
    });
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      fetchUnreadCount();
      if (open) fetchLatestNotifications();
    };

    window.addEventListener("notifications:refresh", handleRefresh);
    return () => window.removeEventListener("notifications:refresh", handleRefresh);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetchLatestNotifications();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.isRead) {
        await fetcher(`${endpointBase}/${notification._id}/read`, { method: "PATCH" });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item
          )
        );
        notifyNotificationStateChanged();
      }
    } catch {
      // Navigation should still work even if read state update fails.
    } finally {
      setOpen(false);
      router.push(notification.link || notificationsPageHref);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`${buttonClassName} relative`}
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="h-4 w-4" />
        {unreadLabel && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-[calc(100%+12px)] z-[70] w-[360px] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] ${panelAlignClassName}`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(notificationsPageHref);
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 px-4 py-4">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="mb-2 h-3 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="mb-2 h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-900">No notifications yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  New messages and updates will appear here.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.category);

                  return (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`mb-2 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60 ${
                        notification.isRead
                          ? "border-transparent bg-white"
                          : "border-emerald-100 bg-emerald-50/80"
                      }`}
                    >
                      <div className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <p className="max-h-10 overflow-hidden text-xs leading-5 text-slate-600">
                          {notification.body}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
                          <span className="capitalize">{notification.category}</span>
                          <span>{formatRelativeTime(notification.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(notificationsPageHref);
            }}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open notifications
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
