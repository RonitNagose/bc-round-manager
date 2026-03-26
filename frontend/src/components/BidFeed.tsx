type Bid = {
  id: string;
  userId?: string | null;
  username: string;
  bidAmount: number;
  createdAt: string;
  phone?: string | null;
  role?: string | null;
};

export default function BidFeed({
  bids,
  canDelete = false,
  deletingBidId = null,
  onDeleteBid,
}: {
  bids: Bid[];
  canDelete?: boolean;
  deletingBidId?: string | null;
  onDeleteBid?: (bidId: string) => void;
}) {
  const sorted = [...bids].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="feed-card">
      {sorted.length === 0 ? (
        <div className="muted-text">No bids yet.</div>
      ) : (
        <div className="feed-list">
          {sorted.slice(0, 100).map((bid, idx) => {
            const isLatest = idx === 0;
            return (
              <div className={`feed-item${isLatest ? " is-latest" : ""}`} key={bid.id}>
                <div>
                  <div className="feed-user">{bid.username}</div>
                  {(bid.phone || bid.role) && (
                    <div className="feed-meta">
                      {[bid.phone, bid.role].filter(Boolean).join(" • ")}
                    </div>
                  )}
                  <div className="feed-time">
                    {new Date(bid.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="feed-actions">
                  <div className="feed-bid">{bid.bidAmount}</div>
                  {canDelete && onDeleteBid && (
                    <button
                      className="button button-ghost feed-delete-button"
                      disabled={deletingBidId === bid.id}
                      type="button"
                      onClick={() => onDeleteBid(bid.id)}
                    >
                      {deletingBidId === bid.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
