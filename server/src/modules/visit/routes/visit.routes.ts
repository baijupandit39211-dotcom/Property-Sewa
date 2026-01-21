import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as visitController from "../controllers/visit.controller";

const router = Router();

// POST /visits (create visit request - buyer)
router.post("/", requireUserAuth, visitController.createVisit);

// GET /visits (seller's visits with filtering)
router.get("/", requireUserAuth, visitController.getSellerVisits);

// GET /visits/my-visits (buyer's visits)
router.get("/my-visits", requireUserAuth, visitController.getBuyerVisits);

// GET /visits/:id (get visit by ID)
router.get("/:id", requireUserAuth, visitController.getVisitById);

// PUT /visits/:id (update visit - seller only)
router.put("/:id", requireUserAuth, visitController.updateVisit);

// DELETE /visits/:id (delete visit request - buyer only)
router.delete("/:id", requireUserAuth, visitController.deleteVisit);

export default router;
