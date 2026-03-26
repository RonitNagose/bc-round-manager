import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLogin = location.pathname === "/login";

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (user?.role === "admin") {
      navigate("/admin");
      return;
    }

    if (user?.role === "member") {
      navigate("/member");
      return;
    }

    navigate("/login");
  }

  return (
    <div className="app-shell">
      {!isLogin && (
        <>
          <div className="shell-nav">
            <div className="shell-brand">
            <span className="shell-brand-mark">BC Round</span>
            <span className="shell-brand-title">Auction Control Center</span>
            </div>

            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className={`shell-menu-button${mobileMenuOpen ? " is-open" : ""}`}
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className={`shell-menu${mobileMenuOpen ? " is-open" : ""}`}>
              <div className="shell-user">
                <div className="shell-user-copy">
                  {user ? (
                    <>
                      <div className="shell-user-name">{user.name}</div>
                      <div className="shell-user-role">{user.role}</div>
                    </>
                  ) : (
                    <div className="shell-user-role">Not signed in</div>
                  )}
                </div>
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
          <div className="shell-back-row">
            <button className="shell-back-icon" type="button" onClick={handleGoBack} aria-label="Go back">
              ←
            </button>
          </div>
        </>
      )}
      {children}
    </div>
  );
}
