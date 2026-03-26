"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const env_1 = require("../config/env");
const models_1 = require("../models");
function assertNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new errorHandler_1.ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
    }
}
exports.authService = {
    async login(payload) {
        assertNonEmptyString(payload.phone, "phone");
        assertNonEmptyString(payload.password, "password");
        const phone = payload.phone.trim();
        const password = payload.password;
        const user = await models_1.User.findOne({ phone }).select("+password").exec();
        if (!user) {
            throw new errorHandler_1.ApiError(401, "Invalid credentials", { code: "INVALID_CREDENTIALS" });
        }
        const ok = await bcryptjs_1.default.compare(password, user.password);
        if (!ok) {
            throw new errorHandler_1.ApiError(401, "Invalid credentials", { code: "INVALID_CREDENTIALS" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), role: user.role }, env_1.env.requireJwtSecret(), { expiresIn: "7d" });
        return {
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
        };
    },
};
