import { Router } from "express";
import {
  addProgressPhoto,
  createProgress,
  deleteProgress,
  deleteProgressPhoto,
  ensureProgressOwnership,
  getProgress,
  listProgress,
  listProgressPhotos,
  updateProgress,
} from "../controllers/progress.controller";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import { progressEntrySchema, progressPhotoSchema } from "../validators/progress.validators";

const router = Router();

router.use(authenticate);

router.get("/", listProgress);
router.post("/", validateBody(progressEntrySchema), createProgress);
router.get("/:id", getProgress);
router.put("/:id", ensureProgressOwnership, validateBody(progressEntrySchema), updateProgress);
router.delete("/:id", deleteProgress);

router.get("/:id/photos", listProgressPhotos);
router.post("/:id/photos", ensureProgressOwnership, validateBody(progressPhotoSchema), addProgressPhoto);
router.delete("/:id/photos/:photoId", deleteProgressPhoto);

export default router;
