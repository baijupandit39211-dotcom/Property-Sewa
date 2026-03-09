import { Types } from "mongoose";
import Property from "../../models/Property.model";
import { ApiError } from "../../utils/apiError";
import propertyService from "../property/services/property.services";
import Report from "./report.model";
import type {
  ReportActionType,
  CreateReportInput,
  ReportListFilters,
  UpdateReportInput,
} from "./report.validation";

function ensureObjectId(value: string, label: string) {
  if (!Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
}

function populateReportQuery(query: any) {
  return query
    .populate("propertyId", "title price location status createdBy")
    .populate("adId", "title price location status createdBy")
    .populate("reporterId", "name email role phone")
    .populate("sellerId", "name email role phone");
}

async function getPopulatedReportById(reportId: string) {
  const report = await populateReportQuery(Report.findById(reportId));
  if (!report) {
    throw new ApiError(404, "Report not found");
  }
  return report;
}

async function createReport(input: CreateReportInput) {
  ensureObjectId(input.propertyId, "propertyId");
  ensureObjectId(input.reporterId, "reporterId");

  const property = await Property.findById(input.propertyId).select(
    "_id title location status createdBy"
  );
  if (!property) {
    throw new ApiError(404, "Property not found");
  }

  const duplicate = await Report.findOne({
    $or: [{ propertyId: property._id }, { adId: property._id }],
    reporterId: input.reporterId,
  });
  if (duplicate) {
    throw new ApiError(409, "You have already reported this property");
  }

  try {
    const report = await Report.create({
      propertyId: property._id,
      adId: property._id,
      sellerId: property.createdBy ?? null,
      reporterId: input.reporterId,
      reason: input.reason,
      remarks: input.message || "",
    });

    return getPopulatedReportById(String(report._id));
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ApiError(409, "You have already reported this property");
    }
    throw error;
  }
}

async function listReports(filters: ReportListFilters) {
  const query: Record<string, unknown> = {};
  if (filters.status) {
    query.status = filters.status;
  }

  const skip = (filters.page - 1) * filters.limit;
  const [items, total] = await Promise.all([
    populateReportQuery(
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit)
    ),
    Report.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

async function getReportById(reportId: string) {
  ensureObjectId(reportId, "report id");
  return getPopulatedReportById(reportId);
}

async function getReportStats() {
  const [total, pending, reviewed, actionTaken, rejected, byReasonRaw, recent] =
    await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "reviewed" }),
      Report.countDocuments({ status: "action_taken" }),
      Report.countDocuments({ status: "rejected" }),
      Report.aggregate([
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      populateReportQuery(Report.find({}).sort({ createdAt: -1 }).limit(5)),
    ]);

  return {
    total,
    pending,
    reviewed,
    actionTaken,
    rejected,
    byReason: byReasonRaw.map((row: any) => ({
      reason: String(row?._id || "Other"),
      count: Number(row?.count || 0),
    })),
    recent,
  };
}

function resolveAutoAction(
  status: UpdateReportInput["status"],
  currentAction: string
): ReportActionType | undefined {
  if (status === "reviewed" && currentAction === "none") return "marked_reviewed";
  if (status === "rejected") return "report_rejected";
  return undefined;
}

async function updateReport(reportId: string, updates: UpdateReportInput) {
  ensureObjectId(reportId, "report id");

  const report = await Report.findById(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  const nextAction = updates.actionType || resolveAutoAction(updates.status, report.action);
  let touched = false;

  if (updates.status && updates.status !== report.status) {
    report.status = updates.status;
    touched = true;
  }

  if (updates.adminNote !== undefined && updates.adminNote !== report.adminNote) {
    report.adminNote = updates.adminNote;
    touched = true;
  }

  if (nextAction && nextAction !== report.action) {
    report.action = nextAction;
    touched = true;
  }

  if (!touched) {
    throw new ApiError(400, "No fields to update");
  }

  await report.save();
  return getPopulatedReportById(reportId);
}

async function removePropertyFromReport(
  reportId: string,
  adminUserId: string,
  updates: Pick<UpdateReportInput, "adminNote"> = {}
) {
  ensureObjectId(reportId, "report id");
  ensureObjectId(adminUserId, "admin user id");

  const report = await Report.findById(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  const propertyId = String(report.propertyId || report.adId || "");
  if (!propertyId) {
    throw new ApiError(404, "Property not found for this report");
  }

  const property = await propertyService.rejectProperty(propertyId, adminUserId);

  const setData: Record<string, unknown> = {
    status: "action_taken",
    action: "property_removed",
  };
  if (updates.adminNote !== undefined) {
    setData.adminNote = updates.adminNote;
  }

  await Report.updateMany(
    { $or: [{ propertyId }, { adId: propertyId }] },
    { $set: setData }
  );

  return {
    property,
    report: await getPopulatedReportById(reportId),
  };
}

async function restorePropertyFromReport(
  reportId: string,
  adminUserId: string,
  updates: Pick<UpdateReportInput, "adminNote"> = {}
) {
  ensureObjectId(reportId, "report id");
  ensureObjectId(adminUserId, "admin user id");

  const report = await Report.findById(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  const propertyId = String(report.propertyId || report.adId || "");
  if (!propertyId) {
    throw new ApiError(404, "Property not found for this report");
  }

  const property = await propertyService.restoreProperty(propertyId, adminUserId);

  const setData: Record<string, unknown> = {
    status: "action_taken",
    action: "property_restored",
  };
  if (updates.adminNote !== undefined) {
    setData.adminNote = updates.adminNote;
  }

  await Report.updateMany(
    { $or: [{ propertyId }, { adId: propertyId }] },
    { $set: setData }
  );

  return {
    property,
    report: await getPopulatedReportById(reportId),
  };
}

export default {
  createReport,
  listReports,
  getReportById,
  getReportStats,
  updateReport,
  removePropertyFromReport,
  restorePropertyFromReport,
};
