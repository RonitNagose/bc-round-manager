"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitNewBid = emitNewBid;
exports.emitRoundClosed = emitRoundClosed;
const ioInstance_1 = require("./ioInstance");
function emitNewBid(roundId, payload) {
    (0, ioInstance_1.getIo)().to(roundId).emit("newBid", payload);
}
function emitRoundClosed(roundId, payload) {
    (0, ioInstance_1.getIo)().to(roundId).emit("roundClosed", payload);
}
