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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import {
  emitChatDelivered,
  emitChatSeen,
  emitChatTypingStart,
  emitChatTypingStop,
  subscribeToChatPresence,
  subscribeToChatSocket,
} from "@/app/lib/chatSocket";
import { subscribeToNotificationSocket } from "@/app/lib/notificationsSocket";

type LeadStatus = "new" | "contacted" | "visit_scheduled" | "negotiating" | "reserved" | "closed";
type FilterStatus = "all" | LeadStatus;

type Buyer = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type Property = {
  _id: string;
  title: string;
  location: string;
  images?: Array<{ url: string }>;
  price?: number;
  currency?: string;
  listingType?: string;
  status?: string;
};

type Visit = {
  _id: string;
  requestedDate: string;
  preferredTime: string;
  status: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  sellerResponse?: string;
  actualDate?: string;
  actualTime?: string;
  message?: string;
  createdAt: string;
};

type Message = {
  _id: string;
  leadId: string;
  senderId: { _id: string; name: string; email: string } | null;
  senderRole: "seller" | "buyer";
  text: string;
  fileUrl?: string | null;
  fileDownloadUrl?: string | null;
  fileType?: "image" | "file" | null;
  fileName?: string | null;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deliveredAt?: string | null;
  seenAt?: string | null;
};

type Lead = {
  _id: string;
  buyerId?: Buyer | string | null;
  propertyId: Property;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt?: string;
  lastMessage?: Message | null;
  latestActivityAt?: string;
  messageCount?: number;
  latestVisit?: Visit | null;
};

type VisitResponse = {
  _id: string;
  requestedDate: string;
  preferredTime: string;
  status: Visit["status"];
  message?: string;
  sellerResponse?: string;
  actualDate?: string;
  actualTime?: string;
  createdAt: string;
};
const MAX_CHAT_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_CHAT_DOCUMENT_SIZE = 20 * 1024 * 1024;

const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

const STATUS_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "negotiating", label: "Negotiating" },
  { value: "reserved", label: "Reserved" },
  { value: "closed", label: "Closed" },
];

const DEFAULT_SELLER_REPLIES = [
  "Yes, it is available",
  "Can we schedule a visit?",
  "Please share your preferred time",
];

const LEAD_STAGE_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "negotiating", label: "Negotiating" },
  { value: "reserved", label: "Reserved" },
  { value: "closed", label: "Closed" },
];

const getStatusTone = (status: LeadStatus) =>
  status === "new"
    ? "bg-sky-50 text-sky-700 ring-sky-200"
    : status === "contacted"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "visit_scheduled"
        ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
        : status === "negotiating"
          ? "bg-violet-50 text-violet-700 ring-violet-200"
          : status === "reserved"
            ? "bg-orange-50 text-orange-700 ring-orange-200"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200";

const formatLeadStageLabel = (status: LeadStatus) =>
  status === "visit_scheduled"
    ? "Visit Scheduled"
    : status.charAt(0).toUpperCase() + status.slice(1);

const getVisitTone = (status: Visit["status"]) =>
  status === "requested"
    ? "bg-sky-50 text-sky-700 ring-sky-200"
    : status === "confirmed" || status === "rescheduled"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "completed"
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const formatRelative = (value?: string) => {
  if (!value) return "No activity";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 1000 * 60) return "Just now";
  if (diffMs < 1000 * 60 * 60) return `${Math.max(1, Math.floor(diffMs / (1000 * 60)))}m ago`;
  if (diffMs < 1000 * 60 * 60 * 24) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffMs < 1000 * 60 * 60 * 24 * 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatCurrency = (amount?: number, currency?: string) => {
  if (!amount) return "Price on request";
  return `${currency || "Rs"} ${Number(amount).toLocaleString()}`;
};

const formatVisitDateTime = (date?: string, time?: string) => {
  if (!date && !time) return "";
  if (!date) return time || "";
  const dateLabel = formatDate(date);
  return time ? `${dateLabel} at ${time}` : dateLabel;
};

const getVisitSystemMessage = (visit: Visit | null | undefined) => {
  if (!visit) return null;

  const scheduledDateTime = formatVisitDateTime(
    visit.actualDate || visit.requestedDate,
    visit.actualTime || visit.preferredTime
  );

  if (visit.status === "confirmed" || visit.status === "rescheduled" || visit.status === "completed") {
    return {
      label: `Visit scheduled for ${scheduledDateTime}`,
      tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    };
  }

  if (visit.status === "requested") {
    return {
      label: `Visit requested for ${scheduledDateTime}`,
      tone: "bg-sky-50 text-sky-800 ring-sky-200",
    };
  }

  if (visit.status === "rejected") {
    return {
      label: `Visit request was declined for ${scheduledDateTime}`,
      tone: "bg-rose-50 text-rose-800 ring-rose-200",
    };
  }

  return null;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

function applyDeletedStatus(messages: Message[], messageId: string, deletedAt?: string) {
  if (!messageId || !deletedAt) return messages;
  return messages.map((message) =>
    message._id === messageId
      ? {
          ...message,
          text: "",
          fileUrl: null,
          fileDownloadUrl: null,
          fileType: null,
          fileName: null,
          isDeleted: true,
          deletedAt,
        }
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

function getMessagePreview(message: Message | null | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.isDeleted) return "This message was deleted";
  if (message.text?.trim()) return message.text;
  if (message.fileType === "image") return "Photo";
  if (message.fileName) return message.fileName;
  if (message.fileType === "file") return "File attachment";
  return fallback;
}

function isPdfAttachment(message: Message) {
  const target = `${message.fileName || ""} ${message.fileUrl || ""}`.toLowerCase();
  return target.includes(".pdf");
}

function renderAttachmentContent(message: Message, onPreviewPdf: (url: string, name: string) => void) {
  if (!message.fileUrl || !message.fileType) return null;

  if (message.fileType === "image") {
    return (
      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
        <img src={message.fileUrl} alt={message.fileName || "Shared image"} className="max-h-72 w-full rounded-2xl object-cover" />
      </a>
    );
  }

  const isPdf = isPdfAttachment(message);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-black/5 px-3 py-3 ring-1 ring-inset ring-current/10">
      <FileText className="h-5 w-5 flex-none" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{message.fileName || "Attachment"}</div>
      </div>
      <div className="flex items-center gap-2">
        {isPdf && (
          <button
            type="button"
            onClick={() => onPreviewPdf(message.fileUrl!, message.fileName || "PDF")}
            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        )}
        <a href={message.fileDownloadUrl || message.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white">
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}

function validateChatAttachment(file: File) {
  const isImage = file.type.startsWith("image/");
  const maxSize = isImage ? MAX_CHAT_IMAGE_SIZE : MAX_CHAT_DOCUMENT_SIZE;
  if (file.size > maxSize) {
    return isImage
      ? "Image is too large. Maximum size is 10MB."
      : "File is too large. Maximum size is 20MB.";
  }
  return "";
}

function getBuyerSnapshot(lead: Lead | null) {
  if (!lead) return null;
  const buyer = typeof lead.buyerId === "object" && lead.buyerId ? lead.buyerId : null;
  return {
    name: buyer?.name || lead.name || "Buyer",
    email: buyer?.email || lead.email || "No email shared",
    phone: buyer?.phone || lead.phone || "",
  };
}

function getSmartSellerReplies(messages: Message[], lead: Lead | null) {
  const latestBuyerMessage = [...messages].reverse().find((message) => message.senderRole === "buyer");
  if (!latestBuyerMessage) return DEFAULT_SELLER_REPLIES;

  const text = latestBuyerMessage.text.toLowerCase();
  const suggestions: string[] = [];

  if (text.includes("available")) {
    suggestions.push("Yes, it is available");
  }

  if (
    text.includes("visit") ||
    text.includes("schedule") ||
    text.includes("see property") ||
    text.includes("see the property")
  ) {
    suggestions.push("Can we schedule a visit?");
  }

  if (text.includes("price") || text.includes("negotiable") || text.includes("final")) {
    suggestions.push("The price is negotiable");
  }

  if (text.includes("time") || text.includes("when")) {
    suggestions.push("Please share your preferred time");
  }

  if ((text.includes("location") || text.includes("where")) && lead?.propertyId?.location) {
    suggestions.push(`The property is located in ${lead.propertyId.location}.`);
  }

  const uniqueSuggestions = [...new Set(suggestions)];
  return uniqueSuggestions.length > 0 ? uniqueSuggestions : DEFAULT_SELLER_REPLIES;
}

export default function SellerLeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState<LeadStatus | null>(null);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserRole, setTypingUserRole] = useState<"buyer" | "seller" | null>(null);
  const [isBuyerOnline, setIsBuyerOnline] = useState(false);
  const [isSocketDisconnected, setIsSocketDisconnected] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [aiSellerReplies, setAiSellerReplies] = useState<string[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    requestedDate: "",
    preferredTime: "10:00",
    message: "",
  });
  const typingTimeoutRef = useRef<number | null>(null);
  const receiverTypingTimeoutRef = useRef<number | null>(null);
  const selectedIdRef = useRef("");
  const deferredSearch = useDeferredValue(search);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead._id === selectedId) || null,
    [leads, selectedId]
  );
  const visitSystemMessage = useMemo(
    () => getVisitSystemMessage(selectedLead?.latestVisit),
    [selectedLead]
  );
  const smartSellerReplies = useMemo(
    () => getSmartSellerReplies(messages, selectedLead),
    [messages, selectedLead]
  );
  const displayedSellerReplies = aiSellerReplies.length > 0 ? aiSellerReplies : smartSellerReplies;

  const stats = useMemo(() => {
    const total = leads.length;
    const fresh = leads.filter((lead) => lead.status === "new").length;
    const active = leads.filter((lead) =>
      ["contacted", "visit_scheduled", "negotiating", "reserved"].includes(lead.status)
    ).length;
    const closed = leads.filter((lead) => lead.status === "closed").length;
    const withVisit = leads.filter((lead) => lead.latestVisit).length;
    return { total, fresh, active, closed, withVisit };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter !== "all" && lead.status !== filter) return false;
      if (!query) return true;
      const haystack = [
        lead.name,
        lead.email,
        lead.phone,
        lead.propertyId?.title,
        lead.propertyId?.location,
        lead.lastMessage?.text,
        lead.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, filter, leads]);

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

  const syncSelectedLeadToUrl = useEffectEvent((leadId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (leadId) params.set("lead", leadId);
    else params.delete("lead");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  });

  const loadInbox = useEffectEvent(async () => {
    const response = await apiFetch<{ success: boolean; items: Lead[] }>("/leads/mine");
    const items = (response.items || []).sort(
      (left, right) =>
        new Date(right.latestActivityAt || right.createdAt).getTime() -
        new Date(left.latestActivityAt || left.createdAt).getTime()
    );
    setLeads(items);

    const requestedLeadId = searchParams?.get("lead") || "";
    const nextSelectedId =
      (requestedLeadId && items.some((lead) => lead._id === requestedLeadId) && requestedLeadId) ||
      (selectedId && items.some((lead) => lead._id === selectedId) && selectedId) ||
      items[0]?._id ||
      "";

    setSelectedId(nextSelectedId);
  });

  const loadThread = useEffectEvent(async (leadId: string, silent = false) => {
    if (!silent) setThreadLoading(true);
    try {
      const thread = await fetchConversationMessages(leadId);
      setMessages(thread);
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
        await loadInbox();
      } catch (err: any) {
        setError(err?.message || "Failed to load seller leads");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    const requestedLeadId = searchParams?.get("lead") || "";
    if (requestedLeadId && requestedLeadId !== selectedId && leads.some((lead) => lead._id === requestedLeadId)) {
      setSelectedId(requestedLeadId);
    }
  }, [leads, searchParams, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    syncSelectedLeadToUrl(selectedId);
    loadThread(selectedId);
  }, [selectedId]);

  useEffect(() => {
    return subscribeToChatSocket({
      onConnect: () => {
        setIsSocketDisconnected(false);
        if (selectedIdRef.current) {
          subscribeToChatPresence(selectedIdRef.current);
        }
      },
      onDisconnect: () => {
        setIsSocketDisconnected(true);
      },
      onNewMessage: ({ message }) => {
        if (!message?.leadId) return;

        setLeads((prev) =>
          prev
            .map((lead) =>
              lead._id === message.leadId
                ? {
                    ...lead,
                    lastMessage: message,
                    latestActivityAt: message.createdAt,
                    messageCount:
                      message.senderRole === "buyer"
                        ? (lead.messageCount || 0) + 1
                        : Math.max(lead.messageCount || 0, 1),
                  }
                : lead
            )
            .sort(
              (left, right) =>
                new Date(right.latestActivityAt || right.createdAt).getTime() -
                new Date(left.latestActivityAt || left.createdAt).getTime()
            )
        );

        if (message.leadId !== selectedIdRef.current) return;

        setMessages((prev) => (prev.some((item) => item._id === message._id) ? prev : [...prev, message]));
        acknowledgeDelivered(message.leadId, [message]);
        acknowledgeSeen(message.leadId, [message]);
        requestAnimationFrame(() => scrollToBottom());
      },
      onMessageDelivered: ({ leadId, messageIds, deliveredAt }) => {
        if (leadId !== selectedIdRef.current) return;
        setMessages((prev) => applyDeliveredStatus(prev, messageIds, deliveredAt));
      },
      onMessageSeen: ({ leadId, messageIds, deliveredAt, seenAt }) => {
        if (leadId !== selectedIdRef.current) return;
        setMessages((prev) => applySeenStatus(prev, messageIds, deliveredAt, seenAt));
      },
      onMessageDeleted: ({ leadId, messageId, deletedAt }) => {
        if (leadId !== selectedIdRef.current) return;
        setMessages((prev) => applyDeletedStatus(prev, messageId, deletedAt));
        setLeads((prev) =>
          prev.map((lead) =>
            lead._id === leadId && lead.lastMessage?._id === messageId
              ? {
                  ...lead,
                  lastMessage: {
                    ...lead.lastMessage,
                    text: "",
                    fileUrl: null,
                    fileDownloadUrl: null,
                    fileType: null,
                    fileName: null,
                    isDeleted: true,
                    deletedAt,
                  } as Message,
                }
              : lead
          )
        );
      },
      onUserOnline: ({ leadId }) => {
        if (leadId !== selectedIdRef.current) return;
        setIsBuyerOnline(true);
      },
      onUserOffline: ({ leadId }) => {
        if (leadId !== selectedIdRef.current) return;
        setIsBuyerOnline(false);
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
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        await loadInbox();
        if (selectedId) await loadThread(selectedId, true);
      } catch {}
    }, 15000);
    return () => window.clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    const unsubscribe = subscribeToNotificationSocket({
      onNew: async (payload) => {
        const leadId = String((payload.notification as any)?.data?.leadId || "");
        if (!leadId) return;
        try {
          await loadInbox();
          if (selectedId === leadId || !selectedId) {
            setSelectedId((current) => current || leadId);
            await loadThread(leadId, true);
          }
        } catch {}
      },
    });

    return unsubscribe;
  }, [selectedId]);

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
    setIsBuyerOnline(false);
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !messages.length) return;
    acknowledgeSeen(selectedId, messages);
  }, [messages, selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function loadAiSellerReplies() {
      if (!selectedLead) {
        setAiSellerReplies([]);
        return;
      }

      try {
        const response = await apiFetch<{ success: boolean; suggestions?: string[] }>(
          `/messages/${selectedLead._id}/suggestions`
        );

        if (cancelled) return;
        const suggestions = (response.suggestions || []).filter(Boolean);
        setAiSellerReplies([...new Set(suggestions)].slice(0, 3));
      } catch {
        if (!cancelled) {
          setAiSellerReplies([]);
        }
      }
    }

    loadAiSellerReplies();
    return () => {
      cancelled = true;
    };
  }, [messages, selectedLead]);

  useEffect(() => {
    if (!selectedId) return;
    subscribeToChatPresence(selectedId);
  }, [selectedId]);

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
      await loadInbox();
      if (selectedId) await loadThread(selectedId, true);
    } catch (err: any) {
      setError(err?.message || "Failed to refresh leads");
    } finally {
      setRefreshing(false);
    }
  }

  function openScheduleVisit() {
    const now = new Date();
    const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      .toISOString()
      .slice(0, 10);

    setScheduleError("");
    setScheduleForm({
      requestedDate: scheduleForm.requestedDate || defaultDate,
      preferredTime: scheduleForm.preferredTime || "10:00",
      message:
        scheduleForm.message ||
        `Visit request for ${selectedLead?.propertyId.title || "this property"}.`,
    });
    setScheduleOpen(true);
  }

  function closeScheduleVisit() {
    setScheduleOpen(false);
    setScheduleLoading(false);
    setScheduleError("");
  }

  async function handleScheduleVisit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedLead || !scheduleForm.requestedDate || !scheduleForm.preferredTime || scheduleLoading) return;

    setScheduleLoading(true);
    setScheduleError("");

    try {
      const response = await apiFetch<{ success: boolean; visit: VisitResponse }>(
        `/visits/lead/${selectedLead._id}`,
        {
          method: "POST",
          body: JSON.stringify({
            requestedDate: scheduleForm.requestedDate,
            preferredTime: scheduleForm.preferredTime,
            message: scheduleForm.message,
          }),
        }
      );

      const nextVisit = response.visit;
      setLeads((prev) =>
        prev.map((lead) =>
          lead._id === selectedLead._id
            ? {
                ...lead,
                latestVisit: nextVisit,
              }
            : lead
        )
      );
      await loadInbox();
      await loadThread(selectedLead._id, true);
      closeScheduleVisit();
    } catch (err: any) {
      setScheduleError(err?.message || "Failed to schedule visit");
      setScheduleLoading(false);
    }
  }

  async function sendSellerMessage(text: string, file?: File | null) {
    if (!selectedLead || sending) return;

    const optimisticText = text.trim();
    if (!optimisticText && !file) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticUrl = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    const optimisticMessage: Message = {
      _id: tempId,
      leadId: selectedLead._id,
      senderId: null,
      senderRole: "seller",
      text: optimisticText,
      fileUrl: optimisticUrl,
      fileDownloadUrl: optimisticUrl,
      fileType: file ? (file.type.startsWith("image/") ? "image" : "file") : null,
      fileName: file?.name || null,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setError("");
    setComposer("");
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    emitChatTypingStop(selectedLead._id);
    setIsTyping(false);
    setTypingUserRole(null);
    setMessages((prev) => [...prev, optimisticMessage]);
    requestAnimationFrame(() => scrollToBottom());

    try {
      const requestInit: RequestInit =
        file
          ? (() => {
              const formData = new FormData();
              if (optimisticText) formData.append("text", optimisticText);
              formData.append("file", file);
              return { method: "POST", body: formData };
            })()
          : {
              method: "POST",
              body: JSON.stringify({ text: optimisticText }),
            };

      const response = await apiFetch<{ success: boolean; message: Message }>(
        `/messages/${selectedLead._id}`,
        requestInit
      );

      setMessages((prev) => prev.map((item) => (item._id === tempId ? response.message : item)));
      setLeads((prev) =>
        prev
          .map((lead) =>
            lead._id === selectedLead._id
              ? {
                  ...lead,
                  status: lead.status === "new" ? "contacted" : lead.status,
                  lastMessage: response.message,
                  messageCount: (lead.messageCount || 0) + 1,
                  latestActivityAt: response.message.createdAt,
                }
              : lead
          )
          .sort(
            (left, right) =>
              new Date(right.latestActivityAt || right.createdAt).getTime() -
              new Date(left.latestActivityAt || left.createdAt).getTime()
          )
      );
      await loadThread(selectedLead._id, true);
    } catch (err: any) {
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      if (!file) setComposer(optimisticText);
      setError(err?.message || "Failed to send message");
    } finally {
      if (optimisticUrl) URL.revokeObjectURL(optimisticUrl);
      setSending(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    await sendSellerMessage(composer);
  }

  async function handleQuickReplyClick(reply: string) {
    await sendSellerMessage(reply);
  }

  async function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateChatAttachment(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsUploadingAttachment(true);
    try {
      await sendSellerMessage("", file);
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!selectedLead || sending) return;
    try {
      const response = await apiFetch<{ success: boolean; message: Message }>(
        `/messages/${selectedLead._id}/${messageId}`,
        { method: "DELETE" }
      );
      setMessages((prev) =>
        applyDeletedStatus(prev, messageId, response.message.deletedAt || new Date().toISOString())
      );
      setLeads((prev) =>
        prev.map((lead) =>
          lead._id === selectedLead._id && lead.lastMessage?._id === messageId
            ? { ...lead, lastMessage: { ...lead.lastMessage, ...response.message } as Message }
            : lead
        )
      );
    } catch (err: any) {
      setError(err?.message || "Failed to delete message");
    }
  }

  async function handleStatusChange(nextStatus: LeadStatus) {
    if (!selectedLead || selectedLead.status === nextStatus || statusSaving) return;

    setStatusSaving(nextStatus);
    setError("");
    try {
      const response = await apiFetch<{ success: boolean; lead: Lead }>(
        `/leads/${selectedLead._id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      setLeads((prev) =>
        prev.map((lead) => (lead._id === selectedLead._id ? { ...lead, ...response.lead } : lead))
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update lead status");
    } finally {
      setStatusSaving(null);
    }
  }

  const buyer = getBuyerSnapshot(selectedLead);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-r-2 border-emerald-600" />
          <p className="mt-4 text-sm text-slate-600">Loading seller leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-7xl min-w-0 flex-col gap-6 pb-2">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(120deg,#0c2d26_0%,#15533b_40%,#7bb495_76%,#d6e5dc_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.24)_0%,rgba(236,246,240,0.06)_58%,transparent_100%)]" />
        <div className="relative grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Seller Leads Workspace
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Leads / Inquiries</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#edf6f0]/90 sm:text-base">
                Manage every buyer inquiry from one place: qualify the lead, reply in thread, track visit intent,
                and keep the pipeline moving without jumping across pages.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Total leads</div>
                <div className="mt-1 text-2xl font-black">{stats.total}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Fresh</div>
                <div className="mt-1 text-2xl font-black">{stats.fresh}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Active</div>
                <div className="mt-1 text-2xl font-black">{stats.active}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">With visits</div>
                <div className="mt-1 text-2xl font-black">{stats.withVisit}</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 self-start rounded-[28px] bg-[rgba(218,232,223,0.12)] p-4 backdrop-blur-md ring-1 ring-[rgba(255,255,255,0.14)]">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#11392f] transition hover:bg-[#f5faf7] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh workspace"}
            </button>
            <Link
              href="/seller/messages"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#edf6f0] px-4 py-3 text-sm font-semibold text-[#17614b] transition hover:bg-white"
            >
              Open messages hub
              <ChevronRight className="h-4 w-4" />
            </Link>
            <div className="rounded-2xl bg-[rgba(9,36,27,0.12)] px-4 py-3 text-sm text-white/90">
              New inquiries and buyer replies now land here, and seller replies automatically move fresh leads into
              contacted status.
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {error}
        </div>
      )}
      {isSocketDisconnected && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Connection lost
        </div>
      )}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 truncate text-sm font-semibold text-slate-900">{pdfPreview.name}</div>
              <button type="button" onClick={() => setPdfPreview(null)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100">
              <object data={pdfPreview.url} type="application/pdf" className="h-full w-full">
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-600">
                  <p>Preview is not available in this browser.</p>
                  <a href={pdfPreview.url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                    Open PDF
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      <section className="grid min-h-0 min-w-0 gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <aside className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">Lead queue</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {filteredLeads.length} visible of {leads.length}
                </p>
              </div>
              {stats.fresh > 0 && (
                <span className="inline-flex rounded-full bg-sky-500 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                  {stats.fresh} new
                </span>
              )}
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search buyer, property, email, phone"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                    filter === option.value
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredLeads.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-slate-950">
                  {search || filter !== "all" ? "No matching leads" : "No leads yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search || filter !== "all"
                    ? "Adjust your search or status filter."
                    : "Buyer inquiries will appear here once your listings start receiving interest."}
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const active = selectedId === lead._id;
                const preview = getMessagePreview(lead.lastMessage, lead.message || "No message content");
                return (
                  <button
                    key={lead._id}
                    type="button"
                    onClick={() => setSelectedId(lead._id)}
                    className={cn(
                      "group relative w-full border-b border-slate-100 px-5 py-4 text-left transition-all duration-200 ease-out hover:bg-[#f7fbf8] hover:pl-6",
                      active && "bg-emerald-50/80 shadow-[inset_3px_0_0_0_#059669]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)]">
                        {initials(lead.name || "Buyer")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-950">{lead.name}</div>
                            <div className="mt-1 truncate text-xs text-slate-500">{lead.propertyId?.title}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs font-medium text-slate-500">
                              {formatRelative(lead.latestActivityAt || lead.createdAt)}
                            </span>
                            {(lead.messageCount || 0) > 0 && (
                              <span className="inline-flex min-w-6 justify-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                                {lead.messageCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 truncate text-sm text-slate-600">
                          {lead.lastMessage?.senderRole === "seller" ? "You: " : ""}
                          {preview}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1",
                              getStatusTone(lead.status)
                            )}
                          >
                            {formatLeadStageLabel(lead.status)}
                          </span>
                          {lead.latestVisit && (
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1",
                                getVisitTone(lead.latestVisit.status)
                              )}
                            >
                              visit {lead.latestVisit.status}
                            </span>
                          )}
                          <span className="truncate text-xs text-slate-500">{lead.propertyId?.location}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="grid min-h-0 min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            {!selectedLead ? (
              <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">Select a lead</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose an inquiry from the queue to review buyer context and reply.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-base font-black text-white">
                        {initials(selectedLead.name || "Buyer")}
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950">{selectedLead.name}</h2>
                        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              isBuyerOnline ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          />
                          <span>{isBuyerOnline ? "Online" : "Offline"}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {selectedLead.propertyId.title}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {selectedLead.propertyId.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ring-1",
                          getStatusTone(selectedLead.status)
                        )}
                      >
                        {formatLeadStageLabel(selectedLead.status)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        Opened {formatDateTime(selectedLead.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f5faf7_100%)] shadow-sm">
                    <div className="grid gap-0 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="h-32 bg-slate-100 sm:h-full">
                        {selectedLead.propertyId.images?.[0]?.url ? (
                          <img
                            src={selectedLead.propertyId.images[0].url}
                            alt={selectedLead.propertyId.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-slate-400">
                            <Building2 className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-4 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Pinned Property
                            </div>
                            <div className="mt-1 text-lg font-black tracking-tight text-slate-950">
                              {selectedLead.propertyId.title}
                            </div>
                          </div>
                          {selectedLead.propertyId.status && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                              {selectedLead.propertyId.status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(selectedLead.propertyId.price, selectedLead.propertyId.currency)}
                          </span>
                          {selectedLead.propertyId.listingType && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {selectedLead.propertyId.listingType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{selectedLead.propertyId.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={openScheduleVisit}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Schedule Visit
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Stage
                      </span>
                      <select
                        value={selectedLead.status}
                        onChange={(event) => handleStatusChange(event.target.value as LeadStatus)}
                        disabled={!!statusSaving}
                        className="bg-transparent text-sm font-semibold text-slate-800 outline-none disabled:cursor-not-allowed"
                      >
                        {LEAD_STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {statusSaving && <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />}
                    </div>
                  </div>
                </div>

                {scheduleOpen && selectedLead && (
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                    <form onSubmit={handleScheduleVisit} className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-slate-950">Schedule Visit</div>
                          <div className="text-xs text-slate-500">
                            Create a visit request for {selectedLead.propertyId.title}.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={closeScheduleVisit}
                          className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Date</span>
                          <input
                            type="date"
                            value={scheduleForm.requestedDate}
                            onChange={(event) =>
                              setScheduleForm((prev) => ({ ...prev, requestedDate: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                            min={new Date().toISOString().slice(0, 10)}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Time</span>
                          <input
                            type="time"
                            value={scheduleForm.preferredTime}
                            onChange={(event) =>
                              setScheduleForm((prev) => ({ ...prev, preferredTime: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                          />
                        </label>
                      </div>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Note</span>
                        <textarea
                          value={scheduleForm.message}
                          onChange={(event) =>
                            setScheduleForm((prev) => ({ ...prev, message: event.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                          placeholder="Optional note for the visit request"
                        />
                      </label>
                      {scheduleError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {scheduleError}
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={scheduleLoading || !scheduleForm.requestedDate || !scheduleForm.preferredTime}
                          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#059669_0%,#6ac5ab_100%)] px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {scheduleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                          Create visit request
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f4f8f5_0%,#ffffff_26%)] px-6 py-6">
                  {threadLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            Original inquiry
                          </span>
                          <span className="text-xs text-slate-500">{formatDateTime(selectedLead.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-700">{selectedLead.message}</p>
                      </div>

                      {visitSystemMessage && selectedLead?.latestVisit && (
                        <div className="flex justify-center">
                          <div
                            className={cn(
                              "inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1",
                              visitSystemMessage.tone
                            )}
                          >
                            <CalendarClock className="h-3.5 w-3.5 flex-none" />
                            <span className="truncate">{visitSystemMessage.label}</span>
                          </div>
                        </div>
                      )}

                      {messages.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
                          No follow-up messages yet. Reply below to start the conversation.
                        </div>
                      ) : (
                        messages.map((message) => {
                          const mine = message.senderRole === "seller";
                          return (
                            <div key={message._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-[22px] px-4 py-3 shadow-sm",
                                  mine
                                    ? "rounded-tr-md bg-emerald-600 text-white shadow-[0_16px_30px_rgba(5,150,105,0.18)]"
                                    : "rounded-tl-md bg-white text-slate-800 ring-1 ring-slate-200"
                                )}
                              >
                                  {message.isDeleted ? (
                                    <div className={cn("text-sm italic", mine ? "text-white/80" : "text-slate-500")}>
                                      This message was deleted
                                    </div>
                                  ) : (
                                    <>
                                      {renderAttachmentContent(message, (url, name) => setPdfPreview({ url, name }))}
                                      {message.text ? <div className={cn("text-sm leading-6", message.fileUrl && "mt-3")}>{message.text}</div> : null}
                                    </>
                                  )}
                                <div className={cn("mt-2 flex items-center gap-1.5 text-xs", mine ? "text-emerald-100" : "text-slate-500")}>
                                  {mine ? (
                                    <>
                                      <span>{`You | ${formatDateTime(message.createdAt)}`}</span>
                                      {!message.isDeleted && (
                                        <button type="button" onClick={() => handleDeleteMessage(message._id)} className="inline-flex items-center text-current/80 transition hover:text-white">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {renderMessageStatus(message)}
                                    </>
                                  ) : (
                                    <span>{`${message.senderId?.name || selectedLead.name} | ${formatDateTime(message.createdAt)}`}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(249,252,250,0.98)_100%)] px-6 py-5">
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleAttachmentChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      {displayedSellerReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          disabled={sending}
                          onClick={() => handleQuickReplyClick(reply)}
                          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
                      <textarea
                        value={composer}
                        onChange={(event) => handleComposerTyping(event.target.value)}
                        rows={3}
                        placeholder="Reply to the buyer, confirm next steps, or qualify the lead..."
                        className="w-full resize-none bg-transparent text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                        disabled={sending}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="max-w-[480px] text-xs leading-5 text-slate-500">
                        {isTyping && typingUserRole === "buyer" ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                          </div>
                        ) : isUploadingAttachment ? (
                          "Uploading attachment..."
                        ) : error ? (
                          "Failed to send message"
                        ) : isSocketDisconnected ? (
                          "Connection lost"
                        ) : (
                          "Replies stay attached to this inquiry thread and trigger buyer notifications automatically."
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => attachmentInputRef.current?.click()}
                          disabled={sending || !selectedLead}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="submit"
                          disabled={sending || !composer.trim()}
                          className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#059669_0%,#6ac5ab_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(5,150,105,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(5,150,105,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Send reply
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
          <aside className="flex min-h-0 min-w-0 flex-col gap-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <UserRound className="h-3.5 w-3.5" />
                Buyer Snapshot
              </div>
              {selectedLead && buyer ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,#f8fafc_0%,#effdf5_100%)] p-4 ring-1 ring-slate-200">
                    <div className="text-lg font-black tracking-tight text-slate-950">{buyer.name}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {buyer.email && buyer.email !== "No email shared" ? (
                        <a href={`mailto:${buyer.email}`} className="truncate hover:text-emerald-700">
                          {buyer.email}
                        </a>
                      ) : (
                        <span>No email shared</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {buyer.phone ? (
                        <a href={`tel:${buyer.phone}`} className="hover:text-emerald-700">
                          {buyer.phone}
                        </a>
                      ) : (
                        <span>No phone shared</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead stage</div>
                      <div className="mt-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1",
                            getStatusTone(selectedLead.status)
                          )}
                        >
                          {formatLeadStageLabel(selectedLead.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last activity</div>
                      <div className="mt-1">{formatDateTime(selectedLead.latestActivityAt || selectedLead.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Thread size</div>
                      <div className="mt-1">{selectedLead.messageCount || 0} follow-up messages</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Select a lead to view buyer details.</p>
              )}
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Building2 className="h-3.5 w-3.5" />
                Property Context
              </div>
              {selectedLead ? (
                <div className="mt-5 space-y-4">
                  <div className="overflow-hidden rounded-[24px] ring-1 ring-slate-200">
                    <div className="h-40 bg-slate-100">
                      {selectedLead.propertyId.images?.[0]?.url ? (
                        <img
                          src={selectedLead.propertyId.images[0].url}
                          alt={selectedLead.propertyId.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-400">
                          <Building2 className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 bg-white p-4">
                      <div className="text-lg font-black tracking-tight text-slate-950">
                        {selectedLead.propertyId.title}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {selectedLead.propertyId.location}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(selectedLead.propertyId.price, selectedLead.propertyId.currency)}
                        </span>
                        {selectedLead.propertyId.listingType && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                            {selectedLead.propertyId.listingType}
                          </span>
                        )}
                        {selectedLead.propertyId.status && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            {selectedLead.propertyId.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/seller/property/${selectedLead.propertyId._id}`}
                    className="group flex items-center justify-between rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900"
                  >
                    Open property details
                    <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Property details will appear here when you select a lead.</p>
              )}
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                Visit Intent
              </div>
              {selectedLead?.latestVisit ? (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1",
                        getVisitTone(selectedLead.latestVisit.status)
                      )}
                    >
                      {selectedLead.latestVisit.status}
                    </span>
                    <span className="text-sm text-slate-500">
                      Requested {formatDateTime(selectedLead.latestVisit.createdAt)}
                    </span>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedLead.latestVisit.actualDate
                        ? `Scheduled for ${formatDate(selectedLead.latestVisit.actualDate)}`
                        : `Requested for ${formatDate(selectedLead.latestVisit.requestedDate)}`}
                      {(selectedLead.latestVisit.actualTime || selectedLead.latestVisit.preferredTime) &&
                        ` at ${selectedLead.latestVisit.actualTime || selectedLead.latestVisit.preferredTime}`}
                    </div>
                    {selectedLead.latestVisit.message && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedLead.latestVisit.message}</p>
                    )}
                    {selectedLead.latestVisit.sellerResponse && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Seller note: {selectedLead.latestVisit.sellerResponse}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/seller/visit-scheduling"
                    className="group flex items-center justify-between rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900"
                  >
                    Open visit scheduling
                    <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No visit request linked to this lead yet.
                </div>
              )}
            </div>
          </aside>
        </section>
      </section>
    </div>
  );
}
