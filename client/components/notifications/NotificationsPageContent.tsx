"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ReceiptText,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { subscribeToNotificationSocket } from "@/app/lib/notificationsSocket";

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  category: "message" | "order" | "payment" | "alert";
  priority: "low" | "medium" | "high";
  link?: string | null;
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

type Props = {
  roleLabel: "Buyer" | "Seller";
};

type SocketNotificationItem = NotificationItem & {
  category: "message" | "order" | "payment" | "alert";
};

function getNotificationIcon(category: NotificationItem["category"]) {
  if (category === "message") return MessageSquare;
  if (category === "order" || category === "payment") return ReceiptText;
  return AlertCircle;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notifyNotificationStateChanged() {
  window.dispatchEvent(new Event("notifications:refresh"));
}

export default function NotificationsPageContent({ roleLabel }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [data, setData] = useState<NotificationListResponse>({
    success: true,
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const fetchNotifications = async (nextPage: number) => {
    try {
      setLoading(true);
      const response = await apiFetch<NotificationListResponse>(
        `/notifications?page=${nextPage}&limit=10`
      );
      setData(response);
    } catch {
      setData((prev) => ({ ...prev, items: [] }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  useEffect(() => {
    return subscribeToNotificationSocket({
      onNew: ({ notification }) => {
        if (page !== 1) return;

        setData((prev) => {
          const nextItems = [
            notification as SocketNotificationItem,
            ...prev.items.filter((item) => item._id !== notification._id),
          ].slice(0, prev.limit);

          return {
            ...prev,
            items: nextItems,
            total: prev.total + (prev.items.some((item) => item._id === notification._id) ? 0 : 1),
          };
        });
      },
      onRead: ({ notificationId }) => {
        setData((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item._id === notificationId ? { ...item, isRead: true } : item
          ),
        }));
      },
      onReadAll: () => {
        setData((prev) => ({
          ...prev,
          items: prev.items.map((item) => ({ ...item, isRead: true })),
        }));
      },
    });
  }, [page]);

  const handleOpenNotification = async (notification: NotificationItem) => {
    try {
      if (!notification.isRead) {
        await apiFetch(`/notifications/${notification._id}/read`, { method: "PATCH" });
        notifyNotificationStateChanged();
      }
    } catch {
      // Navigation should still proceed.
    } finally {
      if (notification.link) {
        router.push(notification.link);
      } else {
        await fetchNotifications(page);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      notifyNotificationStateChanged();
      await fetchNotifications(page);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#2F6B4A] via-[#387553] to-[#489362] px-7 py-7 text-white shadow-lg">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
              <Bell className="h-3.5 w-3.5" />
              {roleLabel} Notification Center
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
              Review new messages, transaction updates, and account alerts in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || loading || data.items.length === 0}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#24563B] shadow-sm transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent activity</h2>
            <p className="text-sm text-slate-500">{data.total} total notifications</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Page {data.page} of {data.totalPages}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 px-6 py-6">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5"
              >
                <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mb-2 h-5 w-56 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No notifications yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              When something important happens, it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((notification) => {
              const Icon = getNotificationIcon(notification.category);

              return (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={`flex w-full items-start gap-4 px-6 py-5 text-left transition hover:bg-emerald-50/60 ${
                    notification.isRead ? "bg-white" : "bg-emerald-50/55"
                  }`}
                >
                  <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{notification.title}</p>
                      {!notification.isRead && (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                          New
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {notification.category}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                        {notification.priority}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{notification.body}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-slate-500">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                      <span className="text-xs font-semibold text-emerald-700">
                        Open
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!data.hasPrev || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="text-sm text-slate-500">
            Showing {(data.page - 1) * data.limit + (data.items.length ? 1 : 0)}-
            {(data.page - 1) * data.limit + data.items.length} of {data.total}
          </div>

          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data.hasNext || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
