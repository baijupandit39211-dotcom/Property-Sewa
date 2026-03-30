import type { NextFunction, Request, Response } from "express";
import * as adminOverviewService from "../services/adminOverview.services";

export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await adminOverviewService.getAdminOverview();
    return res.status(200).json({ success: true, ...overview });
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
