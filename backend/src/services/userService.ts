import bcrypt from "bcryptjs";

import { ApiError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { User, type UserRole } from "../models/User";

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
  return value.trim();
}

function assertRole(value: unknown): UserRole {
  if (value !== "admin" && value !== "member") {
    throw new ApiError(400, "Invalid role", { code: "VALIDATION_ERROR" });
  }
  return value;
}

export const userService = {
  async createUser(input: { name: unknown; phone: unknown; password: unknown; role: unknown }) {
    // Keep this in service to ensure we never hash/store unvalidated data.
    const name = assertString(input.name, "name");
    const phone = assertString(input.phone, "phone");

    const password = input.password;
    if (typeof password !== "string" || password.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters", { code: "VALIDATION_ERROR" });
    }

    const role = assertRole(input.role);

    // Basic uniqueness constraint.
    const existing = await User.findOne({ phone }).select("_id").exec();
    if (existing) throw new ApiError(409, "Phone already exists", { code: "PHONE_EXISTS" });

    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    const created = await User.create({
      name,
      phone,
      password: hashed,
      role,
    });

    return {
      user: {
        id: created._id.toString(),
        name: created.name,
        phone: created.phone,
        role: created.role,
      },
    };
  },

  async listUsers(_adminUserId: string) {
    const users = await User.find({}).select("name phone role").sort({ createdAt: -1 }).exec();
    return {
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        phone: u.phone,
        role: u.role,
      })),
    };
  },
};

