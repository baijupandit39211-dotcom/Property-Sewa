import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";
import Payment from "../../../models/Payment.model";

function calcAdvanceAmount(property: any) {
  const explicit = Number(property.advanceAmount || 0);
  if (explicit > 0) return explicit;

  if (property.listingType === "rent") {
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
  const property = await Property.findOne({ _id: params.propertyId, status: "active" });
  if (!property) throw new ApiError(404, "Property not found");

  // If someone else reserved and it's not expired
  if (
    property.reservationStatus === "reserved" &&
    property.reservedUntil &&
    property.reservedUntil.getTime() > Date.now() &&
    property.reservedBy &&
    String(property.reservedBy) !== String(params.buyerId)
  ) {
    throw new ApiError(409, "This property is already reserved by another user");
  }

  // If already paid
  if (property.reservationStatus === "paid") {
    throw new ApiError(409, "This property is already paid/reserved");
  }

  const amount = calcAdvanceAmount(property);
  if (!amount || amount <= 0) throw new ApiError(400, "Advance amount is not set for this property");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // cancel old pending payments from same buyer/property if you want (optional)
  await Payment.updateMany(
    { propertyId: property._id, buyerId: params.buyerId, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  const payment = await Payment.create({
    propertyId: property._id,
    buyerId: params.buyerId,
    gateway: params.gateway,
    amount,
    status: "pending",
    expiresAt,
  });

  // mark property reserved
  property.reservationStatus = "reserved";
  property.reservedBy = params.buyerId as any;
  property.reservedUntil = expiresAt;
  await property.save();

  return { payment, property, amount, expiresAt };
}

export async function markPaid(params: {
  paymentId: string;
  buyerId: string; // ✅ security
  gatewayRef?: any;
}) {
  const payment = await Payment.findById(params.paymentId);
  if (!payment) throw new ApiError(404, "Payment not found");

  // ✅ security: only owner can confirm
  if (String(payment.buyerId) !== String(params.buyerId)) {
    throw new ApiError(403, "Not allowed");
  }

  if (payment.status === "paid") return payment;

  if (payment.status !== "pending") {
    throw new ApiError(409, `Payment is ${payment.status}`);
  }

  if (payment.expiresAt.getTime() < Date.now()) {
    payment.status = "expired";
    await payment.save();
    throw new ApiError(410, "Payment expired");
  }

  payment.status = "paid";

  if (payment.gateway === "khalti") {
    payment.khalti_pidx = params.gatewayRef?.pidx || payment.khalti_pidx;
    payment.khalti_txnId = params.gatewayRef?.transaction_id || payment.khalti_txnId;
  } else {
    payment.esewa_refId = params.gatewayRef?.refId || payment.esewa_refId;
  }

  await payment.save();

  // set property paid
  const property = await Property.findById(payment.propertyId);
  if (property) {
    property.reservationStatus = "paid";
    property.reservedBy = payment.buyerId as any;
    property.reservedUntil = null;
    await property.save();
  }

  return payment;
}

export async function cancelReservation(params: { propertyId: string }) {
  const property = await Property.findById(params.propertyId);
  if (!property) throw new ApiError(404, "Property not found");

  // cancel any pending payments for this property
  await Payment.updateMany(
    { propertyId: property._id, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  property.reservationStatus = "cancelled";
  property.reservedBy = null as any;
  property.reservedUntil = null;
  await property.save();

  return property;
}

export async function autoExpireReservations() {
  const now = new Date();

  await Payment.updateMany(
    { status: "pending", expiresAt: { $lt: now } },
    { $set: { status: "expired" } }
  );

  const expiredProps = await Property.find({
    reservationStatus: "reserved",
    reservedUntil: { $lt: now },
  });

  for (const p of expiredProps) {
    p.reservationStatus = "expired";
    p.reservedBy = null as any;
    p.reservedUntil = null;
    await p.save();
  }

  return { expiredProps: expiredProps.length };
}
