"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const requireAuth_1 = require("../middleware/requireAuth");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/login", authController_1.authController.login);
exports.authRouter.get("/me", requireAuth_1.requireAuth, authController_1.authController.me);
