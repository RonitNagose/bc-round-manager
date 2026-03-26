import { apiFetch } from "../lib/http";

export type BCRoundStatus = "upcoming" | "active" | "closed";

export type UserSummary = {
  id: string;
  name: string;
  phone: string;
  role: "admin" | "member";
};

export type BCRound = {
  id: string;
  name: string;
  totalPool: number;
  bidStep: number;
  currentLowestBid: number;
  startTime: string;
  endTime: string;
  status: BCRoundStatus;
  winnerId: UserSummary | null;
  createdBy: string;
};

export type BidFeedItem = {
  id: string;
  userId: string | null;
  username: string;
  bidAmount: number;
  createdAt: string;
  phone?: string | null;
  role?: "admin" | "member" | null;
};

export type AssignedMember = {
  user: UserSummary | null;
  hasWon: boolean;
  assignedAt: string;
};

export type AdminRoundWinner = {
  user: UserSummary | null;
  winningAmount: number;
  bidCreatedAt: string;
};

export async function getAdminRounds(token: string) {
  return apiFetch<{ rounds: BCRound[] }>("/api/admin/rounds", { token });
}

export async function getAdminRound(token: string, roundId: string) {
  return apiFetch<{
    round: BCRound;
    winnerName: string | null;
    winningAmount: number | null;
    assignedMembers: AssignedMember[];
    winner: AdminRoundWinner | null;
  }>(
    `/api/admin/rounds/${roundId}`,
    { token },
  );
}

export async function getAdminRoundBids(token: string, roundId: string, limit = 100) {
  return apiFetch<{ bids: BidFeedItem[] }>(`/api/admin/rounds/${roundId}/bids`, { token, query: { limit } });
}

export async function updateAdminRound(
  token: string,
  roundId: string,
  input: Partial<{ name: string; totalPool: number; bidStep: number; startTime: string; endTime: string }>,
) {
  return apiFetch<{ round: BCRound }>(`/api/admin/rounds/${roundId}`, {
    method: "PATCH",
    token,
    body: input,
  });
}

export async function closeAdminRound(token: string, roundId: string) {
  return apiFetch<{ round: BCRound; winner: AdminRoundWinner | null }>(`/api/admin/rounds/${roundId}/close`, {
    method: "POST",
    token,
  });
}

export async function deleteAdminBid(token: string, roundId: string, bidId: string) {
  return apiFetch<{
    deletedBidId: string;
    nextLowestBid: number;
    winner: AdminRoundWinner | null;
  }>(`/api/admin/rounds/${roundId}/bids/${bidId}`, {
    method: "DELETE",
    token,
  });
}

export async function createAdminRound(
  token: string,
  input: { name: string; totalPool: number; bidStep: number; startTime: string; endTime: string },
) {
  return apiFetch<{ round: BCRound }>(`/api/admin/rounds`, {
    method: "POST",
    token,
    body: input,
  });
}

export async function addMembersToRound(token: string, roundId: string, memberUserIds: string[]) {
  return apiFetch<{ roundId: string; memberUserIds: string[] }>(
    `/api/admin/rounds/${roundId}/members`,
    { method: "POST", token, body: { memberUserIds } },
  );
}

export async function getMemberRounds(token: string) {
  return apiFetch<{ rounds: Array<{ round: BCRound; hasWon: boolean }> }>(`/api/member/rounds`, { token });
}

export async function getMemberRound(token: string, roundId: string) {
  return apiFetch<{
    round: BCRound;
    hasWon: boolean;
    winnerName: string | null;
    winningAmount: number | null;
  }>(`/api/member/rounds/${roundId}`, { token });
}

export async function getMemberRoundBids(token: string, roundId: string, limit = 50) {
  return apiFetch<{ bids: BidFeedItem[] }>(`/api/member/rounds/${roundId}/bids`, { token, query: { limit } });
}

export async function placeMemberBid(token: string, roundId: string, bidAmount: number) {
  return apiFetch<{ bidId: string; bidAmount: number; nextAllowedBid: number; username: string }>(
    `/api/member/rounds/${roundId}/bids`,
    { method: "POST", token, body: { bidAmount } },
  );
}
