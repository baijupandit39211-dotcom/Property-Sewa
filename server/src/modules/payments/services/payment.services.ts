import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";
import Payment from "../../../models/Payment.model";
import Reservation from "../../../models/Reservation.model";
import {
  PROPERTY_RESERVATION_WINDOW_MS,
  assignPropertyReservation,
  clearPropertyReservation,
  expirePropertyReservationIfNeeded,
  expireStalePropertyReservations,
  getReservationBuyerId,
  isReservationActive,
  isReservationPaid,
} from "../../property/utils/reservation.utils";

export function calcAdvanceAmount(property: any) {
  const explicit = Number(property.advanceAmount || 0);
  if (explicit > 0) return explicit;

  if (String(property.listingType || "").toLowerCase() === "rent") {
    const dep = Number(property.deposit || 0);
    if (dep > 0) return dep;
    const mr = Number(property.monthlyRent || 0);
    return mr > 0 ? Math.round(mr * 0.2) : 0;
  }

  const price = Number(property.price || 0);
  return price > 0 ? Math.round(price * 0.02) : 0; // 2% fallback
}

export async function initiatePayment(params: {
  propertyId: string;
  buyerId: string;
  gateway: "khalti" | "esewa";
}) {
  console.log("[payments:initiate] start", {
    propertyId: params.propertyId,
    buyerId: params.buyerId,
    gateway: params.gateway,
  });

  const property = await Property.findOne({ _id: params.propertyId, status: "active" });
  if (!property) throw new ApiError(404, "Property not found");

  console.log("[payments:initiate] property-before-expire-check", {
    propertyId: String(property._id),
    reservationStatus: property.reservationStatus,
    reservationType: property.reservationType,
    reservedBy: property.reservedBy ? String(property.reservedBy) : null,
    reservationExpiresAt: property.reservationExpiresAt || null,
    reservedUntil: (property as any).reservedUntil || null,
  });

  await expirePropertyReservationIfNeeded(property);

  console.log("[payments:initiate] property-after-expire-check", {
    propertyId: String(property._id),
    reservationStatus: property.reservationStatus,
    reservationType: property.reservationType,
    reservedBy: property.reservedBy ? String(property.reservedBy) : null,
    reservationExpiresAt: property.reservationExpiresAt || null,
    reservedUntil: (property as any).reservedUntil || null,
  });

  if (isReservationActive(property) && getReservationBuyerId(property) !== String(params.buyerId)) {
    throw new ApiError(409, "This property is already reserved by another user");
  }

  if (isReservationPaid(property) && getReservationBuyerId(property) !== String(params.buyerId)) {
    throw new ApiError(409, "This property is already paid/reserved");
  }
  if (isReservationPaid(property) && getReservationBuyerId(property) === String(params.buyerId)) {
    throw new ApiError(409, "You have already completed payment for this property");
  }

  const amount = calcAdvanceAmount(property);
  if (!amount || amount <= 0) {
    throw new ApiError(400, "Advance amount is not set for this property");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PROPERTY_RESERVATION_WINDOW_MS);

  // Cancel old pending payments from same buyer/property (optional but good)
  await Payment.updateMany(
    { propertyId: property._id, buyerId: params.buyerId, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  // Create payment
  const payment = await Payment.create({
    propertyId: property._id,
    buyerId: params.buyerId,
    gateway: params.gateway,
    amount,
    status: "pending",
    expiresAt,
  });

  console.log("[payments:initiate] payment-created", {
    paymentId: String(payment._id),
    propertyId: String(payment.propertyId),
    buyerId: String(payment.buyerId),
    gateway: payment.gateway,
    amount: payment.amount,
    status: payment.status,
    expiresAt: payment.expiresAt,
  });

  const propertyAfter = await Property.findById(property._id).select(
    "reservationStatus reservationType reservedBy reservationExpiresAt reservedUntil updatedAt"
  );
  console.log("[payments:initiate] property-after-payment-create", {
    propertyId: String(property._id),
    reservationStatus: propertyAfter?.reservationStatus ?? null,
    reservationType: propertyAfter?.reservationType ?? null,
    reservedBy: propertyAfter?.reservedBy ? String(propertyAfter.reservedBy) : null,
    reservationExpiresAt: propertyAfter?.reservationExpiresAt ?? null,
    reservedUntil: (propertyAfter as any)?.reservedUntil ?? null,
    updatedAt: propertyAfter?.updatedAt ?? null,
  });

  return { payment, property, amount, expiresAt };
}

export async function markPaid(params: {
  paymentId: string;
  buyerId: string;
  gatewayRef?: any;
}) {
  const payment = await Payment.findById(params.paymentId);
  if (!payment) throw new ApiError(404, "Payment not found");

  // security: only owner can confirm
  if (String(payment.buyerId) !== String(params.buyerId)) {
    throw new ApiError(403, "Not allowed");
  }

  // already paid -> ok
  if (payment.status === "paid") return payment;

  // only pending can become paid
  if (payment.status !== "pending") {
    throw new ApiError(409, `Payment is ${payment.status}`);
  }

  // expired
  if (payment.expiresAt.getTime() < Date.now()) {
    payment.status = "expired";
    await payment.save();
    throw new ApiError(410, "Payment expired");
  }

  const property = await Property.findById(payment.propertyId);
  if (!property) throw new ApiError(404, "Property not found");

  await expirePropertyReservationIfNeeded(property);

  if (isReservationActive(property) && getReservationBuyerId(property) !== String(payment.buyerId)) {
    throw new ApiError(409, "Property is reserved by another user");
  }

  if (isReservationPaid(property) && getReservationBuyerId(property) !== String(payment.buyerId)) {
    throw new ApiError(409, "Property already paid by another user");
  }

  // mark payment paid
  payment.status = "paid";

  if (payment.gateway === "khalti") {
    payment.khalti_pidx = params.gatewayRef?.pidx || payment.khalti_pidx;
    payment.khalti_txnId = params.gatewayRef?.transaction_id || payment.khalti_txnId;
  } else {
    payment.esewa_refId = params.gatewayRef?.refId || payment.esewa_refId;
  }

  await payment.save();

  assignPropertyReservation(property, {
    buyerId: String(payment.buyerId),
    type: "ADVANCE",
    reservedAt: property.reservedAt || new Date(),
    status: "paid",
  });
  await property.save();

  await Reservation.updateMany(
    {
      propertyId: property._id,
      userId: payment.buyerId,
      paymentMethod: "COD",
      reservationStatus: "REQUESTED",
    },
    {
      $set: {
        reservationStatus: "CONFIRMED",
        paymentStatus: "PAID",
      },
    }
  );

  return payment;
}

export async function cancelReservation(params: { propertyId: string }) {
  const property = await Property.findById(params.propertyId);
  if (!property) throw new ApiError(404, "Property not found");

  await Payment.updateMany(
    { propertyId: property._id, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  clearPropertyReservation(property, "expired");
  await property.save();

  return property;
}

export async function autoExpireReservations() {
  const now = new Date();

  const expiredProps = await expireStalePropertyReservations(now);

  await Payment.updateMany(
    { status: "pending", expiresAt: { $lt: now } },
    { $set: { status: "expired" } }
  );

  await Reservation.updateMany(
    { reservationStatus: "REQUESTED", holdExpiresAt: { $lt: now } },
    { $set: { reservationStatus: "EXPIRED" } }
  );
  return { expiredProps };
}

export async function cleanupStaleOrWrongReservations(params?: {
  dryRun?: boolean;
  limit?: number;
}) {
  const dryRun = params?.dryRun !== false;
  const limit = Math.max(1, Math.min(Number(params?.limit || 500), 5000));
  const now = new Date();

  const candidates = await Property.find({
    reservationStatus: { $in: ["active", "reserved", "paid"] },
  })
    .sort({ updatedAt: -1 })
    .limit(limit);

  const toClear: typeof candidates = [];
  for (const property of candidates) {
    const paidPayment = await Payment.findOne({
      propertyId: property._id,
      status: "paid",
    })
      .select("_id")
      .lean();

    if (!paidPayment) {
      toClear.push(property);
    }
  }

  const propertyIds = toClear.map((property) => property._id);
  if (dryRun || propertyIds.length === 0) {
    return {
      dryRun: true,
      scanned: candidates.length,
      wouldClear: propertyIds.length,
      propertyIds: propertyIds.map((id) => String(id)),
      payments: {
        wouldExpirePending: propertyIds.length
          ? await Payment.countDocuments({
              propertyId: { $in: propertyIds },
              status: "pending",
              expiresAt: { $lt: now },
            })
          : 0,
        wouldCancelPending: propertyIds.length
          ? await Payment.countDocuments({
              propertyId: { $in: propertyIds },
              status: "pending",
              $or: [{ expiresAt: { $gte: now } }, { expiresAt: { $exists: false } }],
            })
          : 0,
      },
    };
  }

  for (const property of toClear) {
    clearPropertyReservation(property, "expired");
    await property.save();
  }

  const expiredResult = await Payment.updateMany(
    {
      propertyId: { $in: propertyIds },
      status: "pending",
      expiresAt: { $lt: now },
    },
    { $set: { status: "expired" } }
  );

  const cancelledResult = await Payment.updateMany(
    {
      propertyId: { $in: propertyIds },
      status: "pending",
      $or: [{ expiresAt: { $gte: now } }, { expiresAt: { $exists: false } }],
    },
    { $set: { status: "cancelled" } }
  );

  return {
    dryRun: false,
    scanned: candidates.length,
    cleared: propertyIds.length,
    propertyIds: propertyIds.map((id) => String(id)),
    payments: {
      expiredPending: Number(expiredResult.modifiedCount || 0),
      cancelledPending: Number(cancelledResult.modifiedCount || 0),
    },
  };
}
