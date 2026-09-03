import { Router } from "express";
import {
  createNutrition,
  deleteNutrition,
  getNutrition,
  listNutrition,
  updateNutrition,
} from "../controllers/nutrition.controller";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import { nutritionEntrySchema } from "../validators/nutrition.validators";

const router = Router();

router.use(authenticate);

router.get("/", listNutrition);
router.post("/", validateBody(nutritionEntrySchema), createNutrition);
router.get("/:id", getNutrition);
router.put("/:id", validateBody(nutritionEntrySchema), updateNutrition);
router.delete("/:id", deleteNutrition);

export default router;
