import { Schema, model, type Types } from "mongoose";

import { toJSON } from "../utils/mongoose";

export type BCRoundMemberDocument = {
  roundId: Types.ObjectId;
  userId: Types.ObjectId;
  hasWon: boolean;
};

const bcRoundMemberSchema = new Schema<BCRoundMemberDocument>(
  {
    roundId: { type: Schema.Types.ObjectId, ref: "BCRound", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    hasWon: { type: Boolean, required: true, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON,
  },
);

bcRoundMemberSchema.index({ roundId: 1, userId: 1 }, { unique: true });

export const BCRoundMember = model("BCRoundMember", bcRoundMemberSchema);

