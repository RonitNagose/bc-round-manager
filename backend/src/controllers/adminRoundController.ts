import type { Request, Response } from "express";

import { bcRoundService } from "../services/bcRoundService";

export const adminRoundController = {
  async createRound(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const result = await bcRoundService.createRound(req.body, user.id);
    res.status(201).json({ round: result });
  },

  async addMembers(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
    const { memberUserIds } = req.body ?? {};

    const result = await bcRoundService.addMembersToRound(roundId, memberUserIds, user.id);
    res.status(200).json(result);
  },

  async updateRound(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;

    const round = await bcRoundService.updateRound(roundId, user.id, req.body ?? {});
    res.status(200).json({ round });
  },

  async closeRound(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;

    const result = await bcRoundService.closeRoundManually(roundId, user.id);
    res.status(200).json(result);
  },

  async deleteBid(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const bidIdRaw = req.params.bidId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
    const bidId = Array.isArray(bidIdRaw) ? bidIdRaw[0] : bidIdRaw;

    const result = await bcRoundService.deleteRoundBid(roundId, bidId, user.id);
    res.status(200).json(result);
  },

  async listRounds(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const rounds = await bcRoundService.listAdminRounds(user.id);
    res.status(200).json({ rounds });
  },

  async listBids(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === "string" ? Number(limitRaw) : 100;

    const bids = await bcRoundService.listRoundBidsAdmin(roundId, user.id, limit);
    res.status(200).json({ bids });
  },

  async getWinner(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;

    const winner = await bcRoundService.getRoundWinnerAdmin(roundId, user.id);
    res.status(200).json(winner);
  },

  async getRound(req: Request, res: Response) {
    const user = (req as any).user as { id: string };
    const roundIdRaw = req.params.roundId;
    const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;

    const result = await bcRoundService.getAdminRound(roundId, user.id);
    res.status(200).json(result);
  },
};
