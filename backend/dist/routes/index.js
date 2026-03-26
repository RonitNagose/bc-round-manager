"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = require("express");
const health_1 = require("./health");
const auth_1 = require("./auth");
const adminRounds_1 = require("./adminRounds");
const memberRounds_1 = require("./memberRounds");
const adminUsers_1 = require("./adminUsers");
function createApiRouter() {
    const router = (0, express_1.Router)();
    router.use("/health", health_1.healthRouter);
    router.use("/auth", auth_1.authRouter);
    router.use("/admin", adminRounds_1.adminRoundsRouter);
    router.use("/admin/users", adminUsers_1.adminUsersRouter);
    router.use("/member", memberRounds_1.memberRoundsRouter);
    return router;
}
