"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bidService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("../middleware/errorHandler");
const Bid_1 = require("../models/Bid");
const BCRound_1 = require("../models/BCRound");
const BCRoundMember_1 = require("../models/BCRoundMember");
const User_1 = require("../models/User");
function parseObjectId(id, fieldName) {
    if (!mongoose_1.default.isValidObjectId(id)) {
        throw new errorHandler_1.ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
    }
    return new mongoose_1.default.Types.ObjectId(id);
}
function assertBidAmount(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new errorHandler_1.ApiError(400, "Invalid bidAmount", { code: "VALIDATION_ERROR" });
    }
    if (value < 0) {
        throw new errorHandler_1.ApiError(400, "bidAmount must be >= 0", { code: "VALIDATION_ERROR" });
    }
    return value;
}
exports.bidService = {
    async placeBid(input, userId) {
        const roundObjectId = parseObjectId(input.roundId, "roundId");
        const userObjectId = parseObjectId(userId, "userId");
        const bidAmount = assertBidAmount(input.bidAmount);
        const user = await User_1.User.findById(userObjectId).select("name").exec();
        if (!user)
            throw new errorHandler_1.ApiError(401, "User not found for this token", { code: "UNAUTHORIZED" });
        const now = new Date();
        // Promote a due round immediately so bidding does not depend on the lifecycle worker tick.
        await BCRound_1.BCRound.updateOne({
            _id: roundObjectId,
            status: "upcoming",
            startTime: { $lte: now },
            endTime: { $gt: now },
        }, { $set: { status: "active" } }).exec();
        const round = await BCRound_1.BCRound.findById(roundObjectId).exec();
        if (!round)
            throw new errorHandler_1.ApiError(404, "Round not found", { code: "NOT_FOUND" });
        const membership = await BCRoundMember_1.BCRoundMember.findOne({
            roundId: roundObjectId,
            userId: userObjectId,
        }).exec();
        if (!membership) {
            throw new errorHandler_1.ApiError(403, "Forbidden: you are not part of this round", { code: "FORBIDDEN" });
        }
        if (now < round.startTime) {
            throw new errorHandler_1.ApiError(400, "Round has not started yet", { code: "ROUND_NOT_ACTIVE" });
        }
        if (now >= round.endTime || round.status === "closed") {
            if (round.status !== "closed") {
                await BCRound_1.BCRound.updateOne({ _id: roundObjectId, status: { $ne: "closed" } }, { $set: { status: "closed" } }).exec();
            }
            throw new errorHandler_1.ApiError(400, "Round has ended", { code: "ROUND_ENDED" });
        }
        if (round.status !== "active") {
            throw new errorHandler_1.ApiError(400, "Round is not active", { code: "ROUND_NOT_ACTIVE" });
        }
        if (bidAmount !== round.currentLowestBid) {
            throw new errorHandler_1.ApiError(409, "Outdated bid: bidAmount does not match currentLowestBid", {
                code: "BID_OUTDATED",
                details: {
                    expected: round.currentLowestBid,
                },
            });
        }
        const computedNext = bidAmount - round.bidStep;
        if (computedNext < 0) {
            throw new errorHandler_1.ApiError(400, "Invalid bid: nextLowestBid would be negative", { code: "BID_INVALID" });
        }
        const updated = await BCRound_1.BCRound.findOneAndUpdate({
            _id: roundObjectId,
            status: "active",
            startTime: { $lte: now },
            endTime: { $gt: now },
            currentLowestBid: bidAmount,
        }, { $set: { currentLowestBid: computedNext } }, { returnDocument: "after" }).exec();
        if (!updated) {
            const latestRound = await BCRound_1.BCRound.findById(roundObjectId).select("currentLowestBid status startTime endTime").exec();
            if (!latestRound) {
                throw new errorHandler_1.ApiError(404, "Round not found", { code: "NOT_FOUND" });
            }
            if (now < latestRound.startTime) {
                throw new errorHandler_1.ApiError(400, "Round has not started yet", { code: "ROUND_NOT_ACTIVE" });
            }
            if (now >= latestRound.endTime || latestRound.status === "closed") {
                throw new errorHandler_1.ApiError(400, "Round has ended", { code: "ROUND_ENDED" });
            }
            throw new errorHandler_1.ApiError(409, "Outdated bid: auction state changed", {
                code: "BID_OUTDATED",
                details: {
                    expected: latestRound.currentLowestBid,
                },
            });
        }
        const createdBid = await Bid_1.Bid.create({
            roundId: roundObjectId,
            userId: userObjectId,
            bidAmount,
        });
        return {
            bidId: createdBid._id.toString(),
            bidAmount,
            nextAllowedBid: computedNext,
            username: user.name,
        };
    },
};
