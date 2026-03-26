import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { ApiError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { User } from "../models";

function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `Invalid ${fieldName}`, { code: "VALIDATION_ERROR" });
  }
}

export const authService = {
  async login(payload: { phone: unknown; password: unknown }) {
    assertNonEmptyString(payload.phone, "phone");
    assertNonEmptyString(payload.password, "password");

    const phone = payload.phone.trim();
    const password = payload.password;

    const user = await User.findOne({ phone }).select("+password").exec();
    if (!user) {
      throw new ApiError(401, "Invalid credentials", { code: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new ApiError(401, "Invalid credentials", { code: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      env.requireJwtSecret(),
      { expiresIn: "7d" },
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  },
};

