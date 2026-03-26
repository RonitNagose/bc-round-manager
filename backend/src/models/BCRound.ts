import { Schema, model, type Types } from "mongoose";

import { toJSON } from "../utils/mongoose";

export type RoundStatus = "upcoming" | "active" | "closed";

export type BCRoundDocument = {
  name: string;
  totalPool: number;
  bidStep: number;
  currentLowestBid: number;
  startTime: Date;
  endTime: Date;
  status: RoundStatus;
  winnerId?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
};

const bcRoundSchema = new Schema<BCRoundDocument>(
  {
    name: { type: String, required: true, trim: true },
    totalPool: { type: Number, required: true, min: 0 },
    bidStep: { type: Number, required: true, min: 0 },
    currentLowestBid: { type: Number, required: true, min: 0 },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    status: { type: String, required: true, enum: ["upcoming", "active", "closed"], index: true },

    winnerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
    toJSON,
  },
);

bcRoundSchema.index({ status: 1, startTime: 1 });
bcRoundSchema.index({ createdBy: 1, createdAt: -1 });

export const BCRound = model("BCRound", bcRoundSchema);

