"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { apiFetchAdmin } from "../../lib/api";

type ReportProperty = {
  _id: string;
  title?: string;
  location?: string;
  status?: string;
};

type ReportPerson = {
  _id: string;
  name?: string;
  email?: string;
};

type ReportItem = {
  _id: string;
  reason: string;
  status: string;
  createdAt: string;
  message?: string;
  remarks?: string;
  adminNote?: string;
  actionType?: string;
  action?: string;
  property?: ReportProperty;
  propertyId?: ReportProperty;
  adId?: ReportProperty;
  reporter?: ReportPerson;
  reporterId?: ReportPerson;
  owner?: ReportPerson;
  sellerId?: ReportPerson;
};

type ReportStats = {
  total: number;
  pending: number;
  reviewed: number;
  actionTaken: number;
  rejected: number;
};

const EMPTY_STATS: ReportStats = {
  total: 0,
  pending: 0,
  reviewed: 0,
  actionTaken: 0,
  rejected: 0,
};

const STATUS_OPTIONS = ["all", "pending", "reviewed", "action_taken", "rejected"] as const;

const STATUS_COPY: Record<
  (typeof STATUS_OPTIONS)[number],
  { label: string; description: string }
> = {
  all: { label: "All", description: "Review every moderation state in one queue." },
  pending: { label: "Pending", description: "New reports waiting for an admin decision." },
  reviewed: { label: "Reviewed", description: "Reports checked without removing the listing." },
  action_taken: {
    label: "Action taken",
    description: "Reports that already resulted in listing moderation.",
  },
  rejected: { label: "Rejected", description: "Reports dismissed after moderation review." },
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusClasses(status: string) {
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "reviewed") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "action_taken") return "border-[#c9ddd2] bg-[#f4fbf7] text-[#2a523d]";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function pickProperty(report: ReportItem) {
  return report.property || report.propertyId || report.adId;
}

function pickReporter(report: ReportItem) {
  return report.reporter || report.reporterId;
}

function pickOwner(report: ReportItem) {
  return report.owner || report.sellerId;
}

function pickMessage(report: ReportItem) {
  return report.message || report.remarks || "";
}

function pickActionType(report: ReportItem) {
  return report.actionType || report.action || "none";
}

function formatActionLabel(actionType: string) {
  if (actionType === "property_removed") return "Listing hidden";
  if (actionType === "property_restored") return "Listing restored";
  if (actionType === "marked_reviewed") return "Marked reviewed";
  if (actionType === "report_rejected") return "Report rejected";
  return formatStatus(actionType);
}

function formatListingState(status: string) {
  if (status === "rejected") return "Hidden from public site";
  if (status === "active") return "Visible on public site";
  return formatStatus(status);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function ActionBadge({ actionType }: { actionType: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#c9ddd2] bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#316249]">
      {formatActionLabel(actionType)}
    </span>
  );
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
  tone: "slate" | "amber" | "emerald" | "sky" | "rose";
  icon: ReactNode;
}) {
  const tones = {
    slate: "border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)]",
    amber: "border-[#d7e7df] bg-[#f4fbf7]",
    emerald: "border-[#d7e7df] bg-[#f4fbf7]",
    sky: "border-[#d7e7df] bg-[#f4fbf7]",
    rose: "border-[#d7e7df] bg-[#f4fbf7]",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-5 shadow-sm ${tones}`}>
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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats>(EMPTY_STATS);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingKey, setProcessingKey] = useState("");

  const basePath = useMemo(() => "/api/admin/reports", []);

  async function load(nextStatus = status) {
    setLoading(true);
    setError("");
    try {
      const qs = nextStatus === "all" ? "" : `?status=${nextStatus}`;
      const [reportResponse, statsResponse] = await Promise.all([
        apiFetchAdmin<{ items?: ReportItem[] }>(`${basePath}${qs}`),
        apiFetchAdmin<{ stats?: ReportStats }>(`${basePath}/stats`),
      ]);
      setReports(reportResponse.items || []);
      setStats(statsResponse.stats || EMPTY_STATS);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function patchReport(id: string, payload: Record<string, unknown>, actionKey: string) {
    setProcessingKey(`${id}:${actionKey}`);
    setError("");
    try {
      await apiFetchAdmin(`${basePath}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await load(status);
    } catch (patchError: any) {
      setError(patchError?.message || "Update failed");
    } finally {
      setProcessingKey("");
    }
  }

  async function removeListing(id: string) {
    setProcessingKey(`${id}:remove`);
    setError("");
    try {
      await apiFetchAdmin(`${basePath}/${id}/remove-property`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await load(status);
    } catch (removeError: any) {
      setError(removeError?.message || "Failed to remove listing");
    } finally {
      setProcessingKey("");
    }
  }

  async function restoreListing(id: string) {
    setProcessingKey(`${id}:restore`);
    setError("");
    try {
      await apiFetchAdmin(`${basePath}/${id}/restore-property`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await load(status);
    } catch (restoreError: any) {
      setError(restoreError?.message || "Failed to restore listing");
    } finally {
      setProcessingKey("");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[#c9ddd2]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-7 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-9">
          <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                Marketplace Safety
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Reports moderation
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Review reported listings, reject invalid complaints, hide
                listings from the public site, and restore them if a moderation
                action was a mistake.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load(status)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total reports" value={String(stats.total)} detail="All reports in moderation." tone="slate" icon={<ShieldAlert className="h-5 w-5" />} />
          <StatCard title="Pending" value={String(stats.pending)} detail="Waiting for admin review." tone="amber" icon={<Clock3 className="h-5 w-5" />} />
          <StatCard title="Reviewed" value={String(stats.reviewed)} detail="Checked without removal." tone="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard title="Action taken" value={String(stats.actionTaken)} detail="Listings already handled." tone="sky" icon={<Shield className="h-5 w-5" />} />
          <StatCard title="Rejected" value={String(stats.rejected)} detail="Dismissed moderation reports." tone="rose" icon={<XCircle className="h-5 w-5" />} />
        </section>

        <section className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] p-4 shadow-sm shadow-[#d7e7df]/70 backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Filter moderation queue</p>
              <p className="mt-1 text-sm text-slate-500">{STATUS_COPY[status].description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={[
                    "rounded-2xl px-4 py-2.5 text-sm font-semibold transition ring-1",
                    status === option
                      ? "bg-[#316249] text-white ring-[#316249] shadow-sm"
                      : "bg-white text-slate-700 ring-[#d7e7df] hover:bg-[#e9f3ee]",
                  ].join(" ")}
                >
                  {STATUS_COPY[option].label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800 shadow-sm">
            <div className="flex items-start gap-3">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Unable to update the reports view</p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] shadow-[0_24px_60px_-36px_rgba(22,101,52,0.24)]">
          <div className="flex items-center justify-between border-b border-[#d7e7df] px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Report queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "Refreshing report data." : `${reports.length} entries in this view.`}
              </p>
            </div>
            <span className="rounded-full border border-[#c9ddd2] bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#316249]">
              {STATUS_COPY[status].label}
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-full bg-[#f4fbf7] p-4 text-[#316249]">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No reports found</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                There are no reports matching the selected moderation state right now.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f4fbf7] text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Listing</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Reporter</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => {
                    const property = pickProperty(report);
                    const reporter = pickReporter(report);
                    const owner = pickOwner(report);
                    const message = pickMessage(report);
                    const actionType = pickActionType(report);
                    const propertyHidden =
                      property?.status === "rejected" || actionType === "property_removed";

                    return (
                      <tr key={report._id} className="align-top transition hover:bg-[#f4fbf7]">
                        <td className="px-6 py-5">
                          <div className="max-w-xs">
                            <div className="text-sm font-semibold text-slate-900">
                              {property?.title || "Untitled listing"}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                              <MapPin className="h-4 w-4" />
                              <span>{property?.location || "Location unavailable"}</span>
                            </div>
                            {property?.status ? (
                              <div className="mt-3 text-xs font-semibold text-slate-500">
                                Listing: {formatListingState(property.status)}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="max-w-sm">
                            <div className="font-medium text-slate-800">{report.reason}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-500">
                              {message || "No extra details"}
                            </div>
                            {report.adminNote ? (
                              <div className="mt-3 rounded-xl bg-[#f4fbf7] px-3 py-2 text-xs text-slate-600 ring-1 ring-[#d7e7df]">
                                Admin note: {report.adminNote}
                              </div>
                            ) : null}
                            {actionType !== "none" ? (
                              <div className="mt-3">
                                <ActionBadge actionType={actionType} />
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-medium text-slate-900">
                            {reporter?.name || "Unknown"}
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                            <Mail className="h-4 w-4" />
                            <span>{reporter?.email || "No email provided"}</span>
                          </div>
                          {owner?.name ? (
                            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Owner: {owner.name}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void patchReport(
                                  report._id,
                                  { status: "reviewed", actionType: "marked_reviewed" },
                                  "review"
                                )
                              }
                              disabled={processingKey === `${report._id}:review` || report.status !== "pending"}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#316249] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#274e3b] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Check className="h-4 w-4" />
                              Mark reviewed
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patchReport(
                                  report._id,
                                  { status: "rejected", actionType: "report_rejected" },
                                  "reject"
                                )
                              }
                              disabled={
                                processingKey === `${report._id}:reject` ||
                                report.status === "rejected" ||
                                report.status === "action_taken"
                              }
                              className="inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-semibold text-[#316249] ring-1 ring-[#c9ddd2] transition hover:bg-[#e9f3ee] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject report
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeListing(report._id)}
                              disabled={processingKey === `${report._id}:remove` || propertyHidden}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#f4fbf7] px-3.5 py-2 text-xs font-semibold text-[#316249] ring-1 ring-[#c9ddd2] transition hover:bg-[#e9f3ee] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Ban className="h-4 w-4" />
                              Hide listing
                            </button>
                            <button
                              type="button"
                              onClick={() => void restoreListing(report._id)}
                              disabled={
                                processingKey === `${report._id}:restore` || !propertyHidden
                              }
                              className="inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-semibold text-[#316249] ring-1 ring-[#c9ddd2] transition hover:bg-[#e9f3ee] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Restore listing
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
