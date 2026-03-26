import type { Request, Response } from "express";

import { userService } from "../services/userService";

export const adminUserController = {
  async createUser(req: Request, res: Response) {
    const admin = (req as any).user as { id: string };
    const result = await userService.createUser({ ...req.body, role: req.body?.role });
    res.status(201).json(result);
  },

  async listUsers(req: Request, res: Response) {
    const admin = (req as any).user as { id: string };
    const result = await userService.listUsers(admin.id);
    res.status(200).json(result);
  },
};

