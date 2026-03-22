import Payment from "../../../models/Payment.model";
import Property from "../../../models/Property.model";
import PropertyView from "../../../models/PropertyView.model";
import Reservation from "../../../models/Reservation.model";
import User from "../../../models/User.model";
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
      topReportReasons: reportReasons.map((row: any) => ({
        reason: String(row?._id || "Other"),
        count: Number(row?.count || 0),
      })),
    },
  };
}
