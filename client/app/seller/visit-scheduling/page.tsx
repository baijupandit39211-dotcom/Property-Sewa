"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, RotateCcw } from "lucide-react";

type Visit = {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    location: string;
  };
  buyerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  sellerId: string;
  requestedDate: string;
  preferredTime: string;
  status: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  message?: string;
  sellerResponse?: string;
  actualDate?: string;
  actualTime?: string;
  createdAt: string;
};

type ActionModal = {
  type: "confirm" | "reschedule" | "reject" | "complete" | null;
  visit: Visit | null;
};

export default function SellerVisitSchedulingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal>({ type: null, visit: null });
  const [formData, setFormData] = useState({
    actualDate: "",
    actualTime: "",
    sellerResponse: "",
  });

  // Get month boundaries
  const getMonthBoundaries = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const getMonthRange = (year: number, month: number) => {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Use local date string formatting (YYYY-MM-DD) to match backend normalization
      const formatDateLocal = (date: Date) => {
        return date.getFullYear() + '-' + 
          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
          String(date.getDate()).padStart(2, '0');
      };
      
      return {
        start: formatDateLocal(firstDay),
        end: formatDateLocal(lastDay),
      };
    };

    return getMonthRange(year, month);
  };

  // Fetch visits for current month
  const fetchVisits = async (date: Date) => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = getMonthBoundaries(date);
      const response = await apiFetch<{ success: boolean; items: Visit[] }>(
        `/visits?startDate=${start}&endDate=${end}`
      );
      
      if (response.success) {
        setVisits(response.items || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch visits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits(currentDate);
  }, [currentDate]);

  // Navigate months
  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  // Get visits for specific date
  const getVisitsForDate = (date: Date) => {
    // Use local date string matching (YYYY-MM-DD) to match backend normalization
    const dateStr = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    
    return visits.filter(visit => {
      const visitDate = visit.actualDate || visit.requestedDate;
      // Convert visit date to local YYYY-MM-DD format
      const visitDateStr = new Date(visitDate).getFullYear() + '-' + 
        String(new Date(visitDate).getMonth() + 1).padStart(2, '0') + '-' + 
        String(new Date(visitDate).getDate()).padStart(2, '0');
      
      return visitDateStr === dateStr;
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Handle visit actions
  const handleAction = async () => {
    if (!actionModal.visit || !actionModal.type) return;
    
    setActionLoading(true);
    try {
      // Map action types to backend enum values
      const statusMap: Record<string, string> = {
        confirm: "confirmed",
        reject: "rejected", 
        reschedule: "rescheduled",
        complete: "completed"
      };
      
      const status = statusMap[actionModal.type];
      if (!status) {
        throw new Error("Invalid action type");
      }
      
      const payload: any = {
        status: status,
      };

      if (actionModal.type === "confirm" || actionModal.type === "reschedule") {
        payload.actualDate = formData.actualDate;
        payload.actualTime = formData.actualTime;
        if (formData.sellerResponse) {
          payload.sellerResponse = formData.sellerResponse;
        }
      } else if (actionModal.type === "reject") {
        payload.sellerResponse = formData.sellerResponse;
      }

      const response = await apiFetch<{ success: boolean }>(`/visits/${actionModal.visit._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        setActionModal({ type: null, visit: null });
        setFormData({ actualDate: "", actualTime: "", sellerResponse: "" });
        await fetchVisits(currentDate);
        alert(`Visit ${actionModal.type} successfully!`);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update visit");
    } finally {
      setActionLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "requested":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "rescheduled":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const calendarDays = generateCalendarDays();
  const selectedDateVisits = selectedDate ? getVisitsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header area - fixed height */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-extrabold text-gray-900">Visit Scheduling</h1>
          <p className="text-sm text-gray-600">
            Manage property visit requests and schedule appointments.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-100">
          <div className="mx-auto max-w-7xl">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content - fills remaining viewport */}
      <div className="flex-1 px-6 py-4 overflow-hidden">
        <div className="mx-auto max-w-7xl h-full">
          <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Calendar - proper sizing */}
            <div className="lg:col-span-3">
              <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-sm p-6 flex flex-col">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth("prev")}
                    className="p-2 text-gray-600 hover:bg-gray-50 hover:text-emerald-600 hover:shadow-md rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-95"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h2>
                  <button
                    onClick={() => navigateMonth("next")}
                    className="p-2 text-gray-600 hover:bg-gray-50 hover:text-emerald-600 hover:shadow-md rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Calendar Grid - fixed height area */}
                <div className="flex-1" style={{ height: 'clamp(420px, 60vh, 560px)' }}>
                  <div className="h-full grid grid-rows-7 grid-cols-7 gap-2">
                    {/* Day headers */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white rounded-lg">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days - enhanced effects */}
                    {calendarDays.map((day, index) => {
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayVisits = getVisitsForDate(day);
                      const isSelected = selectedDate?.toDateString() === day.toDateString();
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(day)}
                          disabled={!isCurrentMonth}
                          className={`
                            relative h-full w-full border rounded-xl transition-all duration-300 ease-out flex flex-col items-start justify-between p-2
                            ${isCurrentMonth 
                              ? "text-gray-900 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-emerald-100 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1 active:scale-95" 
                              : "text-gray-300 cursor-not-allowed opacity-50"
                            }
                            ${isToday ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-emerald-100 shadow-lg shadow-emerald-500/25" : ""}
                            ${isSelected 
                              ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-500 text-emerald-900 font-semibold shadow-lg shadow-emerald-500/25 transform scale-105" 
                              : "border-gray-200 hover:border-gray-300"
                            }
                          `}
                        >
                          <div className="text-sm font-medium">{day.getDate()}</div>
                          {dayVisits.length > 0 && (
                            <div className="flex gap-1">
                              {dayVisits.slice(0, 2).map((_, i) => (
                                <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50 animate-pulse"></div>
                              ))}
                            </div>
                          )}
                          {dayVisits.length > 2 && (
                            <div className="text-xs text-emerald-600 font-medium leading-none bg-emerald-100 px-1 rounded-full">+{dayVisits.length - 2}</div>
                          )}
                          {isToday && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full shadow-md shadow-emerald-500/50"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Visit List - scrollable panel */}
            <div className="lg:col-span-1 h-full">
              <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-sm p-3 flex flex-col">
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {selectedDate ? (
                    <span>Visits for {selectedDate.toLocaleDateString()}</span>
                  ) : (
                    <span className="text-gray-500">Select a date to view visits</span>
                  )}
                </h3>
                {selectedDate && (
                  <p className="text-xs text-gray-500 mb-3">
                    Click on a date to see scheduled visits
                  </p>
                )}

                {loading && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-r-2 border-emerald-600 mx-auto"></div>
                      <p className="mt-2 text-xs text-gray-600">Loading visits...</p>
                    </div>
                  </div>
                )}

                {!loading && selectedDateVisits.length === 0 && selectedDate && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No visits scheduled</p>
                    </div>
                  </div>
                )}

                {!loading && selectedDateVisits.length > 0 && (
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {selectedDateVisits.map(visit => (
                      <div key={visit._id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{visit.buyerId.name}</p>
                            <p className="text-xs text-gray-600">{visit.buyerId.email}</p>
                            {visit.buyerId.phone && (
                              <p className="text-xs text-gray-600">{visit.buyerId.phone}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(visit.status)}`}>
                            {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{visit.propertyId.title}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>{visit.preferredTime}</span>
                          </div>
                          {visit.message && (
                            <p className="text-xs text-gray-600 italic truncate">"{visit.message}"</p>
                          )}
                          {visit.sellerResponse && (
                            <p className="text-xs text-emerald-600 italic truncate">Response: "{visit.sellerResponse}"</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1 flex-wrap">
                          {visit.status === "requested" && (
                            <>
                              <button
                                onClick={() => {
                                  setActionModal({ type: "confirm", visit });
                                  setFormData({
                                    actualDate: visit.requestedDate,
                                    actualTime: visit.preferredTime,
                                    sellerResponse: "",
                                  });
                                }}
                                className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-all duration-200"
                              >
                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setActionModal({ type: "reschedule", visit });
                                  setFormData({
                                    actualDate: visit.requestedDate,
                                    actualTime: visit.preferredTime,
                                    sellerResponse: "",
                                  });
                                }}
                                className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-all duration-200"
                              >
                                <RotateCcw className="h-3 w-3 inline mr-1" />
                                Reschedule
                              </button>
                              <button
                                onClick={() => {
                                  setActionModal({ type: "reject", visit });
                                  setFormData({ actualDate: "", actualTime: "", sellerResponse: "" });
                                }}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-all duration-200"
                              >
                                <XCircle className="h-3 w-3 inline mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                          {visit.status === "confirmed" && (
                            <button
                              onClick={() => {
                                setActionModal({ type: "complete", visit });
                                setFormData({ actualDate: "", actualTime: "", sellerResponse: "" });
                              }}
                              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-all duration-200"
                            >
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {actionModal.type && actionModal.visit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {actionModal.type === "confirm" && "Confirm Visit"}
              {actionModal.type === "reschedule" && "Reschedule Visit"}
              {actionModal.type === "reject" && "Reject Visit"}
              {actionModal.type === "complete" && "Complete Visit"}
            </h3>

            <div className="space-y-4">
              {(actionModal.type === "confirm" || actionModal.type === "reschedule") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {actionModal.type === "reschedule" ? "New Date" : "Actual Date"}
                    </label>
                    <input
                      type="date"
                      value={formData.actualDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                      min={(() => {
                        const date = new Date();
                        return date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');
                      })()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {actionModal.type === "reschedule" ? "New Time" : "Actual Time"}
                    </label>
                    <input
                      type="time"
                      value={formData.actualTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    />
                  </div>
                </>
              )}

              {(actionModal.type === "reject" || actionModal.type === "reschedule") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {actionModal.type === "reject" ? "Reason for rejection" : "Message to buyer"}
                  </label>
                  <textarea
                    value={formData.sellerResponse}
                    onChange={(e) => setFormData(prev => ({ ...prev, sellerResponse: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    placeholder={
                      actionModal.type === "reject" 
                        ? "Please provide a reason for rejecting this visit request..."
                        : "Inform the buyer about the new schedule..."
                    }
                    required={actionModal.type === "reject"}
                  />
                </div>
              )}

              {actionModal.type === "complete" && (
                <p className="text-sm text-gray-600">
                  Mark this visit as completed. This action cannot be undone.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActionModal({ type: null, visit: null })}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-r-2 border-white"></div>
                ) : (
                  <>
                    {actionModal.type === "confirm" && "Confirm"}
                    {actionModal.type === "reschedule" && "Reschedule"}
                    {actionModal.type === "reject" && "Reject"}
                    {actionModal.type === "complete" && "Complete"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
