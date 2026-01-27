import { autoExpireReservations } from "../modules/payments/services/payment.services";

export function startReservationJobs() {
  // runs every 60 seconds
  setInterval(async () => {
    try {
      await autoExpireReservations();
    } catch (e) {
      console.error("Reservation auto-expire job failed:", e);
    }
  }, 60 * 1000);

  console.log("✅ Reservation jobs started (setInterval)");
}
