import { ApiError } from "../../utils/apiError";

export const REPORT_REASONS = [
  "Harassment",
  "Unauthorized Sales",
  "Scam and Fake Product",
  "Nudity or Sexual Content",
  "Violence",
  "Other",
] as const;

export const REPORT_STATUSES = [
  "pending",
  "reviewed",
  "action_taken",
  "rejected",
] as const;

export const REPORT_ACTION_TYPES = [
  "none",
  "marked_reviewed",
  "report_rejected",
  "property_removed",
  "property_restored",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportActionType = (typeof REPORT_ACTION_TYPES)[number];

export type CreateReportInput = {
  propertyId: string;
  reporterId: string;
  reason: ReportReason;
  message?: string;
};

export type UpdateReportInput = {
  status?: ReportStatus;
  adminNote?: string;
  actionType?: ReportActionType;
};

export type ReportListFilters = {
  status?: ReportStatus;
  page: number;
  limit: number;
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const next = value.trim();
  if (!next) return undefined;
  return next.slice(0, maxLength);
}

function parseReason(value: unknown): ReportReason {
  if (typeof value !== "string") {
    throw new ApiError(400, "reason is required");
  }

  const reason = value.trim() as ReportReason;
  if (!REPORT_REASONS.includes(reason)) {
    throw new ApiError(400, "Invalid report reason");
  }

  return reason;
}

function parseStatus(value: unknown): ReportStatus | undefined {
  if (value === undefined || value === null || value === "" || value === "all") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "Invalid report status");
  }

  const status = value.trim() as ReportStatus;
  if (!REPORT_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid report status");
  }

  return status;
}

function parseActionType(value: unknown): ReportActionType | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "Invalid report action");
  }

  const raw = value.trim();
  const normalized = raw === "ad_removed" ? "property_removed" : raw;
  if (!REPORT_ACTION_TYPES.includes(normalized as ReportActionType)) {
    throw new ApiError(400, "Invalid report action");
  }

  return normalized as ReportActionType;
}

export function parseCreateReportInput(body: any, reporterId: string): CreateReportInput {
  const propertyIdRaw = body?.propertyId || body?.adId;
  const propertyId =
    typeof propertyIdRaw === "string" ? propertyIdRaw.trim() : String(propertyIdRaw || "").trim();

  if (!propertyId) {
    throw new ApiError(400, "propertyId is required");
  }

  return {
    propertyId,
    reporterId,
    reason: parseReason(body?.reason),
    message: sanitizeText(body?.message ?? body?.remarks, 1000),
  };
}

export function parseUpdateReportInput(body: any): UpdateReportInput {
  return {
    status: parseStatus(body?.status),
    adminNote: sanitizeText(body?.adminNote, 1000),
    actionType: parseActionType(body?.actionType ?? body?.action),
  };
}

export function parseReportListFilters(query: any): ReportListFilters {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query?.limit || 20)));

  return {
    status: parseStatus(query?.status),
    page,
    limit,
  };
}
