"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

type Summary = {
  totalViews: number;
  totalLeads: number;
  totalVisits: number;
  conversionRate: number;
  viewsDelta: number;
  leadsDelta: number;
  visitsDelta: number;
};

type Trend = {
  date: string;
  views: number;
  leads: number;
  visits: number;
  conversionRate?: number;
};

type RecentActivity = {
  leads: any[];
  visits: any[];
};

type SellerAnalytics = {
  summary: Summary;
  trends: Trend[];
  recentActivity: RecentActivity;
};

type ApiResponse = {
  success: boolean;
  data: SellerAnalytics;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const BG = "#F1F7F4";
const GREEN = "#2C6B45";

function pct(v: number): string {
  const n = Math.round(v);
  return `${n >= 0 ? "+" : ""}${n}%`;
}

function dayLabel(i: number): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] || "";
}

function sparkPath(values: number[], w = 260, h = 70): string {
  if (!values.length) return "";
  const pad = 6;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const dx = (w - pad * 2) / (values.length - 1 || 1);
  const y = (v: number) => {
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return pad + (1 - t) * (h - pad * 2);
  };
  return values
    .map((v, i) => {
      const x = pad + i * dx;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y(v).toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(values: number[], w = 400, h = 120): string {
  if (!values.length) return "";
  const pad = 10;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const dx = (w - pad * 2) / (values.length - 1 || 1);
  const y = (v: number) => {
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return pad + (1 - t) * (h - pad * 2);
  };

  let path = values
    .map((v, i) => {
      const x = pad + i * dx;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y(v).toFixed(1)}`;
    })
    .join(" ");

  // Close the path for filled area
  const lastX = pad + (values.length - 1) * dx;
  path += ` L ${lastX.toFixed(1)} ${h} L ${pad.toFixed(1)} ${h} Z`;
  return path;
}

const Kpi: React.FC<{ title: string; value: string; delta: string }> = ({ title, value, delta }) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm border border-emerald-100">
    <div className="text-[14px] font-medium text-gray-600">{title}</div>
    <div className="mt-2 text-[32px] font-bold text-gray-900">{value}</div>
    <div className="mt-2 text-[14px] font-semibold text-emerald-600">{delta}</div>
  </div>
);

const TimelineItem: React.FC<{ title: string; time: string; icon: "user" | "cal" }> = ({ title, time, icon }) => (
  <div className="flex items-start gap-3">
    <div className="mt-1 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
      {icon === "user" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )}
    </div>
    <div className="flex-1">
      <div className="text-sm font-medium text-gray-900">{title}</div>
      {time && <div className="text-xs text-gray-500 mt-1">{time}</div>}
    </div>
  </div>
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState<SellerAnalytics | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/analytics/seller`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        const result: ApiResponse = await res.json();
        if (!alive) return;
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load analytics");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const summary = data?.summary;

  const trendArrays = React.useMemo(() => {
    const rows = data?.trends || [];
    return {
      views: rows.map((r) => r.views),
      leads: rows.map((r) => r.leads),
      visits: rows.map((r) => r.visits),
      conversionRates: rows.map((r) => r.conversionRate || 0),
    };
  }, [data]);

  const maxLead = Math.max(...(trendArrays.leads.length ? trendArrays.leads : [1]));
  const maxVisit = Math.max(...(trendArrays.visits.length ? trendArrays.visits : [1]));

  const exportPdf = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/seller/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "seller-analytics-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      alert(e?.message || "Failed to export PDF");
    }
  };

  if (loading) return <div className="p-6 text-slate-600">Loading</div>;
  if (err) return <div className="p-6 text-rose-700">{err}</div>;
  if (!data || !summary) return <div className="p-6 text-slate-600">No data.</div>;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Overview</h1>
            <p className="text-gray-600 mt-1">Track performance of all your active listings at a glance</p>
          </div>
          <button
            onClick={exportPdf}
            className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Kpi title="Total views" value={`${summary.totalViews.toLocaleString()}`} delta={pct(summary.viewsDelta)} />
          <Kpi title="Leads received" value={`${summary.totalLeads}`} delta={pct(summary.leadsDelta)} />
          <Kpi title="Scheduled visits" value={`${summary.totalVisits}`} delta={pct(summary.visitsDelta)} />
          <Kpi title="Conversion rate" value={`${summary.conversionRate.toFixed(1)}%`} delta={pct(summary.conversionRate)} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Views Trend */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Views Trend</h3>
              <span className="text-2xl font-bold text-emerald-600">{pct(summary.viewsDelta)}</span>
            </div>
            <div className="text-sm text-gray-500 mb-4">Last 7 days</div>
            <svg width="100%" height="80" viewBox="0 0 280 80">
              <path
                d={sparkPath(trendArrays.views, 280, 80)}
                fill="none"
                stroke={GREEN}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between mt-3 text-xs text-gray-600">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i}>{dayLabel(i)}</span>
              ))}
            </div>
          </div>

          {/* Leads Trend */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Leads Trend</h3>
              <span className="text-2xl font-bold text-emerald-600">{pct(summary.leadsDelta)}</span>
            </div>
            <div className="text-sm text-gray-500 mb-4">Last 7 days</div>
            <div className="flex items-end justify-between h-20">
              {trendArrays.leads.map((v, i) => {
                const h = Math.max(8, Math.round((v / (maxLead || 1)) * 80));
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-full max-w-[20px] rounded-t-md bg-emerald-500"
                      style={{ height: `${h}px` }}
                    />
                    <div className="text-xs text-gray-600">{dayLabel(i)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visits Trend */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Visits Trend</h3>
              <span className="text-2xl font-bold text-emerald-600">{pct(summary.visitsDelta)}</span>
            </div>
            <div className="text-sm text-gray-500 mb-4">Last 7 days</div>
            <div className="flex items-end justify-between h-20">
              {trendArrays.visits.map((v, i) => {
                const h = Math.max(8, Math.round((v / (maxVisit || 1)) * 80));
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-full max-w-[20px] rounded-t-md bg-emerald-500"
                      style={{ height: `${h}px` }}
                    />
                    <div className="text-xs text-gray-600">{dayLabel(i)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Conversion Rate Trend and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversion Rate Trend */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Conversion Rate Trend</h3>
              <span className="text-2xl font-bold text-emerald-600">{summary.conversionRate.toFixed(1)}%</span>
            </div>
            <div className="text-sm text-gray-500 mb-6">Last 7 days</div>
            <svg width="100%" height="120" viewBox="0 0 400 120">
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={GREEN} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={GREEN} stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d={areaPath(trendArrays.conversionRates, 400, 120)}
                fill="url(#areaGradient)"
              />
              <path
                d={sparkPath(trendArrays.conversionRates, 400, 120)}
                fill="none"
                stroke={GREEN}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between mt-3 text-xs text-gray-600">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i}>{dayLabel(i)}</span>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {data.recentActivity.leads?.slice(0, 3).map((l: any) => (
                <TimelineItem
                  key={String(l._id)}
                  title={`New lead from ${l.name || "Buyer"}`}
                  time={new Date(l.createdAt).toLocaleDateString()}
                  icon="user"
                />
              ))}
              {data.recentActivity.visits?.slice(0, 2).map((v: any) => (
                <TimelineItem
                  key={String(v._id)}
                  title={`Visit ${v.status || "requested"}`}
                  time={new Date(v.createdAt).toLocaleDateString()}
                  icon="cal"
                />
              ))}
              {!data.recentActivity.leads?.length && !data.recentActivity.visits?.length && (
                <div className="text-sm text-gray-500 text-center py-4">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
