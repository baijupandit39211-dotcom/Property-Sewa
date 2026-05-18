import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import https from "https";
import { ApiError } from "../../../utils/apiError";
import * as paymentService from "../services/payment.services";
import Payment from "../../../models/Payment.model";
import Property from "../../../models/Property.model";

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || "";
const KHALTI_INITIATE_URL =
  process.env.KHALTI_INITIATE_URL || "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL =
  process.env.KHALTI_LOOKUP_URL || "https://a.khalti.com/api/v2/epayment/lookup/";

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

function cleanToken(value: any) {
  return String(value || "").split("?")[0].split("&")[0].trim();
}

function verifyEsewaCallbackSignature(data: any) {
  const signedFieldNames = String(data?.signed_field_names || "").trim();
  const signature = String(data?.signature || "").trim();
  if (!signedFieldNames || !signature) return false;

  const fields = signedFieldNames
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (!fields.length) return false;

  const message = fields
    .map((field) => `${field}=${String(data?.[field] ?? "")}`)
    .join(",");

  const expected = hmacBase64(message, ESEWA_SECRET_KEY);
  return expected === signature;
}

async function postJson<T = any>(urlString: string, body: Record<string, any>, headers: Record<string, string>) {
  const payload = JSON.stringify(body);
  const url = new URL(urlString);

  return new Promise<T>((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const statusCode = Number(res.statusCode || 500);
          let parsed: any = null;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            parsed = { raw };
          }
          if (statusCode < 200 || statusCode >= 300) {
            return reject(new ApiError(statusCode, parsed?.detail || parsed?.message || "Gateway request failed"));
          }
          resolve(parsed as T);
        });
      }
    );

    // Prevent hung gateway requests from blocking verify forever.
    req.setTimeout(7000, () => {
      req.destroy(new ApiError(504, "Khalti gateway timeout"));
    });

    req.on("error", (error: any) => {
      if (error instanceof ApiError) return reject(error);
      if (String(error?.message || "").toLowerCase().includes("timeout")) {
        return reject(new ApiError(504, "Khalti gateway timeout"));
      }
      reject(error);
    });
    req.write(payload);
    req.end();
  });
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

      const purchase_order_id = String(payment._id);
      const purchase_order_name = String((payment as any)?.propertyId || propertyId);
      const amountPaisa = Math.round(Number(amount) * 100);

      const return_url = `${FRONTEND_BASE}/buyer/payment/khalti/success?purchase_order_id=${encodeURIComponent(
        purchase_order_id
      )}`;
      const website_url = FRONTEND_BASE;

      const khalti = await postJson<any>(
        KHALTI_INITIATE_URL,
        {
          return_url,
          website_url,
          amount: amountPaisa,
          purchase_order_id,
          purchase_order_name,
        },
        {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
        }
      );

      return res.status(200).json({
        success: true,
        gateway,
        paymentId: String(payment._id),
        amount,
        expiresAt,
        khalti: {
          pidx: khalti?.pidx || "",
          payment_url: khalti?.payment_url || "",
          expires_at: khalti?.expires_at || null,
          expires_in: khalti?.expires_in || null,
        },
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
    const startedAt = Date.now();
    const buyerId = req.user?.userId;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const { paymentId, pidx, transaction_id } = req.body as any;
    console.log("[khaltiVerify] received", {
      buyerId: String(buyerId || ""),
      paymentId: String(paymentId || ""),
      pidx: String(pidx || ""),
    });

    if (!paymentId || !pidx) throw new ApiError(400, "paymentId and pidx are required");
    if (!KHALTI_SECRET_KEY) throw new ApiError(500, "KHALTI_SECRET_KEY missing");

    const existing = await Payment.findById(String(paymentId));
    if (!existing) throw new ApiError(404, "Payment not found");
    if (String(existing.buyerId) !== String(buyerId)) throw new ApiError(403, "Not allowed");
    if (String(existing.status || "").toLowerCase() === "paid") {
      const propertyPaid = await Property.findById(existing.propertyId);
      console.log("[khaltiVerify] before-response", {
        elapsedMs: Date.now() - startedAt,
        paymentId: String(existing?._id || ""),
        paymentStatus: String(existing?.status || ""),
        propertyId: String(propertyPaid?._id || ""),
        reservationStatus: String(propertyPaid?.reservationStatus || ""),
        source: "db-already-paid-prelookup",
      });
      return res.status(200).json({
        success: true,
        payment: existing,
        property: propertyPaid,
        propertyId: String(propertyPaid?._id || ""),
        reservationStatus: propertyPaid?.reservationStatus,
        paymentStatus: "paid",
      });
    }

    console.log("[khaltiVerify] before-lookup", {
      paymentId: String(paymentId || ""),
      pidx: String(pidx || ""),
    });
    let lookup: any;
    try {
      lookup = await postJson<any>(
        KHALTI_LOOKUP_URL,
        { pidx: String(pidx) },
        { Authorization: `Key ${KHALTI_SECRET_KEY}` }
      );
    } catch (lookupErr: any) {
      const latest = await Payment.findById(String(paymentId));
      if (
        latest &&
        String(latest.buyerId) === String(buyerId) &&
        String(latest.status || "").toLowerCase() === "paid"
      ) {
        const propertyPaid = await Property.findById(latest.propertyId);
        console.log("[khaltiVerify] before-response", {
          elapsedMs: Date.now() - startedAt,
          paymentId: String(latest?._id || ""),
          paymentStatus: String(latest?.status || ""),
          propertyId: String(propertyPaid?._id || ""),
          reservationStatus: String(propertyPaid?.reservationStatus || ""),
          source: "db-already-paid-post-lookup-error",
          lookupError: String(lookupErr?.message || lookupErr || ""),
        });
        return res.status(200).json({
          success: true,
          payment: latest,
          property: propertyPaid,
          propertyId: String(propertyPaid?._id || ""),
          reservationStatus: propertyPaid?.reservationStatus,
          paymentStatus: "paid",
        });
      }
      throw lookupErr;
    }
    console.log("[khaltiVerify] after-lookup", {
      elapsedMs: Date.now() - startedAt,
      status: String(lookup?.status || ""),
      purchase_order_id: String(lookup?.purchase_order_id || ""),
      pidx: String(lookup?.pidx || ""),
      amount: Number(lookup?.total_amount || lookup?.amount || 0),
    });

    const status = String(lookup?.status || "").toLowerCase();
    if (status !== "completed") {
      const statusCode = String(lookup?.status || "UNKNOWN")
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .toUpperCase();
      throw new ApiError(
        409,
        `KHALTI_STATUS_${statusCode}: ${lookup?.detail || "Payment received, waiting for confirmation"}`
      );
    }

    const lookupPidx = String(lookup?.pidx || "").trim();
    if (!lookupPidx || lookupPidx !== String(pidx).trim()) {
      throw new ApiError(409, "Khalti pidx mismatch");
    }

    const lookupOrderId = String(lookup?.purchase_order_id || "").trim();
    // NOTE:
    // Khalti sandbox lookup may return an empty purchase_order_id even for completed payments.
    // Enforce strict order-id match only when purchase_order_id is present.
    if (lookupOrderId && lookupOrderId !== String(paymentId).trim()) {
      throw new ApiError(409, "Khalti purchase order mismatch");
    }

    const lookupAmountPaisa = Number(lookup?.total_amount || lookup?.amount || 0);
    const expectedAmountPaisa = Math.round(Number(existing.amount || 0) * 100);
    if (!Number.isFinite(lookupAmountPaisa) || lookupAmountPaisa <= 0) {
      throw new ApiError(409, "Invalid Khalti amount");
    }
    if (lookupAmountPaisa !== expectedAmountPaisa) {
      throw new ApiError(409, "Khalti amount mismatch");
    }

    const payment = await paymentService.markPaid({
      paymentId,
      buyerId,
      gatewayRef: {
        pidx: String(pidx),
        transaction_id: String(transaction_id || lookup?.transaction_id || lookup?.transactionId || ""),
      },
    });

    const property = await Property.findById(payment.propertyId);
    console.log("[khaltiVerify] before-response", {
      elapsedMs: Date.now() - startedAt,
      paymentId: String(payment?._id || ""),
      paymentStatus: String(payment?.status || ""),
      propertyId: String(property?._id || ""),
      reservationStatus: String(property?.reservationStatus || ""),
    });

    return res.status(200).json({
      success: true,
      payment,
      property,
      propertyId: String(property?._id || ""),
      reservationStatus: property?.reservationStatus,
      paymentStatus: String(payment?.status || ""),
    });
  } catch (err) {
    next(err);
  }
}

export async function paymentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const paymentId = String(req.params?.paymentId || "").trim();
    if (!paymentId) throw new ApiError(400, "paymentId is required");

    const payment = await Payment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Payment not found");
    if (String(payment.buyerId) !== String(buyerId)) throw new ApiError(403, "Not allowed");

    const property = await Property.findById(payment.propertyId);
    const paymentStatus = String(payment.status || "").toLowerCase();
    const reservationStatus = String(property?.reservationStatus || "").toLowerCase();

    return res.status(200).json({
      success: paymentStatus === "paid" || reservationStatus === "paid",
      payment,
      property,
      propertyId: String(property?._id || ""),
      paymentStatus,
      reservationStatus,
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
    if (!ESEWA_SECRET_KEY) throw new ApiError(500, "ESEWA_SECRET_KEY missing");

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

    if (!data || typeof data !== "object") {
      throw new ApiError(400, "Missing eSewa callback data for verification");
    }

    const status = String(data?.status || "").toUpperCase();
    if (status !== "COMPLETE") {
      throw new ApiError(409, `eSewa status is ${status || "UNKNOWN"}, not COMPLETE`);
    }

    const callbackTxnId = cleanToken(data?.transaction_uuid || data?.transactionUuid);
    const cleanPaymentId = cleanToken(paymentId);
    if (!callbackTxnId || callbackTxnId !== cleanPaymentId) {
      throw new ApiError(400, "transaction_uuid does not match paymentId");
    }

    const signatureOk = verifyEsewaCallbackSignature(data);
    if (!signatureOk) {
      throw new ApiError(400, "Invalid eSewa callback signature");
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

    const callbackAmount = Number(data?.total_amount || data?.amount || 0);
    if (!Number.isFinite(callbackAmount) || callbackAmount <= 0) {
      throw new ApiError(400, "Invalid eSewa callback amount");
    }
    if (Number(existing.amount).toFixed(2) !== callbackAmount.toFixed(2)) {
      throw new ApiError(409, "eSewa callback amount mismatch");
    }

    const payment = await paymentService.markPaid({
      paymentId,
      buyerId,
      gatewayRef: { refId },
    });

    const property = await Property.findById(payment.propertyId);

    return res.status(200).json({
      success: true,
      message: "eSewa payment verified and marked paid.",
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

export async function cleanupStaleReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const dryRun = req.body?.dryRun !== false;
    const limitRaw = Number(req.body?.limit || 500);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 500;

    const result = await paymentService.cleanupStaleOrWrongReservations({
      dryRun,
      limit,
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    next(err);
  }
}
