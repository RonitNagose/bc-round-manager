"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoundController = void 0;
const bcRoundService_1 = require("../services/bcRoundService");
exports.adminRoundController = {
    async createRound(req, res) {
        const user = req.user;
        const result = await bcRoundService_1.bcRoundService.createRound(req.body, user.id);
        res.status(201).json({ round: result });
    },
    async addMembers(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const { memberUserIds } = req.body ?? {};
        const result = await bcRoundService_1.bcRoundService.addMembersToRound(roundId, memberUserIds, user.id);
        res.status(200).json(result);
    },
    async updateRound(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const round = await bcRoundService_1.bcRoundService.updateRound(roundId, user.id, req.body ?? {});
        res.status(200).json({ round });
    },
    async closeRound(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const result = await bcRoundService_1.bcRoundService.closeRoundManually(roundId, user.id);
        res.status(200).json(result);
    },
    async deleteBid(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const bidIdRaw = req.params.bidId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const bidId = Array.isArray(bidIdRaw) ? bidIdRaw[0] : bidIdRaw;
        const result = await bcRoundService_1.bcRoundService.deleteRoundBid(roundId, bidId, user.id);
        res.status(200).json(result);
    },
    async listRounds(req, res) {
        const user = req.user;
        const rounds = await bcRoundService_1.bcRoundService.listAdminRounds(user.id);
        res.status(200).json({ rounds });
    },
    async listBids(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const limitRaw = req.query.limit;
        const limit = typeof limitRaw === "string" ? Number(limitRaw) : 100;
        const bids = await bcRoundService_1.bcRoundService.listRoundBidsAdmin(roundId, user.id, limit);
        res.status(200).json({ bids });
    },
    async getWinner(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const winner = await bcRoundService_1.bcRoundService.getRoundWinnerAdmin(roundId, user.id);
        res.status(200).json(winner);
    },
    async getRound(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const result = await bcRoundService_1.bcRoundService.getAdminRound(roundId, user.id);
        res.status(200).json(result);
    },
};
