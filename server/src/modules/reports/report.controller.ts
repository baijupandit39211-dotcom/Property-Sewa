import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/apiError";
import reportService from "./report.service";
import {
  parseCreateReportInput,
  parseReportListFilters,
  parseUpdateReportInput,
} from "./report.validation";

function getAuthUserId(req: Request) {
  const user = (req as any).user as
    | { userId?: string; id?: string; _id?: string; payload?: { userId?: string; id?: string } }
    | undefined;

  return (
    user?.userId ||
    user?.id ||
    user?._id ||
    user?.payload?.userId ||
    user?.payload?.id ||
    null
  );
}

export async function createReport(req: Request, res: Response, next: NextFunction) {
  try {
    const reporterId = getAuthUserId(req);
    if (!reporterId) {
      throw new ApiError(401, "Unauthorized");
    }

    const report = await reportService.createReport(
      parseCreateReportInput(req.body || {}, reporterId)
    );

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listReports(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportService.listReports(parseReportListFilters(req.query));
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function getReportStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await reportService.getReportStats();
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    return next(error);
  }
}

export async function getReportById(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getReportById(String(req.params.id || ""));
    return res.status(200).json({ success: true, report });
  } catch (error) {
    return next(error);
  }
}

export async function updateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.updateReport(
      String(req.params.id || ""),
      parseUpdateReportInput(req.body || {})
    );

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function removePropertyFromReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const adminUserId = getAuthUserId(req);
    if (!adminUserId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { adminNote } = parseUpdateReportInput(req.body || {});
    const result = await reportService.removePropertyFromReport(
      String(req.params.id || ""),
      adminUserId,
      { adminNote }
    );

    return res.status(200).json({
      success: true,
      message: "Property removed from active listings",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function restorePropertyFromReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const adminUserId = getAuthUserId(req);
    if (!adminUserId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { adminNote } = parseUpdateReportInput(req.body || {});
    const result = await reportService.restorePropertyFromReport(
      String(req.params.id || ""),
      adminUserId,
      { adminNote }
    );

    return res.status(200).json({
      success: true,
      message: "Property restored to the public site",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}
