import { Router } from "express";

import { adminRoundController } from "../controllers/adminRoundController";
import { requireAuth, requireRole } from "../middleware/requireAuth";

export const adminRoundsRouter = Router();

adminRoundsRouter.use(requireAuth);
adminRoundsRouter.use(requireRole(["admin"]));

adminRoundsRouter.post("/rounds", adminRoundController.createRound);
adminRoundsRouter.post("/rounds/:roundId/members", adminRoundController.addMembers);
adminRoundsRouter.patch("/rounds/:roundId", adminRoundController.updateRound);
adminRoundsRouter.post("/rounds/:roundId/close", adminRoundController.closeRound);
adminRoundsRouter.delete("/rounds/:roundId/bids/:bidId", adminRoundController.deleteBid);
adminRoundsRouter.get("/rounds", adminRoundController.listRounds);
adminRoundsRouter.get("/rounds/:roundId", adminRoundController.getRound);
adminRoundsRouter.get("/rounds/:roundId/bids", adminRoundController.listBids);
adminRoundsRouter.get("/rounds/:roundId/winner", adminRoundController.getWinner);
