"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errorHandler_1 = require("./errorHandler");
function extractBearerToken(req) {
    const header = req.headers.authorization;
    if (!header)
        return null;
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token)
        return null;
    return token;
}
function requireAuth(req, _res, next) {
    const token = extractBearerToken(req);
    if (!token) {
        return next(new errorHandler_1.ApiError(401, "Missing or invalid Authorization header", { code: "UNAUTHORIZED" }));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (!decoded?.userId || !decoded?.role) {
            return next(new errorHandler_1.ApiError(401, "Invalid token payload", { code: "UNAUTHORIZED" }));
        }
        req.user = { id: decoded.userId, role: decoded.role };
        return next();
    }
    catch (_e) {
        return next(new errorHandler_1.ApiError(401, "Invalid or expired token", { code: "UNAUTHORIZED" }));
    }
}
function requireRole(roles) {
    return (req, _res, next) => {
        const user = req.user;
        if (!user?.role)
            return next(new errorHandler_1.ApiError(401, "Unauthorized", { code: "UNAUTHORIZED" }));
        if (!roles.includes(user.role)) {
            return next(new errorHandler_1.ApiError(403, "Forbidden: insufficient permissions", { code: "FORBIDDEN" }));
        }
        return next();
    };
}
