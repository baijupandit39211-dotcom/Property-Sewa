"use client";

import { useEffect, useRef, useState } from "react";
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
  type LocalFilter = "all" | "unread" | "read";
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<LocalFilter>("all");
  const initialLoadStartedRef = useRef(false);
  const fetchSeqRef = useRef(0);
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
  const filteredItems = data.items.filter((item) => {
    if (activeFilter === "unread") return !item.isRead;
    if (activeFilter === "read") return item.isRead;
    return true;
  });
  const fetcher = authMode === "admin" ? apiFetchAdmin : apiFetch;

  const fetchNotifications = async (nextPage: number) => {
    const reqId = ++fetchSeqRef.current;
    try {
      setLoading(true);
      const response = await fetcher<NotificationListResponse>(
        `${endpointBase}?page=${nextPage}&limit=10`
      );
      if (reqId !== fetchSeqRef.current) return;
      setData(response);
    } catch {
      if (reqId !== fetchSeqRef.current) return;
      setData((prev) => ({ ...prev, items: [] }));
    } finally {
      if (reqId !== fetchSeqRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStartedRef.current && page === 1) return;
    initialLoadStartedRef.current = true;
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
      <div className="relative overflow-hidden rounded-[24px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-7 py-7 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
              <Bell className="h-3.5 w-3.5" />
              {roleLabel} Notification Center
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Notifications</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
              Review new messages, transaction updates, and account alerts in one polished workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || loading || data.items.length === 0}
            className={`relative z-10 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-[#0D1C12] shadow-sm transition hover:bg-[#EEF8EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30 disabled:cursor-not-allowed disabled:opacity-60 ${typography.buttonText}`}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={typography.cardTitle}>Unread now</p>
              <p className={`mt-2 ${typography.statValue}`}>{unreadCount}</p>
              <p className={`mt-2 ${typography.helperText}`}>New notifications in this page view.</p>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#316249_0%,#4D9966_100%)] p-3 text-white shadow-sm">
              <Bell className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={typography.cardTitle}>Total activity</p>
              <p className={`mt-2 ${typography.statValue}`}>{data.total}</p>
              <p className={`mt-2 ${typography.helperText}`}>All notifications available from the backend.</p>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#316249_0%,#4D9966_100%)] p-3 text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={typography.cardTitle}>Page status</p>
              <p className={`mt-2 ${typography.statValue}`}>
                {data.page}/{data.totalPages}
              </p>
              <p className={`mt-2 ${typography.helperText}`}>Current notifications page position.</p>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,#316249_0%,#4D9966_100%)] p-3 text-white shadow-sm">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-6 py-5">
          <div>
            <h2 className={typography.sectionTitle}>Recent activity</h2>
            <p className={`mt-1 ${typography.helperText}`}>{data.total} total notifications</p>
          </div>
          <div className="rounded-full bg-[#EEF8EB] px-3 py-1 text-xs font-semibold text-[#316249] ring-1 ring-[#D1D5DB]">
            Page {data.page} of {data.totalPages}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] px-6 py-3">
          {[
            { key: "all" as const, label: "All" },
            { key: "unread" as const, label: "Unread" },
            { key: "read" as const, label: "Read" },
          ].map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#316249] text-white shadow-sm"
                    : "bg-[#E8F2EB] text-[#4B6B59] ring-1 ring-[#D1D5DB] hover:bg-[#DDEFE4]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-4 px-6 py-6">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm"
              >
                <div className="mb-3 h-4 w-32 animate-pulse rounded bg-[#E8F2EB]" />
                <div className="mb-2 h-5 w-56 animate-pulse rounded bg-[#E8F2EB]" />
                <div className="h-4 w-full animate-pulse rounded bg-[#E8F2EB]" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-[#EEF8EB] text-[#316249] ring-1 ring-[#D1D5DB]">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className={typography.sectionTitle}>
              {activeFilter === "all" ? "No notifications yet" : `No ${activeFilter} notifications`}
            </h3>
            <p className={`mt-2 ${typography.pageSubtitle}`}>
              When something important happens, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-6 py-6">
            {filteredItems.map((notification) => {
              const Icon = getNotificationIcon(notification.category);

              return (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={`flex w-full items-start gap-4 rounded-[24px] border px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#EEF8EB]/70 ${
                    notification.isRead
                      ? "border-[#E5E7EB] bg-white"
                      : "border-[#D1D5DB] bg-[#EEF8EB]/60"
                  }`}
                >
                  <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white text-[#316249] ring-1 ring-[#D1D5DB] shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      <p className="text-[15px] font-semibold text-[#0D1C12]">{notification.title}</p>
                      {!notification.isRead && (
                        <span className="rounded-full bg-[#316249] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                          New
                        </span>
                      )}
                      <span className="rounded-full bg-[#ECF5EF] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[#618975]">
                        {notification.category}
                      </span>
                      <span className="rounded-full bg-[#ECF5EF] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[#618975]">
                        {notification.priority}
                      </span>
                    </div>
                    <p className={typography.pageSubtitle}>{notification.body}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                      <p className={typography.helperText}>
                        {formatTimestamp(notification.createdAt)}
                      </p>
                      <span className={`${typography.badgeText} rounded-full bg-[#EEF8EB] px-2.5 py-1 text-[#316249] ring-1 ring-[#D1D5DB]`}>Open</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-[#E5E7EB] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!data.hasPrev || loading}
            className={`inline-flex items-center gap-2 rounded-2xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[#0D1C12] transition hover:bg-[#F7FCFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30 disabled:cursor-not-allowed disabled:opacity-50 ${typography.buttonText}`}
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
            className={`inline-flex items-center gap-2 rounded-2xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-[#0D1C12] transition hover:bg-[#F7FCFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]/30 disabled:cursor-not-allowed disabled:opacity-50 ${typography.buttonText}`}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

