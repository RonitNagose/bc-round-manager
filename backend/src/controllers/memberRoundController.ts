import type { Request, Response } from "express";

import { bcRoundService } from "../services/bcRoundService";

export const memberRoundController = {
  async listRounds(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const rounds = await bcRoundService.listMemberRounds(user.id);
    res.status(200).json({ rounds });
  },

  async getRound(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
    const result = await bcRoundService.getMemberRound(roundId, user.id);
    res.status(200).json(result);
  },

  async listBids(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === "string" ? Number(limitRaw) : 50;

    const bids = await bcRoundService.listMemberRoundBids(roundId, user.id, limit);
    res.status(200).json({ bids });
  },
};

