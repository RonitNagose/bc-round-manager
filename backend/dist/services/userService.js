"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errorHandler_1 = require("../middleware/errorHandler");
const User_1 = require("../models/User");
function assertString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new errorHandler_1.ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
    }
    return value.trim();
}
function assertRole(value) {
    if (value !== "admin" && value !== "member") {
        throw new errorHandler_1.ApiError(400, "Invalid role", { code: "VALIDATION_ERROR" });
    }
    return value;
}
exports.userService = {
    async createUser(input) {
        // Keep this in service to ensure we never hash/store unvalidated data.
        const name = assertString(input.name, "name");
        const phone = assertString(input.phone, "phone");
        const password = input.password;
        if (typeof password !== "string" || password.length < 6) {
            throw new errorHandler_1.ApiError(400, "Password must be at least 6 characters", { code: "VALIDATION_ERROR" });
        }
        const role = assertRole(input.role);
        // Basic uniqueness constraint.
        const existing = await User_1.User.findOne({ phone }).select("_id").exec();
        if (existing)
            throw new errorHandler_1.ApiError(409, "Phone already exists", { code: "PHONE_EXISTS" });
        const saltRounds = 10;
        const hashed = await bcryptjs_1.default.hash(password, saltRounds);
        const created = await User_1.User.create({
            name,
            phone,
            password: hashed,
            role,
        });
        return {
            user: {
                id: created._id.toString(),
                name: created.name,
                phone: created.phone,
                role: created.role,
            },
        };
    },
    async listUsers(_adminUserId) {
        const users = await User_1.User.find({}).select("name phone role").sort({ createdAt: -1 }).exec();
        return {
            users: users.map((u) => ({
                id: u._id.toString(),
                name: u.name,
                phone: u.phone,
                role: u.role,
            })),
        };
    },
};
