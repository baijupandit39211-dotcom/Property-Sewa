import { Router } from "express";
import { createContactMessage } from "../controllers/contact.controller";
import { createRateLimit } from "../../../middleware/rateLimit.middleware";

const router = Router();

function envInt(name: string, fallback: number) {
  const parsed = Number(process.env[name] || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const contactRateLimit = createRateLimit({
  action: "contact_form",
  windowSeconds: envInt("RATE_LIMIT_CONTACT_WINDOW_SECONDS", 3600),
  maxRequests: envInt("RATE_LIMIT_CONTACT_MAX_REQUESTS", 20),
  message: "Too many contact form submissions. Please try again later.",
  keyGenerator: (req) => String(req.body?.email || req.ip || "").trim().toLowerCase(),
});

router.post("/", contactRateLimit, createContactMessage);

export default router;
