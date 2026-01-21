"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { ArrowLeft, Send, MessageCircle, User, Calendar } from "lucide-react";

type Lead = {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    location: string;
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
  createdAt: string;
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

export default function BuyerMessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadWithVisit | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

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
          setMessages(messageResponse.items || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (params.leadId) {
      fetchData();
    }
  }, [params.leadId]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      // Send message
      const response = await apiFetch<{ success: boolean; message: Message }>(`/messages/${params.leadId}`, {
        method: "POST",
        body: JSON.stringify({ text: newMessage }),
      });

      if (response.success) {
        // Clear input
        setNewMessage("");
        
        // Re-fetch messages to get updated list
        const messageResponse = await apiFetch<{ success: boolean; items: Message[] }>(`/messages/${params.leadId}`);
        if (messageResponse.success) {
          setMessages(messageResponse.items || []);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
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

  if (error || !lead) {
    return (
      <main className="min-h-screen bg-emerald-50 px-6 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-600">{error || "Inquiry not found"}</p>
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
      <div className="mx-auto max-w-4xl">
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
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderRole === "buyer" ? "text-emerald-100" : "text-slate-500"
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
