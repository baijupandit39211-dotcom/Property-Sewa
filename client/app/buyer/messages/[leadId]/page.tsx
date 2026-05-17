"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import {
  emitChatDelivered,
  emitChatSeen,
  emitChatTypingStart,
  emitChatTypingStop,
  subscribeToChatPresence,
  subscribeToChatSocket,
} from "@/app/lib/chatSocket";
import { useMessageSound } from "@/app/lib/useMessageSound";
import { ArrowLeft, BellOff, Send, MessageCircle, Calendar, Building2, Check, CheckCheck, MapPin, Paperclip, FileText, Download, Eye, Trash2 } from "lucide-react";

type Lead = {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    location: string;
    images?: Array<{ url: string }>;
    price?: number;
    currency?: string;
    status?: string;
  };
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
};

type Message = {
  _id: string;
  leadId: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
  } | null;
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

type Visit = {
  _id: string;
  propertyId: string;
  status: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  requestedDate: string;
  actualDate?: string;
  createdAt: string;
};

type LeadWithVisit = Lead & {
  visit?: Visit;
};

type VisitResponse = {
  _id: string;
  propertyId?: string;
  status: Visit["status"];
  requestedDate: string;
  preferredTime: string;
  actualDate?: string;
  actualTime?: string;
  message?: string;
  sellerResponse?: string;
  createdAt: string;
};
type ToastState = { show: boolean; text: string };

function Toast({ show, text }: ToastState) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-emerald-600/95 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-emerald-300/50">
        {text}
      </div>
    </div>
  );
}

const MAX_CHAT_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_CHAT_DOCUMENT_SIZE = 20 * 1024 * 1024;

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

function isPdfAttachment(message: Message) {
  const target = `${message.fileName || ""} ${message.fileUrl || ""}`.toLowerCase();
  return target.includes(".pdf");
}

function renderAttachmentContent(message: Message, onPreviewPdf: (url: string, name: string) => void) {
  if (!message.fileUrl || !message.fileType) return null;

  if (message.fileType === "image") {
    return (
      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
        <img src={message.fileUrl} alt={message.fileName || "Shared image"} loading="lazy" decoding="async" className="max-h-72 w-full rounded-2xl object-cover" />
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

function formatCurrency(amount?: number, currency?: string) {
  if (!amount) return "Price on request";
  return `${currency || "Rs"} ${Number(amount).toLocaleString()}`;
}

function formatVisitDateTime(date?: string, time?: string) {
  if (!date && !time) return "";
  if (!date) return time || "";
  const dateLabel = new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return time ? `${dateLabel} at ${time}` : dateLabel;
}

function getVisitSystemMessage(visit?: VisitResponse | Visit) {
  if (!visit) return null;

  const scheduledDateTime = formatVisitDateTime(
    "actualDate" in visit ? visit.actualDate || visit.requestedDate : visit.actualDate || visit.requestedDate,
    "actualTime" in visit ? visit.actualTime || visit.preferredTime : undefined
  );

  if (visit.status === "confirmed" || visit.status === "rescheduled" || visit.status === "completed") {
    return {
      label: `Visit scheduled for ${scheduledDateTime}`,
      tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }

  if (visit.status === "requested") {
    return {
      label: `Visit requested for ${scheduledDateTime}`,
      tone: "bg-sky-50 text-sky-800 border-sky-200",
    };
  }

  if (visit.status === "rejected") {
    return {
      label: `Visit request was declined for ${scheduledDateTime}`,
      tone: "bg-rose-50 text-rose-800 border-rose-200",
    };
  }

  return null;
}

export default function BuyerMessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const currentLeadId = String(params.leadId || "");
  const [lead, setLead] = useState<LeadWithVisit | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserRole, setTypingUserRole] = useState<"buyer" | "seller" | null>(null);
  const [isSellerOnline, setIsSellerOnline] = useState(false);
  const [isSocketDisconnected, setIsSocketDisconnected] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    requestedDate: "",
    preferredTime: "10:00",
    message: "",
  });
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const typingTimeoutRef = useRef<number | null>(null);
  const receiverTypingTimeoutRef = useRef<number | null>(null);
  const activeLeadIdRef = useRef("");
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const visitSystemMessage = getVisitSystemMessage(lead?.visit);
  const { isMuted, isPlaybackBlocked, toggleMute, playIncomingMessageSound } = useMessageSound();

  const showToast = (text: string) => {
    setToast({ show: true, text });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1300);
  };

  const acknowledgeDelivered = (leadId: string, thread: Message[]) => {
    if (!leadId || !thread.some((message) => message.senderRole === "seller" && !message.deliveredAt)) return;
    emitChatDelivered(leadId);
  };

  const acknowledgeSeen = (leadId: string, thread: Message[]) => {
    if (
      !leadId ||
      typeof document === "undefined" ||
      document.visibilityState !== "visible" ||
      !thread.some((message) => message.senderRole === "seller" && !message.seenAt)
    ) {
      return;
    }

    window.setTimeout(() => {
      if (document.visibilityState === "visible" && activeLeadIdRef.current === leadId) {
        emitChatSeen(leadId);
      }
    }, 0);
  };

  useEffect(() => {
    activeLeadIdRef.current = currentLeadId;
  }, [currentLeadId]);

  const playMessageSound = useEffectEvent((message: Message) => {
    void playIncomingMessageSound(message, "seller");
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lead details
        const leadResponse = await apiFetch<{ success: boolean; items: Lead[] }>("/leads/my-inquiries");
        if (leadResponse.success) {
          const leadData = leadResponse.items.find(l => l._id === params.leadId);
          if (leadData) {
            // Try to fetch visit for this lead's property
            try {
              const visitResponse = await apiFetch<{ success: boolean; items: Visit[] }>(`/visits/my-visits?propertyId=${leadData.propertyId._id}`);
              if (visitResponse.success && visitResponse.items.length > 0) {
                // Find the most recent visit for this property
                const visit = visitResponse.items
                  .filter(v => v.propertyId === leadData.propertyId._id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                setLead({ ...leadData, visit });
              } else {
                setLead(leadData);
              }
            } catch (err) {
              // If visit fetch fails, just set lead without visit
              setLead(leadData);
            }
          }
        }

        // Fetch messages
        const messageResponse = await apiFetch<{ success: boolean; items: Message[] }>(`/messages/${params.leadId}`);
        if (messageResponse.success) {
          const thread = messageResponse.items || [];
          setMessages(thread);
          acknowledgeDelivered(currentLeadId, thread);
          acknowledgeSeen(currentLeadId, thread);
        }
      } catch (err: any) {
        setLoadError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (currentLeadId) {
      fetchData();
    }
  }, [currentLeadId]);

  useEffect(() => {
    return subscribeToChatSocket({
      onConnect: () => {
        setIsSocketDisconnected(false);
        if (activeLeadIdRef.current) {
          subscribeToChatPresence(activeLeadIdRef.current);
        }
      },
      onDisconnect: () => {
        setIsSocketDisconnected(true);
      },
      onNewMessage: ({ message }) => {
        if (String(message?.leadId || "") !== activeLeadIdRef.current) return;

        let shouldPlaySound = false;
        setMessages((prev) => {
          if (prev.some((item) => item._id === message._id)) return prev;
          shouldPlaySound = true;
          return [...prev, message];
        });
        if (shouldPlaySound) {
          playMessageSound(message);
        }
        acknowledgeDelivered(String(message.leadId || ""), [message]);
        acknowledgeSeen(String(message.leadId || ""), [message]);
      },
      onMessageDelivered: ({ leadId, messageIds, deliveredAt }) => {
        if (String(leadId) !== activeLeadIdRef.current) return;
        setMessages((prev) => applyDeliveredStatus(prev, messageIds, deliveredAt));
      },
      onMessageSeen: ({ leadId, messageIds, deliveredAt, seenAt }) => {
        if (String(leadId) !== activeLeadIdRef.current) return;
        setMessages((prev) => applySeenStatus(prev, messageIds, deliveredAt, seenAt));
      },
      onMessageDeleted: ({ leadId, messageId, deletedAt }) => {
        if (String(leadId) !== activeLeadIdRef.current) return;
        setMessages((prev) => applyDeletedStatus(prev, messageId, deletedAt));
      },
      onUserOnline: ({ leadId }) => {
        if (String(leadId) !== activeLeadIdRef.current) return;
        setIsSellerOnline(true);
      },
      onUserOffline: ({ leadId }) => {
        if (String(leadId) !== activeLeadIdRef.current) return;
        setIsSellerOnline(false);
      },
      onTypingStart: ({ leadId, senderRole }) => {
        if (senderRole !== "seller" || String(leadId) !== activeLeadIdRef.current) return;
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
        if (senderRole !== "seller" || String(leadId) !== activeLeadIdRef.current) return;
        if (receiverTypingTimeoutRef.current) {
          window.clearTimeout(receiverTypingTimeoutRef.current);
        }
        setIsTyping(false);
        setTypingUserRole(null);
      },
    });
  }, [playMessageSound]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (receiverTypingTimeoutRef.current) {
        window.clearTimeout(receiverTypingTimeoutRef.current);
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (activeLeadIdRef.current) {
        emitChatTypingStop(activeLeadIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    if (receiverTypingTimeoutRef.current) {
      window.clearTimeout(receiverTypingTimeoutRef.current);
    }
    setIsTyping(false);
    setTypingUserRole(null);
    setIsSellerOnline(false);
  }, [currentLeadId]);

  useEffect(() => {
    if (!currentLeadId || !messages.length) return;
    acknowledgeSeen(currentLeadId, messages);
  }, [currentLeadId, messages]);

  useEffect(() => {
    if (!currentLeadId) return;
    subscribeToChatPresence(currentLeadId);
  }, [currentLeadId]);

  const getVisitStatusColor = (status: string) => {
    switch (status) {
      case "requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "rescheduled":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getInquiryStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "closed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDisplayStatus = (lead: LeadWithVisit) => {
    if (lead.visit) {
      return {
        type: "visit",
        status: lead.visit.status,
        color: getVisitStatusColor(lead.visit.status),
        label: lead.visit.status.charAt(0).toUpperCase() + lead.visit.status.slice(1)
      };
    } else {
      return {
        type: "inquiry",
        status: lead.status,
        color: getInquiryStatusColor(lead.status),
        label: lead.status.charAt(0).toUpperCase() + lead.status.slice(1)
      };
    }
  };

  const sendChatMessage = async (text: string, file?: File | null) => {
    const trimmedText = text.trim();
    if ((!trimmedText && !file) || !currentLeadId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticUrl = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    const optimisticMessage: Message = {
      _id: tempId,
      leadId: currentLeadId,
      senderId: null,
      senderRole: "buyer",
      text: trimmedText,
      fileUrl: optimisticUrl,
      fileDownloadUrl: optimisticUrl,
      fileType: file ? (file.type.startsWith("image/") ? "image" : "file") : null,
      fileName: file?.name || null,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setSendError("");
    setMessages((prev) => [...prev, optimisticMessage]);
    if (!file) setNewMessage("");
    try {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      emitChatTypingStop(currentLeadId);

      const requestInit: RequestInit =
        file
          ? (() => {
              const formData = new FormData();
              if (trimmedText) formData.append("text", trimmedText);
              formData.append("file", file);
              return { method: "POST", body: formData };
            })()
          : {
              method: "POST",
              body: JSON.stringify({ text: trimmedText }),
            };

      const response = await apiFetch<{ success: boolean; message: Message }>(`/messages/${params.leadId}`, requestInit);

      if (response.success) {
        setNewMessage("");
        setMessages((prev) => prev.map((item) => (item._id === tempId ? response.message : item)));
        showToast("Message sent successfully");
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      if (!file) setNewMessage(trimmedText);
      setSendError(err.message || "Failed to send message");
    } finally {
      if (optimisticUrl) URL.revokeObjectURL(optimisticUrl);
      setSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendChatMessage(newMessage);
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateChatAttachment(file);
    if (validationError) {
      setSendError(validationError);
      return;
    }
    setIsUploadingAttachment(true);
    try {
      await sendChatMessage("", file);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentLeadId || sending) return;
    try {
      const response = await apiFetch<{ success: boolean; message: Message }>(
        `/messages/${currentLeadId}/${messageId}`,
        { method: "DELETE" }
      );
      setMessages((prev) =>
        applyDeletedStatus(prev, messageId, response.message.deletedAt || new Date().toISOString())
      );
    } catch (err: any) {
      setSendError(err.message || "Failed to delete message");
    }
  };

  const handleMessageInput = (value: string) => {
    setNewMessage(value);

    const leadId = currentLeadId;
    if (!leadId || sending) return;

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      emitChatTypingStop(leadId);
      return;
    }

    emitChatTypingStart(leadId);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      emitChatTypingStop(leadId);
    }, 1200);
  };

  const openScheduleVisit = () => {
    const now = new Date();
    const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      .toISOString()
      .slice(0, 10);

    setScheduleError("");
    setScheduleForm({
      requestedDate: scheduleForm.requestedDate || defaultDate,
      preferredTime: scheduleForm.preferredTime || "10:00",
      message: scheduleForm.message || `I'd like to schedule a visit for ${lead?.propertyId?.title || "this property"}.`,
    });
    setScheduleOpen(true);
  };

  const closeScheduleVisit = () => {
    setScheduleOpen(false);
    setScheduleLoading(false);
    setScheduleError("");
  };

  const handleScheduleVisit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentLeadId || !lead || !scheduleForm.requestedDate || !scheduleForm.preferredTime || scheduleLoading) return;

    setScheduleLoading(true);
    setScheduleError("");

    try {
      const response = await apiFetch<{ success: boolean; visit: VisitResponse }>(
        `/visits/lead/${currentLeadId}`,
        {
          method: "POST",
          body: JSON.stringify({
            requestedDate: scheduleForm.requestedDate,
            preferredTime: scheduleForm.preferredTime,
            message: scheduleForm.message,
          }),
        }
      );

      setLead((prev) => (prev ? { ...prev, visit: response.visit as Visit } : prev));
      showToast("Visit scheduled successfully");
      closeScheduleVisit();
    } catch (err: any) {
      setScheduleError(err?.message || "Failed to schedule visit");
      setScheduleLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading conversation...</p>
        </div>
      </main>
    );
  }

  if (loadError || !lead) {
    return (
      <main className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-600">{loadError || "Inquiry not found"}</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-8">
      <Toast show={toast.show} text={toast.text} />
      <div className="mx-auto max-w-4xl">
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
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inquiries
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Info */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Inquiry Details</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Property</p>
                  <p className="font-medium text-slate-900">{lead.propertyId?.title || "Unknown Property"}</p>
                  <p className="text-sm text-slate-600">{lead.propertyId?.location || "Unknown Location"}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Your Message</p>
                  <p className="text-sm text-slate-700 mt-1">{lead.message}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getDisplayStatus(lead).color}`}>
                      {getDisplayStatus(lead).label}
                    </span>
                    {getDisplayStatus(lead).type === "visit" && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        Visit
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Sent</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 h-[600px] flex flex-col">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversation
                </h3>
                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span
                    className={`h-2 w-2 rounded-full ${isSellerOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                  />
                  <span>{isSellerOnline ? "Online" : "Offline"}</span>
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openScheduleVisit}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <Calendar className="h-4 w-4" />
                      Schedule Visit
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                      aria-pressed={isMuted}
                      aria-label={isMuted ? "Unmute message sound" : "Mute message sound"}
                    >
                      <BellOff className="h-4 w-4" />
                      {isMuted ? "Unmute sound" : "Mute sound"}
                    </button>
                  </div>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f5faf7_100%)]">
                  <div className="grid gap-0 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="h-28 bg-slate-100 sm:h-full">
                      {lead.propertyId?.images?.[0]?.url ? (
                        <img
                          src={lead.propertyId.images[0].url}
                          alt={lead.propertyId.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-400">
                          <Building2 className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Pinned Property
                          </div>
                          <div className="mt-1 truncate text-base font-bold text-slate-950">
                            {lead.propertyId?.title || "Unknown Property"}
                          </div>
                        </div>
                        {lead.propertyId?.status && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            {lead.propertyId.status}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(lead.propertyId?.price, lead.propertyId?.currency)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{lead.propertyId?.location || "Unknown Location"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isSocketDisconnected && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Connection lost
                  </div>
                )}
                {scheduleOpen && (
                  <form onSubmit={handleScheduleVisit} className="mb-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-950">Schedule Visit</div>
                        <div className="text-xs text-slate-500">Create a visit request from this chat.</div>
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
                      <input
                        type="date"
                        value={scheduleForm.requestedDate}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({ ...prev, requestedDate: event.target.value }))
                        }
                        min={new Date().toISOString().slice(0, 10)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      />
                      <input
                        type="time"
                        value={scheduleForm.preferredTime}
                        onChange={(event) =>
                          setScheduleForm((prev) => ({ ...prev, preferredTime: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      />
                    </div>
                    <textarea
                      value={scheduleForm.message}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, message: event.target.value }))
                      }
                      rows={2}
                      placeholder="Optional note"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                    />
                    {scheduleError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {scheduleError}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={scheduleLoading || !scheduleForm.requestedDate || !scheduleForm.preferredTime}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {scheduleLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-white"></div>
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                        Create visit request
                      </button>
                    </div>
                  </form>
                )}
                {visitSystemMessage && (
                  <div className="flex justify-center">
                    <div
                      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${visitSystemMessage.tone}`}
                    >
                      <Calendar className="h-3.5 w-3.5 flex-none" />
                      <span className="truncate">{visitSystemMessage.label}</span>
                    </div>
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.senderRole === "buyer" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 ${
                          message.senderRole === "buyer"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                          {message.isDeleted ? (
                            <p className={`text-sm italic ${message.senderRole === "buyer" ? "text-white/80" : "text-slate-500"}`}>This message was deleted</p>
                          ) : (
                            <>
                              {renderAttachmentContent(message, (url, name) => setPdfPreview({ url, name }))}
                              {message.text ? <p className={`text-sm ${message.fileUrl ? "mt-3" : ""}`}>{message.text}</p> : null}
                            </>
                          )}
                          <div className={`mt-1 flex items-center gap-1.5 text-xs ${
                            message.senderRole === "buyer" ? "text-emerald-100" : "text-slate-500"
                          }`}>
                          <span>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          {message.senderRole === "buyer" && !message.isDeleted ? (
                            <button type="button" onClick={() => handleDeleteMessage(message._id)} className="inline-flex items-center text-current/80 transition hover:text-white">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {message.senderRole === "buyer" ? renderMessageStatus(message) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
                <div className="p-4 border-t border-slate-200">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleAttachmentChange}
                />
                {isTyping && typingUserRole === "seller" && (
                  <div className="mb-2 flex items-center gap-1.5 text-slate-400">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                  </div>
                )}
                {isUploadingAttachment && <div className="mb-2 text-xs text-slate-500">Uploading attachment...</div>}
                {isPlaybackBlocked && !isMuted && (
                  <div className="mb-2 text-xs text-slate-500">
                    Message sound is blocked by your browser until you interact with the page.
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={sending}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => handleMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
                {sendError && <div className="mt-3 text-sm text-rose-600">{sendError}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
