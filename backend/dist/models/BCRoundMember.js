"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCRoundMember = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("../utils/mongoose");
const bcRoundMemberSchema = new mongoose_1.Schema({
    roundId: { type: mongoose_1.Schema.Types.ObjectId, ref: "BCRound", required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    hasWon: { type: Boolean, required: true, default: false, index: true },
}, {
    timestamps: true,
    toJSON: mongoose_2.toJSON,
});
bcRoundMemberSchema.index({ roundId: 1, userId: 1 }, { unique: true });
exports.BCRoundMember = (0, mongoose_1.model)("BCRoundMember", bcRoundMemberSchema);
