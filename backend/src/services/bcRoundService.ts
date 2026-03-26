import mongoose from "mongoose";
import { ApiError } from "../middleware/errorHandler";
import type { UserRole } from "../models/User";
import { BCRound } from "../models/BCRound";
import { BCRoundMember } from "../models/BCRoundMember";
import { Bid } from "../models/Bid";
import { User } from "../models/User";
import { emitRoundClosed } from "../sockets/emitters";

type CreateRoundInput = {
  name: unknown;
  totalPool: unknown;
  bidStep: unknown;
  startTime: unknown;
  endTime: unknown;
};

type UpdateRoundInput = {
  name?: unknown;
  totalPool?: unknown;
  bidStep?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return value.trim();
}

function assertPositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return value;
}

function assertNonNegativeNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return value;
}

function assertDate(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return d;
}

function assertUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "Invalid memberUserIds", { code: "VALIDATION_ERROR" });
  }
  const ids = value.filter((v) => typeof v === "string") as string[];
  if (ids.length === 0) {
    throw new ApiError(400, "memberUserIds must not be empty", { code: "VALIDATION_ERROR" });
  }
  return ids;
}

function parseObjectId(id: string, fieldName: string): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return new mongoose.Types.ObjectId(id);
}

function mapUserSummary(user: any) {
  if (!user) return null;

  return {
    id: user._id?.toString?.() ?? user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}

async function assertAdminRoundOwnership(roundId: mongoose.Types.ObjectId, adminId: mongoose.Types.ObjectId) {
  const round = await BCRound.findById(roundId).populate("winnerId", "name phone role").exec();
  if (!round) throw new ApiError(404, "Round not found", { code: "NOT_FOUND" });
  if (!round.createdBy.equals(adminId)) {
    throw new ApiError(403, "Forbidden: not allowed to access this round", { code: "FORBIDDEN" });
  }
  return round;
}

async function getRoundWinningBid(roundId: mongoose.Types.ObjectId) {
  return Bid.findOne({ roundId }).sort({ bidAmount: 1, createdAt: 1 }).populate("userId", "name phone role").exec();
}

async function recomputeRoundDerivedState(round: any) {
  const winningBid = await getRoundWinningBid(round._id);
  const lowestRemainingBid = await Bid.findOne({ roundId: round._id }).sort({ bidAmount: 1, createdAt: 1 }).select("bidAmount").exec();

  const nextLowestBid = lowestRemainingBid
    ? Math.max(0, lowestRemainingBid.bidAmount - round.bidStep)
    : round.totalPool;

  const winnerId = round.status === "closed" ? winningBid?.userId?._id ?? winningBid?.userId ?? null : round.winnerId ?? null;

  await BCRound.updateOne(
    { _id: round._id },
    { $set: { currentLowestBid: nextLowestBid, winnerId } },
  ).exec();

  await BCRoundMember.updateMany({ roundId: round._id }, { $set: { hasWon: false } }).exec();
  if (round.status === "closed" && winnerId) {
    await BCRoundMember.updateOne({ roundId: round._id, userId: winnerId }, { $set: { hasWon: true } }).exec();
  }

  return {
    winningBid,
    nextLowestBid,
  };
}

export const bcRoundService = {
  async createRound(input: CreateRoundInput, createdByUserId: string) {
    const name = assertString(input.name, "name");
    const totalPool = assertNonNegativeNumber(input.totalPool, "totalPool");
    const bidStep = assertPositiveNumber(input.bidStep, "bidStep");
    const startTime = assertDate(input.startTime, "startTime");
    const endTime = assertDate(input.endTime, "endTime");

    if (startTime.getTime() >= endTime.getTime()) {
      throw new ApiError(400, "startTime must be before endTime", { code: "VALIDATION_ERROR" });
    }
    if (bidStep <= 0) {
      throw new ApiError(400, "bidStep must be > 0", { code: "VALIDATION_ERROR" });
    }

    const createdBy = parseObjectId(createdByUserId, "createdByUserId");

    const now = Date.now();
    const status = startTime.getTime() > now ? "upcoming" : endTime.getTime() > now ? "active" : "closed";

    const round = await BCRound.create({
      name,
      totalPool,
      bidStep,
      currentLowestBid: totalPool,
      startTime,
      endTime,
      status,
      winnerId: null,
      createdBy,
    });

    return round;
  },

  async addMembersToRound(roundId: string, memberUserIdsRaw: unknown, adminUserId: string) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");
    const memberUserIds = assertUserIds(memberUserIdsRaw);

    const round = await BCRound.findById(roundObjectId).exec();
    if (!round) throw new ApiError(404, "Round not found", { code: "NOT_FOUND" });
    if (!round.createdBy.equals(adminObjectId)) {
      throw new ApiError(403, "Forbidden: not allowed to modify this round", { code: "FORBIDDEN" });
    }

    // Ensure users exist and are members.
    const memberObjectIds = memberUserIds.map((id) => parseObjectId(id, "memberUserId"));
    const users = await User.find({ _id: { $in: memberObjectIds } }).select({ role: 1 }).exec();

    const foundIds = new Set(users.map((u) => u._id.toString()));
    const missing = memberObjectIds.map((x) => x.toString()).filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new ApiError(400, `Some memberUserIds not found: ${missing.join(", ")}`, {
        code: "VALIDATION_ERROR",
      });
    }

    const invalidRoles = users
      .filter((u) => u.role !== "member")
      .map((u) => u._id.toString());
    if (invalidRoles.length) {
      throw new ApiError(400, `Some users are not members: ${invalidRoles.join(", ")}`, {
        code: "VALIDATION_ERROR",
      });
    }

    const ops = memberObjectIds.map((userId) => ({
      updateOne: {
        filter: { roundId: roundObjectId, userId },
        update: { $setOnInsert: { hasWon: false } },
        upsert: true,
      },
    }));

    await BCRoundMember.bulkWrite(ops, { ordered: false });

    return { roundId: roundObjectId.toString(), memberUserIds };
  },

  async listAdminRounds(adminUserId: string) {
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");

    const rounds = await BCRound.find({ createdBy: adminObjectId })
      .sort({ createdAt: -1 })
      .populate("winnerId", "name phone role")
      .exec();

    return rounds;
  },

  async getAdminRound(roundId: string, adminUserId: string) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");
    const round = await assertAdminRoundOwnership(roundObjectId, adminObjectId);

    const members = await BCRoundMember.find({ roundId: roundObjectId })
      .sort({ createdAt: 1 })
      .populate("userId", "name phone role")
      .exec();

    const assignedMembers = members.map((membership: any) => ({
      user: mapUserSummary(membership.userId),
      hasWon: membership.hasWon,
      assignedAt: membership.createdAt,
    }));

    const winningBid = await Bid.findOne({ roundId: roundObjectId })
      .sort({ bidAmount: 1, createdAt: 1 })
      .populate("userId", "name phone role")
      .exec();

    if (round.status === "closed" && round.winnerId && winningBid) {
      const winningAmount = winningBid.bidAmount;
      const winnerName = (round.winnerId as any)?.name ?? null;
      return {
        round,
        winnerName,
        winningAmount,
        assignedMembers,
        winner: {
          user: mapUserSummary(winningBid.userId),
          winningAmount,
          bidCreatedAt: winningBid.createdAt,
        },
      };
    }

    return {
      round,
      winnerName: null,
      winningAmount: null,
      assignedMembers,
      winner: null,
    };
  },

  async listRoundBidsAdmin(roundId: string, adminUserId: string, limit = 100) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");
    if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
      throw new ApiError(400, "Invalid limit", { code: "VALIDATION_ERROR" });
    }

    await assertAdminRoundOwnership(roundObjectId, adminObjectId);

    const bids = await Bid.find({ roundId: roundObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name phone role")
      .exec();

    return bids.map((b: any) => ({
      id: b.id,
      userId: b.userId?._id?.toString?.() ?? null,
      bidAmount: b.bidAmount,
      createdAt: b.createdAt,
      username: b.userId?.name ?? "Unknown",
      phone: b.userId?.phone ?? null,
      role: b.userId?.role ?? null,
    }));
  },

  async getRoundWinnerAdmin(roundId: string, adminUserId: string) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");

    const round = await BCRound.findById(roundObjectId).populate("winnerId", "name phone role").exec();
    if (!round) throw new ApiError(404, "Round not found", { code: "NOT_FOUND" });
    if (!round.createdBy.equals(adminObjectId)) {
      throw new ApiError(403, "Forbidden: not allowed to view this round", { code: "FORBIDDEN" });
    }

    if (round.status !== "closed" || !round.winnerId) return { winner: null };

    return {
      winner: round.winnerId,
      winningAmount: await bcRoundService.getWinningAmount(roundObjectId),
    };
  },

  async listMemberRounds(memberUserId: string) {
    const memberObjectId = parseObjectId(memberUserId, "memberUserId");

    const memberships = await BCRoundMember.find({ userId: memberObjectId })
      .populate("roundId")
      .sort({ createdAt: -1 })
      .exec();

    return memberships.map((m) => ({
      round: m.roundId,
      hasWon: m.hasWon,
    }));
  },

  async getMemberRound(roundId: string, memberUserId: string) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const memberObjectId = parseObjectId(memberUserId, "memberUserId");

    const membership = await BCRoundMember.findOne({ roundId: roundObjectId, userId: memberObjectId }).exec();
    if (!membership) {
      throw new ApiError(403, "Forbidden: you are not part of this round", { code: "FORBIDDEN" });
    }

    const round = await BCRound.findById(roundObjectId)
      .populate("winnerId", "name phone role")
      .exec();
    if (!round) throw new ApiError(404, "Round not found", { code: "NOT_FOUND" });

    if (round.status === "closed" && round.winnerId) {
      const winningAmount = await bcRoundService.getWinningAmount(roundObjectId);
      const winnerName = (round.winnerId as any)?.name ?? null;
      return { round, hasWon: membership.hasWon, winnerName, winningAmount };
    }

    return { round, hasWon: membership.hasWon, winnerName: null, winningAmount: null };
  },

  async listMemberRoundBids(roundId: string, memberUserId: string, limit = 50) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const memberObjectId = parseObjectId(memberUserId, "memberUserId");
    if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
      throw new ApiError(400, "Invalid limit", { code: "VALIDATION_ERROR" });
    }

    const membership = await BCRoundMember.findOne({ roundId: roundObjectId, userId: memberObjectId }).exec();
    if (!membership) {
      throw new ApiError(403, "Forbidden: you are not part of this round", { code: "FORBIDDEN" });
    }

    const bids = await Bid.find({ roundId: roundObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name")
      .exec();

    return bids.map((b: any) => ({
      id: b.id,
      bidAmount: b.bidAmount,
      createdAt: b.createdAt,
      username: b.userId?.name ?? "Unknown",
    }));
  },

  async getWinningAmount(roundObjectId: mongoose.Types.ObjectId) {
    // Winning amount is the bidAmount of the earliest (oldest) bid among those at the "lowest"
    // for the closed round. We compute as: lowest bidAmount in the round.
    const lowest = await Bid.aggregate<{ _id: null; minBid: number }>([
      { $match: { roundId: roundObjectId } },
      { $group: { _id: null, minBid: { $min: "$bidAmount" } } },
    ]).exec();

    const minBid = lowest?.[0]?.minBid;
    return typeof minBid === "number" ? minBid : null;
  },

  async updateRound(roundId: string, adminUserId: string, input: UpdateRoundInput) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");
    const round = await assertAdminRoundOwnership(roundObjectId, adminObjectId);

    if (round.status !== "upcoming") {
      throw new ApiError(400, "Only upcoming rounds can be edited", { code: "ROUND_EDIT_NOT_ALLOWED" });
    }

    const existingBidCount = await Bid.countDocuments({ roundId: roundObjectId }).exec();
    if (existingBidCount > 0) {
      throw new ApiError(400, "Rounds with bids cannot be edited", { code: "ROUND_EDIT_NOT_ALLOWED" });
    }

    const nextName = input.name !== undefined ? assertString(input.name, "name") : round.name;
    const nextTotalPool = input.totalPool !== undefined
      ? assertNonNegativeNumber(input.totalPool, "totalPool")
      : round.totalPool;
    const nextBidStep = input.bidStep !== undefined
      ? assertPositiveNumber(input.bidStep, "bidStep")
      : round.bidStep;
    const nextStartTime = input.startTime !== undefined ? assertDate(input.startTime, "startTime") : round.startTime;
    const nextEndTime = input.endTime !== undefined ? assertDate(input.endTime, "endTime") : round.endTime;

    if (nextStartTime.getTime() >= nextEndTime.getTime()) {
      throw new ApiError(400, "startTime must be before endTime", { code: "VALIDATION_ERROR" });
    }

    round.name = nextName;
    round.totalPool = nextTotalPool;
    round.bidStep = nextBidStep;
    round.currentLowestBid = nextTotalPool;
    round.startTime = nextStartTime;
    round.endTime = nextEndTime;
    round.status = nextStartTime.getTime() > Date.now() ? "upcoming" : nextEndTime.getTime() > Date.now() ? "active" : "closed";
    if (round.status !== "closed") {
      round.winnerId = null;
    }

    await round.save();
    return round;
  },

  async closeRoundManually(roundId: string, adminUserId: string) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");
    const round = await assertAdminRoundOwnership(roundObjectId, adminObjectId);

    if (round.status === "closed") {
      const winningBid = await getRoundWinningBid(roundObjectId);
      return {
        round: await BCRound.findById(roundObjectId).populate("winnerId", "name phone role").exec(),
        winner: winningBid
          ? {
              user: mapUserSummary(winningBid.userId),
              winningAmount: winningBid.bidAmount,
              bidCreatedAt: winningBid.createdAt,
            }
          : null,
      };
    }

    round.status = "closed";
    round.endTime = new Date();
    await round.save();

    const { winningBid } = await recomputeRoundDerivedState(round);
    const winnerName = winningBid ? (winningBid.userId as any)?.name ?? null : null;
    emitRoundClosed(roundObjectId.toString(), {
      winnerName,
      winningAmount: winningBid?.bidAmount ?? null,
    });

    return {
      round: await BCRound.findById(roundObjectId).populate("winnerId", "name phone role").exec(),
      winner: winningBid
        ? {
            user: mapUserSummary(winningBid.userId),
            winningAmount: winningBid.bidAmount,
            bidCreatedAt: winningBid.createdAt,
          }
        : null,
    };
  },

  async deleteRoundBid(roundId: string, bidId: string, adminUserId: string) {
    const roundObjectId = parseObjectId(roundId, "roundId");
    const bidObjectId = parseObjectId(bidId, "bidId");
    const adminObjectId = parseObjectId(adminUserId, "adminUserId");
    const round = await assertAdminRoundOwnership(roundObjectId, adminObjectId);

    const bid = await Bid.findOne({ _id: bidObjectId, roundId: roundObjectId }).exec();
    if (!bid) throw new ApiError(404, "Bid not found", { code: "NOT_FOUND" });

    await Bid.deleteOne({ _id: bidObjectId }).exec();

    const { winningBid, nextLowestBid } = await recomputeRoundDerivedState(round);

    if (round.status === "closed") {
      emitRoundClosed(roundObjectId.toString(), {
        winnerName: winningBid ? (winningBid.userId as any)?.name ?? null : null,
        winningAmount: winningBid?.bidAmount ?? null,
      });
    }

    return {
      deletedBidId: bidObjectId.toString(),
      nextLowestBid,
      winner: winningBid
        ? {
            user: mapUserSummary(winningBid.userId),
            winningAmount: winningBid.bidAmount,
            bidCreatedAt: winningBid.createdAt,
          }
        : null,
    };
  },
};
