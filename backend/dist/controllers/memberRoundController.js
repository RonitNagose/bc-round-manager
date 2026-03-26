"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberRoundController = void 0;
const bcRoundService_1 = require("../services/bcRoundService");
exports.memberRoundController = {
    async listRounds(req, res) {
        const user = req.user;
        const rounds = await bcRoundService_1.bcRoundService.listMemberRounds(user.id);
        res.status(200).json({ rounds });
    },
    async getRound(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const result = await bcRoundService_1.bcRoundService.getMemberRound(roundId, user.id);
        res.status(200).json(result);
    },
    async listBids(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : 50;
        const bids = await bcRoundService_1.bcRoundService.listMemberRoundBids(roundId, user.id, limit);
        res.status(200).json({ bids });
    },
};
