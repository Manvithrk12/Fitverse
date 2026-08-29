import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import userRoutes from "./user.routes";

const router = Router();

// Phase 1 wires up: /health, /auth, /users
// Later phases add: /profiles, /exercises, /workouts, /nutrition, /progress,
// /achievements, /challenges, /leaderboards, /posts, /comments, /likes,
// /follows, /notifications, /ai, /admin
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;
