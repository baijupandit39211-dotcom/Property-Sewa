import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import { createCodReservation, listBuyerReservations } from "../services/reservation.services";

export async function createCod(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { propertyId, fullName, phone, message, preferredVisitDate } = req.body || {};

    const reservation = await createCodReservation({
      propertyId,
      userId,
      fullName,
      phone,
      message,
      preferredVisitDate,
    });

    return res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    return next(err);
  }
}

export async function listMy(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const reservations = await listBuyerReservations(userId);
    return res.status(200).json({ success: true, data: reservations });
  } catch (err) {
    return next(err);
  }
}
