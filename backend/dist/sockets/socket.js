"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
function safeJoinRound(socket, payload) {
    if (!payload || typeof payload !== "object")
        return;
    const p = payload;
    if (!p.roundId || typeof p.roundId !== "string")
        return;
    socket.join(p.roundId);
}
function setupSocketHandlers(io) {
    io.on("connection", (socket) => {
        socket.on("joinRound", (payload) => {
            safeJoinRound(socket, payload);
        });
    });
}
