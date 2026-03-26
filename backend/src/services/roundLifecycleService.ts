import mongoose from "mongoose";

import { BCRound } from "../models/BCRound";
import { Bid } from "../models/Bid";
import { BCRoundMember } from "../models/BCRoundMember";
import { User } from "../models/User";
import { emitRoundClosed } from "../sockets/emitters";

async function activateDueRounds() {
  const now = new Date();

  // Promote upcoming rounds to active when startTime has arrived.
  await BCRound.updateMany(
    {
      status: "upcoming",
      startTime: { $lte: now },
      endTime: { $gt: now },
    },
    { $set: { status: "active" } },
  ).exec();
}

async function closeRoundIfDue(roundId: mongoose.Types.ObjectId) {
  const now = new Date();

  // Acquire an idempotent "lock" by transitioning status to closed only once.
  const locked = await BCRound.findOneAndUpdate(
    {
      _id: roundId,
      status: "active",
      endTime: { $lte: now },
      winnerId: null,
    },
    { $set: { status: "closed" } },
    { returnDocument: "after" },
  ).exec();

  if (!locked) return null;

  // Determine the winning bid: the lowest bidAmount among all bids.
  const winningBid = await Bid.findOne({ roundId })
    .sort({ bidAmount: 1, createdAt: 1 })
    .exec();

  const winnerId = winningBid?.userId ?? null;
  const winningAmount = winningBid?.bidAmount ?? null;

  await BCRound.updateOne(
    { _id: roundId, status: "closed", winnerId: null },
    { $set: { winnerId } },
  ).exec();

  // Mark winner membership.
  await BCRoundMember.updateMany({ roundId }, { $set: { hasWon: false } }).exec();
  if (winnerId) {
    await BCRoundMember.updateOne({ roundId, userId: winnerId }, { $set: { hasWon: true } }).exec();
  }

  const winnerName = winnerId ? (await User.findById(winnerId).select("name").exec())?.name ?? null : null;
  emitRoundClosed(roundId.toString(), { winnerName, winningAmount });

  return {
    roundId: roundId.toString(),
    winnerId: winnerId ? winnerId.toString() : null,
    winningAmount,
  };
}

export async function startRoundLifecycleWorker(opts?: { intervalMs?: number }) {
  const intervalMs = opts?.intervalMs ?? 2000;
  // Fire immediately, then at interval.
  await activateDueRounds();

  const loop = async () => {
    try {
      await activateDueRounds();

      const now = new Date();
      const dueRounds = await BCRound.find(
        { status: "active", endTime: { $lte: now } },
        { _id: 1 },
      )
        .limit(100)
        .exec();

      // Process sequentially to reduce DB pressure.
      for (const r of dueRounds) {
        await closeRoundIfDue(r._id);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Round lifecycle worker failed:", e);
    }
  };

  const interval = setInterval(loop, intervalMs);

  // Unref so it won't keep the process alive in some environments.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  (interval as any).unref?.();

  return interval;
}

