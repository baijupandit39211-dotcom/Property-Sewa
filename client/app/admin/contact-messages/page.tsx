"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { apiFetchAdmin } from "@/app/lib/api";
import { subscribeToNotificationSocket } from "@/app/lib/notificationsSocket";
import { Mail, Sparkles, MessageSquareText, Phone, RefreshCcw, Search } from "lucide-react";

type ContactStatus = "new" | "reviewed" | "resolved";

type ContactMessageItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  inquiryType: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
};

type NotificationSocketItem = {
  _id: string;
  type?: string;
  category: "message" | "order" | "payment" | "contact" | "alert";
  link?: string | null;
  data?: Record<string, unknown>;
};

type ContactMessagesResponse = {
  success: boolean;
  counts: {
    total: number;
    new: number;
    reviewed: number;
    resolved: number;
  };
  items: ContactMessageItem[];
};

type UpdateStatusResponse = {
  success: boolean;
  item: {
    id: string;
    status: ContactStatus;
    updatedAt: string;
  };
  meta: {
    statusEmailAttempted: boolean;
    statusEmailSent: boolean;
    statusEmailFailed: boolean;
    statusEmailType: ContactStatus | null;
    reason?: string;
  };
};

type ReplyResponse = {
  success: boolean;
  message: string;
  item: {
    id: string;
    status: ContactStatus;
    lastRepliedAt: string | null;
    lastReplySubject: string;
    repliedBy: string | null;
  };
  meta: {
    replyEmailSent: boolean;
    replyEmailFailed: boolean;
    autoMarkedReviewed: boolean;
  };
};

type AiReplyResponse = {
  success: boolean;
  message: string;
  data: {
    subject?: string;
    draft: string;
  };
  meta?: {
    model?: string;
  };
};

const STATUS_OPTIONS: Array<{ label: string; value: "all" | ContactStatus }> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Resolved", value: "resolved" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function validateReplyInput(subject: string, message: string) {
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  if (!cleanSubject) return "Reply subject is required.";
  if (cleanSubject.length < 4) return "Reply subject should be at least 4 characters.";
  if (!cleanMessage) return "Reply message is required.";
  if (cleanMessage.length < 12) return "Reply message should be at least 12 characters.";
  return "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: ContactStatus }) {
  const tone =
    status === "new"
      ? "bg-sky-50 text-sky-700 ring-sky-200"
      : status === "reviewed"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1", tone)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function AdminContactMessagesPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<ContactMessagesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | ContactStatus>("all");
  const [selectedId, setSelectedId] = React.useState("");
  const [updatingId, setUpdatingId] = React.useState("");
  const [replySubject, setReplySubject] = React.useState("");
  const [replyMessage, setReplyMessage] = React.useState("");
  const [sendingReply, setSendingReply] = React.useState(false);
  const [generatingReply, setGeneratingReply] = React.useState(false);
  const [showReplyValidation, setShowReplyValidation] = React.useState(false);
  const [actionNotice, setActionNotice] = React.useState("");
  const focusContactId = searchParams.get("contactId") || "";

  const loadMessages = React.useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const query = params.toString();
      const response = await apiFetchAdmin<ContactMessagesResponse>(
        `/api/admin/contact-messages${query ? `?${query}` : ""}`,
        { cache: "no-store" }
      );

      setData(response);
      setSelectedId((current) => {
        if (focusContactId && response.items.some((item) => item.id === focusContactId)) {
          return focusContactId;
        }
        if (current && response.items.some((item) => item.id === current)) return current;
        return response.items[0]?.id || "";
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load contact messages.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [focusContactId, search, statusFilter]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMessages();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadMessages]);

  React.useEffect(() => {
    return subscribeToNotificationSocket({
      onNew: ({ notification }) => {
        const item = notification as NotificationSocketItem;
        if (item.type !== "contact.created" && item.category !== "contact") return;
        void loadMessages(true);
        setActionNotice("A new contact message just arrived.");
      },
    });
  }, [loadMessages]);

  const selectedMessage = React.useMemo(
    () => data?.items.find((item) => item.id === selectedId) || null,
    [data, selectedId]
  );

  const replyValidationError = React.useMemo(
    () => validateReplyInput(replySubject, replyMessage),
    [replySubject, replyMessage]
  );

  React.useEffect(() => {
    if (!selectedMessage) {
      setReplySubject("");
      setReplyMessage("");
      setShowReplyValidation(false);
      return;
    }

    setReplySubject(`Re: ${selectedMessage.subject}`);
    setReplyMessage("");
    setShowReplyValidation(false);
    setActionNotice("");
  }, [selectedMessage?.id]);

  const updateStatus = async (contactId: string, status: ContactStatus) => {
    try {
      setUpdatingId(contactId);
      setActionNotice("");
      const response = await apiFetchAdmin<UpdateStatusResponse>(
        `/api/admin/contact-messages/${contactId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );
      await loadMessages(true);

      if (response.meta.statusEmailAttempted) {
        setActionNotice(
          response.meta.statusEmailFailed
            ? `Status updated to ${status}, but the email notification failed.`
            : `Status updated to ${status} and the email notification was sent.`
        );
      } else if (response.meta.reason === "same_status") {
        setActionNotice("This message is already on that status.");
      } else {
        setActionNotice(`Status updated to ${status}.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update contact message status.");
    } finally {
      setUpdatingId("");
    }
  };

  const sendReply = async () => {
    if (!selectedMessage) return;

    const validationError = validateReplyInput(replySubject, replyMessage);
    if (validationError) {
      setShowReplyValidation(true);
      setError(validationError);
      return;
    }

    try {
      setSendingReply(true);
      setShowReplyValidation(false);
      setError("");
      setActionNotice("");

      const response = await apiFetchAdmin<ReplyResponse>(
        `/api/admin/contact-messages/${selectedMessage.id}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            subject: replySubject.trim(),
            message: replyMessage.trim(),
          }),
        }
      );

      await loadMessages(true);
      setError("");
      setReplyMessage("");
      setActionNotice(
        response.meta.replyEmailFailed
          ? "Reply record saved, but the email could not be sent."
          : response.message
      );
    } catch (err: any) {
      setError(err?.message || "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const generateAiReply = async () => {
    if (!selectedMessage) return;

    try {
      setGeneratingReply(true);
      setShowReplyValidation(false);
      setError("");
      setActionNotice("");

      const response = await apiFetchAdmin<AiReplyResponse>(
        `/api/admin/contact-messages/${selectedMessage.id}/ai-reply`,
        {
          method: "POST",
        }
      );

      if (response.data.subject?.trim()) {
        setReplySubject(response.data.subject.trim());
      }
      setReplyMessage(response.data.draft || "");
      setActionNotice("AI reply draft generated. Review it before sending.");
    } catch (err: any) {
      setError(err?.message || "Failed to generate AI reply.");
    } finally {
      setGeneratingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-[28px] bg-white shadow-sm" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[18px] bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-[480px] rounded-[28px] bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-emerald-200/80 bg-[linear-gradient(120deg,#0f2f29_0%,#1f5c46_45%,#98c9af_100%)] px-7 py-7 text-white shadow-[0_24px_80px_rgba(19,74,54,0.22)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-50/80">
              Contact Inbox
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Contact Messages
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/90 sm:text-base">
              Review every message sent from the public contact page, track response status, and keep the support flow organized from one admin view.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadMessages(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Messages" value={data?.counts.total || 0} icon={<Mail className="h-5 w-5" />} />
        <StatCard title="New" value={data?.counts.new || 0} icon={<MessageSquareText className="h-5 w-5" />} />
        <StatCard title="Reviewed" value={data?.counts.reviewed || 0} icon={<Search className="h-5 w-5" />} />
        <StatCard title="Resolved" value={data?.counts.resolved || 0} icon={<Phone className="h-5 w-5" />} />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, phone, subject, or message"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  statusFilter === option.value
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Sender</th>
                    <th className="px-5 py-4 font-semibold">Inquiry</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.length ? (
                    data.items.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "cursor-pointer border-t border-slate-200 transition hover:bg-emerald-50/50",
                          selectedId === item.id && "bg-emerald-50/70"
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">{item.subject}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.inquiryType}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(item.createdAt)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                        No contact messages found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
            {selectedMessage ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Selected Message
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                      {selectedMessage.subject}
                    </h2>
                  </div>
                  <StatusBadge status={selectedMessage.status} />
                </div>

                <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Name</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{selectedMessage.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Email</p>
                    <a href={`mailto:${selectedMessage.email}`} className="mt-1 block text-sm font-medium text-emerald-700">
                      {selectedMessage.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Phone</p>
                    <a href={`tel:${selectedMessage.phone}`} className="mt-1 block text-sm font-medium text-emerald-700">
                      {selectedMessage.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Inquiry Type</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{selectedMessage.inquiryType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Received</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(selectedMessage.createdAt)}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Message</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedMessage.message}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Update Status</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["new", "reviewed", "resolved"] as ContactStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(selectedMessage.id, status)}
                        disabled={updatingId === selectedMessage.id || selectedMessage.status === status}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-semibold transition",
                          selectedMessage.status === status
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
                          (updatingId === selectedMessage.id || selectedMessage.status === status) &&
                            "cursor-not-allowed opacity-70"
                        )}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Send Reply</p>
                    <button
                      type="button"
                      onClick={() => void generateAiReply()}
                      disabled={generatingReply}
                      className={cn(
                        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100",
                        generatingReply && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      {generatingReply ? "Generating..." : "Generate AI Reply"}
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="reply-subject">
                        Subject
                      </label>
                      <input
                        id="reply-subject"
                        value={replySubject}
                        onChange={(event) => {
                          setReplySubject(event.target.value);
                          setError("");
                        }}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        placeholder="Reply subject"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="reply-message">
                        Message
                      </label>
                      <textarea
                        id="reply-message"
                        rows={6}
                        value={replyMessage}
                        onChange={(event) => {
                          setReplyMessage(event.target.value);
                          setError("");
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        placeholder="Write your reply to the sender here."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={sendingReply || Boolean(replyValidationError)}
                      className={cn(
                        "inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700",
                        (sendingReply || Boolean(replyValidationError)) &&
                          "cursor-not-allowed opacity-70"
                      )}
                    >
                      {sendingReply ? "Sending reply..." : "Send Reply"}
                    </button>

                    {showReplyValidation && replyValidationError ? (
                      <p className="text-sm font-medium text-amber-700">{replyValidationError}</p>
                    ) : null}
                  </div>
                </div>

                {actionNotice ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {actionNotice}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid min-h-[320px] place-items-center text-center text-sm text-slate-500">
                Select a message to see its full details.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

export default function AdminContactMessagesPage() {
  return (
    <React.Suspense fallback={null}>
      <AdminContactMessagesPageContent />
    </React.Suspense>
  );
}
