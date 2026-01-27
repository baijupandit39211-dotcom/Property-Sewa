import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiError } from "../../../utils/apiError";
import * as paymentService from "../services/payment.services";

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || "";

// ✅ eSewa v2 configs
const ESEWA_PRODUCT_CODE =
  process.env.ESEWA_PRODUCT_CODE ||
  process.env.ESEWA_MERCHANT_CODE ||
  "";

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "";

const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://localhost:3000";


function hmacBase64(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

/**
 * ✅ eSewa v2 signature format:
 * message = "total_amount=XX.XX,transaction_uuid=UUID,product_code=PCODE"
 * signed_field_names = "total_amount,transaction_uuid,product_code"
 */
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

    // ---------------------------
    // ✅ KHALTI (skeleton)
    // ---------------------------
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

    // ---------------------------
    // ✅ ESEWA v2 (SIGNED FORM)
    // ---------------------------
    if (gateway === "esewa") {
      if (!ESEWA_PRODUCT_CODE) throw new ApiError(500, "ESEWA_PRODUCT_CODE missing");
      if (!ESEWA_SECRET_KEY) throw new ApiError(500, "ESEWA_SECRET_KEY missing");

      // ✅ must be unique per transaction (Mongo _id is perfect)
      const transaction_uuid = String(payment._id);

      // ✅ send as strings with 2 decimals
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
          // ✅ eSewa v2 required fields
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

    // ✅ TODO: verify with khalti, then markPaid
    const paid = await paymentService.markPaid({
      paymentId,
      buyerId,
      gatewayRef: { pidx, transaction_id },
    });

    return res.status(200).json({ success: true, payment: paid });
  } catch (err) {
    next(err);
  }
}

export async function esewaVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const { paymentId, refId } = req.body as any;
    if (!paymentId || !refId) throw new ApiError(400, "paymentId and refId are required");

    // ✅ TODO: verify with eSewa status API, then markPaid
    const paid = await paymentService.markPaid({
      paymentId,
      buyerId,
      gatewayRef: { refId },
    });

    return res.status(200).json({ success: true, payment: paid });
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
