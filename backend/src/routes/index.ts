import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import nutritionRoutes from "./nutrition.routes";
import profileRoutes from "./profile.routes";
import progressRoutes from "./progress.routes";
import userRoutes from "./user.routes";
import workoutRoutes from "./workout.routes";

const router = Router();

// Phase 2 Step 4 adds: /progress
// Later steps/phases add: /exercises, /achievements, /challenges,
// /leaderboards, /posts, /comments, /likes, /follows, /notifications, /ai,
// /admin
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/profiles", profileRoutes);
router.use("/workouts", workoutRoutes);
router.use("/nutrition", nutritionRoutes);
router.use("/progress", progressRoutes);

export default router;
