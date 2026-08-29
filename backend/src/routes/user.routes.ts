import { Router } from "express";
import { getMe } from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// Any authenticated user (USER or ADMIN) can read their own profile.
router.get("/me", authenticate, authorize("USER", "ADMIN"), getMe);

export default router;
