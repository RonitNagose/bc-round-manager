"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bid = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("../utils/mongoose");
const bidSchema = new mongoose_1.Schema({
    roundId: { type: mongoose_1.Schema.Types.ObjectId, ref: "BCRound", required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bidAmount: { type: Number, required: true, min: 0, index: true },
    createdAt: { type: Date, default: () => new Date(), index: true },
}, {
    timestamps: false,
    toJSON: mongoose_2.toJSON,
});
bidSchema.index({ roundId: 1, createdAt: -1 });
bidSchema.index({ roundId: 1, userId: 1, bidAmount: 1 });
exports.Bid = (0, mongoose_1.model)("Bid", bidSchema);
