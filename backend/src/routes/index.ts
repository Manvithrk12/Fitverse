import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import profileRoutes from "./profile.routes";
import userRoutes from "./user.routes";

const router = Router();

// Phase 2 Step 1 adds: /profiles
// Later steps/phases add: /exercises, /workouts, /nutrition, /progress,
// /achievements, /challenges, /leaderboards, /posts, /comments, /likes,
// /follows, /notifications, /ai, /admin
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/profiles", profileRoutes);

export default router;
