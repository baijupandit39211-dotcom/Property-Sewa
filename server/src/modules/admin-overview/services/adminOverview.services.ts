import Payment from "../../../models/Payment.model";
import Property from "../../../models/Property.model";
import PropertyView from "../../../models/PropertyView.model";
import Reservation from "../../../models/Reservation.model";
import User from "../../../models/User.model";
import AuditLog from "../../../models/AuditLog.model";
import Report from "../../reports/report.model";

function monthBuckets(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      start: date,
      label: date.toLocaleDateString(undefined, { month: "short" }),
    };
  });
}

function roleCount(rows: Array<{ _id: string; count: number }>, role: string) {
  return Number(rows.find((row) => row._id === role)?.count || 0);
}

function firstImageUrl(property: any) {
  if (!Array.isArray(property?.images) || !property.images.length) return "";
  return String(property.images[0]?.url || "");
}

type ActivitySource = "audit" | "user" | "property" | "report" | "payment" | "reservation";
type ActivityCategory = "admin" | "user" | "content" | "moderation" | "commerce";

type ActivityItem = {
  id: string;
  source: ActivitySource;
  category: ActivityCategory;
  action: string;
  title: string;
  description: string;
  status: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  subjectName: string;
  subjectType: string;
  href: string | null;
  metadata: Record<string, unknown>;
};

function normalizePage(value: unknown) {
  return Math.max(1, Number(value || 1));
}

function normalizeLimit(value: unknown) {
  return Math.min(50, Math.max(1, Number(value || 20)));
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function formatAction(value: string) {
  if (!value) return "Unknown action";
  return value.replace(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRole(value?: string) {
  const role = String(value || "").trim().toLowerCase();
  if (!role) return "Unknown";
  if (role === "superadmin") return "SuperAdmin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatStatus(value?: string) {
  const status = String(value || "").trim();
  if (!status) return "unknown";
  return status;
}

function asIso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}

function buildSearchText(item: ActivityItem) {
  return [
    item.title,
    item.description,
    item.actorName,
    item.actorRole,
    item.subjectName,
    item.subjectType,
    item.action,
    item.source,
    item.category,
    item.status,
  ]
    .join(" ")
    .toLowerCase();
}

function buildActivityStats(items: ActivityItem[]) {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sourceCounts = {
    audit: 0,
    user: 0,
    property: 0,
    report: 0,
    payment: 0,
    reservation: 0,
  };
  const categoryCounts = {
    admin: 0,
    user: 0,
    content: 0,
    moderation: 0,
    commerce: 0,
  };

  for (const item of items) {
    sourceCounts[item.source] += 1;
    categoryCounts[item.category] += 1;
  }

  return {
    total: items.length,
    last24h: items.filter((item) => new Date(item.timestamp).getTime() >= dayAgo).length,
    sourceCounts,
    categoryCounts,
  };
}

function toActivityItem(input: ActivityItem): ActivityItem {
  return input;
}

function mapAuditLog(log: any): ActivityItem {
  const actor = log?.actorId || {};
  const target = log?.targetUserId || {};
  const action = String(log?.action || "audit.event");
  const before = log?.metadata?.before;
  const after = log?.metadata?.after;
  const description =
    before !== undefined || after !== undefined
      ? `Changed from ${String(before ?? "N/A")} to ${String(after ?? "N/A")}.`
      : `Administrative action recorded under ${formatAction(action)}.`;

  return toActivityItem({
    id: `audit:${String(log?._id || "")}`,
    source: "audit",
    category: "admin",
    action,
    title: formatAction(action),
    description,
    status: formatStatus(String(after || log?.metadata?.status || "recorded").toLowerCase()),
    timestamp: asIso(log?.createdAt),
    actorName: String(actor?.name || actor?.email || "Admin"),
    actorRole: formatRole(actor?.role || "admin"),
    subjectName: String(target?.name || target?.email || "System"),
    subjectType: "user",
    href: target?._id ? `/admin/users/${String(target._id)}` : "/admin/users",
    metadata: log?.metadata || {},
  });
}

function mapUser(user: any): ActivityItem {
  const role = String(user?.role || "buyer");
  return toActivityItem({
    id: `user:${String(user?._id || "")}`,
    source: "user",
    category: "user",
    action: "user.created",
    title: "New user registered",
    description: `${String(user?.name || "Unknown")} joined as ${formatRole(role)}.`,
    status: formatStatus(String(user?.status || "active").toLowerCase()),
    timestamp: asIso(user?.createdAt),
    actorName: String(user?.name || user?.email || "Unknown"),
    actorRole: formatRole(role),
    subjectName: String(user?.name || user?.email || "Unknown"),
    subjectType: "user",
    href: `/admin/users/${String(user?._id || "")}`,
    metadata: {
      email: user?.email || "",
      provider: user?.provider || "",
    },
  });
}

function mapProperty(property: any): ActivityItem {
  const seller = property?.createdBy || {};
  const status = String(property?.status || "pending");
  return toActivityItem({
    id: `property:${String(property?._id || "")}`,
    source: "property",
    category: status === "pending" ? "moderation" : "content",
    action: "property.submitted",
    title: status === "pending" ? "Listing submitted for review" : "Listing activity",
    description: `${String(property?.title || "Untitled listing")} in ${String(property?.location || "Unknown location")} is ${status}.`,
    status: formatStatus(status),
    timestamp: asIso(property?.createdAt),
    actorName: String(seller?.name || seller?.email || "Seller"),
    actorRole: formatRole(seller?.role || "seller"),
    subjectName: String(property?.title || "Untitled listing"),
    subjectType: "property",
    href: "/admin/listings-approval",
    metadata: {
      listingType: property?.listingType || "",
      propertyType: property?.propertyType || "",
      price: Number(property?.price || 0),
      location: property?.location || "",
    },
  });
}

function mapReport(report: any): ActivityItem {
  const property = report?.propertyId || report?.adId || {};
  const reporter = report?.reporterId || {};
  const action = String(report?.action || "report.created");
  const status = String(report?.status || "pending");
  return toActivityItem({
    id: `report:${String(report?._id || "")}`,
    source: "report",
    category: "moderation",
    action,
    title: status === "pending" ? "Listing reported" : "Report workflow updated",
    description: `${String(report?.reason || "Moderation issue")} on ${String(property?.title || "listing")}.`,
    status: formatStatus(status),
    timestamp: asIso(report?.updatedAt || report?.createdAt),
    actorName: String(reporter?.name || reporter?.email || "Reporter"),
    actorRole: formatRole(reporter?.role || "buyer"),
    subjectName: String(property?.title || "Untitled listing"),
    subjectType: "report",
    href: "/admin/reports",
    metadata: {
      reason: report?.reason || "",
      propertyLocation: property?.location || "",
      adminNote: report?.adminNote || "",
      message: report?.remarks || "",
    },
  });
}

function mapPayment(payment: any): ActivityItem {
  const buyer = payment?.buyerId || {};
  const property = payment?.propertyId || {};
  const status = String(payment?.status || "pending");
  return toActivityItem({
    id: `payment:${String(payment?._id || "")}`,
    source: "payment",
    category: "commerce",
    action: `payment.${status}`,
    title: status === "paid" ? "Payment completed" : "Payment activity",
    description: `${String(buyer?.name || "Buyer")} ${status} ${String(payment?.gateway || "payment")} for ${String(property?.title || "listing")}.`,
    status: formatStatus(status),
    timestamp: asIso(payment?.updatedAt || payment?.createdAt),
    actorName: String(buyer?.name || buyer?.email || "Buyer"),
    actorRole: "Buyer",
    subjectName: String(property?.title || "Untitled listing"),
    subjectType: "payment",
    href: "/admin/overview",
    metadata: {
      amount: Number(payment?.amount || 0),
      gateway: payment?.gateway || "",
    },
  });
}

function mapReservation(reservation: any): ActivityItem {
  const user = reservation?.userId || {};
  const property = reservation?.propertyId || {};
  const status = String(reservation?.reservationStatus || "REQUESTED").toLowerCase();
  return toActivityItem({
    id: `reservation:${String(reservation?._id || "")}`,
    source: "reservation",
    category: "commerce",
    action: `reservation.${status}`,
    title: "Reservation activity",
    description: `${String(user?.name || "Buyer")} created a ${String(reservation?.paymentMethod || "COD")} reservation for ${String(property?.title || "listing")}.`,
    status: formatStatus(status),
    timestamp: asIso(reservation?.updatedAt || reservation?.createdAt),
    actorName: String(user?.name || user?.email || "Buyer"),
    actorRole: "Buyer",
    subjectName: String(property?.title || "Untitled listing"),
    subjectType: "reservation",
    href: "/admin/overview",
    metadata: {
      paymentMethod: reservation?.paymentMethod || "",
      paymentStatus: reservation?.paymentStatus || "",
      bookingAdvancePaisa: Number(reservation?.bookingAdvancePaisa || 0),
    },
  });
}

export async function getAdminOverview() {
  const buckets = monthBuckets(6);
  const rangeStart = buckets[0]?.start || new Date();
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [
    totalProperties,
    activeProperties,
    pendingProperties,
    rejectedProperties,
    pendingListings,
    totalUsers,
    activeUsers,
    archivedUsers,
    suspendedUsers,
    roleCounts,
    recentUsers,
    topOwnersRaw,
    totalReports,
    pendingReports,
    reviewedReports,
    actionTakenReports,
    rejectedReports,
    reportReasons,
    recentReports,
    paidStatsRaw,
    pendingPayments,
    paymentTrendRaw,
    recentPayments,
    totalReservations,
    confirmedReservations,
    propertyViews30d,
  ] = await Promise.all([
    Property.countDocuments({}),
    Property.countDocuments({ status: "active" }),
    Property.countDocuments({ status: "pending" }),
    Property.countDocuments({ status: "rejected" }),
    Property.find({ status: "pending" })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    User.countDocuments({}),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: { $in: ["archived", "inactive"] } }),
    User.countDocuments({ status: "suspended" }),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.find({})
      .select("_id name email role status createdAt")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Property.aggregate([
      {
        $match: {
          createdBy: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$createdBy",
          propertyCount: { $sum: 1 },
        },
      },
      { $sort: { propertyCount: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      {
        $project: {
          _id: 1,
          propertyCount: 1,
          name: "$owner.name",
          email: "$owner.email",
          role: "$owner.role",
          status: "$owner.status",
        },
      },
    ]),
    Report.countDocuments({}),
    Report.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "reviewed" }),
    Report.countDocuments({ status: "action_taken" }),
    Report.countDocuments({ status: "rejected" }),
    Report.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
    ]),
    Report.find({})
      .populate("propertyId", "title location")
      .populate("adId", "title location")
      .populate("reporterId", "name email")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Payment.countDocuments({ status: "pending" }),
    Payment.aggregate([
      { $match: { status: "paid", createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          payments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.find({})
      .populate("propertyId", "title location")
      .populate("buyerId", "name email")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Reservation.countDocuments({}),
    Reservation.countDocuments({ reservationStatus: "CONFIRMED" }),
    PropertyView.countDocuments({ createdAt: { $gte: last30Days } }),
  ]);

  const paidStats = paidStatsRaw[0] || { revenue: 0, count: 0 };
  const paymentTrend = buckets.map((bucket) => {
    const row = paymentTrendRaw.find((entry: any) => entry._id === bucket.key);
    return {
      label: bucket.label,
      revenue: Number(row?.revenue || 0),
      payments: Number(row?.payments || 0),
    };
  });

  return {
    stats: {
      properties: {
        total: totalProperties,
        active: activeProperties,
        pending: pendingProperties,
        rejected: rejectedProperties,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        archived: archivedUsers,
        suspended: suspendedUsers,
        buyers: roleCount(roleCounts, "buyer"),
        sellers: roleCount(roleCounts, "seller"),
        agents: roleCount(roleCounts, "agent"),
        admins: roleCount(roleCounts, "admin") + roleCount(roleCounts, "superadmin"),
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        reviewed: reviewedReports,
        actionTaken: actionTakenReports,
        rejected: rejectedReports,
      },
      commerce: {
        paidRevenue: Number(paidStats.revenue || 0),
        paidPayments: Number(paidStats.count || 0),
        pendingPayments,
        totalReservations,
        confirmedReservations,
        propertyViews30d,
      },
    },
    charts: {
      revenue: paymentTrend,
      moderation: [
        { name: "Pending", value: pendingReports },
        { name: "Reviewed", value: reviewedReports },
        { name: "Action Taken", value: actionTakenReports },
        { name: "Rejected", value: rejectedReports },
      ],
      propertyStatus: [
        { name: "Active", value: activeProperties },
        { name: "Pending", value: pendingProperties },
        { name: "Rejected", value: rejectedProperties },
      ],
      userRoles: [
        { name: "Buyers", value: roleCount(roleCounts, "buyer") },
        { name: "Sellers", value: roleCount(roleCounts, "seller") },
        { name: "Agents", value: roleCount(roleCounts, "agent") },
        {
          name: "Admins",
          value: roleCount(roleCounts, "admin") + roleCount(roleCounts, "superadmin"),
        },
      ],
    },
    lists: {
      pendingListings: pendingListings.map((property: any) => ({
        id: String(property._id),
        title: property.title || "Untitled Property",
        location: property.location || property.address || "Unknown",
        image: firstImageUrl(property),
        sellerName: property.createdBy?.name || "Unknown",
        createdAt: property.createdAt,
        propertyType: property.propertyType || "other",
        listingType: property.listingType || "buy",
        price:
          property.listingType === "rent"
            ? Number(property.monthlyRent || property.price || 0)
            : Number(property.price || 0),
        currency: property.currency || "NPR",
      })),
      recentReports: recentReports.map((report: any) => {
        const property = report.propertyId || report.adId || {};
        return {
          id: String(report._id),
          reason: report.reason || "Other",
          status: report.status || "pending",
          createdAt: report.createdAt,
          message: report.remarks || "",
          propertyTitle: property.title || "Untitled listing",
          propertyLocation: property.location || "Unknown",
          reporterName: report.reporterId?.name || "Unknown",
        };
      }),
      recentPayments: recentPayments.map((payment: any) => ({
        id: String(payment._id),
        amount: Number(payment.amount || 0),
        gateway: payment.gateway || "unknown",
        status: payment.status || "pending",
        createdAt: payment.createdAt,
        propertyTitle: payment.propertyId?.title || "Untitled listing",
        buyerName: payment.buyerId?.name || "Unknown",
      })),
      recentUsers: recentUsers.map((user: any) => ({
        id: String(user._id),
        name: user.name || "Unknown",
        email: user.email || "",
        role: user.role || "buyer",
        status: user.status || "active",
        createdAt: user.createdAt,
      })),
      topOwners: topOwnersRaw.map((owner: any) => ({
        id: String(owner._id),
        name: owner.name || "Unknown",
        email: owner.email || "",
        role: owner.role || "seller",
        status: owner.status || "active",
        propertyCount: Number(owner.propertyCount || 0),
      })),
      topReportReasons: reportReasons.map((row: any) => ({
        reason: String(row?._id || "Other"),
        count: Number(row?.count || 0),
      })),
    },
  };
}

export async function getAdminActivity(query: any = {}) {
  const page = normalizePage(query?.page);
  const limit = normalizeLimit(query?.limit);
  const sourceFilter = normalizeText(query?.source);
  const categoryFilter = normalizeText(query?.category);
  const search = normalizeText(query?.search);
  const statusFilter = normalizeText(query?.status);
  const sampleSize = Math.max(80, limit * 4);

  const [auditLogs, users, properties, reports, payments, reservations] = await Promise.all([
    AuditLog.find({})
      .populate("actorId", "name email role")
      .populate("targetUserId", "name email role")
      .sort({ createdAt: -1 })
      .limit(sampleSize)
      .lean(),
    User.find({})
      .select("_id name email role status provider createdAt")
      .sort({ createdAt: -1 })
      .limit(sampleSize)
      .lean(),
    Property.find({})
      .populate("createdBy", "name email role")
      .select("_id title location status propertyType listingType price createdAt createdBy")
      .sort({ createdAt: -1 })
      .limit(sampleSize)
      .lean(),
    Report.find({})
      .populate("propertyId", "title location")
      .populate("adId", "title location")
      .populate("reporterId", "name email role")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(sampleSize)
      .lean(),
    Payment.find({})
      .populate("propertyId", "title location")
      .populate("buyerId", "name email")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(sampleSize)
      .lean(),
    Reservation.find({})
      .populate("propertyId", "title location")
      .populate("userId", "name email")
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(sampleSize)
      .lean(),
  ]);

  const allItems = [
    ...auditLogs.map(mapAuditLog),
    ...users.map(mapUser),
    ...properties.map(mapProperty),
    ...reports.map(mapReport),
    ...payments.map(mapPayment),
    ...reservations.map(mapReservation),
  ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  const filtered = allItems.filter((item) => {
    if (sourceFilter && sourceFilter !== "all" && item.source !== sourceFilter) return false;
    if (categoryFilter && categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (statusFilter && statusFilter !== "all" && normalizeText(item.status) !== statusFilter) return false;
    if (search && !buildSearchText(item).includes(search)) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const items = filtered.slice(start, start + limit);
  const stats = buildActivityStats(filtered);

  return {
    items,
    total,
    page: safePage,
    limit,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    stats,
    filters: {
      source: sourceFilter || "all",
      category: categoryFilter || "all",
      status: statusFilter || "all",
      search: String(query?.search || ""),
    },
  };
}
