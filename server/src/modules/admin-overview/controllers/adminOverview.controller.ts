import type { NextFunction, Request, Response } from "express";
import * as adminOverviewService from "../services/adminOverview.services";
import { logDevTiming, nowMs, payloadSizeBytes } from "../../../utils/devTiming";

export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  const started = nowMs();
  try {
    const overview = await adminOverviewService.getAdminOverview();
    const payload = { success: true, ...overview };
    logDevTiming("GET /api/admin/overview", {
      totalMs: Number((nowMs() - started).toFixed(2)),
      payloadBytes: payloadSizeBytes(payload),
      pendingListings: overview?.lists?.pendingListings?.length ?? 0,
      recentReports: overview?.lists?.recentReports?.length ?? 0,
      recentPayments: overview?.lists?.recentPayments?.length ?? 0,
      recentUsers: overview?.lists?.recentUsers?.length ?? 0,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const activity = await adminOverviewService.getAdminActivity(req.query);
    return res.status(200).json({ success: true, ...activity });
  } catch (error) {
    return next(error);
  }
}
