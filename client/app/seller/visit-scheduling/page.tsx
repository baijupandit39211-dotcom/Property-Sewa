"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type VisitStatus = "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";

type Visit = {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    location: string;
    images?: string[];
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
  status: VisitStatus;
  message?: string;
  sellerResponse?: string;
  actualDate?: string;
  actualTime?: string;
  createdAt: string;
};

type ActionType = "confirm" | "reschedule" | "reject" | "complete" | null;

type ActionModal = {
  type: ActionType;
  visit: Visit | null;
};

const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

const STATUS_LABEL: Record<VisitStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  rejected: "Rejected",
  rescheduled: "Rescheduled",
  completed: "Completed",
};

const STATUS_TONE: Record<VisitStatus, string> = {
  requested: "bg-sky-50 text-sky-700 ring-sky-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  rescheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
};

const STATUS_FILTERS: Array<{ key: VisitStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rescheduled", label: "Rescheduled" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLongDate(value?: string | Date) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value?: string) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMonthTitle(value: Date) {
  return value.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTimeLabel(value?: string) {
  if (!value) return "Not set";
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const end = new Date(lastDay);
  end.setDate(end.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    days.push(new Date(day));
  }
  return days;
}

function compareDateKeys(left: Date, right: Date) {
  return formatLocalDateKey(left).localeCompare(formatLocalDateKey(right));
}

function isDateWithinRange(day: Date, start: Date, end: Date) {
  const dayKey = formatLocalDateKey(day);
  return dayKey >= formatLocalDateKey(start) && dayKey <= formatLocalDateKey(end);
}

function effectiveDateKey(visit: Visit) {
  return formatLocalDateKey(new Date(visit.actualDate || visit.requestedDate));
}

function effectiveTime(visit: Visit) {
  return visit.actualTime || visit.preferredTime || "Time pending";
}

function sortVisits(items: Visit[]) {
  return [...items].sort((left, right) => {
    const leftStamp = new Date(`${effectiveDateKey(left)}T${effectiveTime(left) || "00:00"}`).getTime();
    const rightStamp = new Date(`${effectiveDateKey(right)}T${effectiveTime(right) || "00:00"}`).getTime();
    return leftStamp - rightStamp;
  });
}

export default function SellerVisitSchedulingPage() {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [queryRange, setQueryRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });
  const [draftRange, setDraftRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });
  const [activeRangeEdge, setActiveRangeEdge] = useState<"start" | "end" | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisitStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal>({ type: null, visit: null });
  const [formData, setFormData] = useState({
    actualDate: "",
    actualTime: "",
    sellerResponse: "",
  });
  const [actionMonth, setActionMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedPageTime, setSelectedPageTime] = useState("");

  const rangeLabel = useMemo(
    () =>
      `${queryRange.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${queryRange.end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
    [queryRange]
  );

  const plannerMonths = useMemo(() => [visibleMonth, addMonths(visibleMonth, 1)], [visibleMonth]);

  const selectedDateKey = formatLocalDateKey(selectedDate);

  const summary = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date());
    return {
      total: visits.length,
      requested: visits.filter((visit) => visit.status === "requested").length,
      upcoming: visits.filter((visit) => {
        const statusOpen = visit.status === "requested" || visit.status === "confirmed" || visit.status === "rescheduled";
        return statusOpen && effectiveDateKey(visit) >= todayKey;
      }).length,
      completed: visits.filter((visit) => visit.status === "completed").length,
    };
  }, [visits]);

  const filteredVisits = useMemo(
    () => statusFilter === "all" ? visits : visits.filter((visit) => visit.status === statusFilter),
    [statusFilter, visits]
  );

  const dayVisits = useMemo(
    () => sortVisits(filteredVisits.filter((visit) => effectiveDateKey(visit) === selectedDateKey)),
    [filteredVisits, selectedDateKey]
  );

  const selectedVisit = useMemo(
    () => dayVisits.find((visit) => visit._id === selectedVisitId) || dayVisits[0] || null,
    [dayVisits, selectedVisitId]
  );

  const openQueue = useMemo(
    () =>
      sortVisits(
        visits.filter((visit) => visit.status === "requested" || visit.status === "rescheduled" || visit.status === "confirmed")
      ).slice(0, 5),
    [visits]
  );

  const selectedPropertyId = selectedVisit?.propertyId._id || dayVisits[0]?.propertyId._id || "";

  const selectedDaySlotMap = useMemo(() => {
    if (!selectedPropertyId) return new Map<string, Visit>();
    return new Map(
      visits
        .filter((visit) => {
          if (visit.propertyId._id !== selectedPropertyId) return false;
          if (effectiveDateKey(visit) !== selectedDateKey) return false;
          return ["requested", "confirmed", "rescheduled"].includes(visit.status);
        })
        .map((visit) => [effectiveTime(visit), visit])
    );
  }, [selectedDateKey, selectedPropertyId, visits]);

  const pageTimeSlots = useMemo(
    () =>
      TIME_SLOTS.map((slot) => ({
        value: slot,
        label: formatTimeLabel(slot),
        visit: selectedDaySlotMap.get(slot) || null,
      })),
    [selectedDaySlotMap]
  );

  const nextOpenSlot = useMemo(
    () => pageTimeSlots.find((slot) => !slot.visit) || null,
    [pageTimeSlots]
  );

  const modalSelectedDate = useMemo(
    () => (formData.actualDate ? new Date(formData.actualDate) : null),
    [formData.actualDate]
  );

  const modalMonths = useMemo(
    () => [actionMonth, addMonths(actionMonth, 1)],
    [actionMonth]
  );

  const reservedSlotMap = useMemo(() => {
    if (!actionModal.visit || !modalSelectedDate) return new Map<string, Visit>();
    const selectedKey = formatLocalDateKey(modalSelectedDate);
    return new Map(
      visits
        .filter((visit) => {
          if (visit._id === actionModal.visit?._id) return false;
          if (visit.propertyId._id !== actionModal.visit?.propertyId._id) return false;
          if (!["confirmed", "rescheduled", "requested"].includes(visit.status)) return false;
          return effectiveDateKey(visit) === selectedKey;
        })
        .map((visit) => [effectiveTime(visit), visit])
    );
  }, [actionModal.visit, modalSelectedDate, visits]);

  const availableTimeSlots = useMemo(
    () =>
      TIME_SLOTS.map((slot) => ({
        value: slot,
        label: formatTimeLabel(slot),
        reservedBy: reservedSlotMap.get(slot) || null,
      })),
    [reservedSlotMap]
  );

  async function loadVisits(range: { start: Date; end: Date }, mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const response = await apiFetch<{ success: boolean; items: Visit[] }>(
        `/visits?startDate=${formatLocalDateKey(range.start)}&endDate=${formatLocalDateKey(range.end)}&limit=200&sortBy=requestedDate&sortOrder=asc`
      );
      const items = sortVisits(response.items || []);
      setVisits(items);

      const today = new Date();
      const keepSelectedDate = isDateWithinRange(selectedDate, range.start, range.end);
      const inCurrentRange = isDateWithinRange(today, range.start, range.end);
      const nextSelectedDate = keepSelectedDate
        ? selectedDate
        : inCurrentRange
          ? today
          : items[0]
            ? new Date(items[0].actualDate || items[0].requestedDate)
            : new Date(range.start);
      setSelectedDate(nextSelectedDate);
    } catch (err: any) {
      setError(err?.message || "Failed to load seller visits");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadVisits(queryRange, "initial");
  }, [queryRange]);

  useEffect(() => {
    if (!dayVisits.some((visit) => visit._id === selectedVisitId)) {
      setSelectedVisitId(dayVisits[0]?._id || "");
    }
  }, [dayVisits, selectedVisitId]);

  useEffect(() => {
    if (selectedVisit) {
      setSelectedPageTime(effectiveTime(selectedVisit));
      return;
    }
    setSelectedPageTime("");
  }, [selectedVisit?._id, selectedDateKey]);

  function navigateMonth(direction: "prev" | "next") {
    setVisibleMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  }

  function updateDraftRange(day: Date) {
    setSelectedDate(day);
    setSelectedVisitId("");
    if (!activeRangeEdge) return;
    setDraftRange((prev) => {
      if (activeRangeEdge === "start") {
        const nextStart = day;
        const nextEnd = compareDateKeys(nextStart, prev.end) === 1 ? day : prev.end;
        return { start: nextStart, end: nextEnd };
      }

      if (compareDateKeys(day, prev.start) === -1) {
        return { start: day, end: prev.start };
      }

      return { start: prev.start, end: day };
    });
    setActiveRangeEdge((prev) => (prev === "start" ? "end" : null));
  }

  function applyDraftRange() {
    const nextRange = {
      start: new Date(draftRange.start),
      end: new Date(draftRange.end),
    };
    setQueryRange(nextRange);
    if (!isDateWithinRange(selectedDate, nextRange.start, nextRange.end)) {
      setSelectedDate(new Date(nextRange.start));
      setSelectedVisitId("");
    }
    setActiveRangeEdge(null);
  }

  function resetRange() {
    const now = new Date();
    const nextRange = {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setDraftRange(nextRange);
    setQueryRange(nextRange);
    setSelectedDate(now);
    setSelectedVisitId("");
    setActiveRangeEdge(null);
  }

  function openAction(type: Exclude<ActionType, null>, visit: Visit) {
    setFlash("");
    setActionModal({ type, visit });
    const baseDate = new Date(visit.actualDate || visit.requestedDate);
    setActionMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setFormData({
      actualDate: formatLocalDateKey(baseDate),
      actualTime: visit.actualTime || visit.preferredTime || "",
      sellerResponse: type === "reject" ? "" : visit.sellerResponse || "",
    });
  }

  function closeAction() {
    setActionModal({ type: null, visit: null });
    setFormData({ actualDate: "", actualTime: "", sellerResponse: "" });
  }

  function openPageSchedulingAction() {
    if (!selectedVisit || !selectedPageTime) return;
    if (selectedVisit.status !== "requested" && selectedVisit.status !== "confirmed" && selectedVisit.status !== "rescheduled") {
      setError("This visit cannot be scheduled from the calendar.");
      return;
    }

    const type: Exclude<ActionType, null> =
      selectedVisit.status === "confirmed" ? "reschedule" : selectedVisit.status === "rescheduled" ? "confirm" : "confirm";

    const baseDate = new Date(selectedDate);
    setFlash("");
    setActionModal({ type, visit: selectedVisit });
    setActionMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setFormData({
      actualDate: formatLocalDateKey(baseDate),
      actualTime: selectedPageTime,
      sellerResponse: type === "reschedule" ? selectedVisit.sellerResponse || "" : "",
    });
  }

  function navigateActionMonth(direction: "prev" | "next") {
    setActionMonth((prev) => addMonths(prev, direction === "next" ? 1 : -1));
  }

  async function handleAction() {
    if (!actionModal.visit || !actionModal.type) return;

    const statusMap: Record<Exclude<ActionType, null>, VisitStatus> = {
      confirm: "confirmed",
      reschedule: "rescheduled",
      reject: "rejected",
      complete: "completed",
    };

    const nextStatus = statusMap[actionModal.type];
    const payload: Record<string, string> = { status: nextStatus };

    if (actionModal.type === "confirm" || actionModal.type === "reschedule") {
      if (!formData.actualDate || !formData.actualTime) {
        setError("Date and time are required for this action.");
        return;
      }
      payload.actualDate = formData.actualDate;
      payload.actualTime = formData.actualTime;
      if (formData.sellerResponse.trim()) payload.sellerResponse = formData.sellerResponse.trim();
    }

    if (actionModal.type === "reject") {
      if (!formData.sellerResponse.trim()) {
        setError("A rejection reason is required.");
        return;
      }
      payload.sellerResponse = formData.sellerResponse.trim();
    }

    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/visits/${actionModal.visit._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const actionLabel = { confirm: "confirmed", reschedule: "rescheduled", reject: "rejected", complete: "completed" }[actionModal.type];
      setFlash(`Visit ${actionLabel} successfully.`);
      closeAction();
      await loadVisits(queryRange, "refresh");
    } catch (err: any) {
      setError(err?.message || "Failed to update visit");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Seller Visit Operations
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Visit Scheduling</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#edf6f0]/90 sm:text-base">
                Manage buyer visit requests, confirm schedules, reschedule conflicts, and close completed appointments from one seller workspace.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total visits", value: summary.total },
                { label: "Needs action", value: summary.requested },
                { label: "Upcoming", value: summary.upcoming },
                { label: "Completed", value: summary.completed },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{item.label}</div>
                  <div className="mt-1 text-2xl font-black">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid gap-3 self-start rounded-[28px] bg-[rgba(218,232,223,0.12)] p-4 backdrop-blur-md ring-1 ring-[rgba(255,255,255,0.14)]">
            <button
              type="button"
              onClick={() => loadVisits(queryRange, "refresh")}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#11392f] transition hover:bg-[#f5faf7] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh calendar"}
            </button>
            <Link href="/seller/messages" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#edf6f0] px-4 py-3 text-sm font-semibold text-[#17614b] transition hover:bg-white">
              Open messages
            </Link>
            <div className="rounded-2xl bg-[rgba(9,36,27,0.12)] px-4 py-3 text-sm text-white/90">
              Seller updates are sent through visit status changes only. Use messages for direct buyer conversation.
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">{error}</div>}
      {flash && <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">{flash}</div>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                Monthly Planner
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Select your dates</h2>
              <p className="mt-2 text-sm text-slate-600">Use the calendar range to control which visits load into this workspace.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigateMonth("prev")} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => navigateMonth("next")} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {[
              { key: "start" as const, label: "Start date", value: draftRange.start },
              { key: "end" as const, label: "End date", value: draftRange.end },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveRangeEdge(item.key)}
                className={cn(
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  activeRangeEdge === item.key
                    ? "border-sky-300 bg-sky-50 shadow-[0_16px_30px_rgba(59,130,246,0.10)]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {item.value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500">
                  {activeRangeEdge === item.key ? "Click a calendar day to update this boundary." : "Select this field to edit it."}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  statusFilter === filter.key
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 rounded-[20px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Active range</span>
              <span>{rangeLabel}</span>
            </div>

            <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="grid gap-5 xl:grid-cols-2">
                {plannerMonths.map((month) => (
                  <div key={month.toISOString()} className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="text-center text-xl font-black tracking-tight text-slate-900">
                      {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </div>
                    <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={`${month.toISOString()}-${day}`} className="px-1 py-2">
                          {day.slice(0, 1)}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-y-1">
                      {buildCalendarDays(month).map((day) => {
                        const dayKey = formatLocalDateKey(day);
                        const isCurrentMonth = day.getMonth() === month.getMonth();
                        const isToday = dayKey === formatLocalDateKey(new Date());
                        const isSelected = dayKey === selectedDateKey;
                        const isRangeStart = dayKey === formatLocalDateKey(draftRange.start);
                        const isRangeEnd = dayKey === formatLocalDateKey(draftRange.end);
                        const isInDraftRange = isDateWithinRange(day, draftRange.start, draftRange.end);
                        const count = filteredVisits.filter((visit) => effectiveDateKey(visit) === dayKey).length;
                        const requestedCount = filteredVisits.filter((visit) => effectiveDateKey(visit) === dayKey && visit.status === "requested").length;

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            onClick={() => updateDraftRange(day)}
                            className={cn(
                              "relative min-h-[64px] px-1 py-2 text-center transition",
                              !isCurrentMonth && "text-slate-300",
                              isCurrentMonth && "text-slate-700 hover:text-slate-950"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute inset-x-0 top-1/2 h-10 -translate-y-1/2",
                                isInDraftRange && "bg-sky-100",
                                isRangeStart && "left-1/2 rounded-l-full",
                                isRangeEnd && "right-1/2 rounded-r-full"
                              )}
                            />
                            <span
                              className={cn(
                                "relative z-10 mx-auto grid h-10 w-10 place-items-center rounded-full text-sm font-bold",
                                isRangeStart || isRangeEnd
                                  ? "bg-sky-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.30)]"
                                  : isSelected
                                    ? "bg-slate-950 text-white"
                                    : isToday
                                      ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                                      : "bg-transparent"
                              )}
                            >
                              {day.getDate()}
                            </span>
                            {count > 0 && (
                              <span className="relative z-10 mt-2 block text-[11px] font-semibold text-slate-500">
                                {requestedCount > 0 ? `${requestedCount}/${count}` : count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5">
                <h3 className="text-2xl font-black tracking-tight text-slate-950">Select a time</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Available slots for {formatLongDate(selectedDate)}.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {pageTimeSlots.slice(0, 14).map((slot) => {
                    const isCurrentVisitSlot = selectedVisit ? effectiveTime(selectedVisit) === slot.value : false;
                    const isBusy = Boolean(slot.visit && slot.visit._id !== selectedVisit?._id);
                    const isSelected = selectedPageTime === slot.value;
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setSelectedPageTime(slot.value)}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition",
                          isSelected
                            ? "border-sky-500 bg-sky-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)]"
                          : isBusy
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : isCurrentVisitSlot
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm">
                  <div className="font-semibold text-slate-900">Next available</div>
                  <div className="mt-1 text-slate-600">
                    {nextOpenSlot ? `${formatLongDate(selectedDate)} at ${nextOpenSlot.label}` : "No open slots on this date"}
                  </div>
                </div>

                {selectedVisit ? (
                  <div className="mt-5 rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-900">
                    Current visit: {selectedVisit.buyerId.name} at {formatTimeLabel(effectiveTime(selectedVisit))}
                    {selectedPageTime && selectedPageTime !== effectiveTime(selectedVisit) && (
                      <div className="mt-2 text-emerald-800">
                        New selected time: {formatTimeLabel(selectedPageTime)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    Time can be selected now. Pick a visit from the day agenda before saving the slot.
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={openPageSchedulingAction}
                    disabled={!selectedVisit || !selectedPageTime}
                    className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedVisit?.status === "confirmed" ? "Adjust selected slot" : "Use selected slot"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetRange}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyDraftRange}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                Apply range
              </button>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Clock3 className="h-3.5 w-3.5" />
              Day Agenda
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{formatLongDate(selectedDate)}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {dayVisits.length ? `${dayVisits.length} visit${dayVisits.length === 1 ? "" : "s"} match the current filter.` : "No visits match this date and filter."}
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="grid min-h-[200px] place-items-center rounded-[24px] bg-slate-50">
                  <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : dayVisits.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                  <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">Select another date or change the status filter.</p>
                </div>
              ) : (
                dayVisits.map((visit) => (
                  <button
                    key={visit._id}
                    type="button"
                    onClick={() => setSelectedVisitId(visit._id)}
                    className={cn(
                      "w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-200",
                      selectedVisit?._id === visit._id
                        ? "border-emerald-300 bg-emerald-50/60 shadow-[0_16px_30px_rgba(5,150,105,0.10)]"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-950">{visit.buyerId.name}</div>
                        <div className="mt-1 text-sm text-slate-600">{visit.propertyId.title}</div>
                      </div>
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1", STATUS_TONE[visit.status])}>
                        {STATUS_LABEL[visit.status]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{effectiveTime(visit)}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{visit.propertyId.location}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <CircleAlert className="h-3.5 w-3.5" />
              Open Queue
            </div>
            <div className="mt-5 space-y-3">
              {openQueue.length === 0 ? (
                <div className="rounded-[22px] bg-slate-50 px-4 py-5 text-sm text-slate-500">No active visits in the current range.</div>
              ) : (
                openQueue.map((visit) => (
                  <button
                    key={visit._id}
                    type="button"
                    onClick={() => {
                      setSelectedDate(new Date(visit.actualDate || visit.requestedDate));
                      setSelectedVisitId(visit._id);
                    }}
                    className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-950">{visit.buyerId.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{visit.propertyId.title}</div>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{formatShortDate(visit.actualDate || visit.requestedDate)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <UserRound className="h-3.5 w-3.5" />
                Visit Detail
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                {selectedVisit ? selectedVisit.buyerId.name : "Choose a visit"}
              </h2>
            </div>
            {selectedVisit && (
              <span className={cn("inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ring-1", STATUS_TONE[selectedVisit.status])}>
                {STATUS_LABEL[selectedVisit.status]}
              </span>
            )}
          </div>

          {!selectedVisit ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              Select a visit from the day agenda to review buyer details and take action.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5">
                <div className="rounded-[24px] bg-[linear-gradient(135deg,#f8fafc_0%,#effdf5_100%)] p-5 ring-1 ring-slate-200">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-slate-600">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Requested date</div>
                      <div className="mt-2 font-semibold text-slate-950">{formatLongDate(selectedVisit.requestedDate)}</div>
                    </div>
                    <div className="text-sm text-slate-600">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Scheduled time</div>
                      <div className="mt-2 font-semibold text-slate-950">{effectiveTime(selectedVisit)}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-slate-600">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Listing</div>
                      <div className="mt-2 font-semibold text-slate-950">{selectedVisit.propertyId.title}</div>
                    </div>
                    <div className="text-sm text-slate-600">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Location</div>
                      <div className="mt-2 font-semibold text-slate-950">{selectedVisit.propertyId.location}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Buyer contact</div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{selectedVisit.buyerId.email}</div>
                      <div className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{selectedVisit.buyerId.phone || "No phone shared"}</div>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Buyer note</div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{selectedVisit.message || "No buyer message was included with this request."}</p>
                  </div>
                </div>

                {selectedVisit.sellerResponse && (
                  <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Seller response</div>
                    <p className="mt-3 text-sm leading-6 text-emerald-900">{selectedVisit.sellerResponse}</p>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</div>
                <div className="mt-4 grid gap-3">
                  {selectedVisit.status === "requested" && (
                    <>
                      <button type="button" onClick={() => openAction("confirm", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm visit
                      </button>
                      <button type="button" onClick={() => openAction("reschedule", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                        <RefreshCw className="h-4 w-4" />
                        Reschedule
                      </button>
                      <button type="button" onClick={() => openAction("reject", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
                        <XCircle className="h-4 w-4" />
                        Reject request
                      </button>
                    </>
                  )}

                  {selectedVisit.status === "confirmed" && (
                    <>
                      <button type="button" onClick={() => openAction("complete", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Mark completed
                      </button>
                      <button type="button" onClick={() => openAction("reschedule", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        <RefreshCw className="h-4 w-4" />
                        Adjust schedule
                      </button>
                    </>
                  )}

                  {selectedVisit.status === "rescheduled" && (
                    <>
                      <button type="button" onClick={() => openAction("confirm", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Reconfirm visit
                      </button>
                      <button type="button" onClick={() => openAction("complete", selectedVisit)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        <CheckCircle2 className="h-4 w-4" />
                        Mark completed
                      </button>
                    </>
                  )}

                  {(selectedVisit.status === "completed" || selectedVisit.status === "rejected") && (
                    <div className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      This visit is already closed. Review the timeline or open messages if the buyer needs follow-up.
                    </div>
                  )}

                  <Link href="/seller/messages" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Continue in messages
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Workflow Notes
          </div>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              Requested visits need an explicit seller decision.
            </div>
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              Confirmed and rescheduled visits stay in the open queue until completed.
            </div>
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              Use the seller response field for rejection reasons or new schedule instructions.
            </div>
          </div>
        </aside>
      </section>

      {actionModal.type && actionModal.visit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-2xl font-black tracking-tight text-slate-950">
              {actionModal.type === "confirm" && "Confirm visit"}
              {actionModal.type === "reschedule" && "Reschedule visit"}
              {actionModal.type === "reject" && "Reject visit"}
              {actionModal.type === "complete" && "Complete visit"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {actionModal.visit.buyerId.name} for {actionModal.visit.propertyId.title}
              </p>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_360px]">
              {(actionModal.type === "confirm" || actionModal.type === "reschedule") ? (
                <>
                  <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                    <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{actionModal.visit.propertyId.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigateActionMonth("prev")}
                        className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="text-lg font-black text-slate-900">{formatMonthTitle(actionMonth)}</div>
                      <button
                        type="button"
                        onClick={() => navigateActionMonth("next")}
                        className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                        <div key={`${day}-${index}`} className="py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {modalMonths.map((month) => (
                        <div key={month.toISOString()}>
                          {month.getTime() !== actionMonth.getTime() && (
                            <div className="mb-3 border-t border-slate-200 pt-4 text-center text-lg font-black text-slate-900">
                              {formatMonthTitle(month)}
                            </div>
                          )}
                          <div className="grid grid-cols-7 gap-y-1">
                            {buildCalendarDays(month).map((day) => {
                              const dayKey = formatLocalDateKey(day);
                              const isCurrentMonth = day.getMonth() === month.getMonth();
                              const isSelected = formData.actualDate === dayKey;
                              const isRequested = dayKey === formatLocalDateKey(new Date(actionModal.visit!.requestedDate));
                              const count = visits.filter(
                                (visit) =>
                                  visit.propertyId._id === actionModal.visit!.propertyId._id &&
                                  effectiveDateKey(visit) === dayKey &&
                                  ["requested", "confirmed", "rescheduled"].includes(visit.status)
                              ).length;

                              return (
                                <button
                                  key={dayKey}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, actualDate: dayKey }))}
                                  className={cn(
                                    "group relative min-h-[52px] px-1 py-1 text-center transition",
                                    !isCurrentMonth && "text-slate-300",
                                    isCurrentMonth && "text-slate-700 hover:text-slate-950"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mx-auto grid h-10 w-10 place-items-center rounded-full text-sm font-semibold transition",
                                      isSelected
                                        ? "bg-sky-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.30)]"
                                        : isRequested
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "group-hover:bg-slate-100"
                                    )}
                                  >
                                    {day.getDate()}
                                  </span>
                                  {count > 0 && (
                                    <span className={cn("mt-1 block text-[11px] font-medium", isSelected ? "text-sky-600" : "text-slate-400")}>
                                      {count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] lg:border-t-0 lg:border-l lg:border-slate-200">
                    <div className="flex-1 p-5">
                      <h4 className="text-2xl font-black tracking-tight text-slate-950">Select a time</h4>
                      <p className="mt-2 text-sm text-slate-500">
                        Available slots for {modalSelectedDate ? formatLongDate(modalSelectedDate) : "the selected date"}.
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        {availableTimeSlots.map((slot) => {
                          const isSelected = formData.actualTime === slot.value;
                          const isDisabled = Boolean(slot.reservedBy);
                          return (
                            <button
                              key={slot.value}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setFormData((prev) => ({ ...prev, actualTime: slot.value }))}
                              className={cn(
                                "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                                isSelected
                                  ? "border-sky-500 bg-sky-500 text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)]"
                                  : isDisabled
                                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-5 rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-600 shadow-sm">
                        <div className="font-semibold text-slate-900">Selected schedule</div>
                        <div className="mt-1">
                          {formData.actualDate ? formatLongDate(formData.actualDate) : "Choose a date"} at {formData.actualTime ? formatTimeLabel(formData.actualTime) : "Choose a time"}
                        </div>
                      </div>

                      {(actionModal.type === "reschedule") && (
                        <div className="mt-5">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Message to buyer</label>
                          <textarea
                            rows={4}
                            value={formData.sellerResponse}
                            onChange={(event) => setFormData((prev) => ({ ...prev, sellerResponse: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                            placeholder="Share the new schedule details with the buyer..."
                          />
                        </div>
                      )}
                      <div className="mt-5 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="text-sm font-semibold text-slate-900">Next available</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {availableTimeSlots.find((slot) => !slot.reservedBy)?.label
                            ? `${modalSelectedDate ? "Same day" : "Available"} at ${availableTimeSlots.find((slot) => !slot.reservedBy)?.label}`
                            : "No open slots on this date"}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6">
                  {(actionModal.type === "reject") && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Reason</label>
                      <textarea
                        rows={4}
                        value={formData.sellerResponse}
                        onChange={(event) => setFormData((prev) => ({ ...prev, sellerResponse: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Explain why this request is being declined..."
                      />
                    </div>
                  )}

                  {actionModal.type === "complete" && (
                    <div className="rounded-[22px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      This marks the visit as completed in the seller workflow.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={closeAction} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {actionLoading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Saving...</span> : "Save update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
