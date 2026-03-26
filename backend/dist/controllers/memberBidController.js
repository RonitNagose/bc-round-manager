"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberBidController = void 0;
const bidService_1 = require("../services/bidService");
const emitters_1 = require("../sockets/emitters");
exports.memberBidController = {
    async placeBid(req, res) {
        const user = req.user;
        const roundIdRaw = req.params.roundId;
        const roundId = Array.isArray(roundIdRaw) ? roundIdRaw[0] : roundIdRaw;
        const { bidAmount } = req.body ?? {};
        const result = await bidService_1.bidService.placeBid({ roundId, bidAmount }, user.id);
        (0, emitters_1.emitNewBid)(roundId, {
            username: result.username,
            bidAmount: result.bidAmount,
            nextAllowedBid: result.nextAllowedBid,
        });
        res.status(201).json(result);
    },
};
