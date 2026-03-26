import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    navigate(user.role === "admin" ? "/admin" : "/member", { replace: true });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(phone, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page narrow">
      <div className="hero-card login-card">
        <h1 style={{textAlign:"center"}}>Aarovee BC Yojna</h1>
        {/* <div>
          <div className="eyebrow">Secure Access</div>
          <h1 className="login-title">BC Round Manager</h1>
          <p className="login-copy">
            Professional round management for assigned-member auctions with live bidding, clear settlement data, and real-time visibility.
          </p>

          <div className="top-stats">
            <div className="stat-block">
              <div className="stat-number">Live</div>
              <div className="stat-label">Real-time socket updates</div>
            </div>
            <div className="stat-block">
              <div className="stat-number">Secure</div>
              <div className="stat-label">Role-based admin/member access</div>
            </div>
            <div className="stat-block">
              <div className="stat-number">Clear</div>
              <div className="stat-label">Winner, members, amount, and date history</div>
            </div>
          </div>
        </div> */}

        <div className="login-panel">
          <div className="panel-title">Sign In</div>
          <div className="panel-subtitle">Enter your assigned phone number and password to continue.</div>

          <form className="form-grid" onSubmit={onSubmit}>
            <label className="field">
              <span className="field-label">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </label>

            <button className="button button-primary" disabled={submitting} type="submit">
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            {error && <div className="error-text">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
