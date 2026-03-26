"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIo = setIo;
exports.getIo = getIo;
let io = null;
function setIo(instance) {
    io = instance;
}
function getIo() {
    if (!io)
        throw new Error("Socket.io instance not initialized");
    return io;
}
