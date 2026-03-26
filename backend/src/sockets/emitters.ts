import { getIo } from "./ioInstance";

export function emitNewBid(roundId: string, payload: { username: string; bidAmount: number; nextAllowedBid: number }) {
  getIo().to(roundId).emit("newBid", payload);
}

export function emitRoundClosed(
  roundId: string,
  payload: { winnerName: string | null; winningAmount: number | null },
) {
  getIo().to(roundId).emit("roundClosed", payload);
}

