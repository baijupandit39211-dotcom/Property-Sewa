import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as wishlistController from "../controllers/wishlist.controller";

const router = Router();

router.get("/", requireUserAuth, wishlistController.getMyWishlist);
router.post("/", requireUserAuth, wishlistController.addMyWishlist);
router.delete("/:propertyId", requireUserAuth, wishlistController.removeMyWishlist);
router.get("/check/:propertyId", requireUserAuth, wishlistController.checkMyWishlist);

export default router;
