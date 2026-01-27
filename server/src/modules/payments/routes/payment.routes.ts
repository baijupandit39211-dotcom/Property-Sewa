import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";

import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import { requireRoles } from "../../../middleware/role.middleware";

const router = Router();

// buyer initiates payment
router.post("/initiate", requireUserAuth, paymentController.initiate);

// verify endpoints (buyer only)
router.post("/khalti/verify", requireUserAuth, paymentController.khaltiVerify);
router.post("/esewa/verify", requireUserAuth, paymentController.esewaVerify);

// cancel reservation (admin OR seller)
router.delete(
  "/reservation/:propertyId",
  requireUserAuth,
  requireRoles(["admin", "seller"]),
  paymentController.cancel
);

export default router;
