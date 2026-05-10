"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  ReceiptText,
} from "lucide-react";
import { apiFetch, apiFetchAdmin } from "@/app/lib/api";
import { typography } from "@/app/lib/typography";
import { subscribeToNotificationSocket } from "@/app/lib/notificationsSocket";

type NotificationItem = {
  _id: string;
  title: string;
  body: string;
  category: "message" | "order" | "payment" | "contact" | "alert";
  priority: "low" | "medium" | "high";
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

type Props = {
  roleLabel: "Buyer" | "Seller" | "Admin";
  endpointBase?: string;
  authMode?: "user" | "admin";
};

type SocketNotificationItem = NotificationItem & {
  category: "message" | "order" | "payment" | "contact" | "alert";
};

function getNotificationIcon(category: NotificationItem["category"]) {
  if (category === "message") return MessageSquare;
  if (category === "order" || category === "payment") return ReceiptText;
  if (category === "contact") return Mail;
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

export default function NotificationsPageContent({
  roleLabel,
  endpointBase = "/notifications",
  authMode = "user",
}: Props) {
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
  const unreadCount = data.items.filter((item) => !item.isRead).length;
  const fetcher = authMode === "admin" ? apiFetchAdmin : apiFetch;

  const fetchNotifications = async (nextPage: number) => {
    try {
      setLoading(true);
      const response = await fetcher<NotificationListResponse>(
        `${endpointBase}?page=${nextPage}&limit=10`
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
        await fetcher(`${endpointBase}/${notification._id}/read`, { method: "PATCH" });
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
      await fetcher(`${endpointBase}/read-all`, { method: "PATCH" });
      notifyNotificationStateChanged();
      await fetchNotifications(page);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-7 py-7 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
              <Bell className="h-3.5 w-3.5" />
              {roleLabel} Notification Center
            </div>
            <h1 className="ps-page-title text-white">Notifications</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#edf6f0]/90">
              Review new messages, transaction updates, and account alerts in one polished workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || loading || data.items.length === 0}
            className={`relative z-10 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-[#11392f] shadow-sm transition hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-60 ${typography.buttonText}`}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={typography.cardTitle}>Unread now</p>
              <p className={`mt-2 ${typography.statValue}`}>{unreadCount}</p>
              <p className={`mt-2 ${typography.helperText}`}>New notifications in this page view.</p>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
              <Bell className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={typography.cardTitle}>Total activity</p>
              <p className={`mt-2 ${typography.statValue}`}>{data.total}</p>
              <p className={`mt-2 ${typography.helperText}`}>All notifications available from the backend.</p>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={typography.cardTitle}>Page status</p>
              <p className={`mt-2 ${typography.statValue}`}>
                {data.page}/{data.totalPages}
              </p>
              <p className={`mt-2 ${typography.helperText}`}>Current notifications page position.</p>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/80 px-6 py-5">
          <div>
            <h2 className={typography.sectionTitle}>Recent activity</h2>
            <p className={`mt-1 ${typography.helperText}`}>{data.total} total notifications</p>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Page {data.page} of {data.totalPages}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 px-6 py-6">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-emerald-100 bg-white px-5 py-5 shadow-sm"
              >
                <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mb-2 h-5 w-56 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className={typography.sectionTitle}>No notifications yet</h3>
            <p className={`mt-2 ${typography.pageSubtitle}`}>
              When something important happens, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-6 py-6">
            {data.items.map((notification) => {
              const Icon = getNotificationIcon(notification.category);

              return (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={`flex w-full items-start gap-4 rounded-[24px] border px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50/70 ${
                    notification.isRead
                      ? "border-emerald-100 bg-white"
                      : "border-emerald-200 bg-emerald-50/60"
                  }`}
                >
                  <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 ring-1 ring-emerald-100 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{notification.title}</p>
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
                    <p className={typography.pageSubtitle}>{notification.body}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className={typography.helperText}>
                        {formatTimestamp(notification.createdAt)}
                      </p>
                      <span className={`${typography.badgeText} text-emerald-700`}>Open</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-emerald-100/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!data.hasPrev || loading}
            className={`inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${typography.buttonText}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className={typography.helperText}>
            Showing {(data.page - 1) * data.limit + (data.items.length ? 1 : 0)}-
            {(data.page - 1) * data.limit + data.items.length} of {data.total}
          </div>

          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data.hasNext || loading}
            className={`inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${typography.buttonText}`}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
