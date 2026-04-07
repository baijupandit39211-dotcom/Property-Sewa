"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Clock3,
  Eye,
  Home,
  LoaderCircle,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

type RangeOption = "7d" | "30d" | "90d";
type SortOption =
  | "newest"
  | "oldest"
  | "price_high"
  | "price_low"
  | "views"
  | "leads"
  | "visits";

type Summary = {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  draftListings: number;
  engagedListings: number;
  views: number;
  leads: number;
  visits: number;
  completedVisits: number;
  averageDailyViews: number;
  viewsDelta: number;
  leadsDelta: number;
  visitsDelta: number;
};

type ActivityItem = {
  id: string;
  type: "lead" | "visit";
  status: string;
  occurredAt: string;
  propertyId: string;
  propertyTitle: string;
  href: string;
  actorName: string;
};

type PropertyRow = {
  id: string;
  title: string;
  location: string;
  status: "active" | "pending" | "rejected" | "draft";
  listingType: "buy" | "rent";
  price: number;
  currency: string;
  image: string;
  views: number;
  leads: number;
  visits: number;
  conversionRate: number;
  lastLeadAt: string | null;
  lastVisitAt: string | null;
  createdAt: string;
};

type AnalyticsPayload = {
  filters: {
    range: RangeOption;
    startDate: string;
    endDate: string;
  };
  summary: Summary;
  propertyPerformance: PropertyRow[];
  recentActivity: ActivityItem[];
};

type AnalyticsResponse = {
  success: boolean;
  data: AnalyticsPayload;
};

type DeleteResponse = {
  success: boolean;
};

type ToastState = {
  show: boolean;
  tone: "success" | "error";
  text: string;
};

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "views", label: "Most views" },
  { value: "leads", label: "Most leads" },
  { value: "visits", label: "Most visits" },
  { value: "price_high", label: "Highest price" },
  { value: "price_low", label: "Lowest price" },
];

const PAGE_SIZE = 8;
const SECTION_RENDER_STYLE = {
  contentVisibility: "auto",
  containIntrinsicSize: "900px",
} as const;
const LIST_CARD_RENDER_STYLE = {
  contentVisibility: "auto",
  containIntrinsicSize: "260px",
} as const;
const BRAND = "#316249";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: value < 1000 ? 0 : 1,
  }).format(Number(value || 0));
}

function formatCurrency(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value?: string | null, fallback = "No activity yet") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null, fallback = "Unknown") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deltaTone(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-500";
}

function statusTone(status: PropertyRow["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function activityTone(status: string) {
  if (status === "completed" || status === "closed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "requested" || status === "new" || status === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "confirmed" || status === "contacted" || status === "rescheduled") return "bg-sky-50 text-sky-700 ring-sky-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="h-44 animate-pulse rounded-[32px] bg-[#edf3ef]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-[28px] bg-[#eef2ef]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="h-[640px] animate-pulse rounded-[28px] bg-[#eef2ef]" />
        <div className="h-[640px] animate-pulse rounded-[28px] bg-[#eef2ef]" />
      </div>
    </div>
  );
}

function DeleteModal({
  open,
  property,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  property: PropertyRow | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !property) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
            <Trash2 className="h-3.5 w-3.5" />
            Delete listing
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            Remove this property?
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-900">{property.title}</span> will be
            permanently removed from your seller inventory.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
            Status:{" "}
            <span className="font-semibold text-slate-900">{titleCase(property.status)}</span>.
            If this listing is live, it will no longer appear on the marketplace.
          </div>
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            This action cannot be undone.
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              "Delete listing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellerMyPropertiesPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PropertyRow["status"]>("all");
  const [listingTypeFilter, setListingTypeFilter] = useState<"all" | PropertyRow["listingType"]>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PropertyRow | null>(null);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [toast, setToast] = useState<ToastState>({ show: false, tone: "success", text: "" });
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const toastTimer = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  const showToast = (text: string, tone: ToastState["tone"] = "success") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ show: true, tone, text });
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInventory() {
      setIsFetching(true);
      setError("");

      try {
        const response = await apiFetch<AnalyticsResponse>(`/analytics/seller?range=${range}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted && response.success) {
          setAnalytics(response.data);
          setLastUpdatedAt(new Date().toISOString());
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err?.message || "Failed to load seller listings");
      } finally {
        if (!controller.signal.aborted) setIsFetching(false);
      }
    }

    loadInventory();
    return () => controller.abort();
  }, [range, refreshToken]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter, listingTypeFilter, sort]);

  const summary = analytics?.summary;
  const isInitialLoading = isFetching && !analytics;
  const isRefreshing = isFetching && !!analytics;
  const rows = analytics?.propertyPerformance || [];

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    const nextRows = rows.filter((property) => {
      const matchesQuery =
        !query ||
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesListingType =
        listingTypeFilter === "all" || property.listingType === listingTypeFilter;
      return matchesQuery && matchesStatus && matchesListingType;
    });

    nextRows.sort((left, right) => {
      if (sort === "newest") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
      if (sort === "oldest") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
      if (sort === "price_high") return right.price - left.price;
      if (sort === "price_low") return left.price - right.price;
      if (sort === "views") return right.views - left.views;
      if (sort === "leads") return right.leads - left.leads;
      if (sort === "visits") return right.visits - left.visits;
      return 0;
    });

    return nextRows;
  }, [deferredSearch, listingTypeFilter, rows, sort, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  const topProperty = useMemo(() => {
    return (
      rows.find((property) => property.views > 0 || property.leads > 0 || property.visits > 0) ||
      rows[0] ||
      null
    );
  }, [rows]);

  const recentActivity = analytics?.recentActivity.slice(0, 5) || [];

  const cards = summary
    ? [
        {
          title: "Total listings",
          value: formatNumber(summary.totalListings),
          detail: `${summary.activeListings} active, ${summary.pendingListings} pending`,
          icon: Home,
          tone: "border-slate-200 bg-white",
        },
        {
          title: "Views in range",
          value: formatCompact(summary.views),
          detail: `${formatSignedPercent(summary.viewsDelta)} vs previous range`,
          icon: Eye,
          tone: "border-emerald-100 bg-emerald-50/80",
          detailTone: deltaTone(summary.viewsDelta),
        },
        {
          title: "Leads in range",
          value: formatNumber(summary.leads),
          detail: `${formatSignedPercent(summary.leadsDelta)} vs previous range`,
          icon: Users,
          tone: "border-emerald-100 bg-emerald-50/80",
          detailTone: deltaTone(summary.leadsDelta),
        },
        {
          title: "Visits in range",
          value: formatNumber(summary.visits),
          detail: `${formatSignedPercent(summary.visitsDelta)} vs previous range`,
          icon: CalendarClock,
          tone: "border-emerald-100 bg-emerald-50/80",
          detailTone: deltaTone(summary.visitsDelta),
        },
      ]
    : [];

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError("");

    try {
      const response = await apiFetch<DeleteResponse>(`/properties/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.success) {
        throw new Error("Failed to delete property");
      }

      setDeleteTarget(null);
      showToast("Listing deleted successfully.");
      startTransition(() => {
        setRefreshToken((value) => value + 1);
      });
    } catch (err: any) {
      setError(err?.message || "Failed to delete property");
      showToast(err?.message || "Failed to delete property", "error");
    } finally {
      setDeletingId("");
    }
  }

  if (isInitialLoading) {
    return <LoadingState />;
  }

  if (!analytics && error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
            Listings could not be loaded
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/seller/add-property"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Add property
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !summary) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <div
        className={cn(
          "pointer-events-none fixed right-6 top-24 z-[70] transition-all duration-300",
          toast.show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur",
            toast.tone === "success" ? "bg-emerald-600/95 text-white" : "bg-rose-600/95 text-white"
          )}
        >
          {toast.text}
        </div>
      </div>

      <section
        style={SECTION_RENDER_STYLE}
        className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_20px_60px_rgba(19,74,54,0.16)] md:px-8 md:py-7"
      >
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full border border-white/12" />
        <div className="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Seller inventory workspace
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">My Properties</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#edf6f0]/90 sm:text-base">
                Manage your listing inventory, monitor real performance, track approval status,
                and move into edit or detail views from one production-ready seller workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setRange(option.value);
                    })
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    range === option.value
                      ? "border-white bg-white text-slate-950"
                      : "border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRefreshToken((value) => value + 1)}
            className="relative z-10 inline-flex items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/15"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {error && analytics && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Showing the last successful listings snapshot. Refresh failed with: {error}
        </div>
      )}

      <section
        style={SECTION_RENDER_STYLE}
        className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/seller/add-property"
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-transform duration-150 ease-out motion-safe:hover:-translate-y-0.5"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Plus className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black tracking-tight text-slate-950">Add property</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create a new listing and send it into the seller approval workflow.
            </p>
          </Link>

          <Link
            href="/seller/analytics"
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-transform duration-150 ease-out motion-safe:hover:-translate-y-0.5"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black tracking-tight text-slate-950">Open analytics</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Jump into the seller reporting workspace for deeper inventory performance analysis.
            </p>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Approval queue
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              {formatNumber(summary.pendingListings)}
            </div>
            <p className="mt-2 text-sm text-slate-600">Listings still waiting for moderation approval.</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Engaged listings
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              {formatNumber(summary.engagedListings)}
            </div>
            <p className="mt-2 text-sm text-slate-600">Listings with views, leads, or visits in the selected range.</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Last refresh
            </div>
            <div className="mt-3 text-lg font-black tracking-tight text-slate-950">
              {formatDateTime(lastUpdatedAt, "Just now")}
            </div>
            <p className="mt-2 text-sm text-slate-600">Latest successful inventory snapshot.</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workflow note
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Editing a listing sends it back through the approval flow. Active, pending,
              rejected, and draft properties are all managed here.
            </p>
          </div>
        </div>
      </section>

      <section
        style={SECTION_RENDER_STYLE}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className={cn(
                "rounded-[28px] border p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-transform duration-150 ease-out motion-safe:hover:-translate-y-0.5",
                card.tone
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {card.title}
                  </div>
                  <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                    {card.value}
                  </div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className={cn("mt-4 text-sm", card.detailTone || "text-slate-600")}>{card.detail}</div>
            </article>
          );
        })}
      </section>

      <section
        style={SECTION_RENDER_STYLE}
        className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]"
      >
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <TrendingUp className="h-3.5 w-3.5" />
                Listing manager
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Search, filter, and act on your inventory
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Results update instantly from your real seller performance dataset.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {filteredRows.length} matching listing{filteredRows.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or location"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | PropertyRow["status"])
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>

            <select
              value={listingTypeFilter}
              onChange={(event) =>
                setListingTypeFilter(event.target.value as "all" | PropertyRow["listingType"])
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              <option value="all">All listing types</option>
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-4">
            {rows.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <Home className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">
                  No seller listings yet
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add your first property to activate listing management, seller analytics, and buyer activity tracking.
                </p>
                <Link
                  href="/seller/add-property"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create a listing
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {rows.length > 0 && filteredRows.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
                No listings match the current search and filter combination.
              </div>
            )}

            {paginatedRows.map((property) => (
              <article
                key={property.id}
                style={LIST_CARD_RENDER_STYLE}
                className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm transition-transform duration-150 ease-out motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="h-24 w-28 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                      {property.image ? (
                        <img
                          src={property.image}
                          alt={property.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <Home className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-950">
                          {property.title}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                            statusTone(property.status)
                          )}
                        >
                          {titleCase(property.status)}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {titleCase(property.listingType)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {property.location}
                        </span>
                        <span>{formatCurrency(property.price, property.currency)}</span>
                        <span>Listed {formatDate(property.createdAt)}</span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        {[
                          { label: "Views", value: property.views, icon: Eye },
                          { label: "Leads", value: property.leads, icon: Users },
                          { label: "Visits", value: property.visits, icon: CalendarClock },
                          { label: "Conversion", value: formatPercent(property.conversionRate), icon: TrendingUp },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={`${property.id}-${item.label}`}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                              </div>
                              <div className="mt-2 text-xl font-black tracking-tight text-slate-950">
                                {typeof item.value === "number" ? formatNumber(item.value) : item.value}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:w-[230px]">
                    <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                        Latest activity
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        Lead: {formatDate(property.lastLeadAt)}
                      </div>
                      <p className="mt-1 text-sm text-white/75">
                        Visit: {formatDate(property.lastVisitAt)}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      <Link
                        href={`/seller/property/${property.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      <Link
                        href={`/seller/edit-property/${property.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(property)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredRows.length > PAGE_SIZE && (
            <div className="mt-5 flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                <span className="font-semibold text-slate-900">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Inventory spotlight
            </div>
            <div className="mt-5">
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#f8fafc_0%,#effdf5_100%)] p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Top listing
                </div>
                <div className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  {topProperty?.title || "No listing data yet"}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {topProperty
                    ? `${formatNumber(topProperty.views)} views, ${formatNumber(topProperty.leads)} leads, ${formatNumber(topProperty.visits)} visits`
                    : "Your strongest listing will appear here once inventory is available."}
                </p>
                {topProperty ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/seller/property/${topProperty.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <Link
                      href={`/seller/edit-property/${topProperty.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Clock3 className="h-3.5 w-3.5" />
              Status summary
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: "Active", value: summary.activeListings, tone: "bg-emerald-50 text-emerald-800" },
                { label: "Pending", value: summary.pendingListings, tone: "bg-amber-50 text-amber-800" },
                { label: "Rejected", value: summary.rejectedListings, tone: "bg-rose-50 text-rose-800" },
                { label: "Draft", value: summary.draftListings, tone: "bg-slate-100 text-slate-700" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", item.tone)}>
                    {item.label}
                  </span>
                  <span className="text-lg font-black tracking-tight text-slate-950">
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                Recent activity
              </div>
              <Link
                href="/seller/analytics"
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                Open analytics
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {recentActivity.length === 0 && (
                <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No lead or visit activity has been recorded yet.
                </div>
              )}
              {recentActivity.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="block rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1",
                            activityTone(item.status)
                          )}
                        >
                          {titleCase(item.status)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {item.type}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-950">
                        {item.actorName} on {item.propertyTitle}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatDateTime(item.occurredAt)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-none text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DeleteModal
        open={!!deleteTarget}
        property={deleteTarget}
        deleting={deletingId === deleteTarget?.id}
        onClose={() => {
          if (!deletingId) setDeleteTarget(null);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </main>
  );
}
