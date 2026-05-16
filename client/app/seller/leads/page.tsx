"use client";

import Link from "next/link";
import {
  Suspense,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Building2,
  BadgeCheck,
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
  Plus,
  RefreshCw,
  Search,
  Send,
  Smile,
  Sparkles,
  TrendingUp,
  Trash2,
  UserRound,
  X,
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
  "I will call you shortly",
  "Please share your time",
];

const EXACT_CHAT_QUICK_REPLIES = [
  "Yes, it is available",
  "Can we schedule a visit?",
  "I will call you shortly",
  "Please share your time",
];

const LEAD_STAGE_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "negotiating", label: "Negotiating" },
  { value: "reserved", label: "Reserved" },
  { value: "closed", label: "Closed" },
];

const CHAT_PIPELINE_STAGES: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "negotiating", label: "Negotiating" },
  { value: "closed", label: "Closed" },
];

const getPipelineStepIndex = (status: LeadStatus) => {
  if (status === "closed") return 4;
  if (status === "reserved") return 3;
  const index = CHAT_PIPELINE_STAGES.findIndex((stage) => stage.value === status);
  return index >= 0 ? index : 0;
};

const getStatusTone = (status: LeadStatus) =>
  status === "new"
    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
    : status === "contacted"
      ? "bg-purple-50 text-purple-700 ring-1 ring-purple-100"
      : status === "visit_scheduled"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
        : status === "negotiating"
          ? "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
          : status === "closed"
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

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

const formatPercent = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)}%`;

const formatPhoneDigits = (value?: string) => (value || "").replace(/[^\d]/g, "");

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

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Search;
  label: string;
  value: string | number;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</div>
          <div className="mt-1 text-sm text-slate-500">{hint}</div>
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TrendChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const width = 360;
  const height = 150;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const plotted = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = height - (point.value / maxValue) * (height - 24) - 12;
    return { ...point, x, y };
  });
  const line = plotted.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#f7fbf8_0%,#ffffff_100%)] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
          <defs>
            <linearGradient id="leadTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((step) => (
            <line
              key={step}
              x1="0"
              x2={width}
              y1={height * step}
              y2={height * step}
              stroke="#dbe7df"
              strokeDasharray="4 6"
            />
          ))}
          <polygon points={area} fill="url(#leadTrendFill)" />
          <polyline
            points={line}
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {plotted.map((point) => (
            <circle key={point.label} cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {points.map((point) => (
          <div key={point.label} className="text-center">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

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

function getLeadBuyerKeys(lead: Lead | null | undefined) {
  if (!lead) return [] as string[];
  const keys: string[] = [];
  const buyerId =
    typeof lead.buyerId === "object" && lead.buyerId
      ? String(lead.buyerId._id || "")
      : String(lead.buyerId || "");
  if (buyerId) keys.push(`id:${buyerId}`);
  const email = String(lead.email || "").trim().toLowerCase();
  if (email) keys.push(`email:${email}`);
  const phone = formatPhoneDigits(lead.phone);
  if (phone) keys.push(`phone:${phone}`);
  if (!keys.length) keys.push(`lead:${lead._id}`);
  return keys;
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
    suggestions.push("Please share your time");
  }

  if ((text.includes("location") || text.includes("where")) && lead?.propertyId?.location) {
    suggestions.push(`The property is located in ${lead.propertyId.location}.`);
  }

  const uniqueSuggestions = [...new Set(suggestions)];
  return uniqueSuggestions.length > 0 ? uniqueSuggestions : DEFAULT_SELLER_REPLIES;
}

function SellerLeadsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const crmGridRef = useRef<HTMLElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
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
  const displayedSellerReplies = useMemo(() => {
    const merged = [...EXACT_CHAT_QUICK_REPLIES, ...aiSellerReplies, ...smartSellerReplies].filter(Boolean);
    return [...new Set(merged)].slice(0, 4);
  }, [aiSellerReplies, smartSellerReplies]);

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

  const stageMetrics = useMemo(() => {
    const contacted = leads.filter((lead) => lead.status === "contacted").length;
    const visitScheduled = leads.filter((lead) => lead.status === "visit_scheduled").length;
    const negotiating = leads.filter((lead) => lead.status === "negotiating").length;
    const reserved = leads.filter((lead) => lead.status === "reserved").length;
    const conversionRate = stats.total ? (stats.closed / stats.total) * 100 : 0;
    const awaitingReply = leads.filter((lead) => lead.lastMessage?.senderRole === "buyer").length;
    return {
      contacted,
      visitScheduled,
      negotiating,
      reserved,
      conversionRate,
      awaitingReply,
    };
  }, [leads, stats.closed, stats.total]);

  const propertyOptions = useMemo(
    () =>
      [...new Set(leads.map((lead) => lead.propertyId?.title).filter(Boolean))]
        .slice(0, 4)
        .map((title) => String(title)),
    [leads]
  );

  const analytics = useMemo(() => {
    const today = new Date();
    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const label = date.toLocaleDateString(undefined, { weekday: "short" });
      const value = leads.filter((lead) => {
        const createdAt = new Date(lead.createdAt);
        return createdAt.toDateString() === date.toDateString();
      }).length;
      return { label, value };
    });

    const stageRows = [
      { label: "New", value: stats.fresh, tone: "bg-sky-500" },
      { label: "Contacted", value: stageMetrics.contacted, tone: "bg-amber-500" },
      { label: "Visit Scheduled", value: stageMetrics.visitScheduled, tone: "bg-cyan-500" },
      { label: "Negotiating", value: stageMetrics.negotiating, tone: "bg-violet-500" },
      { label: "Reserved", value: stageMetrics.reserved, tone: "bg-orange-500" },
      { label: "Closed", value: stats.closed, tone: "bg-emerald-500" },
    ];

    const topProperties = Object.entries(
      leads.reduce<Record<string, number>>((acc, lead) => {
        const title = lead.propertyId?.title || "Untitled property";
        acc[title] = (acc[title] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);

    const recentWindowCount = leads.filter((lead) => {
      const diffMs = today.getTime() - new Date(lead.createdAt).getTime();
      return diffMs <= 1000 * 60 * 60 * 24 * 7;
    }).length;

    return {
      trend,
      stageRows,
      topProperties,
      recentWindowCount,
      responseRate: stats.total ? ((stats.total - stageMetrics.awaitingReply) / stats.total) * 100 : 0,
      visitRate: stats.total ? (stats.withVisit / stats.total) * 100 : 0,
    };
  }, [leads, stageMetrics.awaitingReply, stageMetrics.contacted, stageMetrics.negotiating, stageMetrics.reserved, stageMetrics.visitScheduled, stats.closed, stats.fresh, stats.total, stats.withVisit]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  });

  const scrollMessageThreadToTop = useEffectEvent(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = 0;
    }
  });

  const scrollCrmGridToTop = useEffectEvent(() => {
    crmGridRef.current?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
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
      const baseLead = leads.find((lead) => lead._id === leadId) || null;
      const baseKeys = new Set(getLeadBuyerKeys(baseLead));
      const relatedLeadIds = leads
        .filter((lead) => getLeadBuyerKeys(lead).some((key) => baseKeys.has(key)))
        .map((lead) => lead._id);
      const uniqueLeadIds = Array.from(new Set([leadId, ...relatedLeadIds]));

      const threadResults = await Promise.all(
        uniqueLeadIds.map(async (id) => {
          try {
            return await fetchConversationMessages(id);
          } catch {
            return [];
          }
        })
      );

      const thread = threadResults
        .flat()
        .reduce<Message[]>((acc, message) => {
          if (!acc.some((item) => item._id === message._id)) {
            acc.push(message);
          }
          return acc;
        }, [])
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

      setMessages(thread);
      acknowledgeDelivered(leadId, thread);
      acknowledgeSeen(leadId, thread);

      if (!silent) {
        requestAnimationFrame(() => {
          scrollCrmGridToTop();
          scrollMessageThreadToTop();
        });
      }
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
      requestAnimationFrame(() => scrollToBottom());
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
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] p-5 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Seller CRM Workspace
              </div>
              <div className="mt-3">
                <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Seller Leads / Inquiry Management
                </h1>
                <p className="mt-2 max-w-3xl text-[15px] leading-6 text-white/85">
                  Manage inquiries, chat with buyers, and convert more leads.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                href="/seller/messages"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <MessageCircle className="h-4 w-4" />
                Open Messages
              </Link>
              <button
                type="button"
                onClick={openScheduleVisit}
                disabled={!selectedLead}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Schedule Visit
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <label className="group flex min-w-0 items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition focus-within:border-[#316249]/30 focus-within:shadow-[0_14px_30px_rgba(49,98,73,0.12)]">
              <Search className="h-5 w-5 flex-none text-slate-400 transition group-focus-within:text-[#316249]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search leads, name, email, phone, property..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <span className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 md:inline-flex">
                Ctrl + K
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {propertyOptions.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setSearch(title)}
                  className="inline-flex items-center rounded-full border border-[#316249]/20 bg-white px-3 py-2 text-xs font-semibold text-[#316249] transition hover:bg-[#316249]/5"
                >
                  {title}
                </button>
              ))}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear search
                </button>
              )}
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
          <div className="flex min-h-[520px] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)] xl:h-[85vh]">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={UserRound}
          label="Total Leads"
          value={stats.total}
          hint={`${analytics.recentWindowCount} added in the last 7 days`}
          accent="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={Sparkles}
          label="New"
          value={stats.fresh}
          hint="Fresh inquiries awaiting seller action"
          accent="bg-sky-50 text-sky-700"
        />
        <StatCard
          icon={MessageCircle}
          label="Contacted"
          value={stageMetrics.contacted}
          hint={`${stageMetrics.awaitingReply} conversations waiting on you`}
          accent="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={BadgeCheck}
          label="Closed"
          value={stats.closed}
          hint={`${stats.withVisit} leads already have visit intent`}
          accent="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={formatPercent(stageMetrics.conversionRate)}
          hint="Closed leads compared with the current pipeline"
          accent="bg-violet-50 text-violet-700"
        />
      </section>

      <section
        ref={crmGridRef}
        className="scroll-mt-24 grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)_340px]"
      >
        <div className="min-w-0">
          <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_10px_26px_rgba(15,23,42,0.07)] border border-slate-100 min-w-0 xl:min-h-0 xl:h-[calc(100vh-240px)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-lg font-bold tracking-tight text-slate-950">All Leads</div>
                  <div className="mt-1 text-sm text-slate-500">{leads.length} leads</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                    <BarChart3 className="h-4 w-4 text-[#316249]" />
                    {filteredLeads.length} visible
                  </div>
                  {stats.fresh > 0 && (
                    <div className="inline-flex items-center rounded-2xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
                      {stats.fresh} new
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <label className="group flex min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition focus-within:ring-2 focus-within:ring-[#316249]/20">
                  <Search className="h-4 w-4 flex-none text-slate-400 group-focus-within:text-[#316249]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search leads, name, phone, property..."
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "all" as const, label: "All" },
                    { value: "new" as const, label: "New" },
                    { value: "contacted" as const, label: "Contacted" },
                    { value: "visit_scheduled" as const, label: "Visit" },
                    { value: "negotiating" as const, label: "Negotiating" },
                    { value: "closed" as const, label: "Closed" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter(option.value)}
                      className={cn(
                        "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                        filter === option.value
                          ? "bg-[#316249] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-[#316249]/10 hover:text-[#316249]"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled
                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
                  >
                    Lost
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pr-1 sm:px-5">
              {filteredLeads.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">
                    {search || filter !== "all" ? "No matching leads" : "No leads yet"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {search || filter !== "all"
                      ? "Adjust your search or status filter."
                      : "Buyer inquiries will appear here once your listings start receiving interest."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLeads.map((lead) => {
                    const active = selectedId === lead._id;
                    const preview = getMessagePreview(lead.lastMessage, lead.message || "No message content");
                    return (
                      <button
                        key={lead._id}
                        type="button"
                        onClick={() => setSelectedId(lead._id)}
                        className={cn(
                          "w-full rounded-2xl bg-white p-4 text-left transition hover:bg-slate-50",
                          active && "bg-[#316249]/5 border-l-4 border-[#316249]"
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                        <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[#316249]/10 text-sm font-semibold text-[#316249]">
                          {initials(lead.name || "Buyer")}
                        </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-950">{lead.name}</div>
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  {lead.propertyId?.title || "Property"}
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-400">
                                  {lead.propertyId?.location || "Location"}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-xs font-semibold text-slate-500">
                                  {formatRelative(lead.latestActivityAt || lead.createdAt)}
                                </div>
                                <span
                                  className={cn(
                                    "mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold",
                                    getStatusTone(lead.status)
                                  )}
                                >
                                  {formatLeadStageLabel(lead.status)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 line-clamp-1 text-sm text-slate-600">
                              {lead.lastMessage?.senderRole === "seller" ? "You: " : ""}
                              {preview}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="relative flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.07)] xl:h-[calc(100vh-240px)] xl:min-h-[620px]">
            {!selectedLead ? (
              <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
                <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-[#316249]/10 text-[#316249]">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">Select a lead</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose an inquiry from the queue to review buyer context and reply.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-slate-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#316249]/10 text-base font-bold text-[#316249]">
                        {initials(selectedLead.name || "Buyer")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-bold text-slate-950">{selectedLead.name}</h2>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
                              getStatusTone(selectedLead.status)
                            )}
                          >
                            {formatLeadStageLabel(selectedLead.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          {buyer?.phone ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="truncate">{buyer.phone}</span>
                            </span>
                          ) : null}
                          {buyer?.email && buyer.email !== "No email shared" ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span className="truncate">{buyer.email}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-none items-center gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={openScheduleVisit}
                        className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 sm:inline-flex"
                      >
                        <CalendarClock className="h-4 w-4" />
                        Schedule
                      </button>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    {CHAT_PIPELINE_STAGES.map((stage, index) => {
                      const currentIndex = getPipelineStepIndex(selectedLead.status);
                      const completed = index < currentIndex;
                      const current = index === currentIndex;
                      return (
                        <div key={stage.value} className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <div
                              className={cn(
                                "grid h-7 w-7 place-items-center rounded-full border-2 bg-white",
                                completed
                                  ? "border-[#316249] bg-[#316249] text-white"
                                  : current
                                    ? "border-[#316249] text-[#316249] ring-4 ring-[#316249]/15"
                                    : "border-slate-200 text-slate-400"
                              )}
                            >
                              {completed ? <Check className="h-4 w-4" /> : <span className="text-[11px] font-bold">{index + 1}</span>}
                            </div>
                            {index < CHAT_PIPELINE_STAGES.length - 1 ? (
                              <div
                                className={cn(
                                  "h-1 flex-1 rounded-full",
                                  completed ? "bg-[#316249]" : "bg-slate-200"
                                )}
                              />
                            ) : null}
                          </div>
                          <div
                            className={cn(
                              "mt-2 truncate text-center text-xs font-semibold",
                              completed || current ? "text-[#316249]" : "text-slate-400"
                            )}
                          >
                            {stage.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {scheduleOpen && selectedLead && (
                  <div className="absolute inset-0 z-20 overflow-y-auto bg-white/80 px-6 py-6 backdrop-blur">
                    <form
                      onSubmit={handleScheduleVisit}
                      className="mx-auto max-w-xl space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">Schedule Visit</div>
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
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date</span>
                          <input
                            type="date"
                            value={scheduleForm.requestedDate}
                            onChange={(event) =>
                              setScheduleForm((prev) => ({ ...prev, requestedDate: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#316249]/40"
                            min={new Date().toISOString().slice(0, 10)}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Time</span>
                          <input
                            type="time"
                            value={scheduleForm.preferredTime}
                            onChange={(event) =>
                              setScheduleForm((prev) => ({ ...prev, preferredTime: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#316249]/40"
                          />
                        </label>
                      </div>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Note</span>
                        <textarea
                          value={scheduleForm.message}
                          onChange={(event) =>
                            setScheduleForm((prev) => ({ ...prev, message: event.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#316249]/40"
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
                          className="inline-flex items-center gap-2 rounded-full bg-[#316249] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#28513D] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {scheduleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                          Create visit request
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div
                  ref={messageListRef}
                  className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5"
                >
                  {threadLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <LoaderCircle className="h-6 w-6 animate-spin text-[#316249]" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
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
                        messages.map((message, index) => {
                          const mine = message.senderRole === "seller";
                          const currentDay = new Date(message.createdAt).toDateString();
                          const previousDay =
                            index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
                          const showDaySeparator = index === 0 || currentDay !== previousDay;
                          const now = new Date();
                          const todayKey = now.toDateString();
                          const yesterdayKey = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
                          const dayLabel =
                            currentDay === todayKey
                              ? "Today"
                              : currentDay === yesterdayKey
                                ? "Yesterday"
                                : new Intl.DateTimeFormat(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }).format(new Date(message.createdAt));
                          const timeLabel = new Intl.DateTimeFormat(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(message.createdAt));
                          return (
                            <div key={message._id} className="space-y-2">
                              {showDaySeparator ? (
                                <div className="flex justify-center py-2">
                                  <div className="mx-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                    {dayLabel}
                                  </div>
                                </div>
                              ) : null}

                              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                                <div
                                  className={cn(
                                    "min-w-0 max-w-[68%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words",
                                    mine
                                      ? "rounded-br-md bg-[#316249] text-white shadow-[0_16px_30px_rgba(49,98,73,0.18)]"
                                      : "rounded-bl-md bg-slate-100 text-slate-800"
                                  )}
                                >
                                  {message.isDeleted ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs italic text-slate-400">
                                      This message was deleted
                                    </div>
                                  ) : (
                                    <>
                                      {renderAttachmentContent(message, (url, name) => setPdfPreview({ url, name }))}
                                      {message.text ? (
                                        <div className={cn("break-words", message.fileUrl && "mt-3")}>{message.text}</div>
                                      ) : null}
                                    </>
                                  )}
                                <div
                                  className={cn(
                                    "mt-1 flex items-center gap-1.5 text-[11px] text-slate-300",
                                    mine ? "justify-end" : ""
                                  )}
                                >
                                  <span>{timeLabel}</span>
                                  {mine && !message.isDeleted ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(message._id)}
                                      className="inline-flex items-center text-slate-400 transition hover:text-slate-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                  {mine ? renderMessageStatus(message) : null}
                                </div>
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

                <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleAttachmentChange}
                    />

                    <div className="flex h-[56px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition focus-within:border-[#316249]/40 focus-within:ring-4 focus-within:ring-[#316249]/10">
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={sending || !selectedLead || isUploadingAttachment}
                        className="grid h-10 w-10 flex-none place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-[#316249] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Attach file"
                      >
                        {isUploadingAttachment ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </button>

                      <input
                        value={composer}
                        onChange={(event) => handleComposerTyping(event.target.value)}
                        placeholder="Type your message..."
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={sending}
                      />

                      <button
                        type="button"
                        className="grid h-9 w-9 flex-none place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#316249]"
                        aria-label="Emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>

                      <button
                        type="submit"
                        disabled={sending || (!composer.trim() && !isUploadingAttachment)}
                        className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#006B3F] text-white shadow-[0_8px_20px_rgba(0,107,63,0.24)] transition hover:-translate-y-0.5 hover:bg-[#005a35] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                        aria-label="Send message"
                      >
                        {sending ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 fill-current" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                      {displayedSellerReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          disabled={sending}
                          onClick={() => handleQuickReplyClick(reply)}
                          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#316249]/30 hover:bg-[#316249]/5 hover:text-[#316249] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reply === "Yes, it is available" ? (
                            <Sparkles className="h-3.5 w-3.5" />
                          ) : reply === "Can we schedule a visit?" ? (
                            <CalendarClock className="h-3.5 w-3.5" />
                          ) : reply === "I will call you shortly" ? (
                            <Phone className="h-3.5 w-3.5" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}
                          {reply}
                        </button>
                      ))}

                    </div>

                    {(isTyping && typingUserRole === "buyer") || error || isSocketDisconnected || isUploadingAttachment ? (
                      <div className="px-1 text-xs font-medium text-slate-500">
                        {isUploadingAttachment ? (
                          "Uploading attachment..."
                        ) : isTyping && typingUserRole === "buyer" ? (
                          <span className="inline-flex items-center gap-1.5 text-[#316249]">
                            Buyer is typing
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                          </span>
                        ) : error ? (
                          <span className="text-rose-600">{error}</span>
                        ) : isSocketDisconnected ? (
                          <span className="text-amber-600">Connection lost</span>
                        ) : null}
                      </div>
                    ) : null}
                  </form>
                </div>
              </>
            )}
          </div>

        <aside className="min-w-0 xl:sticky xl:top-24 xl:h-fit">
          <div className="space-y-6 rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] border border-slate-100 min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="text-lg font-bold text-slate-950">Lead Details</div>
                <div className="mt-1 text-sm text-slate-500">Selected inquiry context and seller actions.</div>
              </div>
              {selectedLead && (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  ID: {selectedLead._id.slice(-8)}
                </div>
              )}
            </div>

            {selectedLead && buyer ? (
              <>
                <div className="rounded-[24px] bg-[linear-gradient(135deg,#f7faf8_0%,#edf7f1_100%)] p-5 ring-1 ring-[#316249]/15">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-[#316249]/10 text-lg font-bold text-[#316249]">
                      {initials(buyer.name || selectedLead.name || "Buyer")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1",
                            getStatusTone(selectedLead.status)
                          )}
                        >
                          {formatLeadStageLabel(selectedLead.status)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {formatRelative(selectedLead.latestActivityAt || selectedLead.createdAt)}
                        </span>
                      </div>
                      <div className="mt-3 text-lg font-bold text-slate-950">{buyer.name}</div>
                      <div className="mt-2 space-y-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {buyer.email && buyer.email !== "No email shared" ? (
                            <a href={`mailto:${buyer.email}`} className="truncate hover:text-[#316249]">
                              {buyer.email}
                            </a>
                          ) : (
                            <span>No email shared</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {buyer.phone ? (
                            <a href={`tel:${buyer.phone}`} className="hover:text-[#316249]">
                              {buyer.phone}
                            </a>
                          ) : (
                            <span>No phone shared</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <a
                      href={buyer.phone ? `tel:${buyer.phone}` : undefined}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5",
                        buyer.phone
                          ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      )}
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                    <a
                      href={
                        buyer.phone && formatPhoneDigits(buyer.phone)
                          ? `https://wa.me/${formatPhoneDigits(buyer.phone)}`
                          : undefined
                      }
                      target={buyer.phone ? "_blank" : undefined}
                      rel={buyer.phone ? "noreferrer" : undefined}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5",
                        buyer.phone
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      )}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <a
                      href={buyer.email && buyer.email !== "No email shared" ? `mailto:${buyer.email}` : undefined}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5",
                        buyer.email && buyer.email !== "No email shared"
                          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      )}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                    <button
                      type="button"
                      onClick={openScheduleVisit}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Follow Up
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Inquiry Details</div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Original Message</div>
                      <p className="mt-2 leading-6 text-slate-700">{selectedLead.message}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Created</div>
                        <div className="mt-2 font-semibold text-slate-900">{formatDateTime(selectedLead.createdAt)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Last Activity</div>
                        <div className="mt-2 font-semibold text-slate-900">
                          {formatDateTime(selectedLead.latestActivityAt || selectedLead.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Property Details</div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="relative aspect-[16/10] w-full bg-slate-100">
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
                    <div className="space-y-3 p-4">
                      <div className="text-lg font-bold tracking-tight text-slate-950">{selectedLead.propertyId.title}</div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{selectedLead.propertyId.location}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(selectedLead.propertyId.price, selectedLead.propertyId.currency)}
                        </span>
                        {selectedLead.propertyId.listingType && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                            {selectedLead.propertyId.listingType}
                          </span>
                        )}
                        {selectedLead.propertyId.status && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            {selectedLead.propertyId.status}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/seller/property/${selectedLead.propertyId._id}`}
                        className="group flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900"
                      >
                        Open property details
                        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Analytics Overview</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Leads</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{stats.total}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Loaded on this page</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Response Rate</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {formatPercent(analytics.responseRate)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Seller replied threads</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Visits Scheduled</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {stageMetrics.visitScheduled}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Visit stage leads</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Closed Leads</div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{stats.closed}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Closed status</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Visit Intent</div>
                  {selectedLead.latestVisit ? (
                    <div className="mt-4 space-y-4">
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
                      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
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
                        className="group flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-[#f7fbf8] hover:text-slate-900"
                      >
                        Open visit scheduling
                        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No visit request linked to this lead yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                Select a lead to view the CRM-style detail panel.
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function SellerLeadsPage() {
  return (
    <Suspense fallback={null}>
      <SellerLeadsPageContent />
    </Suspense>
  );
}
  


