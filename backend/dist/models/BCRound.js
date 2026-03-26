"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCRound = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("../utils/mongoose");
const bcRoundSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    totalPool: { type: Number, required: true, min: 0 },
    bidStep: { type: Number, required: true, min: 0 },
    currentLowestBid: { type: Number, required: true, min: 0 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, required: true, enum: ["upcoming", "active", "closed"], index: true },
    winnerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, {
    timestamps: true,
    toJSON: mongoose_2.toJSON,
});
bcRoundSchema.index({ status: 1, startTime: 1 });
bcRoundSchema.index({ createdBy: 1, createdAt: -1 });
exports.BCRound = (0, mongoose_1.model)("BCRound", bcRoundSchema);
