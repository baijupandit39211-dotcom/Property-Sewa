import { Types } from "mongoose";

import Lead from "../../../models/Lead.model";
import Property from "../../../models/Property.model";
import PropertyView from "../../../models/PropertyView.model";
import Visit from "../../../models/Visit.model";

type AnalyticsRange = "7d" | "30d" | "90d";

interface AnalyticsSummary {
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
  lifetimeViews: number;
  lifetimeLeads: number;
  lifetimeVisits: number;
  conversionRate: number;
  lifetimeConversionRate: number;
  visitCompletionRate: number;
  averageDailyViews: number;
  viewsDelta: number;
  leadsDelta: number;
  visitsDelta: number;
  conversionDelta: number;
}

interface TrendData {
  key: string;
  label: string;
  shortLabel: string;
  date: string;
  views: number;
  leads: number;
  visits: number;
  completedVisits: number;
  conversionRate: number;
}

interface BreakdownItem {
  label: string;
  count: number;
}

interface ActivityItem {
  id: string;
  type: "lead" | "visit";
  status: string;
  occurredAt: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  actorName: string;
  actorEmail: string;
  href: string;
  requestedDate: string | null;
  preferredTime: string | null;
  message: string;
}

interface PropertyPerformanceItem {
  id: string;
  title: string;
  location: string;
  status: string;
  listingType: string;
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
}

interface FunnelStep {
  label: string;
  value: number;
  ratio: number;
}

interface SellerAnalytics {
  filters: {
    range: AnalyticsRange;
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: AnalyticsSummary;
  trends: TrendData[];
  funnel: FunnelStep[];
  breakdowns: {
    listings: BreakdownItem[];
    leads: BreakdownItem[];
    visits: BreakdownItem[];
  };
  propertyPerformance: PropertyPerformanceItem[];
  recentActivity: ActivityItem[];
}

interface CountRow {
  _id: string;
  count: number;
}

interface PropertyCountRow {
  _id: Types.ObjectId;
  count: number;
  lastAt: Date | null;
}

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const LISTING_STATUS_ORDER = ["active", "pending", "rejected", "draft"] as const;
const LEAD_STATUS_ORDER = ["new", "contacted", "closed"] as const;
const VISIT_STATUS_ORDER = ["requested", "confirmed", "rescheduled", "completed", "rejected"] as const;
const ANALYTICS_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function parseRange(value?: string): AnalyticsRange {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return round2((value / total) * 100);
}

function growthDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return round2(((current - previous) / previous) * 100);
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function chartLabelFor(date: Date, days: number) {
  if (days <= 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function chartShortLabelFor(date: Date, days: number, index: number) {
  if (days <= 7) return chartLabelFor(date, days);
  if (days <= 30) {
    if (index === 0 || index === days - 1 || index % 5 === 0 || date.getDate() === 1) {
      return chartLabelFor(date, days);
    }
    return "";
  }

  if (index === 0 || index === days - 1 || index % 14 === 0 || date.getDate() === 1) {
    return chartLabelFor(date, days);
  }

  return "";
}

async function aggregateDailyCounts(
  model: any,
  sellerId: Types.ObjectId,
  startDate: Date,
  endDateExclusive: Date,
  extraMatch: Record<string, unknown> = {}
) {
  return (await model.aggregate([
    {
      $match: {
        sellerId,
        createdAt: { $gte: startDate, $lt: endDateExclusive },
        ...extraMatch,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: ANALYTICS_TIMEZONE,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])) as CountRow[];
}

async function aggregatePropertyCounts(
  model: any,
  sellerId: Types.ObjectId,
  startDate: Date,
  endDateExclusive: Date
) {
  return (await model.aggregate([
    {
      $match: {
        sellerId,
        createdAt: { $gte: startDate, $lt: endDateExclusive },
      },
    },
    {
      $group: {
        _id: "$propertyId",
        count: { $sum: 1 },
        lastAt: { $max: "$createdAt" },
      },
    },
  ])) as PropertyCountRow[];
}

async function aggregateStatusCounts(
  model: any,
  sellerId: Types.ObjectId,
  startDate: Date,
  endDateExclusive: Date
) {
  return (await model.aggregate([
    {
      $match: {
        sellerId,
        createdAt: { $gte: startDate, $lt: endDateExclusive },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ])) as CountRow[];
}

function mapCountRows(rows: CountRow[]) {
  return new Map(rows.map((row) => [String(row._id), Number(row.count || 0)]));
}

function mapPropertyRows(rows: PropertyCountRow[]) {
  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        count: Number(row.count || 0),
        lastAt: row.lastAt ? row.lastAt.toISOString() : null,
      },
    ])
  );
}

function normalizeBreakdown(
  order: readonly string[],
  rows: CountRow[],
  labels: Record<string, string> = {}
) {
  const counts = mapCountRows(rows);
  return order.map((key) => ({
    label: labels[key] || titleCase(key),
    count: Number(counts.get(key) || 0),
  }));
}

function firstImageUrl(property: any) {
  if (!Array.isArray(property?.images) || !property.images.length) return "";
  return String(property.images[0]?.url || "");
}

class SellerAnalyticsService {
  async getSellerAnalytics(sellerId: string, rangeInput?: string): Promise<SellerAnalytics> {
    const sellerObjectId = new Types.ObjectId(sellerId);
    const range = parseRange(rangeInput);
    const days = RANGE_DAYS[range];
    const periodEndExclusive = addDays(startOfDay(new Date()), 1);
    const periodStart = addDays(periodEndExclusive, -days);
    const previousPeriodStart = addDays(periodStart, -days);

    const [
      properties,
      lifetimeViews,
      lifetimeLeads,
      lifetimeVisits,
      periodViews,
      periodLeads,
      periodVisits,
      completedVisits,
      previousViews,
      previousLeads,
      previousVisits,
      viewTrendRows,
      leadTrendRows,
      visitTrendRows,
      completedVisitTrendRows,
      propertyViewRows,
      propertyLeadRows,
      propertyVisitRows,
      leadStatusRows,
      visitStatusRows,
      recentLeadsRaw,
      recentVisitsRaw,
    ] = await Promise.all([
      Property.find({ createdBy: sellerObjectId })
        .select(
          "_id title location status listingType price monthlyRent currency images createdAt"
        )
        .sort({ createdAt: -1 })
        .lean(),
      PropertyView.countDocuments({ sellerId: sellerObjectId }),
      Lead.countDocuments({ sellerId: sellerObjectId }),
      Visit.countDocuments({ sellerId: sellerObjectId }),
      PropertyView.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: periodStart, $lt: periodEndExclusive },
      }),
      Lead.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: periodStart, $lt: periodEndExclusive },
      }),
      Visit.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: periodStart, $lt: periodEndExclusive },
      }),
      Visit.countDocuments({
        sellerId: sellerObjectId,
        status: "completed",
        createdAt: { $gte: periodStart, $lt: periodEndExclusive },
      }),
      PropertyView.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: previousPeriodStart, $lt: periodStart },
      }),
      Lead.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: previousPeriodStart, $lt: periodStart },
      }),
      Visit.countDocuments({
        sellerId: sellerObjectId,
        createdAt: { $gte: previousPeriodStart, $lt: periodStart },
      }),
      aggregateDailyCounts(PropertyView, sellerObjectId, periodStart, periodEndExclusive),
      aggregateDailyCounts(Lead, sellerObjectId, periodStart, periodEndExclusive),
      aggregateDailyCounts(Visit, sellerObjectId, periodStart, periodEndExclusive),
      aggregateDailyCounts(Visit, sellerObjectId, periodStart, periodEndExclusive, {
        status: "completed",
      }),
      aggregatePropertyCounts(PropertyView, sellerObjectId, periodStart, periodEndExclusive),
      aggregatePropertyCounts(Lead, sellerObjectId, periodStart, periodEndExclusive),
      aggregatePropertyCounts(Visit, sellerObjectId, periodStart, periodEndExclusive),
      aggregateStatusCounts(Lead, sellerObjectId, periodStart, periodEndExclusive),
      aggregateStatusCounts(Visit, sellerObjectId, periodStart, periodEndExclusive),
      Lead.find({ sellerId: sellerObjectId })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("propertyId", "title location")
        .lean(),
      Visit.find({ sellerId: sellerObjectId })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("propertyId", "title location")
        .populate("buyerId", "name email")
        .lean(),
    ]);

    const activeListings = properties.filter((property: any) => property.status === "active").length;
    const pendingListings = properties.filter((property: any) => property.status === "pending").length;
    const rejectedListings = properties.filter((property: any) => property.status === "rejected").length;
    const draftListings = properties.filter((property: any) => property.status === "draft").length;

    const currentConversionRate = percentage(periodLeads, periodViews);
    const previousConversionRate = percentage(previousLeads, previousViews);
    const lifetimeConversionRate = percentage(lifetimeLeads, lifetimeViews);

    const viewsByDate = mapCountRows(viewTrendRows);
    const leadsByDate = mapCountRows(leadTrendRows);
    const visitsByDate = mapCountRows(visitTrendRows);
    const completedVisitsByDate = mapCountRows(completedVisitTrendRows);

    const trends = Array.from({ length: days }, (_, index) => {
      const bucketDate = addDays(periodStart, index);
      const key = formatDateKey(bucketDate);
      const views = Number(viewsByDate.get(key) || 0);
      const leads = Number(leadsByDate.get(key) || 0);
      const visits = Number(visitsByDate.get(key) || 0);
      const completed = Number(completedVisitsByDate.get(key) || 0);

      return {
        key,
        label: chartLabelFor(bucketDate, days),
        shortLabel: chartShortLabelFor(bucketDate, days, index),
        date: key,
        views,
        leads,
        visits,
        completedVisits: completed,
        conversionRate: percentage(leads, views),
      };
    });

    const viewMetricsByProperty = mapPropertyRows(propertyViewRows);
    const leadMetricsByProperty = mapPropertyRows(propertyLeadRows);
    const visitMetricsByProperty = mapPropertyRows(propertyVisitRows);

    const propertyPerformance = properties
      .map((property: any) => {
        const id = String(property._id);
        const viewMetrics = viewMetricsByProperty.get(id);
        const leadMetrics = leadMetricsByProperty.get(id);
        const visitMetrics = visitMetricsByProperty.get(id);
        const views = Number(viewMetrics?.count || 0);
        const leads = Number(leadMetrics?.count || 0);
        const visits = Number(visitMetrics?.count || 0);
        const displayPrice =
          property.listingType === "rent"
            ? Number(property.monthlyRent || property.price || 0)
            : Number(property.price || 0);

        return {
          id,
          title: String(property.title || "Untitled property"),
          location: String(property.location || "Unknown location"),
          status: String(property.status || "pending"),
          listingType: String(property.listingType || "buy"),
          price: displayPrice,
          currency: String(property.currency || "NPR"),
          image: firstImageUrl(property),
          views,
          leads,
          visits,
          conversionRate: percentage(leads, views),
          lastLeadAt: leadMetrics?.lastAt || null,
          lastVisitAt: visitMetrics?.lastAt || null,
          createdAt: property.createdAt
            ? new Date(property.createdAt).toISOString()
            : new Date().toISOString(),
        };
      })
      .sort((left, right) => {
        const leftScore = left.leads * 14 + left.visits * 9 + left.views;
        const rightScore = right.leads * 14 + right.visits * 9 + right.views;
        if (rightScore !== leftScore) return rightScore - leftScore;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });

    const engagedListings = propertyPerformance.filter(
      (property) => property.views > 0 || property.leads > 0 || property.visits > 0
    ).length;

    const recentLeads = recentLeadsRaw.map((lead: any) => ({
      id: String(lead._id),
      type: "lead" as const,
      status: String(lead.status || "new"),
      occurredAt: new Date(lead.createdAt).toISOString(),
      propertyId: String(lead.propertyId?._id || ""),
      propertyTitle: String(lead.propertyId?.title || "Unknown property"),
      propertyLocation: String(lead.propertyId?.location || ""),
      actorName: String(lead.name || "Buyer"),
      actorEmail: String(lead.email || ""),
      href: `/seller/leads/${String(lead._id)}`,
      requestedDate: null,
      preferredTime: null,
      message: String(lead.message || ""),
    }));

    const recentVisits = recentVisitsRaw.map((visit: any) => ({
      id: String(visit._id),
      type: "visit" as const,
      status: String(visit.status || "requested"),
      occurredAt: new Date(visit.createdAt).toISOString(),
      propertyId: String(visit.propertyId?._id || ""),
      propertyTitle: String(visit.propertyId?.title || "Unknown property"),
      propertyLocation: String(visit.propertyId?.location || ""),
      actorName: String(visit.buyerId?.name || "Buyer"),
      actorEmail: String(visit.buyerId?.email || ""),
      href: "/seller/visit-scheduling",
      requestedDate: visit.requestedDate ? new Date(visit.requestedDate).toISOString() : null,
      preferredTime: visit.preferredTime ? String(visit.preferredTime) : null,
      message: String(visit.message || ""),
    }));

    const recentActivity = [...recentLeads, ...recentVisits]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
      )
      .slice(0, 8);

    return {
      filters: {
        range,
        days,
        startDate: periodStart.toISOString(),
        endDate: addDays(periodEndExclusive, -1).toISOString(),
      },
      summary: {
        totalListings: properties.length,
        activeListings,
        pendingListings,
        rejectedListings,
        draftListings,
        engagedListings,
        views: periodViews,
        leads: periodLeads,
        visits: periodVisits,
        completedVisits,
        lifetimeViews,
        lifetimeLeads,
        lifetimeVisits,
        conversionRate: currentConversionRate,
        lifetimeConversionRate,
        visitCompletionRate: percentage(completedVisits, periodVisits),
        averageDailyViews: round2(periodViews / days),
        viewsDelta: growthDelta(periodViews, previousViews),
        leadsDelta: growthDelta(periodLeads, previousLeads),
        visitsDelta: growthDelta(periodVisits, previousVisits),
        conversionDelta: round2(currentConversionRate - previousConversionRate),
      },
      trends,
      funnel: [
        { label: "Views", value: periodViews, ratio: periodViews > 0 ? 100 : 0 },
        { label: "Leads", value: periodLeads, ratio: percentage(periodLeads, periodViews) },
        { label: "Visits", value: periodVisits, ratio: percentage(periodVisits, periodViews) },
        {
          label: "Completed",
          value: completedVisits,
          ratio: percentage(completedVisits, periodViews),
        },
      ],
      breakdowns: {
        listings: LISTING_STATUS_ORDER.map((status) => ({
          label: titleCase(status),
          count: properties.filter((property: any) => property.status === status).length,
        })),
        leads: normalizeBreakdown(LEAD_STATUS_ORDER, leadStatusRows),
        visits: normalizeBreakdown(VISIT_STATUS_ORDER, visitStatusRows),
      },
      propertyPerformance,
      recentActivity,
    };
  }
}

export default new SellerAnalyticsService();
