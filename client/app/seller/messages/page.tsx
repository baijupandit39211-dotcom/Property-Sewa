"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiFetch } from "@/app/lib/api";
import { MessageCircle, Send, User, Calendar, Building2, Clock } from "lucide-react";

// Add CSS animations
const styles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;

// Inject styles into head
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

type Lead = {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    location: string;
  };
  buyerId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
  latestVisitStatus?: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  latestVisitDate?: string;
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
  status?: "sending" | "failed" | "delivered";
  clientId?: string; // WhatsApp-style client ID for matching
  tempId?: string;
};

type Conversation = Lead & {
  lastMessage?: Message;
  unreadCount?: number;
  groupKey?: string; // buyerId + propertyId for grouping
  isLatestInGroup?: boolean; // Whether this is the latest conversation in its group
  groupCount?: number; // Number of conversations in this group
};

export default function SellerMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Count total conversations (including duplicates) for display
  const [totalConversations, setTotalConversations] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  
  // Unread tracking state
  const [readConversations, setReadConversations] = useState<Set<string>>(new Set());
  const [lastSeenMessageIds, setLastSeenMessageIds] = useState<Map<string, string>>(new Map());
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Optimistic messaging state
  const [failedMessages, setFailedMessages] = useState<Map<string, { text: string; timestamp: number }>>(new Map());
  
  // Polling state
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load read state from localStorage
  useEffect(() => {
    const savedReadState = localStorage.getItem('sellerReadConversations');
    if (savedReadState) {
      setReadConversations(new Set(JSON.parse(savedReadState)));
    }
    
    const savedLastSeen = localStorage.getItem('sellerLastSeenMessageIds');
    if (savedLastSeen) {
      setLastSeenMessageIds(new Map(JSON.parse(savedLastSeen)));
    }
  }, []);

  // Save read state to localStorage
  const saveReadState = (readSet: Set<string>) => {
    localStorage.setItem('sellerReadConversations', JSON.stringify(Array.from(readSet)));
  };

  // Save last seen message IDs
  const saveLastSeenState = (lastSeenMap: Map<string, string>) => {
    localStorage.setItem('sellerLastSeenMessageIds', JSON.stringify(Array.from(lastSeenMap.entries())));
  };

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling for new messages
  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(async () => {
      if (selectedConversation && !sending) {
        await fetchMessages(selectedConversation._id, false); // Silent fetch without loading state
      }
      
      // Poll all conversations for unread counts
      try {
        const response = await apiFetch<{ success: boolean; items: Lead[] }>("/leads/mine");
        if (response.success && response.items) {
          // For each conversation, fetch messages to calculate unread counts
          const conversationsWithUnread = await Promise.all(
            response.items.map(async (lead) => {
              try {
                const messageResponse = await apiFetch<{ success: boolean; items: Message[] }>(`/messages/${lead._id}`);
                if (messageResponse.success) {
                  const messages = messageResponse.items || [];
                  const unreadCount = getUnreadCount(lead as Conversation, messages);
                  return { ...lead, unreadCount, messages };
                }
                return { ...lead, unreadCount: 0, messages: [] };
              } catch {
                return { ...lead, unreadCount: 0, messages: [] };
              }
            })
          );
          
          // Group conversations and update state
          const groupedConversations = groupConversations(conversationsWithUnread);
          groupedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
          
          setConversations(groupedConversations);
          setFilteredConversations(groupedConversations);
          
          // Calculate total unread count
          const totalUnread = groupedConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          setTotalUnreadCount(totalUnread);
          updateDocumentTitle(totalUnread);
          
          // Show notifications for new messages in non-active conversations
          groupedConversations.forEach(conv => {
            if (conv.unreadCount && conv.unreadCount > 0) {
              // Show toast for new messages in non-active conversation
              if (selectedConversation?._id !== conv._id) {
                showNewMessageToast(conv, conv.unreadCount);
              }
            }
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 8000); // Poll every 8 seconds
    
    setPollingInterval(interval);
  }, [selectedConversation, sending]);

  // Stop polling when component unmounts or conversation changes
  useEffect(() => {
    startPolling();
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [selectedConversation, sending]);

  // Calculate unread count for a conversation
  const getUnreadCount = (conversation: Conversation, conversationMessages: Message[] = []) => {
    const lastSeenId = lastSeenMessageIds.get(conversation._id);
    if (!lastSeenId) {
      // If we haven't seen any messages, count all buyer messages
      return conversationMessages.filter(msg => msg.senderRole === "buyer").length;
    }
    
    // Count buyer messages after the last seen message
    const lastSeenIndex = conversationMessages.findIndex(msg => msg._id === lastSeenId);
    if (lastSeenIndex === -1) {
      return conversationMessages.filter(msg => msg.senderRole === "buyer").length;
    }
    
    return conversationMessages
      .slice(lastSeenIndex + 1)
      .filter(msg => msg.senderRole === "buyer").length;
  };

  // Update document title with unread count
  const updateDocumentTitle = (unreadCount: number) => {
    const baseTitle = "Property Sewa - Seller Dashboard";
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  };

  // Show toast notification for new message
  const showNewMessageToast = (conversation: Conversation, newMessageCount: number) => {
    if (selectedConversation?._id !== conversation._id && newMessageCount > 0) {
      // Create toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-down max-w-sm';
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              ${conversation.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          </div>
          <div class="flex-1">
            <p class="font-medium text-sm">New message from ${conversation.name}</p>
            <p class="text-xs opacity-90">${conversation.propertyId?.title}</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(toast);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 5000);
    }
  };

  // Mark conversation as read
  const markAsRead = (conversationId: string, messages: Message[] = []) => {
    if (messages.length > 0) {
      const lastMessageId = messages[messages.length - 1]._id;
      setLastSeenMessageIds(prev => {
        const newMap = new Map(prev);
        newMap.set(conversationId, lastMessageId);
        saveLastSeenState(newMap);
        return newMap;
      });
    }
    
    if (!readConversations.has(conversationId)) {
      const newReadSet = new Set(readConversations).add(conversationId);
      setReadConversations(newReadSet);
      saveReadState(newReadSet);
    }
  };

  // Generate temporary ID for optimistic messages
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Optimistic message sending
  const sendOptimisticMessage = (text: string) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      _id: clientId,
      leadId: selectedConversation!._id,
      senderId: { _id: "current", name: "You", email: "" },
      senderRole: "seller" as const,
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
      clientId,
      tempId: clientId
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setConversations(prev => 
      prev.map(conv => 
        conv._id === selectedConversation!._id 
          ? { ...conv, lastMessage: optimisticMessage }
          : conv
      )
    );
    setFilteredConversations(prev => 
      prev.map(conv => 
        conv._id === selectedConversation!._id 
          ? { ...conv, lastMessage: optimisticMessage }
          : conv
      )
    );
    
    return clientId;
  };

  // Retry failed message
  const retryMessage = async (clientId: string) => {
    const failedMessage = failedMessages.get(clientId);
    if (!failedMessage) return;
    
    // Remove from failed messages
    setFailedMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(clientId);
      return newMap;
    });
    
    // Update message status to sending
    setMessages(prev => 
      prev.map(msg => 
        msg.clientId === clientId 
          ? { ...msg, status: "sending" }
          : msg
      )
    );
    
    // Attempt to send again
    await attemptSendMessage(failedMessage.text, clientId);
  };

  // Actual message sending attempt
  const attemptSendMessage = async (text: string, clientId?: string) => {
    try {
      const response = await apiFetch<{ success: boolean; message: Message }>(`/messages/${selectedConversation!._id}`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      if (response.success) {
        // Replace optimistic message with server message and set status to delivered
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.clientId === clientId 
              ? { ...response.message, status: "delivered" as const }
              : msg
          );
          // Remove optimistic message if it exists
          return updated.filter(msg => msg.status !== "sending");
        });
        
        // Update conversation lists
        const realMessage = response.message;
        setConversations(prev => 
          prev.map(conv => 
            conv._id === selectedConversation!._id 
              ? { ...conv, lastMessage: realMessage }
              : conv
          )
        );
        setFilteredConversations(prev => 
          prev.map(conv => 
            conv._id === selectedConversation!._id 
              ? { ...conv, lastMessage: realMessage }
              : conv
          )
        );
        
        // Clear failed message if it exists
        if (clientId) {
          setFailedMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(clientId);
            return newMap;
          });
        }
        
        return true;
      }
    } catch (err) {
      // Mark as failed
      if (clientId) {
        setMessages(prev => 
          prev.map(msg => 
            msg.clientId === clientId 
              ? { ...msg, status: "failed" as const }
              : msg
          )
        );
        
        // Store failed message for retry
        setFailedMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(clientId, { text, timestamp: Date.now() });
          return newMap;
        });
      }
      return false;
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(conv => 
        conv.name.toLowerCase().includes(query) ||
        conv.email.toLowerCase().includes(query) ||
        conv.propertyId.title.toLowerCase().includes(query) ||
        conv.propertyId.location.toLowerCase().includes(query)
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Search is handled in the useEffect above
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch conversations (seller leads)
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // First check if seller is authenticated (same as leads page)
        const authCheck = await apiFetch<{ success: boolean; user: any }>("/auth/me");
        if (!authCheck.success) {
          setError("Please log in to view messages");
          return;
        }
        
        // Then fetch leads using same endpoint as leads page
        const response = await apiFetch<{ success: boolean; items: Lead[] }>("/leads/mine");
        
        if (response.success && response.items) {
          // Store total count before grouping
          setTotalConversations(response.items.length);
          
          // For each lead, try to fetch the last message
          const conversationsWithMessages = await Promise.all(
            response.items.map(async (lead) => {
              try {
                const messageResponse = await apiFetch<{ success: boolean; items: Message[] }>(`/messages/${lead._id}`);
                if (messageResponse.success && messageResponse.items && messageResponse.items.length > 0) {
                  const lastMessage = messageResponse.items[messageResponse.items.length - 1];
                  return { ...lead, lastMessage };
                }
                return lead;
              } catch (err) {
                // If message fetch fails, return lead without last message
                return lead;
              }
            })
          );

          // Group conversations by buyerId + propertyId
          const groupedConversations = groupConversations(conversationsWithMessages);
          
          // Sort by latest activity (last message or lead creation)
          groupedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });

          setConversations(groupedConversations);
          setFilteredConversations(groupedConversations);
          
          // Auto-select first conversation if available
          if (groupedConversations.length > 0) {
            setSelectedConversation(groupedConversations[0]);
            markAsRead(groupedConversations[0]._id);
          }
        } else {
          setError("Failed to fetch conversations - no data returned");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Group conversations by buyerId + propertyId, keeping only the latest
  const groupConversations = (conversations: (Lead & { lastMessage?: Message })[]): Conversation[] => {
    const groups = new Map<string, (Lead & { lastMessage?: Message })[]>();
    
    // Group by buyerId + propertyId
    conversations.forEach(conv => {
      const groupKey = `${conv.buyerId}-${conv.propertyId._id}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(conv);
    });

    // For each group, find the latest conversation
    const latestConversations: Conversation[] = [];
    groups.forEach((groupConvs, groupKey) => {
      // Sort by creation date to find the latest
      groupConvs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Take the latest one
      const latest = groupConvs[0];
      latestConversations.push({
        ...latest,
        groupKey,
        isLatestInGroup: true,
        groupCount: groupConvs.length // Store count for display
      });
    });

    return latestConversations;
  };

  // Fetch messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      markAsRead(selectedConversation._id, messages);
    }
  }, [selectedConversation]);

  const fetchMessages = async (leadId: string, showLoading = true) => {
    if (showLoading) {
      setMessagesLoading(true);
    }
    try {
      const response = await apiFetch<{ success: boolean; items: Message[] }>(`/messages/${leadId}`);
      if (response.success) {
        const serverMessages = response.items || [];
        
        // Merge strategy: preserve optimistic messages that aren't matched by server messages
        setMessages(prev => {
          const optimisticMessages = prev.filter(msg => msg.clientId && msg.status !== "delivered");
          const mergedMessages = [...serverMessages];
          
          // Add optimistic messages that don't have a match in server messages
          optimisticMessages.forEach(optimisticMsg => {
            const hasMatch = serverMessages.some(serverMsg => 
              serverMsg.text === optimisticMsg.text && 
              serverMsg.senderRole === optimisticMsg.senderRole &&
              Math.abs(new Date(serverMsg.createdAt).getTime() - new Date(optimisticMsg.createdAt).getTime()) < 5000 // 5 second window
            );
            
            if (!hasMatch) {
              mergedMessages.push(optimisticMsg);
            }
          });
          
          // Sort by creation time
          mergedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          return mergedMessages;
        });
        
        // Auto-scroll after messages load
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch messages");
    } finally {
      if (showLoading) {
        setMessagesLoading(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    // Prevent duplicate sends
    if (sending) return;
    
    setSending(true);
    setError("");
    
    try {
      // Send optimistically first
      const clientId = sendOptimisticMessage(newMessage);
      const success = await attemptSendMessage(newMessage, clientId);
      
      if (success) {
        // Clear input
        setNewMessage("");
        // Auto-scroll to bottom after new message
        setTimeout(() => scrollToBottom(), 100);
      } else {
        setError("Failed to send message. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Conversations List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Conversations Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Messages</h2>
            {totalUnreadCount > 0 && (
              <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full animate-pulse">
                {totalUnreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {filteredConversations.length} conversations
            {totalConversations !== filteredConversations.length && (
              <span className="text-gray-500"> ({totalConversations} total)</span>
            )}
          </p>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
            />
            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            // Skeleton loading state
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No conversations found</p>
                  <p className="text-sm mt-2">Try adjusting your search terms</p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">When buyers contact you, they'll appear here</p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const unreadCount = conversation.unreadCount || 0;
              return (
                <div
                  key={conversation._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
                    selectedConversation?._id === conversation._id 
                      ? "bg-emerald-50 border-l-4 border-l-emerald-500" 
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    markAsRead(conversation._id, messages);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with initials */}
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {conversation.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900 truncate">{conversation.name}</p>
                        <div className="flex items-center gap-2">
                          {conversation.groupCount && conversation.groupCount > 1 && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                              {conversation.groupCount}
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessage?.createdAt || conversation.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Building2 className="h-3 w-3" />
                        <p className="truncate">{conversation.propertyId?.title}</p>
                      </div>
                      
                      <div className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage ? (
                          <span>
                            {conversation.lastMessage.senderRole === "seller" ? "You: " : `${conversation.name}: `}
                            {conversation.lastMessage.text}
                          </span>
                        ) : (
                          <span>{conversation.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Chat Header - Sticky */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedConversation.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{selectedConversation.propertyId?.title}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(selectedConversation.status)}`}>
                    {selectedConversation.status.charAt(0).toUpperCase() + selectedConversation.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-r-2 border-emerald-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-medium text-gray-600">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-2">Start the conversation with a greeting</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Initial inquiry message */}
                  <div className="flex justify-start animate-fade-in">
                    <div className="max-w-[70%]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {selectedConversation.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{selectedConversation.name}</span>
                      </div>
                      <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-none px-4 py-2">
                        <p className="text-sm">{selectedConversation.message}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-1">
                        {new Date(selectedConversation.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Chat messages */}
                  {messages.map((message, index) => {
                    const isFailed = message.status === "failed";
                    const isSending = message.status === "sending";
                    const isDelivered = message.status === "delivered";
                    
                    return (
                      <div
                        key={message._id}
                        className={`flex ${message.senderRole === "seller" ? "justify-end" : "justify-start"} animate-slide-up`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="max-w-[70%]">
                          {message.senderRole === "buyer" && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {selectedConversation.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {message.senderId?.name || selectedConversation.name}
                              </span>
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 relative ${
                              message.senderRole === "seller"
                                ? "bg-emerald-100 text-emerald-900 rounded-tr-none"
                                : "bg-gray-100 text-gray-900 rounded-tl-none"
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            
                            {/* Failed message retry button */}
                            {isFailed && (
                              <button
                                onClick={() => retryMessage(message.clientId!)}
                                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                title="Retry sending"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011-1 1v1a1 1 0 011-1 1H3a1 1 0 011-1-1V3a1 1 0 011-1-1H4zm2 0a1 1 0 011-1 1v1a1 1 0 011-1 1H3a1 1 0 011-1-1V3a1 1 0 011-1-1H4z"/>
                                </svg>
                              </button>
                            )}
                            
                            {/* Sending indicator */}
                            {isSending && (
                              <div className="absolute -top-1 -right-1 p-1">
                                <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${
                            message.senderRole === "seller" ? "text-right mr-1" : "ml-1"
                          }`}>
                            {message.senderRole === "seller" ? (
                              <>
                                {isSending && "⏳ Sending..."}
                                {isDelivered && "✓ Delivered"}
                                {isFailed && "Failed · Retry"}
                              </>
                            ) : (
                              new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Scroll-to-bottom ref */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
              
              {/* Error display */}
              {error && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                  <button
                    onClick={() => setError("")}
                    className="text-xs text-red-600 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium text-gray-600">Select a conversation</p>
              <p className="text-sm text-gray-500 mt-2">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
