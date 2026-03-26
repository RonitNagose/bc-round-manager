import type { Request, Response } from "express";

import { authService } from "../services/authService";
import { User } from "../models/User";

export const authController = {
  async login(req: Request, res: Response) {
    const { phone, password } = req.body ?? {};

    const result = await authService.login({ phone, password });
    res.status(200).json(result);
  },

  async me(req: Request, res: Response) {
    const authUser = (req as any).user as { id: string; role: "admin" | "member" };
    const user = await User.findById(authUser.id).select("name phone role").exec();
    res.status(200).json({
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            phone: user.phone,
            role: user.role,
          }
        : authUser,
    });
  },
};

