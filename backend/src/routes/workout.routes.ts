import { Router } from "express";
import {
  completeWorkout,
  createWorkout,
  deleteWorkout,
  getWorkout,
  listWorkouts,
  updateWorkout,
} from "../controllers/workout.controller";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import { workoutInputSchema } from "../validators/workout.validators";

const router = Router();

router.use(authenticate);

router.get("/", listWorkouts);
router.post("/", validateBody(workoutInputSchema), createWorkout);
router.get("/:id", getWorkout);
router.put("/:id", validateBody(workoutInputSchema), updateWorkout);
router.delete("/:id", deleteWorkout);
router.patch("/:id/complete", completeWorkout);

export default router;
