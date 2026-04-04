"use client";

import * as React from "react";
import { Eye, Filter, Home, RefreshCcw, Search, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { apiFetchAdmin } from "@/app/lib/api";
import AdminToast from "@/components/admin/AdminToast";

type PropertyItem = {
  _id: string;
  title: string;
  description?: string;
  location: string;
  address?: string;
  price?: number;
  monthlyRent?: number;
  currency?: string;
  status: string;
  propertyType?: string;
  listingType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  createdAt: string;
  images: Array<{ url: string }>;
  createdBy?: { name?: string; email?: string; phone?: string; role?: string };
};

type PropertiesResponse = {
  success: boolean;
  items: PropertyItem[];
  total: number;
  page: number;
  limit: number;
  stats: { total: number; active: number; pending: number; rejected: number; draft: number };
};

const PROPERTY_TYPES = ["all", "house", "apartment", "condo", "land", "office", "other"];
const LISTING_TYPES = ["all", "buy", "rent"];
const STATUS_OPTIONS = ["all", "active", "pending", "rejected", "draft"];
const STATUS_MUTATION_OPTIONS = ["active", "pending", "rejected", "draft"];
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
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function propertyPrice(property: PropertyItem) {
  return (property.listingType || "").toLowerCase() === "rent"
    ? property.monthlyRent || property.price || 0
    : property.price || 0;
}

function formatMoney(value?: number, currency?: string) {
  return `${currency || "NPR"} ${new Intl.NumberFormat().format(Number(value || 0))}`;
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : value === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : value === "rejected"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-slate-100 text-slate-700";

  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>{formatLabel(value)}</span>;
}

function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function DeleteModal({
  property,
  loading,
  onClose,
  onConfirm,
}: {
  property: PropertyItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!property) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-rose-100 bg-white shadow-xl">
        <div className="border-b border-rose-100 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">Delete property?</h3>
          <p className="mt-2 text-sm text-slate-500">{property.title} will be permanently removed.</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function PropertyDrawer({
  property,
  busy,
  draftStatus,
  onStatusChange,
  onSaveStatus,
  onDelete,
  onClose,
}: {
  property: PropertyItem | null;
  busy: boolean;
  draftStatus: string;
  onStatusChange: (value: string) => void;
  onSaveStatus: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  if (!property) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-emerald-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Property overview</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{property.title}</h2>
              <p className="mt-2 text-sm text-slate-500">Created {formatDate(property.createdAt)} by {property.createdBy?.name || "Unknown owner"}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50">Close</button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-emerald-50/40">
            {property.images?.[0]?.url ? (
              <img src={property.images[0].url} alt={property.title} className="h-72 w-full object-cover" />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-400">No cover image</div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p><div className="mt-2"><StatusPill value={property.status} /></div></div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Price</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(propertyPrice(property), property.currency)}</p></div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Type</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatLabel(property.propertyType)} / {formatLabel(property.listingType)}</p></div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Location</p><p className="mt-2 text-sm font-semibold text-slate-900">{property.location || property.address || "Unknown"}</p></div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-white px-5 py-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Owner details</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Name: <span className="font-semibold text-slate-900">{property.createdBy?.name || "Unknown"}</span></div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Role: <span className="font-semibold text-slate-900">{formatLabel(property.createdBy?.role)}</span></div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Email: <span className="font-semibold text-slate-900">{property.createdBy?.email || "N/A"}</span></div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Phone: <span className="font-semibold text-slate-900">{property.createdBy?.phone || "N/A"}</span></div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-white px-5 py-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Listing details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Beds: <span className="font-semibold text-slate-900">{property.beds || 0}</span></div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Baths: <span className="font-semibold text-slate-900">{property.baths || 0}</span></div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3 text-sm text-slate-700">Sqft: <span className="font-semibold text-slate-900">{property.sqft || 0}</span></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{property.description || "No description provided for this property."}</p>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-white px-5 py-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Admin actions</h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select value={draftStatus} onChange={(event) => onStatusChange(event.target.value)} className="rounded-2xl border border-emerald-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                {STATUS_MUTATION_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
              </select>
              <button type="button" onClick={onSaveStatus} disabled={busy || draftStatus === property.status} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{busy ? "Saving..." : "Change Status"}</button>
              <button type="button" onClick={onDelete} disabled={busy} className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">Delete Property</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAllPropertiesWorkspace() {
  const [items, setItems] = React.useState<PropertyItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(12);
  const [stats, setStats] = React.useState<PropertiesResponse["stats"]>({ total: 0, active: 0, pending: 0, rejected: 0, draft: 0 });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [listingType, setListingType] = React.useState("all");
  const [propertyType, setPropertyType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState("newest");
  const [selected, setSelected] = React.useState<PropertyItem | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState("pending");
  const [deleteTarget, setDeleteTarget] = React.useState<PropertyItem | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ tone: "success" | "error"; message: string } | null>(null);
  const timer = React.useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function loadProperties(silent = false) {
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
      if (status !== "all") params.set("status", status);

      const res = await apiFetchAdmin<PropertiesResponse>(`/properties/admin/all?${params.toString()}`, {
        cache: "no-store",
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setStats(res.stats || { total: 0, active: 0, pending: 0, rejected: 0, draft: 0 });
    } catch (err: any) {
      setError(err?.message || "Failed to load properties");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    void loadProperties();
  }, [page, limit, search, listingType, propertyType, status, sort]);

  React.useEffect(() => {
    if (selected) setSelectedStatus(selected.status || "pending");
  }, [selected]);

  React.useEffect(() => {
    if (!notice) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [notice]);

  async function updateStatus(propertyId: string, nextStatus: string) {
    setBusyId(propertyId);
    try {
      await apiFetchAdmin(`/properties/admin/${propertyId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadProperties(true);
      if (selected?._id === propertyId) {
        setSelected((current) => (current ? { ...current, status: nextStatus } : current));
      }
      setNotice({ tone: "success", message: "Property status updated." });
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Failed to update property status" });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProperty(propertyId: string) {
    setBusyId(propertyId);
    try {
      await apiFetchAdmin(`/properties/admin/${propertyId}`, { method: "DELETE" });
      if (selected?._id === propertyId) setSelected(null);
      setDeleteTarget(null);
      await loadProperties(true);
      setNotice({ tone: "success", message: "Property deleted successfully." });
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Failed to delete property" });
    } finally {
      setBusyId(null);
    }
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setListingType("all");
    setPropertyType("all");
    setStatus("all");
    setSort("newest");
    setPage(1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[32px] bg-slate-200/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
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
              <h1 className="text-2xl font-bold text-slate-900">Properties failed to load</h1>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button type="button" onClick={() => void loadProperties()} className="mt-5 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
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
      <AdminToast show={!!notice} message={notice?.message || ""} tone={notice?.tone || "success"} />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_90px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">Property management</span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">View All Properties</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">Review the full property inventory, inspect owners, and moderate status changes from one admin workspace.</p>
            </div>

            <button type="button" onClick={() => void loadProperties(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15">
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh list
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="All Properties" value={String(stats.total)} detail="Inventory across every status." />
          <SummaryCard title="Active" value={String(stats.active)} detail="Visible to approved buyer flows." />
          <SummaryCard title="Pending" value={String(stats.pending)} detail="Awaiting review or re-review." />
          <SummaryCard title="Rejected" value={String(stats.rejected)} detail="Removed from public visibility." />
          <SummaryCard title="Draft" value={String(stats.draft)} detail="Saved without approval." />
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Filter properties</h2>
              <p className="text-sm text-slate-500">Search the database-backed property inventory with admin filters.</p>
            </div>
          </div>

          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput); }}>
            <label className="block xl:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Search</span>
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 px-4 py-3 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Title, description, address, or location" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              </div>
            </label>

            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Listing Type</span><select value={listingType} onChange={(event) => { setListingType(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">{LISTING_TYPES.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Property Type</span><select value={propertyType} onChange={(event) => { setPropertyType(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">{PROPERTY_TYPES.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>

            <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-5">
              <button type="submit" className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Apply filters</button>
              <button type="button" onClick={resetFilters} className="rounded-2xl border border-emerald-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50">Reset</button>
              <p className="text-sm text-slate-500">Visible result set: <span className="font-semibold text-slate-700">{total}</span></p>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">All property records</h2>
              <p className="mt-1 text-sm text-slate-500">Review images, ownership, and moderation status for every property in the system.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Admin inventory
            </div>
          </div>

          {!items.length ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Home className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">No properties match the current filters</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">Adjust the filters to inspect a different part of the inventory.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 bg-emerald-50/40 p-4 md:hidden">
                {items.map((property) => (
                  <div key={property._id} className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-20 overflow-hidden rounded-2xl bg-emerald-100">
                        {property.images?.[0]?.url ? <img src={property.images[0].url} alt={property.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{property.title}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{property.location || property.address}</p>
                        <div className="mt-2"><StatusPill value={property.status} /></div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Owner</p><p className="mt-2 text-sm font-semibold text-slate-900">{property.createdBy?.name || "Unknown"}</p></div>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Price</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(propertyPrice(property), property.currency)}</p></div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelected(property)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />View</button>
                      <button type="button" onClick={() => void updateStatus(property._id, property.status === "active" ? "pending" : "active")} disabled={busyId === property._id} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Change Status</button>
                      <button type="button" onClick={() => setDeleteTarget(property)} disabled={busyId === property._id} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"><Trash2 className="h-4 w-4" />Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[1280px] w-full text-sm">
                  <thead className="bg-emerald-50/70 text-slate-600">
                    <tr>
                      <th className="px-5 py-4 text-left font-semibold">Property</th>
                      <th className="px-5 py-4 text-left font-semibold">Type</th>
                      <th className="px-5 py-4 text-left font-semibold">Price</th>
                      <th className="px-5 py-4 text-left font-semibold">Owner</th>
                      <th className="px-5 py-4 text-left font-semibold">Status</th>
                      <th className="px-5 py-4 text-left font-semibold">Created</th>
                      <th className="px-5 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((property) => (
                      <tr key={property._id} className="border-t border-emerald-100 transition hover:bg-emerald-50/40">
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-12 w-16 overflow-hidden rounded-xl bg-slate-200">{property.images?.[0]?.url ? <img src={property.images[0].url} alt={property.title} className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{property.title}</p><p className="truncate text-sm text-slate-500">{property.location || property.address}</p></div></div></td>
                        <td className="px-5 py-4 text-slate-600">{formatLabel(property.propertyType)} / {formatLabel(property.listingType)}</td>
                        <td className="px-5 py-4 text-slate-700">{formatMoney(propertyPrice(property), property.currency)}</td>
                        <td className="px-5 py-4 text-slate-700"><p className="font-semibold text-slate-900">{property.createdBy?.name || "Unknown"}</p><p className="text-sm text-slate-500">{property.createdBy?.email || "N/A"}</p></td>
                        <td className="px-5 py-4"><StatusPill value={property.status} /></td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(property.createdAt)}</td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelected(property)} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50"><Eye className="h-4 w-4" />View</button><button type="button" onClick={() => setDeleteTarget(property)} disabled={busyId === property._id} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"><Trash2 className="h-4 w-4" />Delete</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-[28px] border border-emerald-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Page {page} of {totalPages}</p>
            <p className="mt-1 text-sm text-slate-500">Properties matching the current admin filters: {total}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="rounded-2xl border border-emerald-100 px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
              {[6, 12, 24, 36].map((value) => <option key={value} value={value}>{value} / page</option>)}
            </select>

            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 disabled:opacity-50">Previous</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
      </div>

      <PropertyDrawer
        property={selected}
        busy={busyId === selected?._id}
        draftStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onSaveStatus={() => {
          if (selected) void updateStatus(selected._id, selectedStatus);
        }}
        onDelete={() => {
          if (selected) setDeleteTarget(selected);
        }}
        onClose={() => setSelected(null)}
      />

      <DeleteModal
        property={deleteTarget}
        loading={busyId === deleteTarget?._id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteProperty(deleteTarget._id);
        }}
      />
    </main>
  );
}
