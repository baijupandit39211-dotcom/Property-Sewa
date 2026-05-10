"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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
  UserRound,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type VisitStatus =
  | "requested"
  | "confirmed"
  | "rejected"
  | "rescheduled"
  | "completed";

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

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const STATUS_LABEL: Record<VisitStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  rejected: "Rejected",
  rescheduled: "Rescheduled",
  completed: "Completed",
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

const THEME = {
  primary: "#316249",
  primaryDark: "#274f3a",
  primarySoft: "#eef6f1",
  border: "#dfe7e1",
  text: "#1f2d24",
  textSoft: "#6b7b72",
  page: "#eef4f0",
  white: "#ffffff",
};

function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
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
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatMonthTitle(value: Date) {
  return value.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTimeLabel(value?: string) {
  if (!value) return "Not set";
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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
  return (
    dayKey >= formatLocalDateKey(start) && dayKey <= formatLocalDateKey(end)
  );
}

function effectiveDateKey(visit: Visit) {
  return formatLocalDateKey(new Date(visit.actualDate || visit.requestedDate));
}

function effectiveTime(visit: Visit) {
  return visit.actualTime || visit.preferredTime || "Time pending";
}

function sortVisits(items: Visit[]) {
  return [...items].sort((left, right) => {
    const leftStamp = new Date(
      `${effectiveDateKey(left)}T${effectiveTime(left) || "00:00"}`
    ).getTime();
    const rightStamp = new Date(
      `${effectiveDateKey(right)}T${effectiveTime(right) || "00:00"}`
    ).getTime();
    return leftStamp - rightStamp;
  });
}

function statusText(status: VisitStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "rejected":
      return "Rejected";
    case "rescheduled":
      return "Rescheduled";
    case "completed":
      return "Completed";
    default:
      return "Requested";
  }
}

function statusTextClass(status: VisitStatus) {
  switch (status) {
    case "confirmed":
      return "text-emerald-600";
    case "rejected":
      return "text-rose-600";
    case "rescheduled":
      return "text-amber-600";
    case "completed":
      return "text-slate-700";
    default:
      return "text-[#587864]";
  }
}

function badgeClass(status: VisitStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "rescheduled":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-[#eef6f1] text-[#316249] ring-[#cde0d3]";
  }
}

function getVisitImage(visit?: Visit | null) {
  if (!visit?.propertyId?.images?.length) return "/placeholder.jpg";
  return visit.propertyId.images[0];
}

function hasVisitImage(visit?: Visit | null) {
  return Boolean(visit?.propertyId?.images?.length && visit.propertyId.images[0]);
}

function handleImageFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = "/placeholder.jpg";
}

function parseDeepLinkDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function MonthCalendar({
  month,
  selectedDateKey,
  onPickDate,
  filteredVisits,
  draftRange,
  activeRangeEdge,
  selectedVisitDayKey,
}: {
  month: Date;
  selectedDateKey: string;
  onPickDate: (day: Date) => void;
  filteredVisits: Visit[];
  draftRange: { start: Date; end: Date };
  activeRangeEdge: "start" | "end" | null;
  selectedVisitDayKey: string;
}) {
  return (
    <div>
      <div className="text-center text-[24px] font-extrabold tracking-tight text-[#1f2d24]">
        {formatMonthTitle(month)}
      </div>

      <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#43584b]">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
          <div key={`${month.toISOString()}-${day}-${idx}`} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1">
        {buildCalendarDays(month).map((day) => {
          const dayKey = formatLocalDateKey(day);
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isSelected = dayKey === selectedDateKey;
          const isRangeStart = dayKey === formatLocalDateKey(draftRange.start);
          const isRangeEnd = dayKey === formatLocalDateKey(draftRange.end);
          const isInDraftRange = isDateWithinRange(
            day,
            draftRange.start,
            draftRange.end
          );
          const hasVisit = filteredVisits.some(
            (visit) => effectiveDateKey(visit) === dayKey
          );
          const isCurrentVisitDay = dayKey === selectedVisitDayKey;

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onPickDate(day)}
              className={cn(
                "relative min-h-[46px] px-1 py-1 text-center transition",
                !isCurrentMonth && "text-slate-300",
                isCurrentMonth && "text-[#1f2d24]"
              )}
            >
              <span
                className={cn(
                  "absolute inset-x-0 top-1/2 h-8 -translate-y-1/2",
                  isInDraftRange && "bg-[#ddeee2]",
                  isRangeStart && "left-1/2 rounded-l-full",
                  isRangeEnd && "right-1/2 rounded-r-full"
                )}
              />
              <span
                className={cn(
                  "relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-semibold",
                  isSelected
                    ? "bg-[#19e268] text-[#0f2d1b]"
                    : isCurrentVisitDay
                    ? "bg-[#316249] text-white"
                    : activeRangeEdge && (isRangeStart || isRangeEnd)
                    ? "bg-[#316249] text-white"
                    : "bg-transparent"
                )}
              >
                {day.getDate()}
              </span>

              {hasVisit && !isSelected && !isCurrentVisitDay && (
                <span className="relative z-10 mt-1 block h-1.5 w-1.5 mx-auto rounded-full bg-[#316249]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SellerVisitSchedulingPage() {
  const searchParams = useSearchParams();
  const deepLinkedVisitId = searchParams.get("visitId") || "";
  const deepLinkedDate = parseDeepLinkDate(searchParams.get("focusDate"));
  const initialCalendarDate = deepLinkedDate || new Date();

  const [visibleMonth, setVisibleMonth] = useState(() => {
    return new Date(
      initialCalendarDate.getFullYear(),
      initialCalendarDate.getMonth(),
      1
    );
  });

  const [queryRange, setQueryRange] = useState(() => {
    return {
      start: new Date(
        initialCalendarDate.getFullYear(),
        initialCalendarDate.getMonth(),
        1
      ),
      end: new Date(
        initialCalendarDate.getFullYear(),
        initialCalendarDate.getMonth() + 1,
        0
      ),
    };
  });

  const [draftRange, setDraftRange] = useState(() => {
    return {
      start: new Date(
        initialCalendarDate.getFullYear(),
        initialCalendarDate.getMonth(),
        1
      ),
      end: new Date(
        initialCalendarDate.getFullYear(),
        initialCalendarDate.getMonth() + 1,
        0
      ),
    };
  });

  const [activeRangeEdge, setActiveRangeEdge] = useState<"start" | "end" | null>(
    null
  );
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(initialCalendarDate)
  );
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisitStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  const [actionModal, setActionModal] = useState<ActionModal>({
    type: null,
    visit: null,
  });

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

  const plannerMonths = useMemo(
    () => [visibleMonth, addMonths(visibleMonth, 1)],
    [visibleMonth]
  );

  const selectedDateKey = formatLocalDateKey(selectedDate);

  const summary = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date());
    return {
      total: visits.length,
      requested: visits.filter((visit) => visit.status === "requested").length,
      upcoming: visits.filter((visit) => {
        const statusOpen =
          visit.status === "requested" ||
          visit.status === "confirmed" ||
          visit.status === "rescheduled";
        return statusOpen && effectiveDateKey(visit) >= todayKey;
      }).length,
      completed: visits.filter((visit) => visit.status === "completed").length,
    };
  }, [visits]);

  const filteredVisits = useMemo(
    () =>
      statusFilter === "all"
        ? visits
        : visits.filter((visit) => visit.status === statusFilter),
    [statusFilter, visits]
  );

  const dayVisits = useMemo(
    () =>
      sortVisits(
        filteredVisits.filter((visit) => effectiveDateKey(visit) === selectedDateKey)
      ),
    [filteredVisits, selectedDateKey]
  );

  const selectedVisit = useMemo(
    () => dayVisits.find((visit) => visit._id === selectedVisitId) || dayVisits[0] || null,
    [dayVisits, selectedVisitId]
  );

  const openQueue = useMemo(
    () =>
      sortVisits(
        visits.filter(
          (visit) =>
            visit.status === "requested" ||
            visit.status === "rescheduled" ||
            visit.status === "confirmed"
        )
      ).slice(0, 5),
    [visits]
  );

  const selectedPropertyId =
    selectedVisit?.propertyId._id || dayVisits[0]?.propertyId._id || "";

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

  const showcaseVisits = useMemo(() => {
    const source = dayVisits.length > 0 ? dayVisits : openQueue;
    return source.slice(0, 3);
  }, [dayVisits, openQueue]);

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
          if (!["confirmed", "rescheduled", "requested"].includes(visit.status))
            return false;
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

  async function loadVisits(
    range: { start: Date; end: Date },
    mode: "initial" | "refresh" = "initial"
  ) {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const response = await apiFetch<{ success: boolean; items: Visit[] }>(
        `/visits?startDate=${formatLocalDateKey(
          range.start
        )}&endDate=${formatLocalDateKey(
          range.end
        )}&limit=200&sortBy=requestedDate&sortOrder=asc`
      );

      const items = sortVisits(response.items || []);
      setVisits(items);

      const today = new Date();
      const keepSelectedDate = isDateWithinRange(
        selectedDate,
        range.start,
        range.end
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryRange]);

  useEffect(() => {
    if (!dayVisits.some((visit) => visit._id === selectedVisitId)) {
      setSelectedVisitId(dayVisits[0]?._id || "");
    }
  }, [dayVisits, selectedVisitId]);

  useEffect(() => {
    if (!deepLinkedVisitId || visits.length === 0) return;

    const linkedVisit = visits.find((visit) => visit._id === deepLinkedVisitId);
    if (!linkedVisit) return;

    const focusDate = new Date(linkedVisit.actualDate || linkedVisit.requestedDate);
    setStatusFilter("all");
    setSelectedDate(focusDate);
    setSelectedVisitId(linkedVisit._id);
    setVisibleMonth(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));
    setDraftRange({
      start: new Date(focusDate.getFullYear(), focusDate.getMonth(), 1),
      end: new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0),
    });
  }, [deepLinkedVisitId, visits]);

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

    if (
      selectedVisit.status !== "requested" &&
      selectedVisit.status !== "confirmed" &&
      selectedVisit.status !== "rescheduled"
    ) {
      setError("This visit cannot be scheduled from the calendar.");
      return;
    }

    const type: Exclude<ActionType, null> =
      selectedVisit.status === "confirmed"
        ? "reschedule"
        : selectedVisit.status === "rescheduled"
        ? "confirm"
        : "confirm";

    const baseDate = new Date(selectedDate);
    setFlash("");
    setActionModal({ type, visit: selectedVisit });
    setActionMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setFormData({
      actualDate: formatLocalDateKey(baseDate),
      actualTime: selectedPageTime,
      sellerResponse:
        type === "reschedule" ? selectedVisit.sellerResponse || "" : "",
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

    if (
      actionModal.type === "confirm" ||
      actionModal.type === "reschedule"
    ) {
      if (!formData.actualDate || !formData.actualTime) {
        setError("Date and time are required for this action.");
        return;
      }
      payload.actualDate = formData.actualDate;
      payload.actualTime = formData.actualTime;
      if (formData.sellerResponse.trim()) {
        payload.sellerResponse = formData.sellerResponse.trim();
      }
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

      const actionLabel = {
        confirm: "confirmed",
        reschedule: "rescheduled",
        reject: "rejected",
        complete: "completed",
      }[actionModal.type];

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
    <main
      className="min-h-screen px-4 pb-6 pt-28 sm:px-6 lg:px-8 lg:pt-32"
      style={{ backgroundColor: THEME.page }}
    >
      <div className="mx-auto max-w-[1240px]">
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {flash && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            {flash}
          </div>
        )}

        <section className="overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
              <CalendarClock className="h-3.5 w-3.5" />
              Seller visits
            </span>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-tight text-white sm:text-[28px]">
              Visits Calendar
            </h1>
            <p className="mt-3 text-sm text-emerald-50/90">
              Click on a visit to see details or update status
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm font-medium">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "border-b-2 pb-1 capitalize transition",
                  viewMode === mode
                    ? "border-[#316249] text-[#1f2d24]"
                    : "border-transparent text-white/75"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  statusFilter === filter.key
                    ? "bg-[#316249] text-white"
                    : "bg-white/10 text-white ring-1 ring-white/20"
                )}
              >
                {filter.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => loadVisits(queryRange, "refresh")}
              disabled={refreshing}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

        </section>

        <section className="mt-8 rounded-[34px] border border-emerald-200/80 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
          <div className="rounded-[26px] bg-[#f8fbf9] p-4 ring-1 ring-[#dfe7e1] sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_1fr]">
              <div>
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigateMonth("prev")}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#43584b] hover:bg-[#f3f8f4]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="grid flex-1 grid-cols-2 items-center gap-4 px-3">
                  {plannerMonths.map((month) => (
                    <div
                      key={month.toISOString()}
                      className="text-center text-[22px] font-extrabold tracking-tight text-[#1f2d24]"
                    >
                      {formatMonthTitle(month)}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigateMonth("next")}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#43584b] hover:bg-[#f3f8f4]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {plannerMonths.map((month) => (
                  <MonthCalendar
                    key={month.toISOString()}
                    month={month}
                    selectedDateKey={selectedDateKey}
                    onPickDate={updateDraftRange}
                    filteredVisits={filteredVisits}
                    draftRange={draftRange}
                    activeRangeEdge={activeRangeEdge}
                    selectedVisitDayKey={selectedDateKey}
                  />
                ))}
              </div>
            </div>

              <div className="rounded-[24px] bg-transparent">
                <div className="space-y-7">
                  {loading ? (
                    <div className="grid min-h-[320px] place-items-center rounded-[24px] bg-white ring-1 ring-[#dfe7e1]">
                    <LoaderCircle className="h-6 w-6 animate-spin text-[#316249]" />
                    </div>
                  ) : showcaseVisits.length === 0 ? (
                    <div className="rounded-[24px] bg-white p-8 text-center ring-1 ring-[#dfe7e1]">
                    <CircleAlert className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm text-[#50645a]">
                      No visits available for the selected range.
                    </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="text-[30px] font-extrabold tracking-tight text-[#1f2d24]">
                          {formatMonthTitle(selectedDate)}
                        </h2>
                      </div>

                      {showcaseVisits.map((visit) => (
                        <div
                          key={visit._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedDate(
                              new Date(visit.actualDate || visit.requestedDate)
                            );
                            setSelectedVisitId(visit._id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedDate(
                                new Date(visit.actualDate || visit.requestedDate)
                              );
                              setSelectedVisitId(visit._id);
                            }
                          }}
                          className={cn(
                            "grid w-full gap-5 rounded-2xl border border-transparent bg-white p-4 text-left shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition hover:border-[#cde0d3] md:grid-cols-[1fr_220px] md:p-5",
                            selectedVisit?._id === visit._id &&
                              "border-[#316249] ring-2 ring-[#316249]/15"
                          )}
                        >
                          <div className="self-center">
                            <div className="text-[22px] font-bold tracking-tight text-[#1f2d24]">
                              {visit.propertyId.title}
                            </div>
                            <div className="mt-2 text-sm text-[#587864]">
                              Buyer: {visit.buyerId.name} | Status:{" "}
                              <span className={statusTextClass(visit.status)}>
                                {statusText(visit.status)}
                              </span>
                            </div>

                            <div className="mt-4">
                              {visit.status === "requested" && (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAction("confirm", visit);
                                    }}
                                    className="rounded-lg bg-[#2d5b3d] px-4 py-2 text-sm font-semibold text-white"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAction("reschedule", visit);
                                    }}
                                    className="rounded-lg border border-[#2d5b3d] bg-white px-4 py-2 text-sm font-semibold text-[#2d5b3d]"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAction("reject", visit);
                                    }}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}

                            {visit.status === "confirmed" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAction("reschedule", visit);
                                }}
                                className="rounded-lg bg-[#2d5b3d] px-4 py-2 text-sm font-semibold text-white"
                              >
                                Reschedule
                              </button>
                            )}

                            {visit.status === "rejected" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAction("reject", visit);
                                }}
                                className="rounded-lg bg-[#2d5b3d] px-4 py-2 text-sm font-semibold text-white"
                              >
                                Cancel
                              </button>
                            )}

                            {visit.status === "rescheduled" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAction("confirm", visit);
                                }}
                                className="rounded-lg bg-[#2d5b3d] px-4 py-2 text-sm font-semibold text-white"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>

                          <div className="overflow-hidden rounded-xl ring-1 ring-[#dfe7e1]">
                            {hasVisitImage(visit) ? (
                              <img
                                src={getVisitImage(visit)}
                                alt={visit.propertyId.title}
                                onError={handleImageFallback}
                                className="h-[140px] w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-[140px] w-full place-items-center bg-[linear-gradient(135deg,#f5faf7_0%,#e7f1ea_100%)] text-center">
                                <div>
                                  <MapPin className="mx-auto h-5 w-5 text-[#316249]" />
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#587864]">
                                    No property image
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetRange}
                className="rounded-xl border border-[#dfe7e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#55685f]"
              >
                Reset Range
              </button>
              <button
                type="button"
                onClick={applyDraftRange}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: THEME.primary }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)]">
          <div className="rounded-[28px] bg-[#f3f8f4] px-5 py-6 sm:px-8">
            {!selectedVisit ? (
              <div className="rounded-[24px] bg-white p-8 text-center ring-1 ring-[#dfe7e1]">
                <p className="text-sm text-[#50645a]">
                  Select a visit to see full details.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-[22px] font-extrabold tracking-tight text-[#1f2d24] sm:text-[28px]">
                  Visit Details
                </h2>
                <div className="mt-3 inline-flex items-center rounded-full border border-[#cde0d3] bg-white px-3 py-1 text-xs font-semibold text-[#316249]">
                  Selected: {selectedVisit.buyerId.name} •{" "}
                  {formatShortDate(selectedVisit.actualDate || selectedVisit.requestedDate)}
                </div>

                <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-[#dfe7e1]">
                  <div className="mb-4 inline-flex items-center rounded-full border border-[#d7e7dd] bg-[#f3fbf6] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#316249]">
                    {statusText(selectedVisit.status)}
                  </div>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_230px]">
                  <div>
                    <div className="text-[18px] font-bold text-[#1f2d24]">
                      Visit Info
                    </div>

                    <div className="mt-6">
                      <div className="text-[20px] font-semibold text-[#1f2d24]">
                        {selectedVisit.propertyId.title}
                      </div>
                      <div className="mt-2 text-sm text-[#587864]">
                        {selectedVisit.propertyId.location}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[8px] ring-1 ring-[#dfe7e1]">
                    {hasVisitImage(selectedVisit) ? (
                      <img
                        src={getVisitImage(selectedVisit)}
                        alt={selectedVisit.propertyId.title}
                        onError={handleImageFallback}
                        className="h-[136px] w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-[136px] w-full place-items-center bg-[linear-gradient(135deg,#f5faf7_0%,#e7f1ea_100%)] text-center">
                        <div>
                          <MapPin className="mx-auto h-5 w-5 text-[#316249]" />
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#587864]">
                            No property image
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="border-t border-[#5d7067] pt-4">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#587864]">
                      Buyer
                    </div>
                    <div className="mt-2 text-[18px] text-[#1f2d24]">
                      {selectedVisit.buyerId.name}
                    </div>
                  </div>

                  <div className="border-t border-[#5d7067] pt-4">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#587864]">
                      Date & Time
                    </div>
                    <div className="mt-2 text-[18px] text-[#1f2d24]">
                      {formatLongDate(
                        selectedVisit.actualDate || selectedVisit.requestedDate
                      )}
                      , {formatTimeLabel(effectiveTime(selectedVisit))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 max-w-md border-t border-[#5d7067] pt-4">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#587864]">
                    Notes
                  </div>
                  <p className="mt-2 text-[16px] leading-7 text-[#1f2d24]">
                    {selectedVisit.message ||
                      "Buyer is interested in seeing the property's amenities and nearby schools."}
                  </p>
                </div>

                {selectedVisit.sellerResponse && (
                  <div className="mt-6 max-w-md rounded-2xl bg-white px-4 py-4 ring-1 ring-[#dfe7e1]">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#587864]">
                      Seller Response
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#1f2d24]">
                      {selectedVisit.sellerResponse}
                    </p>
                  </div>
                )}
                </div>

                <div className="mt-8">
                  <div className="text-[22px] font-bold tracking-tight text-[#1f2d24]">
                    Actions
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedVisit.status === "requested" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openAction("reschedule", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction("complete", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction("reject", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {selectedVisit.status === "confirmed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openAction("reschedule", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction("complete", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction("reject", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {selectedVisit.status === "rescheduled" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openAction("reschedule", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction("complete", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction("reject", selectedVisit)}
                          className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {selectedVisit.status === "completed" && (
                      <button
                        type="button"
                        onClick={() => openAction("complete", selectedVisit)}
                        className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                      >
                        Mark Completed
                      </button>
                    )}

                    {selectedVisit.status === "rejected" && (
                      <button
                        type="button"
                        onClick={() => openAction("reject", selectedVisit)}
                        className="rounded-lg bg-[#2d5b3d] px-5 py-3 text-sm font-semibold text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {(selectedVisit.status === "requested" ||
                  selectedVisit.status === "confirmed" ||
                  selectedVisit.status === "rescheduled") && (
                  <div className="mt-10">
                    <div className="text-[22px] font-bold tracking-tight text-[#1f2d24]">
                      Reschedule Visit
                    </div>

                    <div className="mt-6">
                      <div className="mb-5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setActionMonth(addMonths(actionMonth, -1))}
                          className="grid h-10 w-10 place-items-center rounded-full text-[#43584b] hover:bg-white"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="grid flex-1 grid-cols-2 items-center gap-4 px-3">
                          {modalMonths.map((month) => (
                            <div
                              key={month.toISOString()}
                              className="text-center text-[22px] font-extrabold tracking-tight text-[#1f2d24]"
                            >
                              {formatMonthTitle(month)}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActionMonth(addMonths(actionMonth, 1))}
                          className="grid h-10 w-10 place-items-center rounded-full text-[#43584b] hover:bg-white"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {modalMonths.map((month) => (
                          <div key={month.toISOString()}>
                            <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#43584b]">
                              {["S", "M", "T", "W", "T", "F", "S"].map(
                                (day, idx) => (
                                  <div
                                    key={`${month.toISOString()}-${day}-${idx}`}
                                    className="py-2"
                                  >
                                    {day}
                                  </div>
                                )
                              )}
                            </div>

                            <div className="mt-1 grid grid-cols-7 gap-y-1">
                              {buildCalendarDays(month).map((day) => {
                                const dayKey = formatLocalDateKey(day);
                                const isCurrentMonth =
                                  day.getMonth() === month.getMonth();
                                const isSelected = formData.actualDate === dayKey;

                                return (
                                  <button
                                    key={dayKey}
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        actualDate: dayKey,
                                      }))
                                    }
                                    className={cn(
                                      "relative min-h-[46px] px-1 py-1 text-center transition",
                                      !isCurrentMonth && "text-slate-300",
                                      isCurrentMonth && "text-[#1f2d24]"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-semibold",
                                        isSelected
                                          ? "bg-[#19e268] text-[#0f2d1b]"
                                          : "bg-transparent"
                                      )}
                                    >
                                      {day.getDate()}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {availableTimeSlots.slice(0, 12).map((slot) => {
                          const isSelected = formData.actualTime === slot.value;
                          const isDisabled = Boolean(slot.reservedBy);

                          return (
                            <button
                              key={slot.value}
                              type="button"
                              disabled={isDisabled}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  actualTime: slot.value,
                                }))
                              }
                              className={cn(
                                "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                                isSelected
                                  ? "border-[#316249] bg-[#316249] text-white"
                                  : isDisabled
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                  : "border-[#dfe7e1] bg-white text-[#284938] hover:bg-[#f7fbf8]"
                              )}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="rounded-[28px] bg-[#f3f8f4] px-5 py-6 sm:px-8">
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-[#dfe7e1]">
                <div className="text-sm font-semibold text-[#1f2d24]">
                  Quick Summary
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#50645a]">Total</span>
                    <span className="font-bold text-[#1f2d24]">
                      {summary.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#50645a]">Requested</span>
                    <span className="font-bold text-[#1f2d24]">
                      {summary.requested}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#50645a]">Upcoming</span>
                    <span className="font-bold text-[#1f2d24]">
                      {summary.upcoming}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#50645a]">Completed</span>
                    <span className="font-bold text-[#1f2d24]">
                      {summary.completed}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 ring-1 ring-[#dfe7e1]">
                <div className="text-sm font-semibold text-[#1f2d24]">
                  Open Queue
                </div>

                <div className="mt-4 space-y-3">
                  {openQueue.length === 0 ? (
                    <div className="text-sm text-[#50645a]">
                      No active visits in the current range.
                    </div>
                  ) : (
                    openQueue.map((visit) => (
                      <button
                        key={visit._id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(
                            new Date(visit.actualDate || visit.requestedDate)
                          );
                          setSelectedVisitId(visit._id);
                        }}
                        className="w-full rounded-xl border border-[#dfe7e1] bg-[#f8fbf9] px-4 py-3 text-left"
                      >
                        <div className="text-sm font-semibold text-[#1f2d24]">
                          {visit.buyerId.name}
                        </div>
                        <div className="mt-1 text-xs text-[#50645a]">
                          {visit.propertyId.title}
                        </div>
                        <div className="mt-2 text-xs font-medium text-[#587864]">
                          {formatShortDate(
                            visit.actualDate || visit.requestedDate
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selectedVisit && (
                <div className="rounded-2xl bg-white p-5 ring-1 ring-[#dfe7e1]">
                  <div className="text-sm font-semibold text-[#1f2d24]">
                    Contact
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-[#55685f]">
                    <div className="inline-flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      {selectedVisit.buyerId.name}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedVisit.buyerId.email}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedVisit.buyerId.phone || "No phone shared"}
                    </div>
                  </div>

                  <Link
                    href="/seller/messages"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: THEME.primary }}
                  >
                    Continue in Messages
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>

      {actionModal.type && actionModal.visit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-950">
                {actionModal.type === "confirm" && "Visit Details"}
                {actionModal.type === "reschedule" && "Visit Details"}
                {actionModal.type === "reject" && "Reject Visit"}
                {actionModal.type === "complete" && "Complete Visit"}
              </h3>
            </div>

            {(actionModal.type === "confirm" ||
              actionModal.type === "reschedule") && (
              <div className="px-6 py-6">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_230px]">
                  <div>
                    <div className="text-[18px] font-bold text-[#1f2d24]">
                      Visit Info
                    </div>

                    <div className="mt-6">
                      <div className="text-[20px] font-semibold text-[#1f2d24]">
                        {actionModal.visit.propertyId.title}
                      </div>
                      <div className="mt-2 text-sm text-[#587864]">
                        {actionModal.visit.propertyId.location}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[8px]">
                    {hasVisitImage(actionModal.visit) ? (
                      <img
                        src={getVisitImage(actionModal.visit)}
                        alt={actionModal.visit.propertyId.title}
                        onError={handleImageFallback}
                        className="h-[136px] w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-[136px] w-full place-items-center bg-[linear-gradient(135deg,#f5faf7_0%,#e7f1ea_100%)] text-center">
                        <div>
                          <MapPin className="mx-auto h-5 w-5 text-[#316249]" />
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#587864]">
                            No property image
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="border-t border-[#5d7067] pt-4">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#587864]">
                      Buyer
                    </div>
                    <div className="mt-2 text-[18px] text-[#1f2d24]">
                      {actionModal.visit.buyerId.name}
                    </div>
                  </div>

                  <div className="border-t border-[#5d7067] pt-4">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#587864]">
                      Date & Time
                    </div>
                    <div className="mt-2 text-[18px] text-[#1f2d24]">
                      {formatLongDate(formData.actualDate || new Date())},{" "}
                      {formData.actualTime
                        ? formatTimeLabel(formData.actualTime)
                        : "Select time"}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-[22px] font-bold tracking-tight text-[#1f2d24]">
                    {actionModal.type === "reschedule"
                      ? "Reschedule Visit"
                      : "Schedule Visit"}
                  </div>

                  <div className="mt-6">
                    <div className="mb-5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigateActionMonth("prev")}
                        className="grid h-10 w-10 place-items-center rounded-full text-[#43584b] hover:bg-[#f3f8f4]"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <div className="grid flex-1 grid-cols-2 items-center gap-4 px-3">
                        {modalMonths.map((month) => (
                          <div
                            key={month.toISOString()}
                            className="text-center text-[22px] font-extrabold tracking-tight text-[#1f2d24]"
                          >
                            {formatMonthTitle(month)}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateActionMonth("next")}
                        className="grid h-10 w-10 place-items-center rounded-full text-[#43584b] hover:bg-[#f3f8f4]"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {modalMonths.map((month) => (
                        <div key={month.toISOString()}>
                          <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#43584b]">
                            {["S", "M", "T", "W", "T", "F", "S"].map(
                              (day, idx) => (
                                <div
                                  key={`${month.toISOString()}-${day}-${idx}`}
                                  className="py-2"
                                >
                                  {day}
                                </div>
                              )
                            )}
                          </div>

                          <div className="mt-1 grid grid-cols-7 gap-y-1">
                            {buildCalendarDays(month).map((day) => {
                              const dayKey = formatLocalDateKey(day);
                              const isCurrentMonth =
                                day.getMonth() === month.getMonth();
                              const isSelected = formData.actualDate === dayKey;

                              return (
                                <button
                                  key={dayKey}
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      actualDate: dayKey,
                                    }))
                                  }
                                  className={cn(
                                    "relative min-h-[46px] px-1 py-1 text-center transition",
                                    !isCurrentMonth && "text-slate-300",
                                    isCurrentMonth && "text-[#1f2d24]"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-semibold",
                                      isSelected
                                        ? "bg-[#19e268] text-[#0f2d1b]"
                                        : "bg-transparent"
                                    )}
                                  >
                                    {day.getDate()}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {availableTimeSlots.map((slot) => {
                        const isSelected = formData.actualTime === slot.value;
                        const isDisabled = Boolean(slot.reservedBy);

                        return (
                          <button
                            key={slot.value}
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                actualTime: slot.value,
                              }))
                            }
                            className={cn(
                              "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                              isSelected
                                ? "border-[#316249] bg-[#316249] text-white"
                                : isDisabled
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                : "border-[#dfe7e1] bg-white text-[#284938] hover:bg-[#f7fbf8]"
                            )}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>

                    {actionModal.type === "reschedule" && (
                      <div className="mt-6">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Notes
                        </label>
                        <textarea
                          rows={4}
                          value={formData.sellerResponse}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              sellerResponse: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#316249] focus:bg-white"
                          placeholder="Add an optional note for the buyer..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {actionModal.type === "reject" && (
              <div className="px-6 py-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </label>
                <textarea
                  rows={4}
                  value={formData.sellerResponse}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      sellerResponse: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#316249] focus:bg-white"
                  placeholder="Explain why this request is being declined..."
                />
              </div>
            )}

            {actionModal.type === "complete" && (
              <div className="px-6 py-6">
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  This marks the visit as completed in the seller workflow.
                </div>
              </div>
            )}

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeAction}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: THEME.primary }}
              >
                {actionLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
