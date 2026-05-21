import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as leadController from "../controllers/lead.controller";
import { createRateLimit } from "../../../middleware/rateLimit.middleware";

const router = Router();

function envInt(name: string, fallback: number) {
  const parsed = Number(process.env[name] || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const inquiryRateLimit = createRateLimit({
  action: "property_inquiry",
  windowSeconds: envInt("RATE_LIMIT_INQUIRY_WINDOW_SECONDS", 3600),
  maxRequests: envInt("RATE_LIMIT_INQUIRY_MAX_REQUESTS", 30),
  message: "Too many inquiry submissions. Please try again later.",
  keyGenerator: (req) => String(req.user?.userId || req.body?.email || req.ip || "").trim().toLowerCase(),
});

// POST /leads (create inquiry - buyer-only)
router.post("/", requireUserAuth, inquiryRateLimit, leadController.createLead);

// GET /leads/mine (seller-only)
router.get("/mine", requireUserAuth, leadController.getMyLeads);

// GET /leads/my-inquiries (buyer-only)
router.get("/my-inquiries", requireUserAuth, leadController.getMyInquiries);

// GET /leads/:leadId
router.get("/:leadId", requireUserAuth, leadController.getLeadById);

// PATCH /leads/:leadId/status
router.patch("/:leadId/status", requireUserAuth, leadController.updateLeadStatus);

export default router;
