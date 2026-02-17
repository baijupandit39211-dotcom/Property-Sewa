import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as reservationController from "../controllers/reservation.controller";

const router = Router();

// POST /reservations/cod
router.post("/cod", requireUserAuth, reservationController.createCod);

// GET /reservations/my
router.get("/my", requireUserAuth, reservationController.listMy);

export default router;
