"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRoundLifecycleWorker = startRoundLifecycleWorker;
const BCRound_1 = require("../models/BCRound");
const Bid_1 = require("../models/Bid");
const BCRoundMember_1 = require("../models/BCRoundMember");
const User_1 = require("../models/User");
const emitters_1 = require("../sockets/emitters");
async function activateDueRounds() {
    const now = new Date();
    // Promote upcoming rounds to active when startTime has arrived.
    await BCRound_1.BCRound.updateMany({
        status: "upcoming",
        startTime: { $lte: now },
        endTime: { $gt: now },
    }, { $set: { status: "active" } }).exec();
}
async function closeRoundIfDue(roundId) {
    const now = new Date();
    // Acquire an idempotent "lock" by transitioning status to closed only once.
    const locked = await BCRound_1.BCRound.findOneAndUpdate({
        _id: roundId,
        status: "active",
        endTime: { $lte: now },
        winnerId: null,
    }, { $set: { status: "closed" } }, { returnDocument: "after" }).exec();
    if (!locked)
        return null;
    // Determine the winning bid: the lowest bidAmount among all bids.
    const winningBid = await Bid_1.Bid.findOne({ roundId })
        .sort({ bidAmount: 1, createdAt: 1 })
        .exec();
    const winnerId = winningBid?.userId ?? null;
    const winningAmount = winningBid?.bidAmount ?? null;
    await BCRound_1.BCRound.updateOne({ _id: roundId, status: "closed", winnerId: null }, { $set: { winnerId } }).exec();
    // Mark winner membership.
    await BCRoundMember_1.BCRoundMember.updateMany({ roundId }, { $set: { hasWon: false } }).exec();
    if (winnerId) {
        await BCRoundMember_1.BCRoundMember.updateOne({ roundId, userId: winnerId }, { $set: { hasWon: true } }).exec();
    }
    const winnerName = winnerId ? (await User_1.User.findById(winnerId).select("name").exec())?.name ?? null : null;
    (0, emitters_1.emitRoundClosed)(roundId.toString(), { winnerName, winningAmount });
    return {
        roundId: roundId.toString(),
        winnerId: winnerId ? winnerId.toString() : null,
        winningAmount,
    };
}
async function startRoundLifecycleWorker(opts) {
    const intervalMs = opts?.intervalMs ?? 2000;
    // Fire immediately, then at interval.
    await activateDueRounds();
    const loop = async () => {
        try {
            await activateDueRounds();
            const now = new Date();
            const dueRounds = await BCRound_1.BCRound.find({ status: "active", endTime: { $lte: now } }, { _id: 1 })
                .limit(100)
                .exec();
            // Process sequentially to reduce DB pressure.
            for (const r of dueRounds) {
                await closeRoundIfDue(r._id);
            }
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error("Round lifecycle worker failed:", e);
        }
    };
    const interval = setInterval(loop, intervalMs);
    // Unref so it won't keep the process alive in some environments.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    interval.unref?.();
    return interval;
}
