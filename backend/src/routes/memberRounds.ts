import { Router } from "express";

import { memberRoundController } from "../controllers/memberRoundController";
import { memberBidController } from "../controllers/memberBidController";
import { requireAuth, requireRole } from "../middleware/requireAuth";

export const memberRoundsRouter = Router();

memberRoundsRouter.use(requireAuth);
memberRoundsRouter.use(requireRole(["member"]));

memberRoundsRouter.get("/rounds", memberRoundController.listRounds);
memberRoundsRouter.get("/rounds/:roundId", memberRoundController.getRound);
memberRoundsRouter.get("/rounds/:roundId/bids", memberRoundController.listBids);
memberRoundsRouter.post("/rounds/:roundId/bids", memberBidController.placeBid);

