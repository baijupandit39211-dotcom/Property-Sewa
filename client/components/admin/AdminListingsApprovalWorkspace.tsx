"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";
import AdminToast from "@/components/admin/AdminToast";
import {
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Home,
  RefreshCcw,
  Search,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";

type Listing = {
  _id: string;
  title: string;
  description?: string;
  location: string;
  address?: string;
  price?: number;
  monthlyRent?: number;
  deposit?: number;
  currency?: string;
  status: string;
  propertyType?: string;
  listingType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  amenities?: string[];
  createdAt: string;
  images: Array<{ url: string }>;
  createdBy?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
};

type PendingResponse = {
  success: boolean;
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalPending: number;
    active: number;
    rejected: number;
    buy: number;
    rent: number;
    recent: number;
    byType: Array<{ type: string; count: number }>;
  };
};

type ReviewAction = "approve" | "reject";

const PROPERTY_TYPES = ["all", "house", "apartment", "condo", "land", "office", "other"];
const LISTING_TYPES = ["all", "buy", "rent"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_high", label: "Highest price" },
  { value: "price_low", label: "Lowest price" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatLabel(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatMoney(value?: number, currency?: string) {
  return `${currency || "NPR"} ${new Intl.NumberFormat().format(Number(value || 0))}`;
}

function listingPrice(listing: Listing) {
  if ((listing.listingType || "").toLowerCase() === "rent") {
    return listing.monthlyRent || listing.price || 0;
  }
  return listing.price || 0;
}

function StatCard({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[28px] border p-5 shadow-sm", tone)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl bg-[linear-gradient(135deg,#316249_0%,#5b8f73_100%)] p-3 text-white shadow-sm">{icon}</div>
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#c9ddd2] bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#2a523d]">
      {formatLabel(value)}
    </span>
  );
}

function ConfirmModal({
  open,
  action,
  listing,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: ReviewAction;
  listing: Listing | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !listing) return null;

  const danger = action === "reject";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-[0_30px_80px_-30px_rgba(22,101,52,0.28)]">
        <div className="border-b border-[#d7e7df] px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">
            {action === "approve" ? "Approve listing?" : "Reject listing?"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {listing.title} will be {action === "approve" ? "published to active listings" : "moved to rejected status"}.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm font-semibold text-white",
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-[#316249] hover:bg-[#274e3b]",
              loading && "opacity-60"
            )}
          >
            {loading ? "Working..." : action === "approve" ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewDrawer({
  listing,
  onClose,
  onApprove,
  onReject,
  busy,
}: {
  listing: Listing | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  if (!listing) return null;

  const image = listing.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#d7e7df] bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#316249]">
                Listing review
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {listing.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Submitted {formatDate(listing.createdAt)} by {listing.createdBy?.name || "Unknown seller"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="overflow-hidden rounded-[28px] border border-[#d7e7df] bg-[#f4fbf7]">
            {image ? (
              <img src={image} alt={listing.title} className="h-72 w-full object-cover" />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-400">
                No cover image
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[#d7e7df] bg-[#f4fbf7] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Listing type
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatLabel(listing.listingType)}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#d7e7df] bg-[#f4fbf7] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Property type
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatLabel(listing.propertyType)}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#d7e7df] bg-[#f4fbf7] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Price
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatMoney(listingPrice(listing), listing.currency)}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#d7e7df] bg-[#f4fbf7] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Location
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {listing.location || listing.address || "Unknown"}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] px-5 py-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Property details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Beds: <span className="font-semibold text-slate-900">{listing.beds || 0}</span>
              </div>
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Baths: <span className="font-semibold text-slate-900">{listing.baths || 0}</span>
              </div>
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Sqft: <span className="font-semibold text-slate-900">{listing.sqft || 0}</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {listing.description || "No description provided for this listing."}
            </p>
            {listing.amenities?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full border border-[#c9ddd2] bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#316249]"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] px-5 py-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Seller snapshot</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Name: <span className="font-semibold text-slate-900">{listing.createdBy?.name || "Unknown"}</span>
              </div>
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Role: <span className="font-semibold text-slate-900">{formatLabel(listing.createdBy?.role)}</span>
              </div>
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Email: <span className="font-semibold text-slate-900">{listing.createdBy?.email || "N/A"}</span>
              </div>
              <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3 text-sm text-slate-700">
                Phone: <span className="font-semibold text-slate-900">{listing.createdBy?.phone || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[#d7e7df] bg-white px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              Reject listing
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white hover:bg-[#274e3b] disabled:opacity-60"
            >
              Approve listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminListingsApprovalWorkspace() {
  const [items, setItems] = React.useState<Listing[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(12);
  const [stats, setStats] = React.useState<PendingResponse["stats"]>({
    totalPending: 0,
    active: 0,
    rejected: 0,
    buy: 0,
    rent: 0,
    recent: 0,
    byType: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [listingType, setListingType] = React.useState("all");
  const [propertyType, setPropertyType] = React.useState("all");
  const [sort, setSort] = React.useState("newest");
  const [selected, setSelected] = React.useState<Listing | null>(null);
  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    action: ReviewAction;
    listing: Listing | null;
  }>({ open: false, action: "approve", listing: null });
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const timer = React.useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const maxTypeCount = Math.max(1, ...stats.byType.map((row) => row.count || 0));

  async function loadQueue(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sort", sort);
      if (search.trim()) params.set("search", search.trim());
      if (listingType !== "all") params.set("listingType", listingType);
      if (propertyType !== "all") params.set("propertyType", propertyType);

      const res = await apiFetchAdmin<PendingResponse>(
        `/properties/admin/pending?${params.toString()}`,
        { cache: "no-store" }
      );

      setItems(res.items || []);
      setTotal(res.total || 0);
      setStats(
        res.stats || {
          totalPending: 0,
          active: 0,
          rejected: 0,
          buy: 0,
          rent: 0,
          recent: 0,
          byType: [],
        }
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load pending listings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    void loadQueue();
  }, [page, limit, search, listingType, propertyType, sort]);

  React.useEffect(() => {
    if (!notice) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [notice]);

  async function moderateListing(listing: Listing, action: ReviewAction) {
    setActingId(listing._id);
    try {
      await apiFetchAdmin(`/properties/admin/${listing._id}/${action}`, { method: "PATCH" });
      if (selected?._id === listing._id) setSelected(null);
      setConfirm({ open: false, action: "approve", listing: null });
      await loadQueue(true);
      setNotice({
        tone: "success",
        message:
          action === "approve"
            ? "Listing approved successfully."
            : "Listing rejected successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || `Failed to ${action} listing`,
      });
    } finally {
      setActingId(null);
    }
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setListingType("all");
    setPropertyType("all");
    setSort("newest");
    setPage(1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[32px] bg-slate-200/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-[28px] bg-white shadow-sm" />
            ))}
          </div>
          <div className="h-48 rounded-[28px] bg-white shadow-sm" />
          <div className="h-[520px] rounded-[28px] bg-white shadow-sm" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Queue failed to load</h1>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadQueue()}
                className="mt-5 rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white hover:bg-[#274e3b]"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
      <AdminToast
        show={!!notice}
        message={notice?.message || ""}
        tone={notice?.tone || "success"}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[#c9ddd2]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Moderation queue
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Listings approval
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Review new property submissions, inspect seller context, and approve or reject
                each listing without changing the existing property moderation rules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadQueue(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Pending listings"
            value={String(stats.totalPending)}
            detail={`${total} listings match the current filter scope.`}
            tone="border-[#d7e7df] bg-[#f4fbf7]"
            icon={<Clock3 className="h-5 w-5" />}
          />
          <StatCard
            title="Recently submitted"
            value={String(stats.recent)}
            detail="Listings submitted in the last 7 days."
            tone="border-[#d7e7df] bg-[#f4fbf7]"
            icon={<Home className="h-5 w-5" />}
          />
          <StatCard
            title="Live inventory"
            value={String(stats.active)}
            detail="Already approved and visible on the public site."
            tone="border-[#d7e7df] bg-[#f4fbf7]"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            title="Rejected listings"
            value={String(stats.rejected)}
            detail="Properties currently held out of the public catalog."
            tone="border-[#d7e7df] bg-[#f4fbf7]"
            icon={<XCircle className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[#f4fbf7] p-3 text-[#316249]">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Review filters</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Narrow the approval queue by search term, listing type, property type, and sort order.
                  </p>
                </div>
              </div>

              <form
                className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_180px]"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  setSearch(searchInput);
                }}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Search</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search title, location, or address"
                      className="w-full rounded-2xl border border-[#d7e7df] px-11 py-3 text-sm text-slate-900 outline-none focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Listing type
                  </span>
                  <select
                    value={listingType}
                    onChange={(event) => {
                      setListingType(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-2xl border border-[#d7e7df] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                  >
                    {LISTING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Property type
                  </span>
                  <select
                    value={propertyType}
                    onChange={(event) => {
                      setPropertyType(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-2xl border border-[#d7e7df] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Sort</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-2xl border border-[#d7e7df] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
                  <button
                    type="submit"
                    className="rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white hover:bg-[#274e3b]"
                  >
                    Apply filters
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-2xl border border-[#c9ddd2] px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee]"
                  >
                    Reset
                  </button>
                  <p className="text-sm text-slate-500">
                    Current result set: <span className="font-semibold text-slate-700">{total}</span>
                  </p>
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Approval queue</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Open a listing to inspect the full submission before approving or rejecting it.
                  </p>
                </div>
                <StatusPill value="pending" />
              </div>

              {!items.length ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4fbf7] text-[#316249]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">No pending listings</h3>
                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    The approval queue is currently clear for the active filter combination.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 bg-[#f4fbf7] p-4 md:hidden">
                    {items.map((listing) => (
                      <div
                        key={listing._id}
                        className="rounded-[24px] border border-[#d7e7df] bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-20 overflow-hidden rounded-2xl bg-[#e9f3ee]">
                            {listing.images?.[0]?.url ? (
                              <img
                                src={listing.images[0].url}
                                alt={listing.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {listing.title}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-500">{listing.location}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {formatLabel(listing.propertyType)} / {formatLabel(listing.listingType)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Seller
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {listing.createdBy?.name || "Unknown"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Price
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatMoney(listingPrice(listing), listing.currency)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setSelected(listing)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee] sm:w-auto"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ open: true, action: "approve", listing })
                            }
                            disabled={actingId === listing._id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#316249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#274e3b] disabled:opacity-60 sm:w-auto"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ open: true, action: "reject", listing })
                            }
                            disabled={actingId === listing._id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:w-auto sm:col-span-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-[#f4fbf7] text-slate-600">
                        <tr>
                          <th className="w-[20%] px-4 py-4 text-left font-semibold">Property</th>
                          <th className="w-[22%] px-4 py-4 text-left font-semibold">Seller</th>
                          <th className="w-[14%] px-4 py-4 text-left font-semibold">Type</th>
                          <th className="w-[10%] px-4 py-4 text-left font-semibold">Price</th>
                          <th className="w-[12%] px-4 py-4 text-left font-semibold">Created</th>
                          <th className="w-[22%] px-4 py-4 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((listing) => (
                          <tr
                            key={listing._id}
                            className="border-t border-[#d7e7df] transition hover:bg-[#e9f3ee]/40"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-16 overflow-hidden rounded-xl bg-slate-200">
                                  {listing.images?.[0]?.url ? (
                                    <img
                                      src={listing.images[0].url}
                                      alt={listing.title}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {listing.title}
                                  </p>
                                  <p className="truncate text-sm text-slate-600">
                                    {listing.location}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              <p className="font-semibold text-slate-900">
                                {listing.createdBy?.name || "Unknown"}
                              </p>
                              <p className="text-sm text-slate-600">
                                {listing.createdBy?.email || "N/A"}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatLabel(listing.propertyType)} / {formatLabel(listing.listingType)}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-800">
                              {formatMoney(listingPrice(listing), listing.currency)}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatDate(listing.createdAt)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelected(listing)}
                                  className="inline-flex items-center gap-1.5 rounded-2xl border border-[#c9ddd2] px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee]"
                                >
                                  <Eye className="h-4 w-4" />
                                  Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirm({ open: true, action: "approve", listing })
                                  }
                                  disabled={actingId === listing._id}
                                  className="inline-flex items-center gap-1.5 rounded-2xl bg-[#316249] px-2.5 py-2 text-sm font-semibold text-white hover:bg-[#274e3b] disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirm({ open: true, action: "reject", listing })
                                  }
                                  disabled={actingId === listing._id}
                                  className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="flex flex-col gap-4 rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Page {page} of {totalPages}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Pending listings matching the current review filters: {total}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-2xl border border-[#d7e7df] px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                >
                  {[6, 12, 24, 36].map((value) => (
                    <option key={value} value={value}>
                      {value} / page
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Property type mix</h2>
              <p className="mt-1 text-sm text-slate-500">
                Distribution across the full pending queue.
              </p>
              <div className="mt-5 space-y-3">
                {stats.byType.map((row) => (
                  <div key={row.type}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{formatLabel(row.type)}</span>
                      <span className="text-slate-500">{row.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#e9f3ee]">
                      <div
                        className="h-2 rounded-full bg-[#316249]"
                        style={{ width: `${(row.count / maxTypeCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!stats.byType.length ? (
                  <div className="rounded-2xl border border-dashed border-[#c9ddd2] bg-[#f4fbf7] px-4 py-4 text-sm text-slate-500">
                    Type distribution will appear once the queue has pending listings.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Review guidance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep moderation decisions aligned with the current property workflow.
              </p>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                  Approving a listing moves its property status to <span className="font-semibold text-slate-900">active</span>.
                </div>
                <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                  Rejecting a listing moves its property status to <span className="font-semibold text-slate-900">rejected</span>.
                </div>
                <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                  Seller edits still reset a listing back to <span className="font-semibold text-slate-900">pending</span> for review.
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>

      <ReviewDrawer
        listing={selected}
        onClose={() => setSelected(null)}
        onApprove={() => {
          if (!selected) return;
          setConfirm({ open: true, action: "approve", listing: selected });
        }}
        onReject={() => {
          if (!selected) return;
          setConfirm({ open: true, action: "reject", listing: selected });
        }}
        busy={actingId === selected?._id}
      />

      <ConfirmModal
        open={confirm.open}
        action={confirm.action}
        listing={confirm.listing}
        loading={actingId === confirm.listing?._id}
        onClose={() => setConfirm({ open: false, action: "approve", listing: null })}
        onConfirm={() => {
          if (!confirm.listing) return;
          void moderateListing(confirm.listing, confirm.action);
        }}
      />
    </main>
  );
}

