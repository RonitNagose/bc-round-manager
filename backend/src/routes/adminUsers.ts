import { Router } from "express";

import { adminUserController } from "../controllers/adminUserController";
import { requireAuth, requireRole } from "../middleware/requireAuth";

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth);
adminUsersRouter.use(requireRole(["admin"]));

adminUsersRouter.post("/", adminUserController.createUser);
adminUsersRouter.get("/", adminUserController.listUsers);

