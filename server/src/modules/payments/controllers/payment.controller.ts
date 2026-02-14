import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiError } from "../../../utils/apiError";
import * as paymentService from "../services/payment.services";
import Payment from "../../../models/Payment.model";
import Property from "../../../models/Property.model";

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || "";

// eSewa v2 configs
const ESEWA_PRODUCT_CODE =
  process.env.ESEWA_PRODUCT_CODE || process.env.ESEWA_MERCHANT_CODE || "";

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "";
const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://localhost:3000";

function hmacBase64(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

function buildEsewaSignature(params: {
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
}) {
  const msg = `total_amount=${params.total_amount},transaction_uuid=${params.transaction_uuid},product_code=${params.product_code}`;
  return hmacBase64(msg, ESEWA_SECRET_KEY);
}

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const { propertyId, gateway } = req.body as {
      propertyId: string;
      gateway: "khalti" | "esewa";
    };

    if (!propertyId || !gateway) {
      throw new ApiError(400, "propertyId and gateway are required");
    }

    const { payment, amount, expiresAt } = await paymentService.initiatePayment({
      propertyId,
      buyerId,
      gateway,
    });

    if (gateway === "khalti") {
      if (!KHALTI_SECRET_KEY) throw new ApiError(500, "KHALTI_SECRET_KEY missing");

      return res.status(200).json({
        success: true,
        gateway,
        paymentId: String(payment._id),
        amount,
        expiresAt,
      });
    }

    if (gateway === "esewa") {
      if (!ESEWA_PRODUCT_CODE) throw new ApiError(500, "ESEWA_PRODUCT_CODE missing");
      if (!ESEWA_SECRET_KEY) throw new ApiError(500, "ESEWA_SECRET_KEY missing");

      const transaction_uuid = String(payment._id);
      const total_amount = Number(amount).toFixed(2);

      const success_url = `${FRONTEND_BASE}/buyer/payment/esewa/success?pid=${transaction_uuid}`;
      const failure_url = `${FRONTEND_BASE}/buyer/payment/esewa/failure?pid=${transaction_uuid}`;

      const signed_field_names = "total_amount,transaction_uuid,product_code";
      const signature = buildEsewaSignature({
        total_amount,
        transaction_uuid,
        product_code: ESEWA_PRODUCT_CODE,
      });

      return res.status(200).json({
        success: true,
        gateway,
        paymentId: transaction_uuid,
        amount,
        expiresAt,
        esewa: {
          amount: total_amount,
          tax_amount: "0.00",
          total_amount,
          transaction_uuid,
          product_code: ESEWA_PRODUCT_CODE,
          product_service_charge: "0.00",
          product_delivery_charge: "0.00",
          success_url,
          failure_url,
          signed_field_names,
          signature,
        },
      });
    }

    throw new ApiError(400, "Invalid gateway");
  } catch (err) {
    next(err);
  }
}

export async function khaltiVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const { paymentId, pidx, transaction_id } = req.body as any;
    if (!paymentId) throw new ApiError(400, "paymentId is required");

    const payment = await paymentService.markPaid({
      paymentId,
      buyerId,
      gatewayRef: { pidx, transaction_id },
    });

    const property = await Property.findById(payment.propertyId);

    return res.status(200).json({
      success: true,
      payment,
      property,
      propertyId: String(property?._id || ""),
      reservationStatus: property?.reservationStatus,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ✅ FIXED: no longer requires refId
 * Accepts:
 * - { paymentId } OR { pid }
 * - optional { data } (if you choose to forward eSewa callback payload)
 */
export async function esewaVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const body = (req.body || {}) as any;
    const data = body.data ?? null;

    const paymentId =
      String(body.paymentId || "").trim() ||
      String(body.pid || "").trim() ||
      String(data?.transaction_uuid || "").trim() ||
      String(data?.transactionUuid || "").trim();

    if (!paymentId) {
      throw new ApiError(
        400,
        "Missing paymentId/pid. Send { paymentId } or { pid } (or include data.transaction_uuid)."
      );
    }

    // optional refId (best effort)
    const refId =
      body.refId ||
      body.reference_id ||
      data?.refId ||
      data?.reference_id ||
      data?.referenceId ||
      "";

    // ensure payment exists
    const existing = await Payment.findById(paymentId);
    if (!existing) throw new ApiError(404, "Payment not found");

    // TODO: call real eSewa status API here, then only markPaid if success
    const payment = await paymentService.markPaid({
      paymentId,
      buyerId,
      gatewayRef: { refId },
    });

    const property = await Property.findById(payment.propertyId);

    return res.status(200).json({
      success: true,
      message: "eSewa payment marked paid (status API verify TODO).",
      payment,
      property,
      propertyId: String(property?._id || ""),
      reservationStatus: property?.reservationStatus,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const propertyId = req.params.propertyId;
    if (!propertyId) throw new ApiError(400, "propertyId required");

    const updated = await paymentService.cancelReservation({ propertyId });
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    next(err);
  }
}
