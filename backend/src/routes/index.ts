import { Router } from "express";
import healthRoutes from "./health.routes";

const router = Router();

// Phase 0: only the health module is wired up.
// Later phases add: /auth, /users, /profiles, /exercises, /workouts,
// /nutrition, /progress, /achievements, /challenges, /leaderboards,
// /posts, /comments, /likes, /follows, /notifications, /ai, /admin
router.use("/health", healthRoutes);

export default router;
