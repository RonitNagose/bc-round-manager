import mongoose from "mongoose";

import { ApiError } from "../middleware/errorHandler";
import { Bid } from "../models/Bid";
import { BCRound } from "../models/BCRound";
import { BCRoundMember } from "../models/BCRoundMember";
import { User } from "../models/User";

export type PlaceBidInput = {
  roundId: string;
  bidAmount: unknown;
};

function parseObjectId(id: string, fieldName: string): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return new mongoose.Types.ObjectId(id);
}

function assertBidAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, "Invalid bidAmount", { code: "VALIDATION_ERROR" });
  }
  if (value < 0) {
    throw new ApiError(400, "bidAmount must be >= 0", { code: "VALIDATION_ERROR" });
  }
  return value;
}

export const bidService = {
  async placeBid(input: PlaceBidInput, userId: string) {
    const roundObjectId = parseObjectId(input.roundId, "roundId");
    const userObjectId = parseObjectId(userId, "userId");
    const bidAmount = assertBidAmount(input.bidAmount);

    const user = await User.findById(userObjectId).select("name").exec();
    if (!user) throw new ApiError(401, "User not found for this token", { code: "UNAUTHORIZED" });

    const now = new Date();

    // Promote a due round immediately so bidding does not depend on the lifecycle worker tick.
    await BCRound.updateOne(
      {
        _id: roundObjectId,
        status: "upcoming",
        startTime: { $lte: now },
        endTime: { $gt: now },
      },
      { $set: { status: "active" } },
    ).exec();

    const round = await BCRound.findById(roundObjectId).exec();
    if (!round) throw new ApiError(404, "Round not found", { code: "NOT_FOUND" });

    const membership = await BCRoundMember.findOne({
      roundId: roundObjectId,
      userId: userObjectId,
    }).exec();

    if (!membership) {
      throw new ApiError(403, "Forbidden: you are not part of this round", { code: "FORBIDDEN" });
    }

    if (now < round.startTime) {
      throw new ApiError(400, "Round has not started yet", { code: "ROUND_NOT_ACTIVE" });
    }

    if (now >= round.endTime || round.status === "closed") {
      if (round.status !== "closed") {
        await BCRound.updateOne(
          { _id: roundObjectId, status: { $ne: "closed" } },
          { $set: { status: "closed" } },
        ).exec();
      }
      throw new ApiError(400, "Round has ended", { code: "ROUND_ENDED" });
    }

    if (round.status !== "active") {
      throw new ApiError(400, "Round is not active", { code: "ROUND_NOT_ACTIVE" });
    }

    if (bidAmount !== round.currentLowestBid) {
      throw new ApiError(409, "Outdated bid: bidAmount does not match currentLowestBid", {
        code: "BID_OUTDATED",
        details: {
          expected: round.currentLowestBid,
        },
      });
    }

    const computedNext = bidAmount - round.bidStep;
    if (computedNext < 0) {
      throw new ApiError(400, "Invalid bid: nextLowestBid would be negative", { code: "BID_INVALID" });
    }

    const updated = await BCRound.findOneAndUpdate(
      {
        _id: roundObjectId,
        status: "active",
        startTime: { $lte: now },
        endTime: { $gt: now },
        currentLowestBid: bidAmount,
      },
      { $set: { currentLowestBid: computedNext } },
      { returnDocument: "after" },
    ).exec();

    if (!updated) {
      const latestRound = await BCRound.findById(roundObjectId).select("currentLowestBid status startTime endTime").exec();

      if (!latestRound) {
        throw new ApiError(404, "Round not found", { code: "NOT_FOUND" });
      }
      if (now < latestRound.startTime) {
        throw new ApiError(400, "Round has not started yet", { code: "ROUND_NOT_ACTIVE" });
      }
      if (now >= latestRound.endTime || latestRound.status === "closed") {
        throw new ApiError(400, "Round has ended", { code: "ROUND_ENDED" });
      }

      throw new ApiError(409, "Outdated bid: auction state changed", {
        code: "BID_OUTDATED",
        details: {
          expected: latestRound.currentLowestBid,
        },
      });
    }

    const createdBid = await Bid.create({
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
