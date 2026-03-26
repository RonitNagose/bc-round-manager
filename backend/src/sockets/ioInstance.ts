import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setIo(instance: SocketIOServer) {
  io = instance;
}

export function getIo() {
  if (!io) throw new Error("Socket.io instance not initialized");
  return io;
}

