import { Router } from "express";
import { getProfile, putProfile } from "../controllers/profile.controller";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import { upsertProfileSchema } from "../validators/profile.validators";

const router = Router();

router.get("/me", authenticate, getProfile);
router.put("/me", authenticate, validateBody(upsertProfileSchema), putProfile);

export default router;
