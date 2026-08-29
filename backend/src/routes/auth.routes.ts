import { Router } from "express";
import { postLogin, postLogout, postRefresh, postRegister } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/auth.validators";

const router = Router();

router.post("/register", validateBody(registerSchema), postRegister);
router.post("/login", validateBody(loginSchema), postLogin);
router.post("/refresh", postRefresh);
router.post("/logout", postLogout);

export default router;
