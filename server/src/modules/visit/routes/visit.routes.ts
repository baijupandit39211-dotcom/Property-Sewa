import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as visitController from "../controllers/visit.controller";

const router = Router();

// Buyer contract
router.get("/my", requireUserAuth, visitController.getMyVisits);
router.get("/property/:propertyId/status", requireUserAuth, visitController.getPropertyVisitStatus);
router.post("/", requireUserAuth, visitController.createVisit);
router.patch("/:id/cancel", requireUserAuth, visitController.cancelVisit);
router.patch("/:id/request-reschedule", requireUserAuth, visitController.requestVisitReschedule);

// Seller contract (works when mounted as /api/seller/visits and also /visits)
router.get("/", requireUserAuth, visitController.getSellerVisits);
router.patch("/:id/approve", requireUserAuth, visitController.approveVisit);
router.patch("/:id/reject", requireUserAuth, visitController.rejectVisit);
router.patch("/:id/reschedule", requireUserAuth, visitController.rescheduleVisit);
router.patch("/:id/complete", requireUserAuth, visitController.completeVisit);

// Backward-compatible existing routes
router.post("/lead/:leadId", requireUserAuth, visitController.createVisitFromLead);
router.get("/my-visits", requireUserAuth, visitController.getBuyerVisits);
router.get("/:id", requireUserAuth, visitController.getVisitById);
router.put("/:id", requireUserAuth, visitController.updateVisit);
router.delete("/:id", requireUserAuth, visitController.deleteVisit);

export default router;
