import { Router } from "express";

import { healthRouter } from "./health";
import { authRouter } from "./auth";
import { adminRoundsRouter } from "./adminRounds";
import { memberRoundsRouter } from "./memberRounds";
import { adminUsersRouter } from "./adminUsers";

export function createApiRouter() {
  const router = Router();

  router.use("/health", healthRouter);
  router.use("/auth", authRouter);
  router.use("/admin", adminRoundsRouter);
  router.use("/admin/users", adminUsersRouter);
  router.use("/member", memberRoundsRouter);

  return router;
}

