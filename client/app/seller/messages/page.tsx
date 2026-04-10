"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BellRing,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import {
  emitChatDelivered,
  emitChatSeen,
  emitChatTypingStart,
  emitChatTypingStop,
  subscribeToChatSocket,
} from "@/app/lib/chatSocket";

type Lead = {
  _id: string;
  buyerId?: string | null;
  propertyId: { _id: string; title: string; location: string };
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
};

type Message = {
  _id: string;
  leadId: string;
  senderId: { _id: string; name: string; email: string } | null;
  senderRole: "seller" | "buyer";
  text: string;
  createdAt: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
};

type ConversationSummary = Lead & { lastMessage: Message | null; unreadCount: number };

const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");
const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const formatShortTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 1000 * 60 * 60) return "Just now";
  if (diff < 1000 * 60 * 60 * 24) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 1000 * 60 * 60 * 24 * 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};
const getStatusTone = (status: Lead["status"]) =>
  status === "new"
    ? "bg-sky-50 text-sky-700 ring-sky-200"
    : status === "contacted"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-emerald-50 text-emerald-700 ring-emerald-200";

async function fetchConversationMessages(leadId: string) {
  const response = await apiFetch<{ success: boolean; items: Message[] }>(`/messages/${leadId}`);
  return response.items || [];
}

function applyDeliveredStatus(messages: Message[], messageIds: string[], deliveredAt?: string) {
  if (!messageIds.length || !deliveredAt) return messages;
  const targets = new Set(messageIds);
  return messages.map((message) =>
    targets.has(message._id) ? { ...message, deliveredAt, seenAt: message.seenAt || null } : message
  );
}

function applySeenStatus(messages: Message[], messageIds: string[], deliveredAt?: string, seenAt?: string) {
  if (!messageIds.length || !seenAt) return messages;
  const targets = new Set(messageIds);
  return messages.map((message) =>
    targets.has(message._id)
      ? { ...message, deliveredAt: deliveredAt || message.deliveredAt || seenAt, seenAt }
      : message
  );
}

function renderMessageStatus(message: Message) {
  if (message.seenAt) {
    return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
  }
  if (message.deliveredAt) {
    return <CheckCheck className="h-3.5 w-3.5 text-white/80" />;
  }
  return <Check className="h-3.5 w-3.5 text-white/70" />;
}

export default function SellerMessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState("");
  const [search, setSearch] = useState("");
  const [readMarkers, setReadMarkers] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserRole, setTypingUserRole] = useState<"buyer" | "seller" | null>(null);
  const [isSocketDisconnected, setIsSocketDisconnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const receiverTypingTimeoutRef = useRef<number | null>(null);
  const selectedIdRef = useRef("");
  const deferredSearch = useDeferredValue(search);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item._id === selectedId) || null,
    [conversations, selectedId]
  );
  const filteredConversations = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query) ||
      item.propertyId.title.toLowerCase().includes(query) ||
      item.propertyId.location.toLowerCase().includes(query)
    );
  }, [conversations, deferredSearch]);
  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations]
  );

  const scrollToBottom = useEffectEvent(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const acknowledgeDelivered = useEffectEvent((leadId: string, thread: Message[]) => {
    if (!leadId || !thread.some((message) => message.senderRole === "buyer" && !message.deliveredAt)) return;
    emitChatDelivered(leadId);
  });

  const acknowledgeSeen = useEffectEvent((leadId: string, thread: Message[]) => {
    if (
      !leadId ||
      typeof document === "undefined" ||
      document.visibilityState !== "visible" ||
      !thread.some((message) => message.senderRole === "buyer" && !message.seenAt)
    ) {
      return;
    }

    window.setTimeout(() => {
      if (document.visibilityState === "visible" && selectedIdRef.current === leadId) {
        emitChatSeen(leadId);
      }
    }, 0);
  });

  const markConversationRead = useEffectEvent((leadId: string, thread: Message[]) => {
    const lastMessage = thread[thread.length - 1];
    if (!lastMessage) return;
    setReadMarkers((prev) => ({ ...prev, [leadId]: lastMessage._id }));
    setConversations((prev) => prev.map((item) => (item._id === leadId ? { ...item, unreadCount: 0 } : item)));
  });

  const loadInbox = useEffectEvent(async (keepSelection = true) => {
    const leadsRes = await apiFetch<{ success: boolean; items: Lead[] }>("/leads/mine");
    const leads = leadsRes.items || [];
    const summaries = await Promise.all(
      leads.map(async (lead) => {
        const thread = await fetchConversationMessages(lead._id);
        const lastMessage = thread[thread.length - 1] || null;
        const marker = readMarkers[lead._id];
        let unreadCount = 0;
        if (!marker) unreadCount = thread.filter((item) => item.senderRole === "buyer").length;
        else {
          const markerIndex = thread.findIndex((item) => item._id === marker);
          const unseen = markerIndex === -1 ? thread : thread.slice(markerIndex + 1);
          unreadCount = unseen.filter((item) => item.senderRole === "buyer").length;
        }
        return { ...lead, lastMessage, unreadCount };
      })
    );
    summaries.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    setConversations(summaries);
    if (!keepSelection || !selectedId) setSelectedId(summaries[0]?._id || "");
    else if (!summaries.some((item) => item._id === selectedId)) setSelectedId(summaries[0]?._id || "");
  });

  const loadThread = useEffectEvent(async (leadId: string, silent = false) => {
    if (!silent) setThreadLoading(true);
    try {
      const thread = await fetchConversationMessages(leadId);
      setMessages(thread);
      markConversationRead(leadId, thread);
      acknowledgeDelivered(leadId, thread);
      acknowledgeSeen(leadId, thread);
      requestAnimationFrame(() => scrollToBottom());
    } finally {
      if (!silent) setThreadLoading(false);
    }
  });

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError("");
      try {
        await loadInbox(false);
      } catch (err: any) {
        setError(err?.message || "Failed to load seller inbox");
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadThread(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        await loadInbox(true);
        if (selectedId) await loadThread(selectedId, true);
      } catch {}
    }, 12000);
    return () => window.clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    return subscribeToChatSocket({
      onConnect: () => {
        setIsSocketDisconnected(false);
      },
      onDisconnect: () => {
        setIsSocketDisconnected(true);
      },
      onNewMessage: ({ message }) => {
        if (!message?.leadId) return;

        setConversations((prev) => {
          const exists = prev.some((item) => item._id === message.leadId);
          if (!exists) return prev;

          return prev
            .map((item) =>
              item._id === message.leadId
                ? {
                    ...item,
                    lastMessage: message,
                    unreadCount: selectedIdRef.current === message.leadId ? 0 : item.unreadCount + 1,
                  }
                : item
            )
            .sort((a, b) => {
              const aTime = a.lastMessage?.createdAt || a.createdAt;
              const bTime = b.lastMessage?.createdAt || b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
        });

        if (selectedIdRef.current === message.leadId) {
          setMessages((prev) =>
            prev.some((item) => item._id === message._id) ? prev : [...prev, message]
          );
          acknowledgeDelivered(message.leadId, [message]);
          acknowledgeSeen(message.leadId, [message]);
          requestAnimationFrame(() => scrollToBottom());
        }
      },
      onMessageDelivered: ({ leadId, messageIds, deliveredAt }) => {
        if (leadId !== selectedIdRef.current) return;
        setMessages((prev) => applyDeliveredStatus(prev, messageIds, deliveredAt));
      },
      onMessageSeen: ({ leadId, messageIds, deliveredAt, seenAt }) => {
        if (leadId !== selectedIdRef.current) return;
        setMessages((prev) => applySeenStatus(prev, messageIds, deliveredAt, seenAt));
      },
      onTypingStart: ({ leadId, senderRole }) => {
        if (senderRole !== "buyer" || leadId !== selectedIdRef.current) return;
        setIsTyping(true);
        setTypingUserRole(senderRole);
        if (receiverTypingTimeoutRef.current) {
          window.clearTimeout(receiverTypingTimeoutRef.current);
        }
        receiverTypingTimeoutRef.current = window.setTimeout(() => {
          setIsTyping(false);
          setTypingUserRole(null);
        }, 1800);
      },
      onTypingStop: ({ leadId, senderRole }) => {
        if (senderRole !== "buyer" || leadId !== selectedIdRef.current) return;
        if (receiverTypingTimeoutRef.current) {
          window.clearTimeout(receiverTypingTimeoutRef.current);
        }
        setIsTyping(false);
        setTypingUserRole(null);
      },
    });
  }, [scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (receiverTypingTimeoutRef.current) {
        window.clearTimeout(receiverTypingTimeoutRef.current);
      }
      if (selectedIdRef.current) {
        emitChatTypingStop(selectedIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousLeadId = selectedIdRef.current;
    if (previousLeadId && previousLeadId !== selectedId) {
      emitChatTypingStop(previousLeadId);
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    if (receiverTypingTimeoutRef.current) {
      window.clearTimeout(receiverTypingTimeoutRef.current);
    }
    setIsTyping(false);
    setTypingUserRole(null);
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !messages.length) return;
    acknowledgeSeen(selectedId, messages);
  }, [messages, selectedId]);

  function handleComposerTyping(value: string) {
    setComposer(value);

    if (!selectedId || sending) return;

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      emitChatTypingStop(selectedId);
      return;
    }

    emitChatTypingStart(selectedId);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      emitChatTypingStop(selectedId);
    }, 1200);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    try {
      await loadInbox(true);
      if (selectedId) await loadThread(selectedId, true);
    } catch (err: any) {
      setError(err?.message || "Failed to refresh inbox");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedConversation || !composer.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      _id: tempId,
      leadId: selectedConversation._id,
      senderId: null,
      senderRole: "seller",
      text: composer.trim(),
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setError("");
    setMessages((prev) => [...prev, optimisticMessage]);
    setComposer("");
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    emitChatTypingStop(selectedConversation._id);
    requestAnimationFrame(() => scrollToBottom());

    try {
      const response = await apiFetch<{ success: boolean; message: Message }>(
        `/messages/${selectedConversation._id}`,
        { method: "POST", body: JSON.stringify({ text: optimisticMessage.text }) }
      );

      setMessages((prev) => prev.map((item) => (item._id === tempId ? response.message : item)));
      setConversations((prev) =>
        prev
          .map((item) =>
            item._id === selectedConversation._id
              ? { ...item, lastMessage: response.message }
              : item
          )
          .sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          })
      );
      await loadThread(selectedConversation._id, true);
    } catch (err: any) {
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      setComposer(optimisticMessage.text);
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-sm text-slate-600">Loading seller inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Seller Messaging Workspace
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Messages / Chat</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#edf6f0]/90 sm:text-base">
                Manage buyer conversations, reply from a clean thread view, and keep property-specific
                communication in one seller inbox.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Conversations</div>
                <div className="mt-1 text-2xl font-black">{conversations.length}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Unread</div>
                <div className="mt-1 text-2xl font-black">{totalUnread}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Active thread</div>
                <div className="mt-1 text-sm font-semibold">{selectedConversation?.propertyId.title || "Select a conversation"}</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 self-start rounded-[28px] bg-[rgba(218,232,223,0.12)] p-4 backdrop-blur-md ring-1 ring-[rgba(255,255,255,0.14)]">
            <button type="button" onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#11392f] transition hover:bg-[#f5faf7] disabled:opacity-60">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh inbox"}
            </button>
            <Link href="/seller/leads" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#edf6f0] px-4 py-3 text-sm font-semibold text-[#17614b] transition hover:bg-white">
              Open leads
              <ChevronRight className="h-4 w-4" />
            </Link>
            <div className="rounded-2xl bg-[rgba(9,36,27,0.12)] px-4 py-3 text-sm text-white/90">
              Threads are loaded from seller leads and live message history. Notifications continue to route buyers here.
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">{error}</div>}
      {isSocketDisconnected && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Connection lost
        </div>
      )}
      <section className="grid min-h-0 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex h-[720px] min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-[0_20px_70px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_24px_80px_rgba(15,23,42,0.08)] xl:h-[calc(100vh-260px)] xl:min-h-[620px]">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">Conversation inbox</h2>
                <p className="mt-1 text-sm text-slate-600">{filteredConversations.length} visible of {conversations.length}</p>
              </div>
              {totalUnread > 0 && <span className="inline-flex rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">{totalUnread} unread</span>}
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search buyer, property, or location" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
            {filteredConversations.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700"><MessageCircle className="h-6 w-6" /></div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-slate-950">{search ? "No matching conversations" : "No conversations yet"}</h3>
                <p className="mt-2 text-sm text-slate-500">{search ? "Try a different search term." : "When buyers send inquiries, their threads will appear here."}</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const active = selectedId === conversation._id;
                const preview = conversation.lastMessage?.text || conversation.message || "No message content";
                const hasUnread = conversation.unreadCount > 0;
                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => setSelectedId(conversation._id)}
                    className={cn(
                      "group relative w-full border-b border-slate-100 px-5 py-4 text-left transition-all duration-200 ease-out hover:bg-[#f7fbf8] hover:pl-6",
                      active &&
                        "bg-emerald-50/90 shadow-[inset_3px_0_0_0_#059669] ring-1 ring-inset ring-emerald-100"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition-transform duration-200 ease-out group-hover:scale-[1.03]">
                          {initials(conversation.name)}
                        </div>
                        {hasUnread && (
                          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "truncate text-sm font-bold text-slate-950 transition-colors duration-200 group-hover:text-emerald-800",
                                hasUnread && "text-slate-950"
                              )}
                            >
                              {conversation.name}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">{conversation.propertyId.title}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-[11px] font-medium",
                                hasUnread ? "bg-emerald-50 text-emerald-700" : "text-slate-500"
                              )}
                            >
                              {formatShortTime(conversation.lastMessage?.createdAt || conversation.createdAt)}
                            </span>
                            {hasUnread && (
                              <span className="inline-flex min-w-6 justify-center rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "mt-2 truncate text-sm transition-colors duration-200 group-hover:text-slate-700",
                            hasUnread ? "font-medium text-slate-800" : "text-slate-600"
                          )}
                        >
                          {conversation.lastMessage?.senderRole === "seller" ? "You: " : ""}
                          {preview}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1", getStatusTone(conversation.status))}>{conversation.status}</span>
                          <span className="truncate text-xs text-slate-500">{conversation.propertyId.location}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex h-[720px] min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_24px_80px_rgba(15,23,42,0.08)] xl:h-[calc(100vh-260px)] xl:min-h-[620px]">
            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700"><MessageCircle className="h-6 w-6" /></div>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">Select a conversation</h3>
                  <p className="mt-2 text-sm text-slate-500">Choose a buyer thread from the inbox to view and reply.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-base font-black text-white">{initials(selectedConversation.name)}</div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950">{selectedConversation.name}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-slate-400" />{selectedConversation.propertyId.title}</span>
                          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{selectedConversation.propertyId.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ring-1", getStatusTone(selectedConversation.status))}>{selectedConversation.status}</span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><Clock3 className="h-3.5 w-3.5" />Started {formatDateTime(selectedConversation.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[linear-gradient(180deg,#f4f8f5_0%,#ffffff_26%)] px-6 py-6">
                  {threadLoading ? (
                    <div className="flex h-full items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-emerald-600" /></div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-[22px] rounded-tl-md bg-slate-100 px-4 py-3 text-slate-800 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5">
                          <div className="text-sm leading-6">{selectedConversation.message}</div>
                          <div className="mt-2 text-xs text-slate-500">Original inquiry | {formatDateTime(selectedConversation.createdAt)}</div>
                        </div>
                      </div>
                      {messages.map((message) => {
                        const mine = message.senderRole === "seller";
                        return (
                          <div key={message._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[80%] rounded-[22px] px-4 py-3 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5", mine ? "rounded-tr-md bg-emerald-600 text-white shadow-[0_16px_30px_rgba(5,150,105,0.18)]" : "rounded-tl-md bg-white text-slate-800 ring-1 ring-slate-200")}>
                              <div className="text-sm leading-6">{message.text}</div>
                              <div className={cn("mt-2 flex items-center gap-1.5 text-xs", mine ? "text-emerald-100" : "text-slate-500")}>
                                {mine ? (
                                  <>
                                    <span>{`You | ${formatDateTime(message.createdAt)}`}</span>
                                    {renderMessageStatus(message)}
                                  </>
                                ) : (
                                  <span>{`${message.senderId?.name || selectedConversation.name} | ${formatDateTime(message.createdAt)}`}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(249,252,250,0.98)_100%)] px-6 py-5 backdrop-blur-sm">
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3 transition-all duration-200 ease-out focus-within:-translate-y-0.5 focus-within:border-emerald-400 focus-within:bg-white focus-within:shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
                      <textarea value={composer} onChange={(event) => handleComposerTyping(event.target.value)} rows={2} placeholder="Type your reply to the buyer..." className="w-full resize-none bg-transparent text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400" disabled={sending} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="max-w-[440px] text-xs leading-5 text-slate-500">
                        {isTyping && typingUserRole === "buyer" ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                          </div>
                        ) : error ? (
                          "Failed to send message"
                        ) : isSocketDisconnected ? (
                          "Connection lost"
                        ) : (
                          "Replies are sent into the buyer conversation and trigger message notifications."
                        )}
                      </div>
                      <button type="submit" disabled={sending || !composer.trim()} className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#059669_0%,#6ac5ab_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(5,150,105,0.20)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(5,150,105,0.26)] disabled:cursor-not-allowed disabled:opacity-60">
                        {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send message
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><UserRound className="h-3.5 w-3.5" />Buyer Snapshot</div>
              {selectedConversation ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,#f8fafc_0%,#effdf5_100%)] p-4 ring-1 ring-slate-200 transition-transform duration-200 ease-out hover:-translate-y-0.5">
                    <div className="text-lg font-black tracking-tight text-slate-950">{selectedConversation.name}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4 text-slate-400" />{selectedConversation.email}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{selectedConversation.phone || "No phone shared"}</div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Listing</div><div className="mt-1 font-semibold text-slate-900">{selectedConversation.propertyId.title}</div></div>
                    <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Location</div><div className="mt-1">{selectedConversation.propertyId.location}</div></div>
                    <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Inquiry status</div><div className="mt-1"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1", getStatusTone(selectedConversation.status))}>{selectedConversation.status}</span></div></div>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Select a conversation to view buyer and listing details.</p>
              )}
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><BellRing className="h-3.5 w-3.5" />Seller Flow</div>
              <div className="mt-5 grid gap-3">
                <Link href="/seller/leads" className="group flex items-center justify-between rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900">Open leads workspace<ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" /></Link>
                <Link href="/seller/visit-scheduling" className="group flex items-center justify-between rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900">Manage visit requests<ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" /></Link>
                <Link href="/seller/notifications" className="group flex items-center justify-between rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900">Open notifications<ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" /></Link>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </div>
  );
}
