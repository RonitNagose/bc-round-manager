import type { Request, Response } from "express";

import { bidService } from "../services/bidService";
import { emitNewBid } from "../sockets/emitters";

export const memberBidController = {
  async placeBid(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;

    const { bidAmount } = req.body ?? {};

    const result = await bidService.placeBid({ roundId, bidAmount }, user.id);
    emitNewBid(roundId, {
      username: result.username,
      bidAmount: result.bidAmount,
      nextAllowedBid: result.nextAllowedBid,
    });
    res.status(201).json(result);
  },
};

