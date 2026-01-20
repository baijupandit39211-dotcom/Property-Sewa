import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as leadController from "../controllers/lead.controller";

const router = Router();

// POST /leads (create inquiry - buyer-only)
router.post("/", requireUserAuth, leadController.createLead);

// GET /leads/mine (seller-only)
router.get("/mine", requireUserAuth, leadController.getMyLeads);

// GET /leads/my-inquiries (buyer-only)
router.get("/my-inquiries", requireUserAuth, leadController.getMyInquiries);

export default router;
