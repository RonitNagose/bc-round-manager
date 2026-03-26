"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("../utils/mongoose");
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["admin", "member"], index: true },
}, {
    timestamps: true,
    toJSON: mongoose_2.toJSON,
});
exports.User = (0, mongoose_1.model)("User", userSchema);
