import { Schema, model, type Types } from "mongoose";

import { toJSON } from "../utils/mongoose";

export type BidDocument = {
  roundId: Types.ObjectId;
  userId: Types.ObjectId;
  bidAmount: number;
  createdAt: Date;
};

const bidSchema = new Schema<BidDocument>(
  {
    roundId: { type: Schema.Types.ObjectId, ref: "BCRound", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bidAmount: { type: Number, required: true, min: 0, index: true },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  {
    timestamps: false,
    toJSON,
  },
);

bidSchema.index({ roundId: 1, createdAt: -1 });
bidSchema.index({ roundId: 1, userId: 1, bidAmount: 1 });

export const Bid = model("Bid", bidSchema);

