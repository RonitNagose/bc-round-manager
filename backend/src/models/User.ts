import { Schema, model } from "mongoose";

import { toJSON } from "../utils/mongoose";

export type UserRole = "admin" | "member";

export type UserDocument = {
  name: string;
  phone: string;
  password: string; // hashed
  role: UserRole;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["admin", "member"], index: true },
  },
  {
    timestamps: true,
    toJSON,
  },
);

export const User = model("User", userSchema);

