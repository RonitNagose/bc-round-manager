import { Router } from "express";

import { authController } from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.get("/me", requireAuth, authController.me);

