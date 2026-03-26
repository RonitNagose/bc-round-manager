import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { getMemberRounds, type BCRound } from "../services/roundApi";

type MemberRoundRow = { round: BCRound; hasWon: boolean };

function getStatusClass(status: BCRound["status"]) {
  return status === "active" ? "status-active" : status === "closed" ? "status-closed" : "status-upcoming";
}

export default function MemberDashboardPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<MemberRoundRow[]>([]);

  useEffect(() => {
    if (!token) return;
    getMemberRounds(token)
      .then((res) => setRounds(res.rounds))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load rounds"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="page">
      <div className="hero-card">
        <div className="eyebrow">Member View</div>
        <h1 className="page-title">Assigned Auctions</h1>
        <p className="lead">Track your active rounds, open upcoming auctions, and monitor outcomes after close.</p>
      </div>

      <div className="panel">
        <div className="split-header">
          <div>
            <div className="panel-title">Assigned Rounds</div>
            <div className="panel-subtitle">Only rounds assigned to your account are visible here.</div>
          </div>
        </div>

        {loading && <p className="panel-subtitle">Loading...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <div className="list">
            {rounds.length === 0 ? (
              <p className="panel-subtitle">No assigned rounds.</p>
            ) : (
              rounds.map((row) => (
                <div className="list-card" key={row.round.id}>
                  <div>
                    <div className="list-card-title">{row.round.name}</div>
                    <div className="list-card-subtitle">Pool {row.round.totalPool} • Step {row.round.bidStep}</div>
                    <div className={`status-pill ${getStatusClass(row.round.status)}`} style={{ marginTop: 10 }}>
                      {row.round.status}
                    </div>
                    {row.hasWon && <div className="success-text" style={{ marginTop: 10 }}>You won this round</div>}
                  </div>
                  <Link className="button button-primary" to={`/round/${row.round.id}`}>
                    Open
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
