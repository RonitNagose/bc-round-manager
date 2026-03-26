import type { Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";

type JoinRoundPayload = {
  roundId: string;
};

function safeJoinRound(socket: Socket, payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const p = payload as Partial<JoinRoundPayload>;
  if (!p.roundId || typeof p.roundId !== "string") return;

  socket.join(p.roundId);
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on("connection", (socket) => {
    socket.on("joinRound", (payload: unknown) => {
      safeJoinRound(socket, payload);
    });
  });
}

// Placeholder for future typed socket events.
export type SocketEvents = {
  joinRound: JoinRoundPayload;
};

