import { Router } from "express";
import { getMyGamification, getMyGamificationHistory } from "../controllers/gamification.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/me", getMyGamification);
router.get("/me/history", getMyGamificationHistory);

export default router;
