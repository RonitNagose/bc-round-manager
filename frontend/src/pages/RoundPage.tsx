import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useParams } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { SOCKET_URL } from "../lib/config";
import { ApiError } from "../lib/http";
import BidFeed from "../components/BidFeed";
import BidButton from "../components/BidButton";
import LowBidDisplay from "../components/LowBidDisplay";
import RoundCountdown from "../components/RoundCountdown";
import {
  getAdminRound,
  getAdminRoundBids,
  getMemberRound,
  getMemberRoundBids,
  placeMemberBid,
  closeAdminRound,
  deleteAdminBid,
  updateAdminRound,
  type AdminRoundWinner,
  type AssignedMember,
  type BCRound,
  type BidFeedItem,
  type UserSummary,
} from "../services/roundApi";

type RoundViewModel = Pick<
  BCRound,
  "id" | "name" | "status" | "currentLowestBid" | "bidStep" | "startTime" | "endTime" | "totalPool"
> & {
  winnerId: UserSummary | null;
};

function getStatusClass(status: BCRound["status"]) {
  return status === "active" ? "status-active" : status === "closed" ? "status-closed" : "status-upcoming";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return date.toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function RoundPage() {
  const { token, user } = useAuth();
  const params = useParams();
  const roundId = params.roundId ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<RoundViewModel | null>(null);
  const [bids, setBids] = useState<BidFeedItem[]>([]);
  const [bidError, setBidError] = useState<string | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<{ winnerName: string | null; winningAmount: number | null } | null>(
    null,
  );
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [adminWinnerDetails, setAdminWinnerDetails] = useState<AdminRoundWinner | null>(null);
  const [editName, setEditName] = useState("");
  const [editTotalPool, setEditTotalPool] = useState(0);
  const [editBidStep, setEditBidStep] = useState(0);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);
  const [savingRound, setSavingRound] = useState(false);
  const [closingRound, setClosingRound] = useState(false);
  const [deletingBidId, setDeletingBidId] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const nextAllowedBid = useMemo(() => {
    if (!round) return 0;
    return round.currentLowestBid - round.bidStep;
  }, [round]);

  const startMs = round ? new Date(round.startTime).getTime() : Number.NaN;
  const endMs = round ? new Date(round.endTime).getTime() : Number.NaN;
  const isStartedByTime = Number.isFinite(startMs) && nowMs >= startMs;
  const isEndedByTime = Number.isFinite(endMs) && nowMs >= endMs;
  const isClosed = round?.status === "closed" || isEndedByTime;
  const isUpcoming = !!round && !isStartedByTime;
  const isActiveByTime = !!round && isStartedByTime && !isEndedByTime;
  const canBid = !!round && isActiveByTime && !isClosed && user?.role === "member";

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      if (!token) return;
      setLoading(true);
      setError(null);

      try {
        if (user?.role === "member") {
          const roundRes = await getMemberRound(token, roundId);
          const bidsRes = await getMemberRoundBids(token, roundId, 100);

          if (cancelled) return;
          setRound(roundRes.round);
          setBids(bidsRes.bids);
          setWinnerInfo({ winnerName: roundRes.winnerName, winningAmount: roundRes.winningAmount });
          setAssignedMembers([]);
          setAdminWinnerDetails(null);
        } else {
          const roundRes = await getAdminRound(token, roundId);
          const bidsRes = await getAdminRoundBids(token, roundId, 100);

          if (cancelled) return;
          setRound(roundRes.round);
          setBids(bidsRes.bids);
          setWinnerInfo({ winnerName: roundRes.winnerName, winningAmount: roundRes.winningAmount });
          setAssignedMembers(roundRes.assignedMembers);
          setAdminWinnerDetails(roundRes.winner);
          setEditName(roundRes.round.name);
          setEditTotalPool(roundRes.round.totalPool);
          setEditBidStep(roundRes.round.bidStep);
          setEditStartTime(toDatetimeLocalInput(roundRes.round.startTime));
          setEditEndTime(toDatetimeLocalInput(roundRes.round.endTime));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load round");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [token, roundId, user?.role]);

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    setSocketReady(false);

    socket.on("connect", () => {
      socket.emit("joinRound", { roundId });
      setSocketReady(true);
    });

    socket.on("newBid", (payload: { username: string; bidAmount: number; nextAllowedBid: number }) => {
      setRound((prev) => {
        if (!prev) return prev;
        const hasEnded = Date.now() >= new Date(prev.endTime).getTime();

        return {
          ...prev,
          status: hasEnded ? "closed" : prev.status === "upcoming" ? "active" : prev.status,
          currentLowestBid: payload.nextAllowedBid,
        };
      });

      setBids((prev) => [
        {
          id: `live-${payload.bidAmount}-${Date.now()}`,
          userId: null,
          username: payload.username,
          bidAmount: payload.bidAmount,
          createdAt: new Date().toISOString(),
          phone: null,
          role: null,
        },
        ...prev,
      ].slice(0, 100));
    });

    socket.on("roundClosed", (payload: { winnerName: string | null; winningAmount: number | null }) => {
      setRound((prev) => (prev ? { ...prev, status: "closed" } : prev));
      setWinnerInfo({ winnerName: payload.winnerName, winningAmount: payload.winningAmount });
    });

    socket.on("disconnect", () => {
      setSocketReady(false);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setSocketReady(false);
    };
  }, [token, roundId]);

  async function handleAdminRoundUpdate() {
    if (!token || !round || !isAdmin) return;

    setSavingRound(true);
    setAdminActionError(null);
    setAdminActionSuccess(null);

    try {
      if (!editStartTime || !editEndTime) {
        throw new Error("Enter valid start and end times.");
      }

      const result = await updateAdminRound(token, roundId, {
        name: editName,
        totalPool: editTotalPool,
        bidStep: editBidStep,
        startTime: new Date(editStartTime).toISOString(),
        endTime: new Date(editEndTime).toISOString(),
      });

      setRound((prev) => (prev ? { ...prev, ...result.round } : result.round));
      setAdminActionSuccess("Round updated successfully.");
    } catch (e) {
      setAdminActionError(e instanceof Error ? e.message : "Failed to update round");
    } finally {
      setSavingRound(false);
    }
  }

  async function handleCloseRound() {
    if (!token || !isAdmin) return;

    setClosingRound(true);
    setAdminActionError(null);
    setAdminActionSuccess(null);

    try {
      const result = await closeAdminRound(token, roundId);
      setRound((prev) =>
        prev && result.round
          ? { ...prev, ...result.round }
          : result.round ?? prev,
      );
      setWinnerInfo({
        winnerName: result.winner?.user?.name ?? null,
        winningAmount: result.winner?.winningAmount ?? null,
      });
      setAdminWinnerDetails(result.winner);
      setAdminActionSuccess("Round closed successfully.");
    } catch (e) {
      setAdminActionError(e instanceof Error ? e.message : "Failed to close round");
    } finally {
      setClosingRound(false);
    }
  }

  async function handleDeleteBid(bidId: string) {
    if (!token || !isAdmin) return;

    setDeletingBidId(bidId);
    setAdminActionError(null);
    setAdminActionSuccess(null);

    try {
      const result = await deleteAdminBid(token, roundId, bidId);
      setBids((prev) => prev.filter((bid) => bid.id !== result.deletedBidId));
      setRound((prev) => (prev ? { ...prev, currentLowestBid: result.nextLowestBid } : prev));
      setAdminWinnerDetails(result.winner);
      setWinnerInfo({
        winnerName: result.winner?.user?.name ?? null,
        winningAmount: result.winner?.winningAmount ?? null,
      });
      setAssignedMembers((prev) =>
        prev.map((member) => ({
          ...member,
          hasWon: result.winner?.user?.id ? member.user?.id === result.winner.user.id : false,
        })),
      );
      setAdminActionSuccess("Bid deleted from history.");
    } catch (e) {
      setAdminActionError(e instanceof Error ? e.message : "Failed to delete bid");
    } finally {
      setDeletingBidId(null);
    }
  }

  return (
    <div className="page round-layout">
      <div className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Live Auction</div>
            <h1 className="page-title">{round ? round.name : "Loading..."}</h1>
            <p className="lead">
              {isAdmin
                ? "Review the complete round record, assigned members, live bids, and winner metadata."
                : "Monitor the live low-bid ladder, countdown state, and latest accepted bids in real time."}
            </p>
          </div>
          {round && <div className={`status-pill ${getStatusClass(round.status)}`}>{isClosed ? "closed" : round.status}</div>}
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}
      {loading && !error && <div className="panel-subtitle">Loading round...</div>}

      <div className="round-top">
        <div className="metric-card">
          {round ? <LowBidDisplay value={round.currentLowestBid} /> : <div className="muted-text">Loading...</div>}
          <div className="metric-support">
            Next allowed bid: <strong>{round ? nextAllowedBid : "-"}</strong>
          </div>
        </div>

        <div className="metric-card">
          {round ? <RoundCountdown startTime={round.startTime} endTime={round.endTime} /> : <div className="muted-text">Loading...</div>}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-title">Round Schedule</div>
          <div className="detail-list" style={{ marginTop: 18 }}>
            <div className="detail-row">
              <span className="detail-label">Start</span>
              <span className="detail-value">{round ? formatDateTime(round.startTime) : "TBD"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">End</span>
              <span className="detail-value">{round ? formatDateTime(round.endTime) : "TBD"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Pool</span>
              <span className="detail-value">{round?.totalPool ?? "TBD"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Bid Step</span>
              <span className="detail-value">{round?.bidStep ?? "TBD"}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Winner Summary</div>
          <div className="detail-list" style={{ marginTop: 18 }}>
            <div className="detail-row">
              <span className="detail-label">Winner</span>
              <span className="detail-value">
                {adminWinnerDetails?.user?.name ?? winnerInfo?.winnerName ?? round?.winnerId?.name ?? "TBD"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Winning Amount</span>
              <span className="detail-value">
                {adminWinnerDetails?.winningAmount ?? winnerInfo?.winningAmount ?? "TBD"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Winning Bid Time</span>
              <span className="detail-value">{formatDateTime(adminWinnerDetails?.bidCreatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="round-actions">
          <div>
            <div className="panel-title">Bid Action</div>
            <div className="panel-subtitle">{socketReady ? "Live sync connected." : "Waiting for live sync."}</div>
          </div>

          {isAdmin ? (
            <div className="button-row">
              <button
                className="button button-primary"
                disabled={closingRound || isClosed}
                type="button"
                onClick={() => void handleCloseRound()}
              >
                {closingRound ? "Closing..." : isClosed ? "Round Closed" : "Close Round"}
              </button>
            </div>
          ) : (
            <BidButton
              disabled={!canBid}
              onClick={() => {
                setBidError(null);
                if (user?.role !== "member") {
                  setBidError("Bidding is available for members only.");
                  return;
                }

                if (!round || isClosed || !isActiveByTime) return;

                void (async () => {
                  try {
                    const res = await placeMemberBid(token as string, roundId, round.currentLowestBid);
                    setBidError(null);
                    setRound((prev) => (prev ? { ...prev, status: "active", currentLowestBid: res.nextAllowedBid } : prev));
                  } catch (e) {
                    if (e instanceof ApiError && e.code === "BID_OUTDATED") {
                      const expected = (e.details as { expected?: unknown } | undefined)?.expected;
                      if (typeof expected === "number") {
                        setRound((prev) => (prev ? { ...prev, currentLowestBid: expected } : prev));
                      }
                    }
                    setBidError(e instanceof Error ? e.message : "Bid failed");
                  }
                })();
              }}
            >
              {user?.role !== "member"
                ? "Members only"
                : isClosed
                  ? "Round closed"
                  : isUpcoming
                    ? "Starts soon"
                    : "Place bid"}
            </BidButton>
          )}
        </div>

        {bidError && <div className="error-text" style={{ marginTop: 14 }}>{bidError}</div>}
        {adminActionError && <div className="error-text" style={{ marginTop: 14 }}>{adminActionError}</div>}
        {adminActionSuccess && <div className="success-text" style={{ marginTop: 14 }}>{adminActionSuccess}</div>}
      </div>

      {isAdmin && (
        <div className="panel">
          <div className="panel-title">Edit Round</div>
          <div className="panel-subtitle">Editing is allowed only before the round starts and before any bids are placed.</div>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Name</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Total Pool</span>
                <input
                  type="number"
                  value={editTotalPool}
                  onChange={(e) => setEditTotalPool(Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span className="field-label">Bid Step</span>
                <input
                  type="number"
                  value={editBidStep}
                  onChange={(e) => setEditBidStep(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Start Time</span>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">End Time</span>
                <input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="button button-primary" disabled={savingRound} type="button" onClick={() => void handleAdminRoundUpdate()}>
                {savingRound ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="panel-title" style={{ marginBottom: 14 }}>Live Bid Feed</h2>
        <BidFeed
          bids={bids}
          canDelete={isAdmin}
          deletingBidId={deletingBidId}
          onDeleteBid={(bidId) => void handleDeleteBid(bidId)}
        />
      </div>

      {isAdmin && (
        <div className="panel">
          <div className="split-header">
            <div>
              <div className="panel-title">Assigned Members</div>
              <div className="panel-subtitle">Full member roster for this round, including assignment date and winner status.</div>
            </div>
            <div className="pill">{assignedMembers.length} members</div>
          </div>

          <div className="list">
            {assignedMembers.length === 0 ? (
              <div className="panel-subtitle">No members assigned to this round.</div>
            ) : (
              assignedMembers.map((member, index) => (
                <div className="list-card" key={`${member.user?.id ?? "member"}-${index}`}>
                  <div>
                    <div className="list-card-title">{member.user?.name ?? "Unknown Member"}</div>
                    <div className="list-card-subtitle">
                      {member.user?.phone ?? "No phone"} • {member.user?.role ?? "member"}
                    </div>
                    <div className="member-meta">Assigned: {formatDateTime(member.assignedAt)}</div>
                  </div>
                  <div className={`status-pill ${member.hasWon ? "status-active" : "status-upcoming"}`}>
                    {member.hasWon ? "Winner" : "Assigned"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {round?.status === "closed" && (
        <div className="winner-banner">
          <div>
            <div className="metric-label">Winner</div>
            <div className="winner-name">{winnerInfo?.winnerName ?? adminWinnerDetails?.user?.name ?? round?.winnerId?.name ?? "TBD"}</div>
          </div>
          <div className="winner-amount">Winning amount: {winnerInfo?.winningAmount ?? adminWinnerDetails?.winningAmount ?? "TBD"}</div>
        </div>
      )}
    </div>
  );
}
